import { WorldState } from './types';
import { WORLD_SCHEMA_VERSION } from './behaviorEngine';

const DB_NAME = 'unchain_genesis_db';
const STORE_NAME = 'world_saves';
const SAVE_KEY = 'primary_world';
const FALLBACK_LS_KEY = 'unchain_genesis_primary_world_v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

export async function saveWorldState(world: WorldState): Promise<boolean> {
  const payload: WorldState = {
    ...world,
    version: WORLD_SCHEMA_VERSION,
    savedAtRealMs: Date.now(),
  };

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(payload, SAVE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Fall back to localStorage below
  }

  try {
    localStorage.setItem(FALLBACK_LS_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export async function loadWorldState(): Promise<WorldState | null> {
  try {
    const db = await openDb();
    const result = await new Promise<WorldState | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(SAVE_KEY);
      req.onsuccess = () => resolve(req.result as WorldState | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (result && result.version === WORLD_SCHEMA_VERSION && Array.isArray(result.npcs)) {
      return result;
    }
  } catch {
    // Try localStorage fallback
  }

  try {
    const raw = localStorage.getItem(FALLBACK_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorldState;
    if (parsed && parsed.version === WORLD_SCHEMA_VERSION && Array.isArray(parsed.npcs)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export async function clearSavedWorldState(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(SAVE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(FALLBACK_LS_KEY);
  } catch {
    // ignore
  }
}
