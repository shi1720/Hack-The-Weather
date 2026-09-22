import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { z } from 'zod';
import type { Dataset, Forecast, User, Workspace } from '../src/shared/types';
import { applyCommand, createDemoWorkspace, createWorkspace, WorkspaceError, commandSchema } from '../src/shared/workspace';
import { openDatabase, type KavuDatabase } from './database';
import { createForecastService } from './forecast';

const derive = promisify(scrypt);
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${key.toString('hex')}`;
}
async function checkPassword(password: string, stored: string): Promise<boolean> {
  const [, salt, encoded] = stored.split(':');
  const key = await derive(password, salt, 64) as Buffer;
  const expected = Buffer.from(encoded, 'hex');
  return key.length === expected.length && timingSafeEqual(key, expected);
}
const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(12, 'Use at least 12 characters for your password.').max(128);
const credentials = z.object({ email, password: z.string().min(1).max(128) }).strict();
const registration = z.object({ name: z.string().trim().min(2).max(80), email, password }).strict();
interface UserRow { id: string; name: string; email: string | null; password_hash: string | null; demo: number; }
interface WorkspaceRow { revision: number; data: string; }
const publicUser = (row: UserRow): User => ({ id: row.id, name: row.name, email: row.email ?? '', demo: Boolean(row.demo) });
interface AppOptions { db?: KavuDatabase; databasePath?: string; dataset?: Dataset; dataPath?: string; production?: boolean; origin?: string; forecast?: (lat: number, lon: number) => Promise<Forecast>; rateLimit?: boolean; distPath?: string; trustProxy?: number; }
export function createApp(options: AppOptions = {}) {
  const app = express();
  const db = options.db ?? openDatabase(options.databasePath ?? process.env.DATABASE_PATH ?? './var/kavu.db');
  const production = options.production ?? process.env.NODE_ENV === 'production';
  const COOKIE = production ? '__Host-kavu_session' : 'kavu_session';
  const origin = options.origin ?? process.env.APP_ORIGIN ?? 'http://localhost:5173';
  if (production && !origin.startsWith('https://')) throw new Error('APP_ORIGIN must be an HTTPS origin in production.');
  const allowedOrigin = new URL(origin).origin;
  const allowedOrigins = new Set([allowedOrigin]);
  if (!production) {
    const alternate = new URL(allowedOrigin);
    if (alternate.hostname === 'localhost' || alternate.hostname === '127.0.0.1') {
      alternate.hostname = alternate.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
      allowedOrigins.add(alternate.origin);
    }
  }
  const dataPath = options.dataPath ?? resolve('public/data/conduit.json');
  let cachedDataset = options.dataset;
  let datasetBytes: Buffer | undefined;
  let datasetGzip: Buffer | undefined;
  const dataset = (): Dataset => cachedDataset ??= JSON.parse(readFileSync(dataPath, 'utf8')) as Dataset;
  const getForecast = options.forecast ?? createForecastService(process.env.WEATHER_USER_AGENT ?? 'Kavu/1.0 https://github.com/shi1720/Hack-The-Weather');
  const cookieOptions = { httpOnly: true, sameSite: 'strict' as const, secure: production, path: '/' };
  if (options.trustProxy !== undefined) app.set('trust proxy', options.trustProxy);
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], fontSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"] } }, crossOriginEmbedderPolicy: false, strictTransportSecurity: production ? undefined : false }));
  app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.get('x-kavu-request') !== '1' || (req.get('origin') && !allowedOrigins.has(req.get('origin')!))) {
        res.status(403).json({ error: 'Request origin could not be verified. Reload the application and try again.', code: 'ORIGIN_REJECTED' }); return;
      }
      if (!req.is('application/json')) { res.status(415).json({ error: 'Use application/json for this request.', code: 'INVALID_CONTENT_TYPE' }); return; }
    }
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  const authLimiter = options.rateLimit === false ? (_req: Request, _res: Response, next: NextFunction) => next() : rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many sign-in attempts. Please try again in 15 minutes.', code: 'RATE_LIMITED' } });
  const apiLimiter = options.rateLimit === false ? (_req: Request, _res: Response, next: NextFunction) => next() : rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many requests. Wait a minute and try again.', code: 'RATE_LIMITED' } });
  app.use('/api', apiLimiter);
  app.use('/api/auth/login', authLimiter); app.use('/api/auth/register', authLimiter); app.use('/api/auth/demo', authLimiter);
  const userFor = (req: Request) => {
    const token: unknown = req.cookies?.[COOKIE];
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return undefined;
    return db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').get(sha(token), Date.now()) as UserRow | undefined;
  };
  const requireUser = (req: Request): UserRow => {
    const user = userFor(req);
    if (!user) throw new WorkspaceError('Please sign in to continue.', 'UNAUTHENTICATED', 401);
    return user;
  };
  const workspaceFor = (id: string): Workspace => {
    const row = db.prepare('SELECT revision,data FROM workspaces WHERE user_id=?').get(id) as WorkspaceRow | undefined;
    if (!row) throw new WorkspaceError('Workspace was not found.', 'NOT_FOUND', 404);
    return { ...JSON.parse(row.data), revision: row.revision } as Workspace;
  };
  const session = (req: Request, res: Response, user: UserRow) => {
    const token = randomBytes(32).toString('hex');
    const tokenHash = sha(token);
    const duration = (user.demo ? 1 : 7) * 24 * 60 * 60_000;
    const now = Date.now();
    db.transaction(() => {
      // Rotate presented sessions, prune expiry, and bound simultaneous devices per account.
      const previous: unknown = req.cookies?.[COOKIE];
      if (typeof previous === 'string') db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(previous));
      db.prepare('DELETE FROM sessions WHERE user_id=? AND expires_at<=?').run(user.id, now);
      db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(tokenHash, user.id, now + duration);
      db.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash<>? AND token_hash NOT IN (SELECT token_hash FROM sessions WHERE user_id=? AND token_hash<>? ORDER BY expires_at DESC LIMIT 19)').run(user.id, tokenHash, user.id, tokenHash);
    })();
    res.cookie(COOKIE, token, { ...cookieOptions, maxAge: duration });
  };
  const insertUser = db.transaction((user: UserRow, workspace: Workspace) => {
    db.prepare('INSERT INTO users(id,name,email,password_hash,demo,created_at) VALUES(?,?,?,?,?,?)').run(user.id, user.name, user.email, user.password_hash, user.demo, Date.now());
    db.prepare('INSERT INTO workspaces(user_id,revision,data) VALUES(?,?,?)').run(user.id, 0, JSON.stringify(workspace));
  });
  const save = db.transaction((user: UserRow, revision: number, command: unknown, weather: Dataset | undefined, forecast: Forecast | undefined) => {
    const current = workspaceFor(user.id);
    if (current.revision !== revision) throw new WorkspaceError('Your workspace changed in another tab. Reload the latest data and try again.', 'REVISION_CONFLICT', 409);
    const next = applyCommand(current, command, { dataset: weather, forecast, demo: Boolean(user.demo), id: randomUUID });
    if (next !== current) db.prepare('UPDATE workspaces SET revision=?,data=? WHERE user_id=? AND revision=?').run(next.revision, JSON.stringify(next), user.id, revision);
    return next;
  });
  app.get('/api/health', (_req, res) => { db.prepare('SELECT 1').get(); res.json({ status: 'ok', service: 'kavu', version: '1.0.0' }); });
  app.get('/api/auth/me', (req, res) => { const user = userFor(req); res.json({ user: user ? publicUser(user) : null }); });
  app.post('/api/auth/register', async (req, res) => {
    const input = registration.parse(req.body);
    const user: UserRow = { id: randomUUID(), name: input.name, email: input.email, password_hash: await hashPassword(input.password), demo: 0 };
    try { insertUser(user, createWorkspace()); }
    catch (error) { if (typeof error === 'object' && error && 'code' in error && error.code === 'SQLITE_CONSTRAINT_UNIQUE') throw new WorkspaceError('An account with this email already exists. Sign in instead.', 'ACCOUNT_EXISTS', 409); throw error; }
    session(req, res, user); res.status(201).json({ user: publicUser(user) });
  });
  // A dummy derivation keeps password work equivalent for unknown emails.
  const dummyPassword = `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`;
  app.post('/api/auth/login', async (req, res) => {
    const input = credentials.parse(req.body);
    const user = db.prepare('SELECT * FROM users WHERE email=? AND demo=0').get(input.email) as UserRow | undefined;
    const valid = await checkPassword(input.password, user?.password_hash ?? dummyPassword);
    if (!user || !valid) throw new WorkspaceError('The email or password is incorrect.', 'INVALID_CREDENTIALS', 401);
    session(req, res, user); res.json({ user: publicUser(user) });
  });
  app.post('/api/auth/demo', (req, res) => {
    const user: UserRow = { id: randomUUID(), name: 'Demo operator', email: null, password_hash: null, demo: 1 };
    insertUser(user, createDemoWorkspace()); session(req, res, user); res.status(201).json({ user: publicUser(user) });
  });
  app.post('/api/auth/logout', (req, res) => {
    const token: unknown = req.cookies?.[COOKIE];
    if (typeof token === 'string') db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(token));
    res.clearCookie(COOKIE, cookieOptions); res.status(204).end();
  });
  app.post('/api/auth/password', authLimiter, async (req, res) => {
    const user = requireUser(req);
    if (user.demo || !user.password_hash) throw new WorkspaceError('Demo accounts do not have passwords.', 'FORBIDDEN', 403);
    const input = z.object({ currentPassword: z.string().min(1).max(128), newPassword: password }).strict().parse(req.body);
    if (!await checkPassword(input.currentPassword, user.password_hash)) throw new WorkspaceError('Your current password is incorrect.', 'INVALID_CREDENTIALS', 401);
    const hash = await hashPassword(input.newPassword);
    db.transaction(() => { const changed = db.prepare('UPDATE users SET password_hash=? WHERE id=? AND password_hash=?').run(hash, user.id, user.password_hash); if (!changed.changes) throw new WorkspaceError('Your password changed during this request. Sign in again before changing it.', 'REVISION_CONFLICT', 409); db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id); })();
    session(req, res, user); res.status(204).end();
  });
  app.get('/api/workspace', (req, res) => res.json(workspaceFor(requireUser(req).id)));
  app.post('/api/commands', async (req, res) => {
    const user = requireUser(req);
    const input = z.object({ command: commandSchema, revision: z.number().int().min(0) }).strict().parse(req.body);
    const current = workspaceFor(user.id);
    if (current.revision !== input.revision) throw new WorkspaceError('Your workspace changed in another tab. Reload the latest data and try again.', 'REVISION_CONFLICT', 409);
    const taskId = input.command.type === 'task.complete' ? input.command.taskId : undefined;
    const completing = taskId ? current.tasks.find(t => t.id === taskId) : undefined;
    const needsForecast = (input.command.type === 'plan.commit' && input.command.mode === 'forecast') || Boolean(completing && completing.status === 'pending' && ['spread', 'turn'].includes(completing.action) && completing.id.startsWith('plan:forecast:'));
    const weather = input.command.type === 'plan.commit' || needsForecast ? dataset() : undefined;
    let forecast: Forecast | undefined;
    if (needsForecast) forecast = await getForecast(current.settings.latitude, current.settings.longitude);
    res.json(save(user, input.revision, input.command, weather, forecast));
  });
  app.get('/api/data', (req, res) => {
    datasetBytes ??= Buffer.from(JSON.stringify(dataset()));
    res.type('application/json').setHeader('Cache-Control', 'public, max-age=3600');
    res.vary('Accept-Encoding');
    if (req.acceptsEncodings('gzip')) { datasetGzip ??= gzipSync(datasetBytes); res.setHeader('Content-Encoding', 'gzip'); res.send(datasetGzip); }
    else res.send(datasetBytes);
  });
  app.get('/api/forecast', async (req, res) => {
    requireUser(req);
    const coordinate = (min: number, max: number) => z.string().trim().regex(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i).transform(Number).pipe(z.number().finite().min(min).max(max));
    const query = z.object({ latitude: coordinate(-90, 90), longitude: coordinate(-180, 180) }).strict().parse(req.query);
    res.json(await getForecast(query.latitude, query.longitude));
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route was not found.', code: 'NOT_FOUND' }));
  const distPath = options.distPath ?? resolve('dist');
  if (existsSync(resolve(distPath, 'index.html'))) {
    app.use(express.static(distPath, { index: false, maxAge: production ? '1h' : 0 }));
    app.get('/{*path}', (req, res, next) => {
      if (!req.accepts('html') || /\.[a-z0-9]{1,10}$/i.test(req.path)) { next(); return; }
      res.setHeader('Cache-Control', 'no-cache'); res.sendFile(resolve(distPath, 'index.html'));
    });
  }
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError) { res.status(400).json({ error: error.issues.map(i => `${i.path.join('.') || 'request'}: ${i.message}`).join('; '), code: 'INVALID_INPUT' }); return; }
    if (error instanceof WorkspaceError) { res.status(error.status).json({ error: error.message, code: error.code }); return; }
    if (error && typeof error === 'object' && 'type' in error && error.type === 'entity.too.large') { res.status(413).json({ error: 'Request is too large.', code: 'PAYLOAD_TOO_LARGE' }); return; }
    if (error instanceof SyntaxError && 'body' in error) { res.status(400).json({ error: 'Request contains invalid JSON.', code: 'INVALID_JSON' }); return; }
    console.error('[kavu] request failed', error instanceof Error ? error.name : 'UnknownError');
    res.status(500).json({ error: 'The server could not complete this request. Please try again.', code: 'INTERNAL_ERROR' });
  });
  const cleanup = () => {
    const now = Date.now();
    db.transaction(() => { db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now); db.prepare('DELETE FROM users WHERE demo=1 AND created_at<? AND id NOT IN (SELECT user_id FROM sessions)').run(now - 24 * 60 * 60_000); })();
  };
  return { app, db, cleanup };
}
