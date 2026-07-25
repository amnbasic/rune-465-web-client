import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpBrick extends TextureOp {
    mortarWidth = 204;
    brickHeight = 1;
    brickWidth = 1;

    constructor() {
        super(0, true);
    }

    override renderMono(arg0: number): Int32Array {
        const var2 = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            for (let var3 = 0; var3 < Texture.width; var3++) {
                const var4 = Texture.columnLut[var3];
                const var5 = Texture.rowLut[arg0];
                let var6 = Math.imul(var4, this.brickWidth) >> 12;
                const var7 = Math.imul(this.brickHeight, var5) >> 12;
                if (this.brickWidth === 0) {
                    throw new Error();
                }
                const var8 = Math.imul(this.brickWidth, var4 % ((4096 / this.brickWidth) | 0));
                if (this.brickHeight === 0) {
                    throw new Error();
                }
                const var9 = Math.imul(var5 % ((4096 / this.brickHeight) | 0), this.brickHeight);
                if (var9 < this.mortarWidth) {
                    for (var6 -= var7; var6 < 0; var6 += 4) {}
                    while (var6 > 3) {
                        var6 -= 4;
                    }
                    if (var6 !== 1) {
                        var2[var3] = 0;
                        continue;
                    }
                    if (var8 < this.mortarWidth) {
                        var2[var3] = 0;
                        continue;
                    }
                }
                if (this.mortarWidth > var8) {
                    let var10: number;
                    for (var10 = var6 - var7; var10 < 0; var10 += 4) {}
                    while (var10 > 3) {
                        var10 -= 4;
                    }
                    if (var10 > 0) {
                        var2[var3] = 0;
                        continue;
                    }
                }
                var2[var3] = 4096;
            }
        }
        return var2;
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.brickWidth = arg0.g1();
        } else if (arg1 === 1) {
            this.brickHeight = arg0.g1();
        } else if (arg1 === 2) {
            this.mortarWidth = arg0.g2();
        }
    }
}
