// IndexedDB store for uploaded files, plus a per-tab pointer to the file that tab shows.
// Record shape: { id, name, size, savedAt (ms), html (string) }
//
// Each upload gets a fresh id. The tab that uploaded it remembers that id in
// sessionStorage (per tab, survives reload), so two tabs can run two different
// files and each gets its own back on reload. A tab with no pointer (new tab,
// browser reopened) gets the most recent upload and is then pinned to it.
const DB_NAME = 'html-runner';
const STORE = 'files';
const KEEP = 5; // most recent uploads kept; older ones are deleted
const TAB_KEY = 'html-runner:file';

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
      tx.oncomplete = () => resolve(req && req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

const newId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

async function allNewestFirst() {
  const all = await run('readonly', (s) => s.getAll());
  return all.filter((r) => r && r.id).sort((a, b) => b.savedAt - a.savedAt);
}

function tabFileId() {
  try { return sessionStorage.getItem(TAB_KEY); } catch (_) { return null; }
}

function setTabFileId(id) {
  try {
    if (id) sessionStorage.setItem(TAB_KEY, id);
    else sessionStorage.removeItem(TAB_KEY);
  } catch (_) { /* ignore */ }
}

// The file this tab should show: its own, else the latest (and pin the tab to it).
export async function getTabFile() {
  const id = tabFileId();
  let file = id ? await run('readonly', (s) => s.get(id)) : null;
  if (!file) file = (await allNewestFirst())[0] || null;
  setTabFileId(file && file.id);
  return file;
}

// Save a new upload, point this tab at it, and drop uploads beyond KEEP.
export async function addFile({ name, size, html }) {
  const id = newId();
  await run('readwrite', (s) => s.put({ id, name, size, savedAt: Date.now(), html }, id));
  setTabFileId(id);
  const old = (await allNewestFirst()).slice(KEEP);
  if (old.length) {
    await run('readwrite', (s) => { let r; for (const f of old) r = s.delete(f.id); return r; });
  }
  return id;
}

// Remove every saved upload.
export async function clearAll() {
  await run('readwrite', (s) => s.clear());
  setTabFileId(null);
}

// Ask the browser not to evict our storage under pressure (best effort).
export async function requestPersist() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist();
    }
  } catch (_) { /* ignore */ }
  return false;
}
