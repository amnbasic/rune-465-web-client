import HashTable from '#/datastruct/HashTable.js';
import Linkable from '#/datastruct/Linkable.js';

// jag::oldscape::ClientInvCache
export default class ClientInvCache extends Linkable {
    // jag::oldscape::ClientInvCache::m_invList
    static invList: HashTable<ClientInvCache> = new HashTable(32);

    objCount: Int32Array = new Int32Array(1);
    objId: Int32Array = Int32Array.from([-1]);

    // jag::oldscape::ClientInvCache::GetCount
    static getCount(arg0: number, arg1: number): number {
        const var2 = ClientInvCache.invList.find(BigInt(arg0));
        if (var2 === null) {
            return 0;
        } else if (arg1 >= 0 && var2.objCount.length > arg1) {
            return var2.objCount[arg1];
        } else {
            return 0;
        }
    }

    // jag::oldscape::ClientInvCache::InvTotal
    static invTotal(arg0: number, arg1: number): number {
        const var2 = ClientInvCache.invList.find(BigInt(arg0));
        if (var2 === null) {
            return 0;
        } else if (arg1 === -1) {
            return 0;
        } else {
            let var3 = 0;
            for (let var4 = 0; var4 < var2.objCount.length; var4++) {
                if (arg1 === var2.objId[var4]) {
                    var3 += var2.objCount[var4];
                }
            }
            return var3;
        }
    }

    // jag::oldscape::ClientInvCache::Set
    static set(arg0: number, arg1: number, arg2: number, arg3: number): void {
        let var4 = ClientInvCache.invList.find(BigInt(arg0));
        if (var4 === null) {
            var4 = new ClientInvCache();
            ClientInvCache.invList.put(BigInt(arg0), var4);
        }
        if (var4.objId.length <= arg2) {
            const var5 = new Int32Array(arg2 + 1);
            const var6 = new Int32Array(arg2 + 1);
            for (let var7 = 0; var7 < var4.objId.length; var7++) {
                var6[var7] = var4.objId[var7];
                var5[var7] = var4.objCount[var7];
            }
            for (let var8 = var4.objId.length; var8 < arg2; var8++) {
                var6[var8] = -1;
                var5[var8] = 0;
            }
            var4.objCount = var5;
            var4.objId = var6;
        }
        var4.objId[arg2] = arg3;
        var4.objCount[arg2] = arg1;
    }

    // jag::oldscape::ClientInvCache::Delete
    static delete(arg0: number): void {
        const var1 = ClientInvCache.invList.find(BigInt(arg0));
        if (var1 !== null) {
            var1.unlink();
        }
    }

    // jag::oldscape::ClientInvCache::GetType
    static getType(arg0: number, arg1: number): number {
        const var2 = ClientInvCache.invList.find(BigInt(arg1));
        if (var2 === null) {
            return -1;
        } else if (arg0 >= 0 && arg0 < var2.objId.length) {
            return var2.objId[arg0];
        } else {
            return -1;
        }
    }

    // jag::oldscape::ClientInvCache::DeleteAll
    static deleteAll(): void {
        ClientInvCache.invList = new HashTable(32);
    }

    // todo: identify
    static clear(arg0: number): void {
        const var1 = ClientInvCache.invList.find(BigInt(arg0));
        if (var1 !== null) {
            for (let var2 = 0; var2 < var1.objId.length; var2++) {
                var1.objId[var2] = -1;
                var1.objCount[var2] = 0;
            }
        }
    }
}
