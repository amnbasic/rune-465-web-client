export default class ByteArrayPool {
    static readonly cacheMin: Array<Uint8Array | null> = new Array(1000).fill(null);
    static readonly cacheMid: Array<Uint8Array | null> = new Array(250).fill(null);
    static readonly cacheMax: Array<Uint8Array | null> = new Array(50).fill(null);
    static cacheMinCount: number = 0;
    static cacheMidCount: number = 0;
    static cacheMaxCount: number = 0;

    static alloc(arg0: number): Uint8Array {
        if (arg0 === 100 && ByteArrayPool.cacheMinCount > 0) {
            const var1 = ByteArrayPool.cacheMin[--ByteArrayPool.cacheMinCount]!;
            ByteArrayPool.cacheMin[ByteArrayPool.cacheMinCount] = null;
            return var1;
        } else if (arg0 === 5000 && ByteArrayPool.cacheMidCount > 0) {
            const var2 = ByteArrayPool.cacheMid[--ByteArrayPool.cacheMidCount]!;
            ByteArrayPool.cacheMid[ByteArrayPool.cacheMidCount] = null;
            return var2;
        } else if (arg0 === 30000 && ByteArrayPool.cacheMaxCount > 0) {
            const var3 = ByteArrayPool.cacheMax[--ByteArrayPool.cacheMaxCount]!;
            ByteArrayPool.cacheMax[ByteArrayPool.cacheMaxCount] = null;
            return var3;
        } else {
            return new Uint8Array(arg0);
        }
    }
}
