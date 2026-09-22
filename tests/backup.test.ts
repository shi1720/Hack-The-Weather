import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { backupDatabase, verifyBackup } from '../scripts/backup';
import { openDatabase, type KavuDatabase } from '../server/database';

let directory: string;
let source: string;
let db: KavuDatabase;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'kavu-backup-test-'));
  source = join(directory, 'live.db');
  db = openDatabase(source);
  db.pragma('wal_autocheckpoint = 0');
});
afterEach(() => {
  if (db.open) db.close();
  rmSync(directory, { recursive: true, force: true });
});

describe('online backup and isolated restore verification', () => {
  it('preserves committed WAL account/workspace records in a standalone verified snapshot', async () => {
    db.prepare(
      'INSERT INTO users(id,name,email,password_hash,demo,created_at) VALUES(?,?,?,?,?,?)',
    ).run('owner-1', 'Fixture operator', 'backup@example.test', 'fixture-hash', 0, Date.now());
    db.prepare('INSERT INTO workspaces(user_id,revision,data) VALUES(?,?,?)').run(
      'owner-1',
      7,
      JSON.stringify({ revision: 7, batches: [{ id: 'harvest-1', weightKg: 840 }] }),
    );
    expect(statSync(`${source}-wal`).size).toBeGreaterThan(0);
    const destination = join(directory, 'snapshots', 'snapshot.db');
    const cli = await promisify(execFile)(process.execPath, [
      '--import',
      'tsx',
      fileURLToPath(new URL('../scripts/backup.ts', import.meta.url)),
      source,
      destination,
    ]);
    const result = JSON.parse(cli.stdout);
    expect(cli.stderr).toBe('');
    expect(result.verification).toMatchObject({
      integrity: 'ok',
      restoreVerified: true,
      users: 1,
      workspaces: 1,
      sessions: 0,
      schemaVersion: 1,
    });
    if (process.platform !== 'win32') expect(statSync(destination).mode & 0o777).toBe(0o600);
    // A later live mutation cannot change the already completed backup.
    db.prepare('UPDATE workspaces SET revision=8 WHERE user_id=?').run('owner-1');
    const restored = new Database(destination, { readonly: true, fileMustExist: true });
    try {
      expect(
        (restored.prepare('SELECT revision FROM workspaces').get() as { revision: number })
          .revision,
      ).toBe(7);
      const workspace = restored.prepare('SELECT data FROM workspaces').get() as { data: string };
      expect(JSON.parse(workspace.data).batches[0].weightKg).toBe(840);
      expect((restored.prepare('SELECT name FROM users').get() as { name: string }).name).toBe(
        'Fixture operator',
      );
    } finally {
      restored.close();
    }
    expect(verifyBackup(destination).restoreVerified).toBe(true);
    expect(
      (db.prepare('SELECT revision FROM workspaces').get() as { revision: number }).revision,
    ).toBe(8);
  });
  it('refuses to overwrite any existing destination and leaves its bytes unchanged', async () => {
    const destination = join(directory, 'existing.db');
    writeFileSync(destination, 'existing backup bytes');
    await expect(backupDatabase(source, destination)).rejects.toThrow(/already exists/);
    expect(readFileSync(destination, 'utf8')).toBe('existing backup bytes');
    await expect(backupDatabase(source, source)).rejects.toThrow(/different files/);
  });
  it('rejects invalid snapshots and removes a failed newly reserved backup', async () => {
    const corrupt = join(directory, 'corrupt.db');
    writeFileSync(corrupt, 'not a SQLite database');
    expect(() => verifyBackup(corrupt)).toThrow();
    db.pragma('user_version = 99');
    const destination = join(directory, 'unsupported.db');
    await expect(backupDatabase(source, destination)).rejects.toThrow(/Unsupported Kavu schema/);
    expect(existsSync(destination)).toBe(false);
    expect(existsSync(source)).toBe(true);
  });
});
