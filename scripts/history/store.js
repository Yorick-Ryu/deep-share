/* The complete archive stays in extension-owned IndexedDB, never sync storage. */
(() => {
    async function access(mode, operation) {
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('deepshare-history', 1);
            request.onupgradeneeded = () => request.result.createObjectStore('archive');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        try {
            return await new Promise((resolve, reject) => {
                const tx = db.transaction('archive', mode);
                const request = operation(tx.objectStore('archive'));
                tx.oncomplete = () => resolve(request.result);
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error || new Error('本地对话库写入失败。'));
            });
        } finally { db.close(); }
    }
    globalThis.DeepShareHistoryStore = {
        read: () => access('readonly', store => store.get('latest')),
        write: archive => access('readwrite', store => store.put(archive, 'latest')),
        clear: () => access('readwrite', store => store.delete('latest'))
    };
})();
