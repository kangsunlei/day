const DB_NAME = "rss-reader";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("feeds")) {
        db.createObjectStore("feeds", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("articles")) {
        const store = db.createObjectStore("articles", { keyPath: "id" });
        store.createIndex("feed_id", "feed_id", { unique: false });
        store.createIndex("published_at", "published_at", { unique: false });
      }
      if (!db.objectStoreNames.contains("preferences")) {
        db.createObjectStore("preferences", { keyPath: "article_id" });
      }
      if (!db.objectStoreNames.contains("sync_state")) {
        db.createObjectStore("sync_state", { keyPath: "source" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

function txStore(db: IDBDatabase, storeName: string, mode: IDBTransactionMode) {
  return db.transaction(storeName, mode).objectStore(storeName);
}

export async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return requestToPromise(txStore(db, storeName, "readonly").getAll());
}

export async function getByKey<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDB();
  return requestToPromise(txStore(db, storeName, "readonly").get(key));
}

export async function put<T>(storeName: string, value: T): Promise<void> {
  const db = await openDB();
  await requestToPromise(txStore(db, storeName, "readwrite").put(value));
}

export async function putMany<T>(storeName: string, values: T[]): Promise<void> {
  if (values.length === 0) return;
  const db = await openDB();
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);

    for (const value of values) {
      store.put(value);
    }
  });
}

export async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();
  await requestToPromise(txStore(db, storeName, "readwrite").clear());
}
