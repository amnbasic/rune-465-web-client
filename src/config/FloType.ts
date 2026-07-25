import Linkable2 from '#/datastruct/Linkable2.js';
import LruCache from '#/datastruct/LruCache.js';
import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

// jag::oldscape::configdecoder::FloType
export default class FloType extends Linkable2 {
    // jag::oldscape::configdecoder::FloType::m_pConfigClient
    static configClient: Js5;

    static numDefinitions: number = 0;
    static readonly recentUse: LruCache<FloType> = new LruCache(64);
    colour: number = 0;
    material: number = -1;
    occlude: boolean = true;
    mapcolour: number = -1;
    static defaultWater: number = 0;
    waterfogcolour: number = 1190717;
    waterfogscale: number = 16;

    static init(config: Js5): void {
        FloType.configClient = config;
        FloType.numDefinitions = FloType.configClient.getFileIdLimit(4);
    }

    // jag::oldscape::configdecoder::FloType::List
    static list(id: number): FloType {
        const cached = FloType.recentUse.find(BigInt(id));
        if (cached !== null) {
            return cached;
        }

        const data = FloType.configClient.getFile(id, 4);
        const type = new FloType();
        if (data !== null) {
            type.decode(new Packet(data), id);
        }

        FloType.recentUse.put(BigInt(id), type);
        return type;
    }

    // jag::oldscape::configdecoder::FloType::Decode
    decode(buf: Packet, id: number): void {
        while (true) {
            const code = buf.g1();
            if (code === 0) {
                return;
            }

            this.decodeInner(id, code, buf);
        }
    }

    // jag::oldscape::configdecoder::FloType::Decode
    decodeInner(id: number, code: number, buf: Packet): void {
        if (code == 1) {
            this.colour = FloType.getHsl(buf.g3());
        } else if (code == 2) {
            this.material = buf.g1();
        } else if (code == 3) {
            this.material = buf.g2();
            if (this.material == 65535) {
                this.material = -1;
            }
        } else if (code == 5) {
            this.occlude = false;
        } else if (code == 7) {
            this.mapcolour = FloType.getHsl(buf.g3());
        } else if (code == 8) {
            FloType.defaultWater = id;
        } else if (code == 9) {
            // materialscale
            buf.g2();
        } else if (code == 10) {
            // hardshadow
        } else if (code == 11) {
            // priority
            buf.g1();
        } else if (code == 12) {
            // blend
        } else if (code == 13) {
            this.waterfogcolour = buf.g3();
        } else if (code == 14) {
            this.waterfogscale = buf.g1();
        }
    }

    // jag::oldscape::configdecoder::FloType::GetHsl
    static getHsl(arg0: number): number {
        return arg0 == 16711935 ? -1 : FloType.getColour(arg0);
    }

    static getColour(arg0: number): number {
        const var1 = ((arg0 >> 8) & 0xff) / 256.0;
        const var3 = ((arg0 >> 16) & 0xff) / 256.0;
        const var5 = (arg0 & 0xff) / 256.0;
        let var7 = var3;
        if (var3 < var1) {
            var7 = var1;
        }
        let var9 = 0.0;
        let var11 = var3;
        if (var1 < var3) {
            var11 = var1;
        }
        if (var7 < var5) {
            var7 = var5;
        }
        if (var11 > var5) {
            var11 = var5;
        }
        let var13 = 0.0;
        const var15 = (var11 + var7) / 2.0;
        if (var11 !== var7) {
            if (var15 < 0.5) {
                var9 = (var7 - var11) / (var7 + var11);
            }
            if (var3 === var7) {
                var13 = (var1 - var5) / (var7 - var11);
            } else if (var7 === var1) {
                var13 = (var5 - var3) / (var7 - var11) + 2.0;
            } else if (var5 === var7) {
                var13 = (var3 - var1) / (-var11 + var7) + 4.0;
            }
            if (var15 >= 0.5) {
                var9 = (var7 - var11) / (2.0 - var11 - var7);
            }
        }
        const var17 = var13 / 6.0;
        let var19 = Math.trunc(var9 * 256.0);
        const var20 = Math.trunc(var17 * 256.0);
        if (var19 < 0) {
            var19 = 0;
        } else if (var19 > 255) {
            var19 = 255;
        }
        let var21 = Math.trunc(var15 * 256.0);
        if (var21 < 0) {
            var21 = 0;
        } else if (var21 > 255) {
            var21 = 255;
        }
        if (var21 > 243) {
            var19 >>= 4;
        } else if (var21 > 217) {
            var19 >>= 3;
        } else if (var21 > 192) {
            var19 >>= 2;
        } else if (var21 > 179) {
            var19 >>= 1;
        }
        return ((var19 >> 5) << 7) + ((var20 >> 2) << 10) + (var21 >> 1);
    }

    static resetCache(): void {
        FloType.recentUse.clear();
    }
}
