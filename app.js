// js/db.js
const DB_NAME = 'KKMongin_InventoryDB';
const DB_VERSION = 1;

let dbInstance = null;

export const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // 1. Master Items
            if (!db.objectStoreNames.contains('items')) {
                const itemStore = db.createObjectStore('items', { keyPath: 'id' });
                itemStore.createIndex('inventory_name', 'inventory_name', { unique: false });
                itemStore.createIndex('category', 'category', { unique: false });
                itemStore.createIndex('sku', 'sku', { unique: true });
            }

            // 2. Batches (Untuk FEFO Logic)
            if (!db.objectStoreNames.contains('batches')) {
                const batchStore = db.createObjectStore('batches', { keyPath: 'id' });
                batchStore.createIndex('item_id', 'item_id', { unique: false });
                batchStore.createIndex('expiry_date', 'expiry_date', { unique: false }); // Penting untuk FEFO
            }

            // 3. Transactions (Stock In / Stock Out)
            if (!db.objectStoreNames.contains('transactions')) {
                const trxStore = db.createObjectStore('transactions', { keyPath: 'id' });
                trxStore.createIndex('item_id', 'item_id', { unique: false });
                trxStore.createIndex('timestamp', 'timestamp', { unique: false });
            }

            // 4. Daily Stock Opname
            if (!db.objectStoreNames.contains('daily_so')) {
                const soStore = db.createObjectStore('daily_so', { keyPath: 'id' });
                soStore.createIndex('date', 'date', { unique: false });
            }

            // 5. Users & Roles (Prototype Auth)
            if (!db.objectStoreNames.contains('users')) {
                const userStore = db.createObjectStore('users', { keyPath: 'username' });
                userStore.createIndex('role', 'role', { unique: false });
            }

            // 6. Audit Logs
            if (!db.objectStoreNames.contains('audit_logs')) {
                const auditStore = db.createObjectStore('audit_logs', { keyPath: 'id', autoIncrement: true });
                auditStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            console.log("Database initialized successfully.");
            resolve(dbInstance);
        };

        request.onerror = (event) => {
            console.error("Database error: ", event.target.errorCode);
            reject(event.target.error);
        };
    });
};

export const getDB = () => dbInstance;
