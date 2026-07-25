import Linkable2 from '#/datastruct/Linkable2.js';
import LruCache from '#/datastruct/LruCache.js';
import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

// jag::oldscape::configdecoder::VarpType
export default class VarpType extends Linkable2 {
    // jag::oldscape::configdecoder::VarpType::m_pConfigClient
    static configClient: Js5;

    // jag::oldscape::configdecoder::VarpType::m_numDefinitions
    static numDefinitions: number = 0;

    // jag::oldscape::configdecoder::VarpType::m_recentUse
    static readonly recentUse: LruCache<VarpType> = new LruCache(64);

    clientcode: number = 0;

    // jag::oldscape::configdecoder::VarpType::Init
    static init(config: Js5): void {
        VarpType.configClient = config;
        VarpType.numDefinitions = VarpType.configClient.getFileIdLimit(16);
    }

    // jag::oldscape::configdecoder::VarpType::List
    static list(id: number): VarpType {
        const cached = VarpType.recentUse.find(BigInt(id));
        if (cached !== null) {
            return cached;
        }

        const data = VarpType.configClient.getFile(id, 16);
        const type = new VarpType();
        if (data !== null) {
            type.decode(new Packet(data));
        }

        VarpType.recentUse.put(BigInt(id), type);
        return type;
    }

    // jag::oldscape::configdecoder::VarpType::Decode
    decode(buf: Packet): void {
        while (true) {
            const code = buf.g1();
            if (code === 0) {
                return;
            }

            this.decodeInner(code, buf);
        }
    }

    // jag::oldscape::configdecoder::VarpType::Decode
    decodeInner(code: number, buf: Packet): void {
        if (code === 5) {
            this.clientcode = buf.g2();
        }
    }

    // jag::oldscape::configdecoder::VarpType::ResetCache
    static resetCache(): void {
        VarpType.recentUse.clear();
    }
}
