import HashTable from '#/datastruct/HashTable.js';
import IntNode from '#/datastruct/IntNode.js';
import Linkable from '#/datastruct/Linkable.js';
import Linkable2 from '#/datastruct/Linkable2.js';
import LruCache from '#/datastruct/LruCache.js';
import StringNode from '#/datastruct/StringNode.js';

import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';
import IntMath from '#/util/IntMath.js';

export default class StructType extends Linkable2 {
    static configClient: Js5;
    static readonly recentUse: LruCache<StructType> = new LruCache(64);
    params: HashTable<Linkable> | null = null;

    static init(config: Js5): void {
        StructType.configClient = config;
    }

    static list(id: number): StructType {
        const cached = StructType.recentUse.find(BigInt(id));
        if (cached !== null) {
            return cached;
        }

        const data = StructType.configClient.getFile(id, 26);
        const config = new StructType();
        if (data !== null) {
            config.decode(new Packet(data));
        }

        StructType.recentUse.put(BigInt(id), config);
        return config;
    }

    decode(buf: Packet): void {
        while (true) {
            const code = buf.g1();
            if (code === 0) {
                return;
            }

            this.decodeInner(code, buf);
        }
    }

    decodeInner(code: number, buf: Packet): void {
        if (code === 249) {
            const var3 = buf.g1();
            if (this.params === null) {
                const var4 = IntMath.bitceil(var3);
                this.params = new HashTable(var4);
            }
            for (let var5 = 0; var5 < var3; var5++) {
                const var6 = buf.g1() === 1;
                const var7 = buf.g3();
                let var8: Linkable;
                if (var6) {
                    var8 = new StringNode(buf.gjstr());
                } else {
                    var8 = new IntNode(buf.g4());
                }
                this.params.put(BigInt(var7), var8);
            }
        }
    }

    getParamInt(fallback: number, key: number): number {
        if (this.params === null) {
            return fallback;
        } else {
            const node = this.params.find(BigInt(key)) as IntNode | null;
            return node === null ? fallback : node.value;
        }
    }

    getParamString(fallback: string | null, key: number): string | null {
        if (this.params === null) {
            return fallback;
        } else {
            const node = this.params.find(BigInt(key)) as StringNode | null;
            return node === null ? fallback : (node.value as string);
        }
    }
}
