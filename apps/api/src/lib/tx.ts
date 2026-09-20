import { db, type Tx } from '../db/client.js';

// NFR-10: an important change and its audit entry commit together or not at all. Services
// receive the transaction handle and pass it to `audit()`.
export function withTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(fn);
}
