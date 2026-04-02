const DATABASE_NAME = 'olympiad-proctoring';
const DATABASE_VERSION = 1;
const STORE_NAME = 'chunks';

let databasePromise = null;

function openDatabase() {
    if (databasePromise) {
        return databasePromise;
    }

    databasePromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

        request.addEventListener('upgradeneeded', () => {
            const database = request.result;

            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('session_kind_sequence', ['sessionId', 'kind', 'sequence'], { unique: false });
            }
        });

        request.addEventListener('success', () => {
            resolve(request.result);
        });

        request.addEventListener('error', () => {
            reject(request.error || new Error('Failed to open proctoring database.'));
        });
    });

    return databasePromise;
}

function withStore(mode, handler) {
    return openDatabase().then(
        (database) =>
            new Promise((resolve, reject) => {
                const transaction = database.transaction(STORE_NAME, mode);
                const store = transaction.objectStore(STORE_NAME);

                let result;

                try {
                    result = handler(store);
                } catch (error) {
                    reject(error);
                    return;
                }

                transaction.addEventListener('complete', () => resolve(result));
                transaction.addEventListener('error', () => reject(transaction.error || new Error('IndexedDB transaction failed.')));
                transaction.addEventListener('abort', () => reject(transaction.error || new Error('IndexedDB transaction aborted.')));
            }),
    );
}

export function isProctoringQueueSupported() {
    return typeof window !== 'undefined' && 'indexedDB' in window;
}

export function saveQueuedChunk({ sessionId, kind, sequence, blob }) {
    return withStore('readwrite', (store) => {
        store.put({
            id: `${sessionId}:${kind}:${sequence}`,
            sessionId,
            kind,
            sequence,
            blob,
            createdAt: Date.now(),
        });
    });
}

export function deleteQueuedChunk(id) {
    return withStore('readwrite', (store) => {
        store.delete(id);
    });
}

export function listQueuedChunks(sessionId, kind) {
    return withStore('readonly', (store) => {
        const index = store.index('session_kind_sequence');
        const request = index.getAll(IDBKeyRange.bound([sessionId, kind, 0], [sessionId, kind, Number.MAX_SAFE_INTEGER]));

        return new Promise((resolve, reject) => {
            request.addEventListener('success', () => {
                resolve((request.result || []).sort((left, right) => left.sequence - right.sequence));
            });

            request.addEventListener('error', () => {
                reject(request.error || new Error('Failed to read queued proctoring chunks.'));
            });
        });
    }).then((value) => value);
}

export async function getNextQueuedSequence(sessionId, kind) {
    const items = await listQueuedChunks(sessionId, kind);
    const lastSequence = items.length ? items[items.length - 1].sequence : -1;

    return lastSequence + 1;
}
