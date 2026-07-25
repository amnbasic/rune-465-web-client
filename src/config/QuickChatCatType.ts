import Linkable2 from '#/datastruct/Linkable2.js';
import LruCache from '#/datastruct/LruCache.js';
import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

export default class QuickChatCatType extends Linkable2 {
    static configClient: Js5;
    static globalConfigClient: Js5;
    static readonly recentUse: LruCache<QuickChatCatType> = new LruCache(64);
    description: string | null = null;
    subcategoryIds: Int32Array | null = null;
    subcategoryShortcuts: Int32Array | null = null;
    phraseIds: Int32Array | null = null;
    phraseShortcuts: Int32Array | null = null;

    static init(config: Js5, globalConfig: Js5): void {
        QuickChatCatType.configClient = config;
        QuickChatCatType.globalConfigClient = globalConfig;
    }

    static list(id: number): QuickChatCatType {
        const cached = QuickChatCatType.recentUse.find(BigInt(id));
        if (cached !== null) {
            return cached;
        }

        let data: Uint8Array | null;
        if (id < 32768) {
            data = QuickChatCatType.configClient.getFile(id, 0);
        } else {
            data = QuickChatCatType.globalConfigClient.getFile(id & 0x7fff, 0);
        }

        const type = new QuickChatCatType();
        if (data !== null) {
            type.decode(new Packet(data));
        }
        if (id >= 32768) {
            type.postDecode();
        }

        QuickChatCatType.recentUse.put(BigInt(id), type);
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
        if (code == 1) {
            this.description = buf.gjstr();
        } else if (code == 2) {
            const count = buf.g1();
            this.subcategoryShortcuts = new Int32Array(count);
            this.subcategoryIds = new Int32Array(count);
            for (let i = 0; i < count; i++) {
                this.subcategoryIds[i] = buf.g2();
                const var5 = buf.g1();
                if (var5 == 0) {
                    this.subcategoryShortcuts[i] = -1;
                } else {
                    this.subcategoryShortcuts[i] = var5;
                }
            }
        } else if (code == 3) {
            const count = buf.g1();
            this.phraseShortcuts = new Int32Array(count);
            this.phraseIds = new Int32Array(count);
            for (let i = 0; i < count; i++) {
                this.phraseIds[i] = buf.g2();
                const var8 = buf.g1();
                if (var8 == 0) {
                    this.phraseShortcuts[i] = -1;
                } else {
                    this.phraseShortcuts[i] = var8;
                }
            }
        }
    }

    getSubcategoryByShortcut(arg0: number): number {
        if (this.subcategoryIds === null) {
            return -1;
        }

        for (let i = 0; i < this.subcategoryIds.length; i++) {
            if (this.subcategoryShortcuts![i] == arg0) {
                return this.subcategoryIds[i];
            }
        }
        return -1;
    }

    getPhraseByShortcut(arg0: number): number {
        if (this.phraseIds === null) {
            return -1;
        }

        for (let i = 0; i < this.phraseIds.length; i++) {
            if (this.phraseShortcuts![i] == arg0) {
                return this.phraseIds[i];
            }
        }
        return -1;
    }

    postDecode(): void {
        if (this.phraseIds !== null) {
            for (let i = 0; i < this.phraseIds.length; i++) {
                this.phraseIds[i] |= 0x8000;
            }
        }
        if (this.subcategoryIds !== null) {
            for (let i = 0; i < this.subcategoryIds.length; i++) {
                this.subcategoryIds[i] |= 0x8000;
            }
        }
    }
}
