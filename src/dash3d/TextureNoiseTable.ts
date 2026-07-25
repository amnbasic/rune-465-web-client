import Linkable2 from '#/datastruct/Linkable2.js';
import LruCache from '#/datastruct/LruCache.js';
import Statics from '#/deob/Statics.js';
import JavaRandom from '#/util/JavaRandom.js';

export default class TextureNoiseTable extends Linkable2 {
    static readonly cache: LruCache<TextureNoiseTable> = new LruCache(16);
    readonly table: Int8Array;

    constructor(arg0: Int8Array) {
        super();
        this.table = arg0;
    }

    static get(seed: number): Int8Array {
        let var1 = TextureNoiseTable.cache.find(BigInt(seed));
        if (var1 === null) {
            const var2 = new Int8Array(512);
            const var3 = new JavaRandom(seed);
            for (let var4 = 0; var4 < 255; var4++) {
                var2[var4] = var4;
            }
            for (let var5 = 0; var5 < 255; var5++) {
                const var6 = 255 - var5;
                const var7 = Statics.method812(var6, var3);
                const var8 = var2[var7];
                var2[var7] = var2[var6];
                var2[var6] = var2[511 - var5] = var8;
            }
            var1 = new TextureNoiseTable(var2);
            TextureNoiseTable.cache.put(BigInt(seed), var1);
        }
        return var1.table;
    }
}
