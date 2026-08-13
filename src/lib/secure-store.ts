/**
 * Encrypted local storage for the VSS session (token + pid).
 * AES-GCM via WebCrypto with a non-extractable device key held in IndexedDB,
 * so the stored payload is opaque at rest. Browser-only.
 */
const DB_NAME = "dashmoto-secure";
const STORE = "keys";
const KEY_ID = "vss-aes-key";

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<CryptoKey | undefined> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as CryptoKey | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: CryptoKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function deviceKey(): Promise<CryptoKey> {
  const db = await idb();
  const existing = await idbGet(db, KEY_ID);
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
  await idbPut(db, KEY_ID, key);
  return key;
}

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function secureSet(name: string, value: unknown): Promise<void> {
  if (typeof window === "undefined") return;
  const key = await deviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(value)),
  );
  localStorage.setItem(`sec:${name}`, `${b64(iv.buffer)}.${b64(ct)}`);
}

export async function secureGet<T>(name: string): Promise<T | null> {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(`sec:${name}`);
  if (!stored) return null;
  const [ivPart, ctPart] = stored.split(".");
  if (!ivPart || !ctPart) return null;
  try {
    const key = await deviceKey();
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: unb64(ivPart) },
      key,
      unb64(ctPart),
    );
    return JSON.parse(new TextDecoder().decode(pt)) as T;
  } catch {
    localStorage.removeItem(`sec:${name}`);
    return null;
  }
}

export function secureClear(name: string) {
  if (typeof window !== "undefined") localStorage.removeItem(`sec:${name}`);
}
