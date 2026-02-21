const DB_NAME = 'promptnota-db';
const DB_VERSION = 1;
const STORE = 'prompts';

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE)) {
                const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

async function getAllPrompts() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).index('createdAt').getAll();
        req.onsuccess = e => resolve(e.target.result.reverse());
        req.onerror = e => reject(e.target.error);
    });
}

async function addPrompt(title, text) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const req = tx.objectStore(STORE).add({ title, text, createdAt: Date.now() });
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

async function updatePrompt(id, title, text) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const getReq = store.get(id);
        getReq.onsuccess = e => {
            const item = e.target.result;
            if (!item) { reject(new Error('Not found')); return; }
            item.title = title;
            item.text = text;
            item.updatedAt = Date.now();
            const putReq = store.put(item);
            putReq.onsuccess = () => resolve();
            putReq.onerror = err => reject(err);
        };
        getReq.onerror = e => reject(e.target.error);
    });
}

async function deletePrompt(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const req = tx.objectStore(STORE).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = e => reject(e.target.error);
    });
}
