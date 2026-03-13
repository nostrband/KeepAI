import type Database from 'better-sqlite3';
import type { PendingPairing } from '@keepai/proto/types.js';

interface PairingRow {
  id: string;
  name: string;
  type: string;
  secret: string;
  keepd_pubkey: string;
  keepd_privkey: string;
  expires_at: number;
  created_at: number;
}

function rowToPairing(row: PairingRow): PendingPairing {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    secret: row.secret,
    keepdPubkey: row.keepd_pubkey,
    keepdPrivkey: row.keepd_privkey,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export class PairingStore {
  constructor(private db: Database.Database) {}

  create(pairing: PendingPairing): void {
    this.db
      .prepare(
        `INSERT INTO pending_pairings (id, name, type, secret, keepd_pubkey, keepd_privkey, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        pairing.id,
        pairing.name,
        pairing.type,
        pairing.secret,
        pairing.keepdPubkey,
        pairing.keepdPrivkey,
        pairing.expiresAt
      );
  }

  getBySecret(secret: string): PendingPairing | null {
    const row = this.db
      .prepare('SELECT * FROM pending_pairings WHERE secret = ?')
      .get(secret) as PairingRow | undefined;
    return row ? rowToPairing(row) : null;
  }

  getByKeepdPubkey(keepdPubkey: string): PendingPairing | null {
    const row = this.db
      .prepare('SELECT * FROM pending_pairings WHERE keepd_pubkey = ?')
      .get(keepdPubkey) as PairingRow | undefined;
    return row ? rowToPairing(row) : null;
  }

  list(): PendingPairing[] {
    const rows = this.db
      .prepare('SELECT * FROM pending_pairings ORDER BY created_at DESC')
      .all() as PairingRow[];
    return rows.map(rowToPairing);
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM pending_pairings WHERE id = ?').run(id);
  }

  expireOld(): number {
    const now = Date.now();
    const result = this.db
      .prepare('DELETE FROM pending_pairings WHERE expires_at < ?')
      .run(now);
    return result.changes;
  }
}
