import type { Dataset, Forecast, User, Workspace, WorkspaceCommand } from '../shared/types';
import { applyCommand, createDemoWorkspace, WorkspaceError } from '../shared/workspace';

export const isDemoOnly = import.meta.env.VITE_DEMO_ONLY === 'true';
export class APIError extends Error {
  constructor(
    message: string,
    public status = 500,
    public code = 'REQUEST_FAILED',
  ) {
    super(message);
    this.name = 'APIError';
  }
}
const STORAGE_KEY = 'kavu.local-demo.v1';
interface LocalSession {
  user: User;
  workspace: Workspace;
}
let datasetPromise: Promise<Dataset> | undefined;
function readLocal(): LocalSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as LocalSession;
    if (
      !value?.user?.demo ||
      !Array.isArray(value.workspace?.batches) ||
      !Array.isArray(value.workspace?.tasks) ||
      !Number.isInteger(value.workspace?.revision)
    )
      throw new Error('Invalid local demo');
    return value;
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Storage may be blocked by browser policy. */
    }
    return null;
  }
}
function writeLocal(value: LocalSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    throw new APIError(
      'Your browser cannot save the demonstration. Enable site storage or free some space and retry.',
      507,
      'STORAGE_UNAVAILABLE',
    );
  }
}
function requireLocal(): LocalSession {
  const session = readLocal();
  if (!session) throw new APIError('Open the demonstration to continue.', 401, 'UNAUTHENTICATED');
  return session;
}
function hostedOnly(): never {
  throw new APIError(
    'This public preview is a local demonstration. Account registration and sign-in are available on a deployed Kavu server.',
    501,
    'DEMO_ONLY',
  );
}
async function request<T>(path: string, body?: unknown, method?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: method ?? (body === undefined ? 'GET' : 'POST'),
      credentials: 'same-origin',
      headers:
        body === undefined
          ? { Accept: 'application/json' }
          : {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'X-Kavu-Request': '1',
            },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new APIError(
      'The server could not be reached. Check your connection and try again.',
      0,
      'NETWORK_ERROR',
    );
  }
  if (response.status === 204) return undefined as T;
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new APIError(
      'The server returned an unreadable response. Please retry.',
      response.status,
      'INVALID_RESPONSE',
    );
  }
  if (!response.ok) {
    const error = payload as { error?: string; code?: string };
    throw new APIError(
      error.error ?? 'The request could not be completed.',
      response.status,
      error.code ?? 'REQUEST_FAILED',
    );
  }
  return payload as T;
}
export async function getMe(): Promise<User | null> {
  if (isDemoOnly) return readLocal()?.user ?? null;
  return (await request<{ user: User | null }>('/auth/me')).user;
}
export async function login(email: string, password: string): Promise<User> {
  if (isDemoOnly) hostedOnly();
  return (await request<{ user: User }>('/auth/login', { email, password })).user;
}
export async function register(name: string, email: string, password: string): Promise<User> {
  if (isDemoOnly) hostedOnly();
  return (await request<{ user: User }>('/auth/register', { name, email, password })).user;
}
export async function enterDemo(): Promise<User> {
  if (isDemoOnly) {
    const user: User = { id: crypto.randomUUID(), name: 'Demo operator', email: '', demo: true };
    writeLocal({ user, workspace: createDemoWorkspace() });
    return user;
  }
  return (await request<{ user: User }>('/auth/demo', {})).user;
}
export async function logout(): Promise<void> {
  if (isDemoOnly) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  await request<void>('/auth/logout', {});
}
export async function getWorkspace(): Promise<Workspace> {
  if (isDemoOnly) return structuredClone(requireLocal().workspace);
  return request<Workspace>('/workspace');
}
export async function getDataset(): Promise<Dataset> {
  if (!isDemoOnly) return request<Dataset>('/data');
  if (!datasetPromise) {
    datasetPromise = (async () => {
      let response: Response;
      try {
        response = await fetch(`${import.meta.env.BASE_URL}data/conduit.json`, {
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        throw new APIError(
          'Conduit observations could not be loaded. Check your connection and retry.',
          0,
          'DATA_UNAVAILABLE',
        );
      }
      if (!response.ok)
        throw new APIError(
          'Conduit observations are unavailable.',
          response.status,
          'DATA_UNAVAILABLE',
        );
      return (await response.json()) as Dataset;
    })().catch((error) => {
      datasetPromise = undefined;
      throw error;
    });
  }
  return datasetPromise;
}
export async function getForecast(latitude: number, longitude: number): Promise<Forecast> {
  if (isDemoOnly)
    throw new APIError(
      'Live forecasts require the deployed Kavu server. This preview uses verified historical Conduit observations.',
      501,
      'DEMO_ONLY',
    );
  return request<Forecast>(
    `/forecast?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`,
  );
}
export async function command(value: WorkspaceCommand, revision: number): Promise<Workspace> {
  if (!isDemoOnly) return request<Workspace>('/commands', { command: value, revision });
  if (value.type === 'plan.commit' && value.mode === 'forecast')
    throw new APIError('Live forecasting requires a Kavu server.', 501, 'DEMO_ONLY');
  const dataset = value.type === 'plan.commit' ? await getDataset() : undefined;
  const apply = () => {
    const session = requireLocal();
    if (session.workspace.revision !== revision)
      throw new APIError(
        'Your demonstration changed in another tab. Refresh the workspace and try again.',
        409,
        'REVISION_CONFLICT',
      );
    try {
      session.workspace = applyCommand(session.workspace, value, { dataset, demo: true });
    } catch (error) {
      if (error instanceof WorkspaceError)
        throw new APIError(error.message, error.status, error.code);
      throw error;
    }
    writeLocal(session);
    return structuredClone(session.workspace);
  };
  return navigator.locks ? navigator.locks.request('kavu-local-workspace', apply) : apply();
}
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (isDemoOnly) hostedOnly();
  await request('/auth/password', { currentPassword, newPassword });
}
