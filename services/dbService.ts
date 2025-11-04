const DB_NAME = 'AIComicBookDB';
const DB_VERSION = 1;
const STORE_NAME = 'images';

let db: IDBDatabase | null = null;
let initPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
    if (db) {
        return Promise.resolve(db);
    }
    if (initPromise) {
        return initPromise;
    }

    initPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error("IndexedDB error:", request.error);
            initPromise = null; // Allow retrying initialization
            reject(request.error);
        };

        request.onsuccess = () => {
            const dbInstance = request.result;
            
            // This handler is called if the connection is closed, e.g., by another tab or browser maintenance.
            dbInstance.onclose = () => {
                console.warn('IndexedDB connection closed by the browser.');
                // When the connection is closed, we need to nullify our reference
                // so the next call to getDB will re-establish a connection.
                db = null;
                initPromise = null;
            };

            db = dbInstance;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const dbInstance = (event.target as IDBOpenDBRequest).result;
            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
    return initPromise;
};


export const initDB = (): Promise<boolean> => {
  return getDB().then(() => true).catch(() => false);
};

export const saveImage = async (id: string, imageData: string): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ id, imageData });

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error("Error saving image:", request.error);
      reject(request.error);
    };
  });
};

export const getImage = async (id: string): Promise<string | null> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result ? request.result.imageData : null);
    };
    request.onerror = () => {
      console.error("Error getting image:", request.error);
      reject(request.error);
    };
  });
};

export const deleteImages = async (ids: string[]): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        if (ids.length === 0) {
            return resolve();
        }

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        let completed = 0;

        ids.forEach(id => {
            const request = store.delete(id);
            const checkCompletion = () => {
                completed++;
                if (completed === ids.length) {
                    resolve();
                }
            };
            request.onsuccess = checkCompletion;
            request.onerror = () => {
                console.error(`Failed to delete image with id: ${id}`, request.error);
                checkCompletion(); // Continue even if one fails
            };
        });

        transaction.onerror = (event) => {
            console.error("Transaction error during image deletion:", event);
            reject(event);
        };
    });
};

export const clearImages = async (): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error("Error clearing image store:", request.error);
            reject(request.error);
        };
    });
};