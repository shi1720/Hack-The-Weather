import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Firestore } from '@google-cloud/firestore';
import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { FirestoreStore, encodeWorkspace } from '../server/firestore-store';
import { createApp } from '../server/app';
import { applyCommand, createDemoWorkspace, createWorkspace } from '../src/shared/workspace';
import type { StoreUser } from '../server/store';

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIRESTORE_TEST_PROJECT);
const projectId = process.env.FIRESTORE_TEST_PROJECT ?? 'demo-kavu-test';
const prefix = `kavu_test_${randomUUID().replaceAll('-', '')}`;
const newUser = (email: string | null = `${randomUUID()}@example.test`, demo = 0): StoreUser => ({
  id: randomUUID(),
  name: 'Firestore integration fixture',
  email,
  password_hash: demo ? null : 'fixture-hash',
  demo,
  created_at: Date.now(),
});
const token = () => randomBytes(32).toString('hex');
let store: FirestoreStore;
let server: Server | undefined;
let testAuth: GoogleAuth | undefined;
function makeStore() {
  const client = new Firestore({ projectId, ...(testAuth ? { auth: testAuth } : {}) });
  return new FirestoreStore({ client, prefix });
}

describe.skipIf(!enabled)('Firestore real service or emulator integration', () => {
  beforeAll(async () => {
    if (process.env.FIRESTORE_TEST_USE_GCLOUD === '1') {
      let accessToken: string;
      try {
        accessToken = execFileSync('gcloud', ['auth', 'print-access-token'], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }).trim();
      } catch {
        throw new Error(
          'Could not obtain short-lived gcloud test credentials. Authenticate the official CLI first.',
        );
      }
      const oauth = new OAuth2Client();
      oauth.setCredentials({ access_token: accessToken, expiry_date: Date.now() + 3_500_000 });
      testAuth = new GoogleAuth({ authClient: oauth });
    }
    store = makeStore();
    await store.health();
  }, 60_000);
  afterAll(async () => {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    if (!store) return;
    // Only this random test namespace is deleted. Never remove a production collection.
    if (!prefix.startsWith('kavu_test_'))
      throw new Error('Unsafe integration test cleanup prefix.');
    for (const name of ['users', 'emails', 'workspaces', 'sessions', 'meta']) {
      let page = await store.client.collection(`${prefix}_${name}`).limit(200).get();
      while (!page.empty) {
        const batch = store.client.batch();
        for (const document of page.docs) batch.delete(document.ref);
        await batch.commit();
        page = await store.client.collection(`${prefix}_${name}`).limit(200).get();
      }
    }
    await store.close();
  }, 60_000);

  it('claims an email exactly once under concurrent registration', async () => {
    const email = `${randomUUID()}@example.test`;
    const outcomes = await Promise.allSettled([
      store.createUser(newUser(email), createWorkspace()),
      store.createUser(newUser(email.toUpperCase()), createWorkspace()),
    ]);
    expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: 'ACCOUNT_EXISTS', status: 409 });
    expect((await store.findUserByEmail(email))?.email).toBe(email);
  }, 30_000);

  it('isolates tenants and allows exactly one optimistic-concurrency winner', async () => {
    const a = newUser(null, 1),
      b = newUser(null, 1);
    await Promise.all([
      store.createUser(a, createDemoWorkspace()),
      store.createUser(b, createDemoWorkspace()),
    ]);
    const update = (workspace: ReturnType<typeof createWorkspace>) =>
      applyCommand(workspace, {
        type: 'batch.measure',
        batchId: 'demo-batch-1',
        moisturePct: 12.5,
        note: 'Integration fixture',
      });
    const outcomes = await Promise.allSettled([
      store.updateWorkspace(a.id, 0, update),
      store.updateWorkspace(a.id, 0, update),
    ]);
    expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      (outcomes.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason,
    ).toMatchObject({ code: 'REVISION_CONFLICT' });
    expect((await store.getWorkspace(a.id)).batches[0].moisturePct).toBe(12.5);
    expect((await store.getWorkspace(b.id)).batches[0].moisturePct).toBe(18.2);
    // A separate client has no in-process state to fall back on.
    const independent = makeStore();
    try {
      expect((await independent.getWorkspace(a.id)).revision).toBe(1);
    } finally {
      await independent.close();
    }
  }, 30_000);

  it('bounds sessions, rejects stale credentials and atomically revokes all earlier sessions on password change', async () => {
    const user = newUser();
    await store.createUser(user, createWorkspace());
    const hashes: string[] = [];
    for (let i = 0; i < 22; i++) {
      const hash = token();
      hashes.push(hash);
      await store.createSession(
        user.id,
        { tokenHash: hash, expiresAt: Date.now() + 60_000 },
        undefined,
        user.password_hash,
      );
    }
    expect(await store.userForSession(hashes[0], Date.now())).toBeUndefined();
    expect((await store.userForSession(hashes.at(-1)!, Date.now()))?.id).toBe(user.id);
    const replacement = { tokenHash: token(), expiresAt: Date.now() + 60_000 };
    await store.changePassword(user.id, 'fixture-hash', 'new-fixture-hash', replacement);
    expect(await store.userForSession(hashes.at(-1)!, Date.now())).toBeUndefined();
    expect((await store.userForSession(replacement.tokenHash, Date.now()))?.id).toBe(user.id);
    await expect(
      store.createSession(
        user.id,
        { tokenHash: token(), expiresAt: Date.now() + 60_000 },
        undefined,
        'fixture-hash',
      ),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await expect(
      store.changePassword(user.id, 'fixture-hash', 'racing-change', {
        tokenHash: token(),
        expiresAt: Date.now() + 60_000,
      }),
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    await store.revokeSession(replacement.tokenHash);
    expect(await store.userForSession(replacement.tokenHash, Date.now())).toBeUndefined();
  }, 60_000);

  it('cleans up expired demo records without deleting real tenants', async () => {
    const demo = { ...newUser(null, 1), created_at: Date.now() - 26 * 60 * 60_000 };
    const real = newUser();
    await store.createUser(demo, createDemoWorkspace());
    await store.createUser(real, createWorkspace());
    await store.cleanup();
    await expect(store.getWorkspace(demo.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect((await store.getWorkspace(real.id)).revision).toBe(0);
  }, 30_000);

  it('rolls back an oversized workspace instead of losing the previous revision', async () => {
    const user = newUser();
    await store.createUser(user, createWorkspace());
    const detail = randomBytes(1_000_000).toString('base64');
    await expect(
      store.updateWorkspace(user.id, 0, (current) => ({
        ...current,
        revision: 1,
        audit: [{ id: 'oversize', at: new Date().toISOString(), action: 'fixture', detail }],
      })),
    ).rejects.toMatchObject({ code: 'STORAGE_LIMIT', status: 413 });
    expect((await store.getWorkspace(user.id)).revision).toBe(0);
  }, 30_000);

  it('serves the unchanged API using Firebase-compatible secure cookies and private responses', async () => {
    const application = createApp({
      store,
      production: true,
      origin: 'https://kavu-drying.web.app',
      cookieName: '__session',
      rateLimit: false,
      distPath: '/not-present',
    });
    server = await new Promise<Server>((resolve) => {
      const listening = application.app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const response = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Kavu-Request': '1',
        Origin: 'https://kavu-drying.web.app',
      },
      body: JSON.stringify({
        name: 'Cloud integration fixture',
        email: `${randomUUID()}@example.test`,
        password: 'cloud-fixture-passphrase-2026',
      }),
    });
    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const header = response.headers.get('set-cookie')!;
    expect(header).toMatch(/^__session=/);
    expect(header).toContain('HttpOnly');
    expect(header).toContain('Secure');
    expect(header).toContain('SameSite=Strict');
    const cookie = header.split(';')[0];
    const workspace = await fetch(`${base}/api/workspace`, { headers: { Cookie: cookie } });
    expect(workspace.status).toBe(200);
    expect(workspace.headers.get('cache-control')).toBe('private, no-store');
    expect((await workspace.json()).batches).toHaveLength(0);
    const health = await fetch(`${base}/api/health`);
    expect((await health.json()).storage).toBe('firestore');
  }, 30_000);
});

describe('Firestore serialization bounds', () => {
  it('round-trips realistic workspaces within the Firestore envelope', () => {
    expect(encodeWorkspace(createDemoWorkspace()).length).toBeLessThan(900_000);
  });
  it('rejects raw data beyond the decompression budget', () => {
    const w = createWorkspace();
    w.audit.push({ id: 'large', at: '', action: '', detail: 'x'.repeat(32 * 1024 * 1024) });
    expect(() => encodeWorkspace(w)).toThrow(/cloud storage limit/);
  });
});
