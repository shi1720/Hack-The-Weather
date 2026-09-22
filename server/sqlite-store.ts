import type { Workspace } from '../src/shared/types';
import { WorkspaceError } from '../src/shared/workspace';
import type { KavuDatabase } from './database';
import type { KavuStore, StoreSession, StoreUser } from './store';

export class SQLiteStore implements KavuStore {
  readonly kind = 'sqlite' as const;
  constructor(readonly db: KavuDatabase) {}
  async health() {
    this.db.prepare('SELECT 1').get();
  }
  async createUser(inputUser: StoreUser, workspace: Workspace) {
    const user = { ...inputUser, email: inputUser.email?.trim().toLowerCase() ?? null };
    try {
      this.db.transaction(() => {
        this.db
          .prepare(
            'INSERT INTO users(id,name,email,password_hash,demo,created_at) VALUES(?,?,?,?,?,?)',
          )
          .run(user.id, user.name, user.email, user.password_hash, user.demo, user.created_at);
        this.db
          .prepare('INSERT INTO workspaces(user_id,revision,data) VALUES(?,?,?)')
          .run(user.id, workspace.revision, JSON.stringify(workspace));
      })();
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'SQLITE_CONSTRAINT_UNIQUE'
      )
        throw new WorkspaceError(
          'An account with this email already exists. Sign in instead.',
          'ACCOUNT_EXISTS',
          409,
        );
      throw error;
    }
  }
  async findUserByEmail(email: string) {
    return this.db
      .prepare('SELECT * FROM users WHERE email=? AND demo=0')
      .get(email.trim().toLowerCase()) as StoreUser | undefined;
  }
  async userForSession(hash: string, now: number) {
    return this.db
      .prepare(
        'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?',
      )
      .get(hash, now) as StoreUser | undefined;
  }
  private insertSession(userId: string, session: StoreSession) {
    this.db
      .prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)')
      .run(session.tokenHash, userId, session.expiresAt);
    this.db
      .prepare(
        'DELETE FROM sessions WHERE user_id=? AND token_hash<>? AND token_hash NOT IN (SELECT token_hash FROM sessions WHERE user_id=? AND token_hash<>? ORDER BY expires_at DESC LIMIT 19)',
      )
      .run(userId, session.tokenHash, userId, session.tokenHash);
  }
  async createSession(
    userId: string,
    session: StoreSession,
    previousHash: string | undefined,
    expectedPasswordHash: string | null,
  ) {
    this.db.transaction(() => {
      const user = this.db.prepare('SELECT * FROM users WHERE id=?').get(userId) as
        StoreUser | undefined;
      if (!user || user.password_hash !== expectedPasswordHash)
        throw new WorkspaceError(
          'Your credentials changed. Sign in again.',
          'INVALID_CREDENTIALS',
          401,
        );
      if (previousHash)
        this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(previousHash);
      this.db
        .prepare('DELETE FROM sessions WHERE user_id=? AND expires_at<=?')
        .run(userId, Date.now());
      this.insertSession(userId, session);
    })();
  }
  async revokeSession(hash: string) {
    this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash);
  }
  async changePassword(
    userId: string,
    expectedHash: string,
    newHash: string,
    replacement: StoreSession,
  ) {
    this.db.transaction(() => {
      const changed = this.db
        .prepare('UPDATE users SET password_hash=? WHERE id=? AND password_hash=?')
        .run(newHash, userId, expectedHash);
      if (!changed.changes)
        throw new WorkspaceError(
          'Your password changed during this request. Sign in again before changing it.',
          'REVISION_CONFLICT',
          409,
        );
      this.db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId);
      this.insertSession(userId, replacement);
    })();
  }
  private readWorkspace(userId: string): Workspace {
    const row = this.db
      .prepare('SELECT revision,data FROM workspaces WHERE user_id=?')
      .get(userId) as { revision: number; data: string } | undefined;
    if (!row) throw new WorkspaceError('Workspace was not found.', 'NOT_FOUND', 404);
    return { ...JSON.parse(row.data), revision: row.revision } as Workspace;
  }
  async getWorkspace(userId: string) {
    return this.readWorkspace(userId);
  }
  async updateWorkspace(
    userId: string,
    revision: number,
    update: (workspace: Workspace) => Workspace,
  ) {
    return this.db.transaction(() => {
      const current = this.readWorkspace(userId);
      if (current.revision !== revision)
        throw new WorkspaceError(
          'Your workspace changed in another tab. Reload the latest data and try again.',
          'REVISION_CONFLICT',
          409,
        );
      const next = update(current);
      if (next !== current)
        this.db
          .prepare('UPDATE workspaces SET revision=?,data=? WHERE user_id=? AND revision=?')
          .run(next.revision, JSON.stringify(next), userId, revision);
      return next;
    })();
  }
  async cleanup(now = Date.now()) {
    this.db.transaction(() => {
      this.db
        .prepare(
          'DELETE FROM sessions WHERE token_hash IN (SELECT token_hash FROM sessions WHERE expires_at<=? LIMIT 100)',
        )
        .run(now);
      this.db
        .prepare(
          'DELETE FROM users WHERE id IN (SELECT id FROM users WHERE demo=1 AND created_at<? AND id NOT IN (SELECT user_id FROM sessions WHERE expires_at>?) LIMIT 20)',
        )
        .run(now - 24 * 60 * 60_000, now);
    })();
  }
  async close() {
    if (this.db.open) this.db.close();
  }
}
