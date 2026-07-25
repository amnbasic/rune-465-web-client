import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';
import ArrayUtil from '#/util/ArrayUtil.js';

export default class TextureOpStripes extends TextureOp {
    stripeCount: number = 10;
    stripeWidth: number = 2048;
    orientation: number = 0;
    stripeBounds: Int32Array = new Int32Array(0);
    stripeFillBounds: Int32Array = new Int32Array(0);

    constructor() {
        super(0, true);
    }

    override postDecode(): void {
        this.buildStripes();
    }

    buildStripes(): void {
        this.stripeFillBounds = new Int32Array(this.stripeCount + 1);
        this.stripeBounds = new Int32Array(this.stripeCount + 1);
        let pos = 0;
        if (this.stripeCount === 0) {
            throw new Error();
        }
        const step = (4096 / this.stripeCount) | 0;
        const fill = Math.imul(this.stripeWidth, step) >> 12;
        for (let i = 0; i < this.stripeCount; i++) {
            this.stripeBounds[i] = pos;
            this.stripeFillBounds[i] = pos + fill;
            pos += step;
        }
        this.stripeBounds[this.stripeCount] = 4096;
        this.stripeFillBounds[this.stripeCount] = this.stripeFillBounds[0] + 4096;
    }

    override renderMono(arg0: number): Int32Array {
        const var2 = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            const var3 = Texture.rowLut[arg0];
            if (this.orientation === 0) {
                let var4 = 0;
                for (let var5 = 0; var5 < this.stripeCount; var5++) {
                    if (var3 >= this.stripeBounds[var5] && var3 < this.stripeBounds[var5 + 1]) {
                        if (this.stripeFillBounds[var5] > var3) {
                            var4 = 4096;
                        }
                        break;
                    }
                }
                ArrayUtil.method837(var2, 0, Texture.width, var4);
            } else {
                for (let var6 = 0; var6 < Texture.width; var6++) {
                    let var7 = 0;
                    let var8 = 0;
                    const var9 = Texture.columnLut[var6];
                    const var10 = this.orientation;
                    if (var10 === 1) {
                        var7 = var9;
                    } else if (var10 === 2) {
                        var7 = ((var3 + var9 - 4096) >> 1) + 2048;
                    } else if (var10 === 3) {
                        var7 = ((var9 - var3) >> 1) + 2048;
                    }
                    for (let var11 = 0; var11 < this.stripeCount; var11++) {
                        if (var7 >= this.stripeBounds[var11] && this.stripeBounds[var11 + 1] > var7) {
                            if (this.stripeFillBounds[var11] > var7) {
                                var8 = 4096;
                            }
                            break;
                        }
                    }
                    var2[var6] = var8;
                }
            }
        }
        return var2;
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.stripeCount = arg0.g1();
        } else if (arg1 === 1) {
            this.stripeWidth = arg0.g2();
        } else if (arg1 === 2) {
            this.orientation = arg0.g1();
        }
    }
}
