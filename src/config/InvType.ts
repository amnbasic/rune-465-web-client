import Linkable2 from '#/datastruct/Linkable2.js';
import LruCache from '#/datastruct/LruCache.js';

import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

// jag::oldscape::configdecoder::InvType
export default class InvType extends Linkable2 {
    // jag::oldscape::configdecoder::InvType::m_pConfigClient
    static configClient: Js5;

    // jag::oldscape::configdecoder::InvType::m_recentUse
    static readonly recentUse: LruCache<InvType> = new LruCache(64);

    size: number = 0;

    // jag::oldscape::configdecoder::InvType::Init
    static init(config: Js5): void {
        InvType.configClient = config;
    }

    // jag::oldscape::configdecoder::InvType::List
    static list(id: number): InvType {
        const cached = InvType.recentUse.find(BigInt(id));
        if (cached !== null) {
            return cached;
        }

        const data = InvType.configClient.getFile(id, 5);
        const type = new InvType();
        if (data !== null) {
            type.decode(new Packet(data));
        }

        InvType.recentUse.put(BigInt(id), type);
        return type;
    }

    // jag::oldscape::configdecoder::InvType::Decode
    decode(buf: Packet): void {
        while (true) {
            const code = buf.g1();
            if (code === 0) {
                return;
            }

            this.decodeInner(code, buf);
        }
    }

    // jag::oldscape::configdecoder::InvType::Decode
    decodeInner(code: number, buf: Packet): void {
        if (code === 2) {
            this.size = buf.g2();
        }
    }
}
