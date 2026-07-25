import Linkable2 from '#/datastruct/Linkable2.js';
import LruCache from '#/datastruct/LruCache.js';
import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

export default class FluType extends Linkable2 {
    // jag::oldscape::configdecoder::FluType::m_pConfigClient
    static configClient: Js5;

    static readonly recentUse: LruCache<FluType> = new LruCache(64);
    colour: number = 0;
    material: number = -1;
    hue: number = 0;
    saturation: number = 0;
    lightness: number = 0;
    chroma: number = 0;

    // jag::oldscape::configdecoder::FluType::Init
    static init(config: Js5): void {
        FluType.configClient = config;
    }

    // jag::oldscape::configdecoder::FluType::List
    static list(id: number): FluType {
        const cached = FluType.recentUse.find(BigInt(id));
        if (cached !== null) {
            return cached;
        }

        const data = FluType.configClient.getFile(id, 1);
        const type = new FluType();
        if (data !== null) {
            type.decode(id, new Packet(data));
        }

        FluType.recentUse.put(BigInt(id), type);
        return type;
    }

    // jag::oldscape::configdecoder::FluType::Decode
    decode(id: number, buf: Packet): void {
        while (true) {
            const code = buf.g1();
            if (code === 0) {
                return;
            }

            this.decodeInner(code, buf, id);
        }
    }

    // jag::oldscape::configdecoder::FluType::Decode
    decodeInner(code: number, buf: Packet, id: number): void {
        if (code == 1) {
            this.colour = buf.g3();
            this.getHsl(this.colour);
        } else if (code == 2) {
            this.material = buf.g2();
            if (this.material == 65535) {
                this.material = -1;
            }
        } else if (code == 3) {
            // materialscale
            buf.g2();
        }
    }

    // jag::oldscape::configdecoder::FluType::GetHsl
    getHsl(arg0: number): void {
        const var2 = ((arg0 >> 16) & 0xff) / 256.0;
        const var4 = ((arg0 >> 8) & 0xff) / 256.0;
        const var6 = (arg0 & 0xff) / 256.0;
        let var8 = var2;
        if (var2 > var4) {
            var8 = var4;
        }
        let var10 = var2;
        if (var2 < var4) {
            var10 = var4;
        }
        if (var6 > var10) {
            var10 = var6;
        }
        if (var6 < var8) {
            var8 = var6;
        }
        let var12 = 0.0;
        let var14 = 0.0;
        const var16 = (var10 + var8) / 2.0;
        this.lightness = Math.trunc(var16 * 256.0);
        if (this.lightness < 0) {
            this.lightness = 0;
        } else if (this.lightness > 255) {
            this.lightness = 255;
        }
        if (var8 !== var10) {
            if (var16 < 0.5) {
                var12 = (var10 - var8) / (var8 + var10);
            }
            if (var2 === var10) {
                var14 = (var4 - var6) / (var10 - var8);
            } else if (var4 === var10) {
                var14 = (var6 - var2) / (var10 - var8) + 2.0;
            } else if (var6 === var10) {
                var14 = (var2 - var4) / (-var8 + var10) + 4.0;
            }
            if (var16 >= 0.5) {
                var12 = (var10 - var8) / (2.0 - var10 - var8);
            }
        }
        this.saturation = Math.trunc(var12 * 256.0);
        const var18 = var14 / 6.0;
        if (this.saturation < 0) {
            this.saturation = 0;
        } else if (this.saturation > 255) {
            this.saturation = 255;
        }
        if (var16 > 0.5) {
            this.chroma = Math.trunc(var12 * (1.0 - var16) * 512.0);
        } else {
            this.chroma = Math.trunc(var12 * var16 * 512.0);
        }
        if (this.chroma < 1) {
            this.chroma = 1;
        }
        this.hue = Math.trunc(var18 * this.chroma);
    }

    static resetCache(): void {
        FluType.recentUse.clear();
    }
}
