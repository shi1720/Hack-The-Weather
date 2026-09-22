import Database from 'better-sqlite3';
import {
  chmodSync,
  closeSync,
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  rmSync,
  statSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

export interface BackupVerification {
  integrity: 'ok';
  restoreVerified: true;
  schemaVersion: number;
  users: number;
  workspaces: number;
  sessions: number;
}
export interface BackupResult {
  destination: string;
  bytes: number;
  completedAt: string;
  verification: BackupVerification;
}
const sidecars = ['-wal', '-shm', '-journal'];

function inspectSnapshot(path: string): Omit<BackupVerification, 'restoreVerified'> {
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    db.pragma('busy_timeout = 5000');
    const integrity = db.pragma('integrity_check') as { integrity_check: string }[];
    if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok')
      throw new Error(
        'SQLite integrity verification failed. The backup must not be used for recovery.',
      );
    if ((db.pragma('foreign_key_check') as unknown[]).length)
      throw new Error(
        'SQLite foreign-key verification failed. The backup must not be used for recovery.',
      );
    const schemaVersion = Number(db.pragma('user_version', { simple: true }));
    if (schemaVersion !== 1)
      throw new Error(
        'Unsupported Kavu schema version. Use a backup tool matching this database version.',
      );
    const count = (table: 'users' | 'workspaces' | 'sessions') =>
      (db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count;
    return {
      integrity: 'ok',
      schemaVersion,
      users: count('users'),
      workspaces: count('workspaces'),
      sessions: count('sessions'),
    };
  } finally {
    db.close();
  }
}

/** Check a completed snapshot, then prove its standalone restore copy opens independently. Never replaces the live database. */
export function verifyBackup(snapshotPath: string): BackupVerification {
  const source = resolve(snapshotPath);
  if (!statSync(source).isFile())
    throw new Error('The backup path must be a regular database file.');
  const expected = inspectSnapshot(source);
  const temporary = mkdtempSync(join(tmpdir(), 'kavu-restore-verification-'));
  const restoredPath = join(temporary, 'restored.db');
  try {
    copyFileSync(source, restoredPath, constants.COPYFILE_EXCL);
    if (process.platform !== 'win32') chmodSync(restoredPath, 0o600);
    const restored = inspectSnapshot(restoredPath);
    if (JSON.stringify(restored) !== JSON.stringify(expected))
      throw new Error(
        'Standalone restore verification differs from the snapshot. Do not use an active WAL database as a backup file.',
      );
    return { ...restored, restoreVerified: true };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

/** Online SQLite backup includes committed WAL records. Destination is reserved exclusively and must be new. */
export async function backupDatabase(
  sourcePath: string,
  destinationPath: string,
): Promise<BackupResult> {
  const source = resolve(sourcePath);
  const destination = resolve(destinationPath);
  if (source === destination) throw new Error('Source and destination must be different files.');
  if (!statSync(source).isFile()) throw new Error('The source must be an existing database file.');
  if (sidecars.some((suffix) => existsSync(destination + suffix)))
    throw new Error(
      'Destination has existing SQLite sidecar files. Choose a fresh backup filename.',
    );
  mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
  // Never overwrite even an empty file; exclusive creation also rejects an existing symlink.
  let descriptor: number;
  try {
    descriptor = openSync(destination, 'wx', 0o600);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST')
      throw new Error(
        'Destination already exists. Backups never overwrite files; choose a new filename.',
      );
    throw error;
  }
  closeSync(descriptor);
  let sourceDb: Database.Database | undefined;
  try {
    sourceDb = new Database(source, { readonly: true, fileMustExist: true });
    sourceDb.pragma('busy_timeout = 5000');
    await sourceDb.backup(destination);
    sourceDb.close();
    sourceDb = undefined;
    if (process.platform !== 'win32') chmodSync(destination, 0o600);
    const verification = verifyBackup(destination);
    return {
      destination,
      bytes: statSync(destination).size,
      completedAt: new Date().toISOString(),
      verification,
    };
  } catch (error) {
    // These paths belong to the newly reserved destination; no pre-existing snapshot is removed.
    sourceDb?.close();
    for (const suffix of ['', ...sidecars]) rmSync(destination + suffix, { force: true });
    throw error;
  }
}

async function main(args: string[]): Promise<void> {
  if (args.length === 2 && args[0] === '--verify') {
    console.log(
      JSON.stringify({ file: resolve(args[1]), verification: verifyBackup(args[1]) }, null, 2),
    );
    return;
  }
  if (args.length !== 2 || args.some((arg) => arg.startsWith('--')))
    throw new Error(
      'Usage: npm run backup -- SOURCE.db NEW-BACKUP.db\n       npm run backup -- --verify BACKUP.db',
    );
  console.log(JSON.stringify(await backupDatabase(args[0], args[1]), null, 2));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exitCode = 1;
  });
}
