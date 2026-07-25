import Linkable2 from '#/datastruct/Linkable2.js';
import LruCache from '#/datastruct/LruCache.js';

import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

export default class ParamType extends Linkable2 {
    static configClient: Js5;
    static readonly recentUse: LruCache<ParamType> = new LruCache(64);
    type: number = 0;
    defaultInt: number = 0;
    defaultString: string | null = null;

    static init(config: Js5): void {
        ParamType.configClient = config;
    }

    static list(id: number): ParamType {
        const cached = ParamType.recentUse.find(BigInt(id));
        if (cached !== null) {
            return cached;
        }

        const data = ParamType.configClient.getFile(id, 11);
        const type = new ParamType();
        if (data !== null) {
            type.decode(new Packet(data));
        }

        ParamType.recentUse.put(BigInt(id), type);
        return type;
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
        if (code === 1) {
            this.type = buf!.g1();
        } else if (code === 2) {
            this.defaultInt = buf!.g4();
        } else if (code === 5) {
            this.defaultString = buf!.gjstr();
        }
    }

    isString(): boolean {
        return this.type == 115;
    }
}
