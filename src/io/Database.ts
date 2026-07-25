export default class Database {
    private readonly db: IDBDatabase;

    constructor(db: IDBDatabase) {
        this.db = db;
    }

    static async openDatabase(): Promise<IDBDatabase> {
        return await new Promise<IDBDatabase>((resolve, reject): void => {
            const request: IDBOpenDBRequest = indexedDB.open('lostcity', 1);

            request.onsuccess = (event: Event): void => {
                const target: IDBOpenDBRequest = event.target as IDBOpenDBRequest;
                resolve(target.result);
            };

            request.onupgradeneeded = (event: Event): void => {
                const target: IDBOpenDBRequest = event.target as IDBOpenDBRequest;
                target.result.createObjectStore('cache');
            };

            request.onerror = (event: Event): void => {
                const target: IDBOpenDBRequest = event.target as IDBOpenDBRequest;
                reject(target.result);
            };
        });
    }

    async read(archive: number, file: number) {
        return await new Promise<Uint8Array | undefined>((resolve): void => {
            const transaction: IDBTransaction = this.db.transaction('cache', 'readonly');
            const store: IDBObjectStore = transaction.objectStore('cache');
            const request: IDBRequest<Uint8Array | Int8Array | ArrayBuffer> = store.get(`${archive}.${file}`);

            request.onsuccess = (): void => {
                if (request.result) {
                    const result = request.result;
                    resolve(result instanceof Uint8Array ? result : result instanceof Int8Array ? new Uint8Array(result.buffer, result.byteOffset, result.byteLength) : new Uint8Array(result));
                } else {
                    // IDB will call onsuccess with "undefined" if key does not exist
                    resolve(undefined);
                }
            };

            request.onerror = (): void => {
                resolve(undefined);
            };
        });
    }

    async write(archive: number, file: number, src: Uint8Array | Int8Array | null) {
        if (src === null) {
            return;
        }

        return await new Promise<void>((resolve, _reject): void => {
            const transaction: IDBTransaction = this.db.transaction('cache', 'readwrite');
            const store: IDBObjectStore = transaction.objectStore('cache');
            const request: IDBRequest<IDBValidKey> = store.put(src, `${archive}.${file}`);

            request.onsuccess = (): void => {
                resolve();
            };

            request.onerror = (): void => {
                // not too worried if it doesn't save, it'll redownload later
                resolve();
            };
        });
    }
}
