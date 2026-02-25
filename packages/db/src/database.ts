import Database from 'better-sqlite3';
import { migrations, MAX_VERSION } from './migrations/index.js';

export class KeepDB {
  readonly db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  migrate(): void {
    const version = this.db.pragma('user_version', { simple: true }) as number;
    for (let v = version + 1; v <= MAX_VERSION; v++) {
      const migration = migrations.get(v);
      if (!migration) throw new Error(`Missing migration v${v}`);
      this.db.transaction(() => {
        migration(this.db);
        this.db.pragma(`user_version = ${v}`);
      })();
    }
  }

  getVersion(): number {
    return this.db.pragma('user_version', { simple: true }) as number;
  }

  close(): void {
    this.db.close();
  }
}
