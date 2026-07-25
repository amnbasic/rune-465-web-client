import Linkable2 from '#/datastruct/Linkable2.js';
import LruCache from '#/datastruct/LruCache.js';
import Packet from '#/io/Packet.js';
import JagString from '#/jstring/JagString.js';
import type Js5 from '#/js5/Js5.js';
import type QuickChatDynamicProvider from '#/config/QuickChatDynamicProvider.js';

export default class QuickChatPhraseType extends Linkable2 {
    static configClient: Js5;
    static globalConfigClient: Js5;
    static readonly recentUse: LruCache<QuickChatPhraseType> = new LruCache(64);
    static dynamicProvider: QuickChatDynamicProvider | null = null;
    dynamicCommands: Int32Array | null = null;
    autoResponses: Int32Array | null = null;
    textSegments: string[] | null = null;
    dynamicCommandParams: (Int32Array | null)[] | null = null;

    // todo: rename
    static readonly ENCODE_BIT_LENGTHS: Int32Array = new Int32Array([2, 2, 4, 0, 1, 8, 0, 0, 0, 0, 2]);
    static readonly DECODE_BIT_LENGTHS: Int32Array = new Int32Array([2, 2, 4, 2, 1, 8, 4, 1, 4, 4, 2]);
    static readonly DYNAMIC_PARAM_COUNTS: Int32Array = new Int32Array([1, 0, 0, 0, 1, 0, 2, 1, 1, 1, 0]);

    static init(globalConfig: Js5, arg1: QuickChatDynamicProvider | null, config: Js5): void {
        QuickChatPhraseType.configClient = config;
        QuickChatPhraseType.dynamicProvider = arg1;
        QuickChatPhraseType.globalConfigClient = globalConfig;
    }

    static list(id: number): QuickChatPhraseType {
        const cached = QuickChatPhraseType.recentUse.find(BigInt(id));
        if (cached !== null) {
            return cached;
        }

        let data: Uint8Array | null;
        if (id >= 32768) {
            data = QuickChatPhraseType.globalConfigClient.getFile(id & 0x7fff, 1);
        } else {
            data = QuickChatPhraseType.configClient.getFile(id, 1);
        }

        const type = new QuickChatPhraseType();
        if (data !== null) {
            type.decode(new Packet(data));
        }
        if (id >= 32768) {
            type.postDecode();
        }

        QuickChatPhraseType.recentUse.put(BigInt(id), type);
        return type;
    }

    decode(buf: Packet): void {
        while (true) {
            const code = buf.g1();
            if (code === 0) {
                return;
            }

            this.decodeInner(buf, code);
        }
    }

    decodeInner(buf: Packet, code: number): void {
        if (code == 1) {
            this.textSegments = buf.gjstr().split('<');
        } else if (code == 2) {
            const count = buf.g1();
            this.autoResponses = new Int32Array(count);
            for (let i = 0; i < count; i++) {
                this.autoResponses[i] = buf.g2();
            }
        } else if (code == 3) {
            const count = buf.g1();
            this.dynamicCommandParams = new Array(count);
            this.dynamicCommands = new Int32Array(count);
            for (let i = 0; i < count; i++) {
                const var7 = buf.g2();
                this.dynamicCommands[i] = var7;
                this.dynamicCommandParams[i] = new Int32Array(QuickChatPhraseType.DYNAMIC_PARAM_COUNTS[var7]);
                for (let var8 = 0; var8 < QuickChatPhraseType.DYNAMIC_PARAM_COUNTS[var7]; var8++) {
                    this.dynamicCommandParams[i]![var8] = buf.g2();
                }
            }
        }
    }

    packTransmitValues(arg0: Packet, arg1: Int32Array | number[]): void {
        if (this.dynamicCommands === null) {
            return;
        }

        for (let var3 = 0; var3 < this.dynamicCommands.length; var3++) {
            if (var3 >= arg1.length) {
                return;
            }
            const var4 = QuickChatPhraseType.ENCODE_BIT_LENGTHS[this.getDynamicCommand(var3)];
            if (var4 > 0) {
                arg0.pVarLong(var4, arg1[var3]);
            }
        }
    }

    static formatDynamicValue(arg0: bigint, arg1: number, arg2: Int32Array | null): string {
        if (QuickChatPhraseType.dynamicProvider !== null) {
            const var4 = QuickChatPhraseType.dynamicProvider.formatDynamicValue(arg2, arg1, arg0);
            if (var4 !== null) {
                return var4;
            }
        }
        return arg1 == 5 ? JagString.toRawUsername(arg0)!.toScreenName().toString() : JagString.valueOf(arg0).toString();
    }

    getText(buf: Packet): string {
        const text: string[] = [];
        if (this.dynamicCommands !== null) {
            for (let var3 = 0; var3 < this.dynamicCommands.length; var3++) {
                text.push(this.textSegments![var3]);
                text.push(QuickChatPhraseType.formatDynamicValue(buf.gVarLong(QuickChatPhraseType.DECODE_BIT_LENGTHS[this.dynamicCommands[var3]]), this.dynamicCommands[var3], this.dynamicCommandParams![var3]));
            }
        }
        text.push(this.textSegments![this.textSegments!.length - 1]);
        return text.join('');
    }

    getTextDisplay(): string {
        if (this.textSegments === null) {
            return '';
        }

        const text: string[] = [this.textSegments[0]];
        for (let var2 = 1; var2 < this.textSegments.length; var2++) {
            text.push('...');
            text.push(this.textSegments[var2]);
        }
        return text.join('');
    }

    length(): number {
        return this.dynamicCommands === null ? 0 : this.dynamicCommands.length;
    }

    getDynamicCommand(arg0: number): number {
        return this.dynamicCommands === null || arg0 < 0 || arg0 > this.dynamicCommands.length ? -1 : this.dynamicCommands[arg0];
    }

    getDynamicCommandParam(arg0: number, arg1: number): number {
        if (this.dynamicCommands === null || arg1 < 0 || this.dynamicCommands.length < arg1) {
            return -1;
        } else if (this.dynamicCommandParams![arg1] === null || arg0 < 0 || arg0 > this.dynamicCommandParams![arg1]!.length) {
            return -1;
        } else {
            return this.dynamicCommandParams![arg1]![arg0];
        }
    }

    postDecode(): void {
        if (this.autoResponses !== null) {
            for (let var1 = 0; var1 < this.autoResponses.length; var1++) {
                this.autoResponses[var1] |= 0x8000;
            }
        }
    }
}
