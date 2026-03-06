const DB_NAME = 'promptnota-db';
const DB_VERSION = 3;
const STORE_PROMPTS = 'prompts';
const STORE_TAGS = 'tags';

// ── Default tag colors ──────────────────────────────────────────
const TAG_COLORS = [
    { hex: '#818cf8', name: 'Indigo' },
    { hex: '#f472b6', name: 'Fúcsia' },
    { hex: '#34d399', name: 'Emerald' },
    { hex: '#fbbf24', name: 'Amber' },
    { hex: '#22d3ee', name: 'Cyan' },
    { hex: '#fb7185', name: 'Rose' },
    { hex: '#a78bfa', name: 'Violet' },
    { hex: '#fb923c', name: 'Orange' },
];

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = e => {
            const db = e.target.result;

            // Prompts store (create or keep existing)
            if (!db.objectStoreNames.contains(STORE_PROMPTS)) {
                const store = db.createObjectStore(STORE_PROMPTS, { keyPath: 'id', autoIncrement: true });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }

            // Tags store (new in v2)
            if (!db.objectStoreNames.contains(STORE_TAGS)) {
                db.createObjectStore(STORE_TAGS, { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

// ═══════════════════════════════════════════════════════════════
// PROMPTS CRUD
// ═══════════════════════════════════════════════════════════════

async function getAllPrompts() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PROMPTS, 'readonly');
        const req = tx.objectStore(STORE_PROMPTS).index('createdAt').getAll();
        req.onsuccess = e => resolve(e.target.result.reverse());
        req.onerror = e => reject(e.target.error);
    });
}

async function addPrompt(title, text, tags = []) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PROMPTS, 'readwrite');
        const req = tx.objectStore(STORE_PROMPTS).add({ 
            title, 
            text, 
            tags, 
            isPinned: false,
            createdAt: Date.now() 
        });
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

async function updatePrompt(id, title, text, tags) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PROMPTS, 'readwrite');
        const store = tx.objectStore(STORE_PROMPTS);
        const getReq = store.get(id);
        getReq.onsuccess = e => {
            const item = e.target.result;
            if (!item) { reject(new Error('Not found')); return; }
            item.title = title;
            item.text = text;
            if (tags !== undefined) item.tags = tags;
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
        const tx = db.transaction(STORE_PROMPTS, 'readwrite');
        const req = tx.objectStore(STORE_PROMPTS).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = e => reject(e.target.error);
    });
}

async function togglePromptPin(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PROMPTS, 'readwrite');
        const store = tx.objectStore(STORE_PROMPTS);
        const getReq = store.get(id);
        getReq.onsuccess = e => {
            const item = e.target.result;
            if (!item) { reject(new Error('Not found')); return; }
            item.isPinned = !item.isPinned;
            const putReq = store.put(item);
            putReq.onsuccess = () => resolve(item.isPinned);
            putReq.onerror = err => reject(err);
        };
        getReq.onerror = e => reject(e.target.error);
    });
}

// ═══════════════════════════════════════════════════════════════
// TAGS CRUD
// ═══════════════════════════════════════════════════════════════

async function getAllTags() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_TAGS, 'readonly');
        const req = tx.objectStore(STORE_TAGS).getAll();
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

async function addTag(name, color) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_TAGS, 'readwrite');
        const req = tx.objectStore(STORE_TAGS).add({ name, color });
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

async function updateTag(id, name, color) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_TAGS, 'readwrite');
        const store = tx.objectStore(STORE_TAGS);
        const getReq = store.get(id);
        getReq.onsuccess = e => {
            const item = e.target.result;
            if (!item) { reject(new Error('Tag not found')); return; }
            item.name = name;
            item.color = color;
            const putReq = store.put(item);
            putReq.onsuccess = () => resolve();
            putReq.onerror = err => reject(err);
        };
        getReq.onerror = e => reject(e.target.error);
    });
}

async function deleteTag(id) {
    const db = await openDB();
    // 1. Remove tag from all prompts that reference it
    const prompts = await getAllPrompts();
    const tx = db.transaction([STORE_PROMPTS, STORE_TAGS], 'readwrite');
    const promptStore = tx.objectStore(STORE_PROMPTS);

    for (const p of prompts) {
        if (p.tags && p.tags.includes(id)) {
            p.tags = p.tags.filter(t => t !== id);
            promptStore.put(p);
        }
    }

    // 2. Delete the tag itself
    tx.objectStore(STORE_TAGS).delete(id);

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = e => reject(e.target.error);
    });
}

// ═══════════════════════════════════════════════════════════════
// BACKUP & RESTORE (v2)
// ═══════════════════════════════════════════════════════════════

async function exportAllData() {
    const prompts = await getAllPrompts();
    const tags = await getAllTags();
    return {
        version: 1,
        exportedAt: Date.now(),
        prompts,
        tags
    };
}

async function importAllData(data) {
    if (!data.prompts || !data.tags) {
        throw new Error('Formato de arquivo inválido.');
    }

    const db = await openDB();
    const tx = db.transaction([STORE_PROMPTS, STORE_TAGS], 'readwrite');

    // Clear existing
    tx.objectStore(STORE_PROMPTS).clear();
    tx.objectStore(STORE_TAGS).clear();

    const promptStore = tx.objectStore(STORE_PROMPTS);
    const tagStore = tx.objectStore(STORE_TAGS);

    // Import tags
    for (const tag of data.tags) {
        tagStore.put(tag);
    }

    // Import prompts
    for (const prompt of data.prompts) {
        promptStore.put(prompt);
    }

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = e => reject(e.target.error);
    });
}

/**
 * Remove references to a deleted tag from all prompts.
 * (Used internally by deleteTag)
 */
async function removeTagFromAllPrompts(tagId) {
    const prompts = await getAllPrompts();
    const db = await openDB();
    const tx = db.transaction(STORE_PROMPTS, 'readwrite');
    const store = tx.objectStore(STORE_PROMPTS);
    for (const p of prompts) {
        if (p.tags && p.tags.includes(tagId)) {
            p.tags = p.tags.filter(t => t !== tagId);
            store.put(p);
        }
    }
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = e => reject(e.target.error);
    });
}
