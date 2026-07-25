import LinkList from '#/datastruct/LinkList.js';
import type Database from '#/io/Database.js';
import type Js5Loader from '#/js5/Js5Loader.js';
import Js5WorkerRequest from '#/js5/Js5WorkerRequest.js';

export default class Js5NetThread {
    static readonly requestQueue: LinkList<Js5WorkerRequest> = new LinkList();
    static readonly lock: object = {};
    static readonly completed: LinkList<Js5WorkerRequest> = new LinkList();
    static db: Database | null = null;
    static keepAlive: number = 0;
    static dbActive: number = 0;
    static readonly dbMaxActive: number = 12;

    static shutdown(): void {
        const var0 = Js5NetThread.lock;
        {
            if (Js5NetThread.keepAlive !== 0) {
                Js5NetThread.keepAlive = 1;
                try {
                } catch (var1) {}
            }
        }
    }

    static processCompleted(): void {
        while (true) {
            const var0 = Js5NetThread.requestQueue;
            let var1: Js5WorkerRequest | null;
            {
                var1 = Js5NetThread.completed.popFront();
            }
            if (var1 === null) {
                return;
            }
            var1.loader!.loadIndex(var1.data, Number(var1.key), var1.archive, var1.keepPacked);
        }
    }

    static queueWrite(arg0: Uint8Array, arg1: number, arg2: number): void {
        if (Js5NetThread.db == null) {
            return;
        }
        const var3 = new Js5WorkerRequest();
        var3.data = arg0;
        var3.type = 0;
        var3.key = BigInt(arg1);
        var3.archive = arg2;
        const var4 = Js5NetThread.requestQueue;
        {
            Js5NetThread.requestQueue.push(var3);
        }
        Js5NetThread.startDatabaseThread();
    }

    static startDatabaseThread(): void {
        const db = Js5NetThread.db;
        if (db == null) {
            return;
        }
        while (Js5NetThread.dbActive < Js5NetThread.dbMaxActive) {
            let var1: Js5WorkerRequest | null = null;
            for (let var2 = Js5NetThread.requestQueue.head(); var2 !== null; var2 = Js5NetThread.requestQueue.next()) {
                if (!var2.inProgress) {
                    var1 = var2;
                    break;
                }
            }
            if (var1 === null) {
                return;
            }
            var1.inProgress = true;
            Js5NetThread.dbActive++;
            if (var1.type === 0) {
                void db.write(var1.archive, Number(var1.key), var1.data).finally(() => {
                    var1!.unlink();
                    Js5NetThread.dbActive--;
                    Js5NetThread.startDatabaseThread();
                });
            } else if (var1.type === 1) {
                void db
                    .read(var1.archive, Number(var1.key))
                    .then(
                        data => {
                            var1!.data = data ?? null;
                        },
                        () => {
                            var1!.data = null;
                        }
                    )
                    .finally(() => {
                        Js5NetThread.completed.push(var1!);
                        Js5NetThread.dbActive--;
                        Js5NetThread.startDatabaseThread();
                    });
            } else {
                var1.unlink();
                Js5NetThread.dbActive--;
            }
        }
    }

    static startThread(): void {}

    static queueRead(arg0: number, arg1: Js5Loader, arg2: number): void {
        if (Js5NetThread.db == null) {
            return;
        }
        for (let var1 = Js5NetThread.requestQueue.head(); var1 !== null; var1 = Js5NetThread.requestQueue.next()) {
            if (var1.key === BigInt(arg0) && var1.archive === arg2 && var1.type === 1) {
                return;
            }
        }
        const var3 = new Js5WorkerRequest();
        var3.loader = arg1;
        var3.key = BigInt(arg0);
        var3.type = 1;
        var3.archive = arg2;
        const var4 = Js5NetThread.requestQueue;
        {
            Js5NetThread.requestQueue.push(var3);
        }
        Js5NetThread.startDatabaseThread();
    }

    static queueRequest(arg0: Js5Loader, arg1: number, arg2: number): void {
        if (Js5NetThread.db == null) {
            return;
        }
        let var3: Uint8Array | null = null;
        const var4 = Js5NetThread.requestQueue;
        {
            for (let var5 = Js5NetThread.requestQueue.head(); var5 !== null; var5 = Js5NetThread.requestQueue.next()) {
                if (var5.key === BigInt(arg1) && var5.archive === arg2 && var5.type === 0) {
                    var3 = var5.data;
                    break;
                }
            }
        }
        if (var3 !== null) {
            const var6 = new Js5WorkerRequest();
            var6.loader = arg0;
            var6.key = BigInt(arg1);
            var6.type = 1;
            var6.archive = arg2;
            var6.keepPacked = true;
            var6.data = var3;
            Js5NetThread.completed.push(var6);
            return;
        }
        for (let var5 = Js5NetThread.requestQueue.head(); var5 !== null; var5 = Js5NetThread.requestQueue.next()) {
            if (var5.key === BigInt(arg1) && var5.archive === arg2 && var5.type === 1) {
                var5.loader = arg0;
                var5.keepPacked = true;
                if (!var5.inProgress) {
                    Js5NetThread.requestQueue.pushFront(var5);
                }
                Js5NetThread.startDatabaseThread();
                return;
            }
        }
        const var6 = new Js5WorkerRequest();
        var6.loader = arg0;
        var6.key = BigInt(arg1);
        var6.type = 1;
        var6.archive = arg2;
        var6.keepPacked = true;
        Js5NetThread.requestQueue.pushFront(var6);
        Js5NetThread.startDatabaseThread();
    }

    async run(): Promise<void> {}
}
