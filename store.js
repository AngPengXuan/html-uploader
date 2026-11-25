// Tiny IndexedDB wrapper: holds exactly one uploaded file under a fixed key.
// Record shape: { name, size, savedAt (ms), html (string) }
const DB_NAME = 'html-runner';
const STORE = 'files';
const KEY = 'current';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run(mode, fn) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export const getFile = () => run('readonly', (s) => s.get(KEY));
export const putFile = (record) => run('readwrite', (s) => s.put(record, KEY));
export const clearFile = () => run('readwrite', (s) => s.delete(KEY));

// Ask the browser not to evict our storage under pressure (best effort).
export async function requestPersist() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist();
    }
  } catch (_) { /* ignore */ }
  return false;
}
