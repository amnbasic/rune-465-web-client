import Linkable2 from '#/datastruct/Linkable2.js';
import LruCache from '#/datastruct/LruCache.js';
import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

// jag::oldscape::configdecoder::VarBitType
export default class VarBitType extends Linkable2 {
    // jag::oldscape::configdecoder::VarBitType::m_pConfigClient
    static configClient: Js5;

    // jag::oldscape::configdecoder::VarBitType::m_recentUse
    static readonly recentUse: LruCache<VarBitType> = new LruCache(64);

    basevar: number = 0;
    startbit: number = 0;
    endbit: number = 0;

    // jag::oldscape::configdecoder::VarBitType::Init
    static init(config: Js5): void {
        VarBitType.configClient = config;
    }

    // 465: varbits are a flat group in idx2 (group 14). getFile(file=id, group=14).
    static getGroupId(id: number): number {
        return id;
    }

    static getFileId(id: number): number {
        return 14;
    }

    // jag::oldscape::configdecoder::VarBitType::List
    static list(id: number): VarBitType {
        const cached = VarBitType.recentUse.find(BigInt(id));
        if (cached !== null) {
            return cached;
        }

        const data = VarBitType.configClient.getFile(VarBitType.getGroupId(id), VarBitType.getFileId(id));
        const type = new VarBitType();
        if (data !== null) {
            type.decode(new Packet(data));
        }

        VarBitType.recentUse.put(BigInt(id), type);
        return type;
    }

    // jag::oldscape::configdecoder::VarBitType::Decode
    decode(buf: Packet): void {
        while (true) {
            const code = buf.g1();
            if (code === 0) {
                return;
            }

            this.decodeInner(code, buf);
        }
    }

    // jag::oldscape::configdecoder::VarBitType::Decode
    decodeInner(code: number, buf: Packet): void {
        if (code === 1) {
            this.basevar = buf!.g2();
            this.startbit = buf!.g1();
            this.endbit = buf!.g1();
        }
    }

    // jag::oldscape::configdecoder::VarBitType::ResetCache
    static resetCache(): void {
        VarBitType.recentUse.clear();
    }
}
