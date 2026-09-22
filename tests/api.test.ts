import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Server } from 'node:http';
import { type AddressInfo } from 'node:net';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../server/app';
import { openDatabase, type KavuDatabase } from '../server/database';
import { createForecastService, parseForecast } from '../server/forecast';
import type { Dataset } from '../src/shared/types';

const dataset: Dataset = { station: { name: 'Test station', latitude: -1.0916, longitude: 37.014, elevationM: 1500 }, observations: [], hours: [], sources: [], importedAt: '2026-09-12T00:00:00Z', notes: [], summary: { rawRows: 0, uniqueRows: 0, duplicatesRemoved: 0, invalidRows: 0, firstAt: '', lastAt: '', days: [], gaps: [] } };
let server: Server;
let db: KavuDatabase;
let base: string;
const password = 'correct-horse-battery-kavu';
const headers = { 'Content-Type': 'application/json', 'X-Kavu-Request': '1', Origin: 'http://localhost:5173' };
const cookieFrom = (r: Response) => r.headers.get('set-cookie')!.split(';')[0];
async function post(path: string, body: unknown, cookie = '', extra = {}) {
  return fetch(`${base}${path}`, { method: 'POST', headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}), ...extra }, body: JSON.stringify(body) });
}
async function register(email = 'operator@example.test') {
  const r = await post('/api/auth/register', { name: 'Test operator', email, password });
  expect(r.status).toBe(201);
  return { cookie: cookieFrom(r), user: (await r.json()).user };
}
async function get(path: string, cookie = '') { return fetch(`${base}${path}`, { headers: cookie ? { Cookie: cookie } : {} }); }
beforeEach(async () => {
  db = openDatabase(':memory:');
  const instance = createApp({ db, dataset, rateLimit: false, production: false, origin: 'http://localhost:5173', distPath: '/does-not-exist', forecast: async (latitude, longitude) => ({ fetchedAt: new Date().toISOString(), issuedAt: new Date().toISOString(), hours: [], source: 'test', latitude, longitude }) });
  server = await new Promise<Server>(resolve => { const listening = instance.app.listen(0, '127.0.0.1', () => resolve(listening)); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); db.close(); });

describe('authentication and tenant security', () => {
  it('hashes passwords and session tokens, creates empty workspace, and invalidates logout', async () => {
    const r = await post('/api/auth/register', { name: 'Test operator', email: 'OPERATOR@example.test', password });
    expect(r.status).toBe(201);
    const cookie = cookieFrom(r);
    expect(r.headers.get('set-cookie')).toContain('HttpOnly');
    expect(r.headers.get('set-cookie')).toContain('SameSite=Strict');
    const user = (await r.json()).user;
    expect(user.email).toBe('operator@example.test');
    expect(user.password_hash).toBeUndefined();
    const row = db.prepare('SELECT * FROM users').get() as { password_hash: string };
    expect(row.password_hash).toMatch(/^scrypt:/); expect(row.password_hash).not.toContain(password);
    const session = db.prepare('SELECT token_hash FROM sessions').get() as { token_hash: string };
    expect(session.token_hash).not.toBe(cookie.split('=')[1]);
    expect((await (await get('/api/workspace', cookie)).json()).batches).toHaveLength(0);
    expect((await post('/api/auth/logout', {}, cookie)).status).toBe(204);
    expect((await get('/api/workspace', cookie)).status).toBe(401);
  });
  it('rejects weak credentials, duplicate accounts, wrong passwords and expired sessions', async () => {
    expect((await post('/api/auth/register', { name: 'Test', email: 'test@example.test', password: 'short' })).status).toBe(400);
    const { cookie } = await register();
    expect((await post('/api/auth/register', { name: 'Other', email: 'operator@example.test', password })).status).toBe(409);
    expect((await post('/api/auth/login', { email: 'operator@example.test', password: 'not-the-password' })).status).toBe(401);
    expect((await post('/api/auth/login', { email: 'unknown@example.test', password })).status).toBe(401);
    db.prepare('UPDATE sessions SET expires_at=0').run();
    expect((await get('/api/workspace', cookie)).status).toBe(401);
    expect((await post('/api/auth/login', { email: 'operator@example.test', password })).status).toBe(200);
  });
  it('isolates demo workspaces without shared users or invented emails', async () => {
    const a = await post('/api/auth/demo', {}); const b = await post('/api/auth/demo', {});
    const ua = (await a.json()).user; const ub = (await b.json()).user;
    expect(ua.id).not.toBe(ub.id); expect(ua.email).toBe(''); expect(ub.email).toBe('');
    const ca = cookieFrom(a), cb = cookieFrom(b);
    const update = await post('/api/commands', { revision: 0, command: { type: 'batch.measure', batchId: 'demo-batch-1', moisturePct: 12.5, note: 'Demo reading' } }, ca);
    expect(update.status).toBe(200);
    expect((await update.json()).batches[0].moisturePct).toBe(12.5);
    expect((await (await get('/api/workspace', cb)).json()).batches[0].moisturePct).toBe(18.2);
  });
  it('blocks origin spoofing, missing custom CSRF header and unsupported content types', async () => {
    expect((await post('/api/auth/demo', {}, '', { Origin: 'https://attacker.test' })).status).toBe(403);
    expect((await post('/api/auth/demo', {}, '', { 'X-Kavu-Request': '' })).status).toBe(403);
    expect((await post('/api/auth/demo', {}, '', { 'Content-Type': 'text/plain' })).status).toBe(415);
    expect((await post('/api/auth/demo', {}, '', { Origin: 'null' })).status).toBe(403);
  });
  it('requires HTTPS production origins and sets host-only secure cookies', async () => {
    expect(() => createApp({ db, production: true, origin: 'http://example.test' })).toThrow(/HTTPS/);
    const secure = createApp({ db, production: true, origin: 'https://kavu.example.test', dataset, rateLimit: false, distPath: '/does-not-exist' });
    const listener = await new Promise<Server>(resolve => { const instance = secure.app.listen(0, '127.0.0.1', () => resolve(instance)); });
    try {
      const origin = `http://127.0.0.1:${(listener.address() as AddressInfo).port}`;
      const response = await fetch(`${origin}/api/auth/demo`, { method: 'POST', headers: { ...headers, Origin: 'https://kavu.example.test' }, body: '{}' });
      expect(response.status).toBe(201);
      const cookie = response.headers.get('set-cookie')!;
      expect(cookie).toMatch(/^__Host-kavu_session=/);
      expect(cookie).toContain('Secure'); expect(cookie).toContain('HttpOnly'); expect(cookie).toContain('Path=/'); expect(cookie).not.toContain('Domain=');
    } finally { await new Promise<void>(resolve => listener.close(() => resolve())); }
  });
  it('bounds concurrent account sessions and keeps the newest one valid', async () => {
    const { cookie } = await register();
    let latest = cookie;
    for (let i = 0; i < 22; i++) latest = cookieFrom(await post('/api/auth/login', { email: 'operator@example.test', password }));
    expect((db.prepare('SELECT COUNT(*) AS n FROM sessions').get() as { n: number }).n).toBe(20);
    expect((await get('/api/workspace', latest)).status).toBe(200);
    expect((await get('/api/workspace', cookie)).status).toBe(401);
  });
  it('rate-limits repeated authentication requests', async () => {
    const limited = createApp({ db, dataset, production: false, origin: 'http://localhost:5173', distPath: '/does-not-exist' });
    const listener = await new Promise<Server>(resolve => { const instance = limited.app.listen(0, '127.0.0.1', () => resolve(instance)); });
    try {
      const origin = `http://127.0.0.1:${(listener.address() as AddressInfo).port}`;
      let last: Response | undefined;
      for (let i = 0; i < 31; i++) {
        last = await fetch(`${origin}/api/auth/demo`, { method: 'POST', headers, body: '{}' });
        const body = await last.json();
        if (i === 30) expect(body.code).toBe('RATE_LIMITED');
      }
      expect(last?.status).toBe(429);
    } finally { await new Promise<void>(resolve => listener.close(() => resolve())); }
  });
  it('changes passwords and revokes every earlier session', async () => {
    const { cookie } = await register();
    const alternate = await post('/api/auth/login', { email: 'operator@example.test', password });
    const oldAlternate = cookieFrom(alternate);
    const changed = await post('/api/auth/password', { currentPassword: password, newPassword: 'another-strong-passphrase' }, cookie);
    expect(changed.status).toBe(204);
    expect((await get('/api/workspace', cookie)).status).toBe(401);
    expect((await get('/api/workspace', oldAlternate)).status).toBe(401);
    expect((await get('/api/workspace', cookieFrom(changed))).status).toBe(200);
    expect((await post('/api/auth/login', { email: 'operator@example.test', password })).status).toBe(401);
  });
});
describe('atomic workspace API', () => {
  it('enforces optimistic concurrency and ownership and rejects reset for real accounts', async () => {
    const a = await register('a@example.test'); const b = await register('b@example.test');
    const command = { type: 'batch.create', name: 'Intake', farmer: 'Farmer', weightKg: 1000, moisturePct: 18, deadline: '2026-09-25' };
    const first = await post('/api/commands', { revision: 0, command }, a.cookie);
    expect(first.status).toBe(200); const w = await first.json();
    expect(w.revision).toBe(1);
    expect((await post('/api/commands', { revision: 0, command }, a.cookie)).status).toBe(409);
    expect((await post('/api/commands', { revision: 0, command: { type: 'batch.measure', batchId: w.batches[0].id, moisturePct: 12, note: '' } }, b.cookie)).status).toBe(404);
    expect((await post('/api/commands', { revision: 0, command: { type: 'demo.reset' } }, b.cookie)).status).toBe(403);
    expect((await (await get('/api/workspace', b.cookie)).json()).revision).toBe(0);
    expect((await (await get('/api/workspace', a.cookie)).json()).batches).toHaveLength(1);
  });
  it('allows exactly one winner for concurrent writes with the same revision', async () => {
    const { cookie } = await register();
    const command = { type: 'batch.create', name: 'Concurrent intake', farmer: 'Farmer', weightKg: 800, moisturePct: 17, deadline: '2026-09-25' };
    const responses = await Promise.all([post('/api/commands', { revision: 0, command }, cookie), post('/api/commands', { revision: 0, command }, cookie)]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    expect((await (await get('/api/workspace', cookie)).json()).batches).toHaveLength(1);
  });
  it('returns safe errors for malformed requests and denies anonymous writes', async () => {
    expect((await post('/api/commands', { revision: 0, command: { type: 'demo.reset' } })).status).toBe(401);
    const { cookie } = await register();
    expect((await post('/api/commands', { revision: -1, command: { type: 'demo.reset' } }, cookie)).status).toBe(400);
    const invalid = await fetch(`${base}/api/auth/demo`, { method: 'POST', headers, body: '{broken' });
    expect(invalid.status).toBe(400); expect((await invalid.json()).code).toBe('INVALID_JSON');
    expect((await post('/api/auth/demo', { text: 'x'.repeat(40_000) })).status).toBe(413);
    expect((await get('/api/missing')).status).toBe(404);
  });
  it('serves SPA deep links while preserving API and missing-asset 404 responses', async () => {
    const dist = mkdtempSync(join(tmpdir(), 'kavu-spa-test-'));
    writeFileSync(join(dist, 'index.html'), '<!doctype html><title>Kavu test shell</title>');
    const instance = createApp({ db, dataset, rateLimit: false, production: false, distPath: dist });
    const listener = await new Promise<Server>(resolve => { const listening = instance.app.listen(0, '127.0.0.1', () => resolve(listening)); });
    try {
      const origin = `http://127.0.0.1:${(listener.address() as AddressInfo).port}`;
      const page = await fetch(`${origin}/batches/nested`, { headers: { Accept: 'text/html' } });
      expect(page.status).toBe(200); expect(await page.text()).toContain('Kavu test shell');
      const missingAsset = await fetch(`${origin}/missing.js`); expect(missingAsset.status).toBe(404);
      const missingApi = await fetch(`${origin}/api/not-real`, { headers: { Accept: 'text/html' } });
      expect(missingApi.status).toBe(404); expect((await missingApi.json()).code).toBe('NOT_FOUND');
    } finally { await new Promise<void>(resolve => listener.close(() => resolve())); rmSync(dist, { recursive: true, force: true }); }
  });
  it('serves provenance data publicly but requires auth and valid coordinates for live forecasts', async () => {
    expect((await (await get('/api/data')).json()).station.name).toBe('Test station');
    expect((await get('/api/forecast?latitude=-1&longitude=37')).status).toBe(401);
    const { cookie } = await register();
    expect((await get('/api/forecast?latitude=200&longitude=37', cookie)).status).toBe(400);
    expect((await get('/api/forecast?latitude=&longitude=37', cookie)).status).toBe(400);
    expect((await get('/api/forecast?latitude=-1&latitude=0&longitude=37', cookie)).status).toBe(400);
    expect((await get('/api/forecast?latitude=-1&longitude=37', cookie)).status).toBe(200);
    expect((await (await get('/api/health')).json()).status).toBe('ok');
  });
});
describe('forecast parsing', () => {
  it('deduplicates requests, caches rounded coordinates and bounds in-flight provider calls', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const fetcher = vi.fn(async () => { await gate; return new Response(JSON.stringify({ properties: { timeseries: [{ time: '2026-09-22T06:00:00Z', data: { instant: { details: { air_temperature: 28, relative_humidity: 50, wind_speed: 2 } }, next_1_hours: { details: { precipitation_amount: 0 } } } }] } }), { headers: { 'Content-Type': 'application/json' } }); });
    const service = createForecastService('Kavu/test https://example.test', fetcher as unknown as typeof fetch);
    const first = service(-1.123456, 37);
    const duplicate = service(-1.123459, 37);
    const extra = Array.from({ length: 11 }, (_, i) => service(i, 37));
    await expect(service(20, 37)).rejects.toMatchObject({ code: 'FORECAST_BUSY' });
    expect(fetcher).toHaveBeenCalledTimes(12);
    release();
    const [a, b] = await Promise.all([first, duplicate, ...extra]);
    expect(a).toEqual(b);
    expect(a.latitude).toBe(-1.1235);
    await service(-1.123456, 37);
    expect(fetcher).toHaveBeenCalledTimes(12);
    expect(fetcher.mock.calls[0]).toBeDefined();
  });
  it('does not treat absent rainfall or impossible humidity as safe drying evidence', () => {
    const forecast = parseForecast({ properties: { meta: { updated_at: '2026-09-22T00:00:00Z' }, timeseries: [{ time: '2026-09-22T06:00:00Z', data: { instant: { details: { air_temperature: 28, relative_humidity: 150, wind_speed: 2 } } } }] } }, -1, 37);
    expect(forecast.hours[0].humidityPct).toBeNull();
    expect(forecast.hours[0].rainMm).toBeNull();
    expect(forecast.hours[0].verdict).not.toBe('dry');
  });
});
