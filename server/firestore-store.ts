import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { Firestore, type DocumentData } from '@google-cloud/firestore';
import type { Workspace } from '../src/shared/types';
import { WorkspaceError } from '../src/shared/workspace';
import type { KavuStore, StoreSession, StoreUser } from './store';

const MAX_COMPRESSED_WORKSPACE_BYTES = 900_000;
const MAX_RAW_WORKSPACE_BYTES = 32 * 1024 * 1024;
const DEMO_LIFETIME = 24 * 60 * 60_000;
interface CloudUser extends StoreUser {
  authVersion: number;
  activeSessions: StoreSession[];
  expiresAt?: Date;
}
interface CloudSession {
  userId: string;
  expiresAt: Date;
  authVersion: number;
}
export interface FirestoreStoreOptions {
  client?: Firestore;
  projectId?: string;
  databaseId?: string;
  prefix?: string;
}
function readUser(data: DocumentData | undefined): CloudUser | undefined {
  return data as CloudUser | undefined;
}
function expiryMillis(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof value.toMillis === 'function'
  )
    return value.toMillis() as number;
  return NaN;
}
export function encodeWorkspace(workspace: Workspace): Buffer {
  const raw = Buffer.from(JSON.stringify(workspace));
  if (raw.length > MAX_RAW_WORKSPACE_BYTES)
    throw new WorkspaceError(
      'This workspace has reached its cloud storage limit. Export your records and contact the operator before adding more history. No changes were saved.',
      'STORAGE_LIMIT',
      413,
    );
  const compressed = gzipSync(raw);
  if (compressed.length > MAX_COMPRESSED_WORKSPACE_BYTES)
    throw new WorkspaceError(
      'This workspace has reached its cloud storage limit. Export your records and contact the operator before adding more history. No changes were saved.',
      'STORAGE_LIMIT',
      413,
    );
  return compressed;
}
function decodeWorkspace(data: DocumentData | undefined): Workspace {
  if (!data) throw new WorkspaceError('Workspace was not found.', 'NOT_FOUND', 404);
  if (!Buffer.isBuffer(data.payload) || data.encoding !== 'gzip-json-v1')
    throw new Error('Unsupported stored workspace encoding.');
  const workspace = JSON.parse(
    gunzipSync(data.payload, { maxOutputLength: MAX_RAW_WORKSPACE_BYTES }).toString('utf8'),
  ) as Workspace;
  workspace.revision = data.revision as number;
  return workspace;
}
export class FirestoreStore implements KavuStore {
  readonly kind = 'firestore' as const;
  readonly client: Firestore;
  readonly prefix: string;
  constructor(options: FirestoreStoreOptions = {}) {
    this.prefix = options.prefix ?? process.env.FIRESTORE_COLLECTION_PREFIX ?? 'kavu';
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,80}$/.test(this.prefix))
      throw new Error('FIRESTORE_COLLECTION_PREFIX must be a simple collection prefix.');
    this.client =
      options.client ??
      new Firestore({
        projectId: options.projectId ?? process.env.GOOGLE_CLOUD_PROJECT,
        databaseId: options.databaseId ?? process.env.FIRESTORE_DATABASE_ID ?? '(default)',
      });
  }
  private collection(name: 'users' | 'emails' | 'sessions' | 'workspaces' | 'meta') {
    return this.client.collection(`${this.prefix}_${name}`);
  }
  private emailKey(email: string) {
    return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  }
  async health() {
    await this.collection('meta').doc('health').get();
  }
  async createUser(inputUser: StoreUser, workspace: Workspace) {
    const user = { ...inputUser, email: inputUser.email?.trim().toLowerCase() ?? null };
    const payload = encodeWorkspace(workspace);
    const userRef = this.collection('users').doc(user.id);
    const emailRef = user.email
      ? this.collection('emails').doc(this.emailKey(user.email))
      : undefined;
    const expiresAt = user.demo ? new Date(user.created_at + DEMO_LIFETIME) : undefined;
    await this.client.runTransaction(async (transaction) => {
      const [existingUser, existingEmail] = await Promise.all([
        transaction.get(userRef),
        emailRef ? transaction.get(emailRef) : Promise.resolve(undefined),
      ]);
      if (existingEmail?.exists)
        throw new WorkspaceError(
          'An account with this email already exists. Sign in instead.',
          'ACCOUNT_EXISTS',
          409,
        );
      if (existingUser.exists)
        throw new WorkspaceError(
          'Account identifier already exists. Try again.',
          'ACCOUNT_EXISTS',
          409,
        );
      transaction.create(userRef, {
        ...user,
        authVersion: 0,
        activeSessions: [],
        ...(expiresAt ? { expiresAt } : {}),
      });
      if (emailRef) transaction.create(emailRef, { userId: user.id });
      transaction.create(this.collection('workspaces').doc(user.id), {
        payload,
        encoding: 'gzip-json-v1',
        revision: workspace.revision,
        updatedAt: new Date(),
        ...(expiresAt ? { expiresAt } : {}),
      });
    });
  }
  async findUserByEmail(email: string): Promise<StoreUser | undefined> {
    const claim = await this.collection('emails').doc(this.emailKey(email)).get();
    const userId: unknown = claim.get('userId');
    if (typeof userId !== 'string') return undefined;
    return readUser((await this.collection('users').doc(userId).get()).data());
  }
  async userForSession(hash: string, now: number): Promise<StoreUser | undefined> {
    const session = (await this.collection('sessions').doc(hash).get()).data() as
      CloudSession | undefined;
    if (
      !session ||
      expiryMillis(session.expiresAt) <= now ||
      !Number.isFinite(expiryMillis(session.expiresAt))
    )
      return undefined;
    const user = readUser((await this.collection('users').doc(session.userId).get()).data());
    if (
      !user ||
      user.authVersion !== session.authVersion ||
      !user.activeSessions.some((s) => s.tokenHash === hash && s.expiresAt > now)
    )
      return undefined;
    if (user.demo && user.created_at + DEMO_LIFETIME <= now) return undefined;
    return user;
  }
  async createSession(
    userId: string,
    session: StoreSession,
    previousHash: string | undefined,
    expectedPasswordHash: string | null,
  ) {
    const userRef = this.collection('users').doc(userId);
    await this.client.runTransaction(async (transaction) => {
      const user = readUser((await transaction.get(userRef)).data());
      if (!user || user.password_hash !== expectedPasswordHash)
        throw new WorkspaceError(
          'Your credentials changed. Sign in again.',
          'INVALID_CREDENTIALS',
          401,
        );
      const active = [
        session,
        ...user.activeSessions.filter(
          (s) => s.tokenHash !== previousHash && s.expiresAt > Date.now(),
        ),
      ].slice(0, 20);
      const kept = new Set(active.map((s) => s.tokenHash));
      for (const old of user.activeSessions)
        if (!kept.has(old.tokenHash))
          transaction.delete(this.collection('sessions').doc(old.tokenHash));
      if (previousHash && previousHash !== session.tokenHash)
        transaction.delete(this.collection('sessions').doc(previousHash));
      transaction.create(this.collection('sessions').doc(session.tokenHash), {
        userId,
        authVersion: user.authVersion,
        expiresAt: new Date(session.expiresAt),
      });
      transaction.update(userRef, { activeSessions: active });
    });
  }
  async revokeSession(hash: string) {
    await this.collection('sessions').doc(hash).delete();
  }
  async changePassword(
    userId: string,
    expectedHash: string,
    newHash: string,
    replacement: StoreSession,
  ) {
    const userRef = this.collection('users').doc(userId);
    await this.client.runTransaction(async (transaction) => {
      const user = readUser((await transaction.get(userRef)).data());
      if (!user || user.password_hash !== expectedHash)
        throw new WorkspaceError(
          'Your password changed during this request. Sign in again before changing it.',
          'REVISION_CONFLICT',
          409,
        );
      const authVersion = user.authVersion + 1;
      for (const previous of user.activeSessions)
        transaction.delete(this.collection('sessions').doc(previous.tokenHash));
      transaction.update(userRef, {
        password_hash: newHash,
        authVersion,
        activeSessions: [replacement],
      });
      transaction.create(this.collection('sessions').doc(replacement.tokenHash), {
        userId,
        authVersion,
        expiresAt: new Date(replacement.expiresAt),
      });
    });
  }
  async getWorkspace(userId: string) {
    return decodeWorkspace((await this.collection('workspaces').doc(userId).get()).data());
  }
  async updateWorkspace(
    userId: string,
    revision: number,
    update: (workspace: Workspace) => Workspace,
  ) {
    const reference = this.collection('workspaces').doc(userId);
    return this.client.runTransaction(async (transaction) => {
      const current = decodeWorkspace((await transaction.get(reference)).data());
      if (current.revision !== revision)
        throw new WorkspaceError(
          'Your workspace changed in another tab. Reload the latest data and try again.',
          'REVISION_CONFLICT',
          409,
        );
      const next = update(current);
      if (next !== current)
        transaction.update(reference, {
          payload: encodeWorkspace(next),
          encoding: 'gzip-json-v1',
          revision: next.revision,
          updatedAt: new Date(),
        });
      return next;
    });
  }
  async cleanup(now = Date.now()) {
    const expired = await this.collection('sessions')
      .where('expiresAt', '<=', new Date(now))
      .limit(100)
      .get();
    if (!expired.empty) {
      const batch = this.client.batch();
      for (const row of expired.docs) batch.delete(row.ref);
      await batch.commit();
    }
    const demos = await this.collection('users')
      .where('expiresAt', '<=', new Date(now))
      .limit(20)
      .get();
    for (const row of demos.docs)
      await this.client.runTransaction(async (transaction) => {
        const user = readUser((await transaction.get(row.ref)).data());
        if (!user?.demo || user.created_at + DEMO_LIFETIME > now) return;
        for (const session of user.activeSessions)
          transaction.delete(this.collection('sessions').doc(session.tokenHash));
        transaction.delete(this.collection('workspaces').doc(user.id));
        transaction.delete(row.ref);
      });
  }
  async close() {
    await this.client.terminate();
  }
}
