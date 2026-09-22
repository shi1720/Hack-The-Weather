import type { Workspace } from '../src/shared/types';

export interface StoreUser {
  id: string;
  name: string;
  email: string | null;
  password_hash: string | null;
  demo: number;
  created_at: number;
}
export interface StoreSession {
  tokenHash: string;
  expiresAt: number;
}
export interface KavuStore {
  readonly kind: 'sqlite' | 'firestore';
  health(): Promise<void>;
  createUser(user: StoreUser, workspace: Workspace): Promise<void>;
  findUserByEmail(email: string): Promise<StoreUser | undefined>;
  userForSession(tokenHash: string, now: number): Promise<StoreUser | undefined>;
  createSession(
    userId: string,
    session: StoreSession,
    previousHash: string | undefined,
    expectedPasswordHash: string | null,
  ): Promise<void>;
  revokeSession(tokenHash: string): Promise<void>;
  changePassword(
    userId: string,
    expectedHash: string,
    newHash: string,
    replacement: StoreSession,
  ): Promise<void>;
  getWorkspace(userId: string): Promise<Workspace>;
  updateWorkspace(
    userId: string,
    revision: number,
    update: (workspace: Workspace) => Workspace,
  ): Promise<Workspace>;
  cleanup(now?: number): Promise<void>;
  close(): Promise<void>;
}
