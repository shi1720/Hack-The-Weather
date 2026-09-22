import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  openSync,
  closeSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Firestore } from '@google-cloud/firestore';
import { GoogleAuth, OAuth2Client } from 'google-auth-library';

const [
  phase,
  baseArgument = 'https://kavu-drying.web.app',
  stateArgument = 'var/hosted-smoke.json',
  expectedVersion,
] = process.argv.slice(2);
const statePath = resolve(stateArgument);
const base = new URL(baseArgument);
assert.equal(base.protocol, 'https:', 'Hosted smoke requires HTTPS.');
assert.equal(base.pathname, '/', 'Provide an origin without a path.');
assert.ok(
  !base.search && !base.hash && !base.username && !base.password,
  'Provide a plain HTTPS origin.',
);
const origin = base.origin;
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sha = (value) => createHash('sha256').update(value).digest('hex');
function save(state) {
  const temporary = `${statePath}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(state, null, 2), { mode: 0o600, flag: 'wx' });
  renameSync(temporary, statePath);
}
function readState() {
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  assert.equal(state.schema, 1);
  assert.equal(state.origin, origin);
  assert.match(state.runId, /^[a-f0-9]{32}$/);
  assert.equal(state.firestoreProject, 'kavu-drying');
  assert.equal(state.prefix, 'kavu');
  return state;
}
async function request(path, { cookie, body, foreignOrigin, omitRequestHeader = false } = {}) {
  const headers = { Accept: 'application/json', ...(cookie ? { Cookie: cookie } : {}) };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    headers.Origin = foreignOrigin ?? origin;
    if (!omitRequestHeader) headers['X-Kavu-Request'] = '1';
  }
  const response = await fetch(`${origin}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(25_000),
  });
  const payload = response.status === 204 ? undefined : await response.json();
  assert.match(response.headers.get('cache-control') ?? '', /private/);
  assert.match(response.headers.get('cache-control') ?? '', /no-store/);
  return { response, payload };
}
function sessionCookie(response) {
  const value = response.headers.get('set-cookie') ?? '';
  if (
    !/^__session=/.test(value) ||
    !/HttpOnly/i.test(value) ||
    !/Secure/i.test(value) ||
    !/SameSite=Strict/i.test(value)
  )
    throw new Error('Hosted authentication returned invalid session cookie attributes.');
  return value.split(';')[0];
}

async function workspace(fixture) {
  const result = await request('/api/workspace', { cookie: fixture.cookie });
  assert.equal(result.response.status, 200, 'Fixture session must remain valid.');
  return result.payload;
}
async function health() {
  const { response, payload } = await request('/api/health');
  assert.equal(response.status, 200);
  assert.equal(payload.status, 'ok');
  assert.equal(payload.storage, 'firestore');
  return payload;
}
async function setup() {
  mkdirSync(dirname(statePath), { recursive: true, mode: 0o700 });
  closeSync(openSync(statePath, 'wx', 0o600));
  const state = {
    schema: 1,
    runId: randomUUID().replaceAll('-', ''),
    origin,
    firestoreProject: 'kavu-drying',
    prefix: 'kavu',
    createdAt: new Date().toISOString(),
    initialVersion: null,
    fixtures: [],
  };
  save(state);
  state.initialVersion = (await health()).version;
  save(state);
  for (const label of ['A', 'B']) {
    const fixture = {
      email: `kavu-smoke-${state.runId}-${label.toLowerCase()}@example.test`,
      password: `Kavu-fixture-${randomBytes(24).toString('hex')}`,
      label,
      userId: null,
      cookie: null,
    };
    const created = await request('/api/auth/register', {
      body: {
        name: `Hosted smoke fixture ${label}`,
        email: fixture.email,
        password: fixture.password,
      },
    });
    assert.equal(
      created.response.status,
      201,
      `Fixture registration failed with status ${created.response.status}.`,
    );
    fixture.userId = created.payload.user.id;
    fixture.cookie = sessionCookie(created.response);
    state.fixtures.push(fixture);
    save(state);
  }
  const [a, b] = state.fixtures;
  for (const fixture of state.fixtures) {
    const me = await request('/api/auth/me', { cookie: fixture.cookie });
    assert.equal(me.payload.user.id, fixture.userId);
    assert.equal((await workspace(fixture)).batches.length, 0);
  }
  const deadline = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const intake = {
    type: 'batch.create',
    name: `Smoke intake ${state.runId}`,
    farmer: 'Synthetic verification fixture',
    weightKg: 1234,
    moisturePct: 18,
    deadline,
  };
  const created = await request('/api/commands', {
    cookie: a.cookie,
    body: { revision: 0, command: intake },
  });
  assert.equal(created.response.status, 200);
  assert.equal(created.payload.revision, 1);
  const foreignBatch = await request('/api/commands', {
    cookie: b.cookie,
    body: {
      revision: 0,
      command: {
        type: 'batch.measure',
        batchId: created.payload.batches[0].id,
        moisturePct: 12.8,
        note: 'Must be rejected',
      },
    },
  });
  assert.equal(foreignBatch.response.status, 404);
  const invalidOrigin = await request('/api/commands', {
    cookie: a.cookie,
    foreignOrigin: 'https://foreign.example.test',
    body: { revision: 1, command: intake },
  });
  assert.equal(invalidOrigin.response.status, 403);
  const missingHeader = await request('/api/commands', {
    cookie: a.cookie,
    omitRequestHeader: true,
    body: { revision: 1, command: intake },
  });
  assert.equal(missingHeader.response.status, 403);
  const concurrent = await Promise.all(
    [1, 2].map((index) =>
      request('/api/commands', {
        cookie: a.cookie,
        body: {
          revision: 1,
          command: { ...intake, name: `Concurrent fixture ${index}`, weightKg: 500 },
        },
      }),
    ),
  );
  assert.deepEqual(concurrent.map((item) => item.response.status).sort(), [200, 409]);
  assert.equal((await workspace(b)).batches.length, 0);
  const loggedOut = await request('/api/auth/logout', { cookie: b.cookie, body: {} });
  assert.equal(loggedOut.response.status, 204);
  assert.equal((await request('/api/workspace', { cookie: b.cookie })).response.status, 401);
  const login = await request('/api/auth/login', {
    body: { email: b.email, password: b.password },
  });
  assert.equal(login.response.status, 200);
  b.cookie = sessionCookie(login.response);
  for (const fixture of state.fixtures) {
    const current = await workspace(fixture);
    fixture.workspaceDigest = digest(current);
    fixture.revision = current.revision;
  }
  state.setupComplete = true;
  save(state);
  console.log(
    JSON.stringify(
      {
        ok: true,
        phase: 'setup',
        version: state.initialVersion,
        storage: 'firestore',
        fixtureCount: state.fixtures.length,
        revisions: state.fixtures.map((f) => f.revision),
        stateFile: statePath,
      },
      null,
      2,
    ),
  );
}
async function verify() {
  const state = readState();
  assert.equal(state.setupComplete, true, 'Fixture setup must have completed.');
  const currentHealth = await health();
  if (expectedVersion) assert.equal(currentHealth.version, expectedVersion);
  for (const fixture of state.fixtures) {
    const me = await request('/api/auth/me', { cookie: fixture.cookie });
    assert.equal(
      me.payload.user.id,
      fixture.userId,
      'The original session must survive deployment.',
    );
    const current = await workspace(fixture);
    assert.equal(current.revision, fixture.revision);
    assert.equal(
      digest(current),
      fixture.workspaceDigest,
      'Workspace contents must survive deployment unchanged.',
    );
  }
  state.lastVerifiedVersion = currentHealth.version;
  state.lastVerifiedAt = new Date().toISOString();
  save(state);
  console.log(
    JSON.stringify(
      {
        ok: true,
        phase: 'verify',
        initialVersion: state.initialVersion,
        currentVersion: currentHealth.version,
        versionChanged: state.initialVersion !== currentHealth.version,
        sessionsPreserved: true,
        workspacesPreserved: true,
        fixtureCount: state.fixtures.length,
      },
      null,
      2,
    ),
  );
}
async function cleanup() {
  const state = readState();
  let accessToken;
  try {
    accessToken = execFileSync('gcloud', ['auth', 'print-access-token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    throw new Error(
      'Cleanup needs the authenticated official gcloud CLI; no credential file will be created.',
    );
  }
  const oauth = new OAuth2Client();
  oauth.setCredentials({ access_token: accessToken, expiry_date: Date.now() + 3500000 });
  const client = new Firestore({
    projectId: state.firestoreProject,
    auth: new GoogleAuth({ authClient: oauth }),
  });
  try {
    for (const fixture of state.fixtures) {
      assert.ok(
        fixture.email.startsWith(`kavu-smoke-${state.runId}-`) &&
          fixture.email.endsWith('@example.test'),
      );
      assert.match(fixture.userId, /^[a-f0-9-]{36}$/);
      const userRef = client.collection('kavu_users').doc(fixture.userId);
      await client.runTransaction(async (transaction) => {
        const user = await transaction.get(userRef);
        if (!user.exists) return;
        assert.equal(
          user.get('email'),
          fixture.email,
          'Refuse to delete an account not matching this fixture.',
        );
        assert.match(user.get('name'), /^Hosted smoke fixture [AB]$/);
        const sessions = await transaction.get(
          client.collection('kavu_sessions').where('userId', '==', fixture.userId).limit(100),
        );
        const emailRef = client.collection('kavu_emails').doc(sha(fixture.email));
        const emailClaim = await transaction.get(emailRef);
        assert.equal(emailClaim.get('userId'), fixture.userId);
        for (const session of sessions.docs) transaction.delete(session.ref);
        transaction.delete(client.collection('kavu_workspaces').doc(fixture.userId));
        transaction.delete(emailRef);
        transaction.delete(userRef);
      });
    }
  } finally {
    await client.terminate();
  }
  rmSync(statePath);
  console.log(
    JSON.stringify(
      {
        ok: true,
        phase: 'cleanup',
        removedFixtures: state.fixtures.length,
        privateStateRemoved: true,
      },
      null,
      2,
    ),
  );
}
try {
  if (phase === 'setup') await setup();
  else if (phase === 'verify') await verify();
  else if (phase === 'cleanup') await cleanup();
  else
    throw new Error(
      'Usage: node scripts/smoke-hosted.mjs setup|verify|cleanup HTTPS_ORIGIN [PRIVATE_STATE_FILE] [EXPECTED_VERSION]',
    );
} catch (error) {
  // Never print the fixture state, passwords, cookies or cloud access token.
  console.error(
    `Hosted smoke failed: ${error instanceof Error ? error.message : 'Unknown failure'}`,
  );
  process.exitCode = 1;
}
