import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpFrame extends TextureOp {
    borderWidth = 585;

    constructor() {
        super(0, true);
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.borderWidth = arg0.g2();
        }
    }

    override renderMono(arg0: number): Int32Array {
        const var2 = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            const var3 = Texture.rowLut[arg0];
            for (let var4 = 0; var4 < Texture.width; var4++) {
                const var5 = Texture.columnLut[var4];
                if (var5 > this.borderWidth && 4096 - this.borderWidth > var5 && var3 > 2048 - this.borderWidth && var3 < this.borderWidth + 2048) {
                    const var6 = 2048 - var5;
                    const var7 = var6 >= 0 ? var6 : -var6;
                    const var8 = var7 << 12;
                    if (2048 - this.borderWidth === 0) {
                        throw new Error();
                    }
                    const var9 = (var8 / (2048 - this.borderWidth)) | 0;
                    var2[var4] = 4096 - var9;
                } else if (2048 - this.borderWidth < var5 && this.borderWidth + 2048 > var5) {
                    const var10 = var3 - 2048;
                    const var11 = var10 < 0 ? -var10 : var10;
                    const var12 = var11 - this.borderWidth;
                    const var13 = var12 << 12;
                    if (2048 - this.borderWidth === 0) {
                        throw new Error();
                    }
                    var2[var4] = (var13 / (2048 - this.borderWidth)) | 0;
                } else if (var3 < this.borderWidth || var3 > 4096 - this.borderWidth) {
                    const var14 = var5 - 2048;
                    const var15 = var14 < 0 ? -var14 : var14;
                    const var16 = var15 - this.borderWidth;
                    const var17 = var16 << 12;
                    if (2048 - this.borderWidth === 0) {
                        throw new Error();
                    }
                    var2[var4] = (var17 / (2048 - this.borderWidth)) | 0;
                } else if (this.borderWidth <= var5 && var5 <= 4096 - this.borderWidth) {
                    var2[var4] = 0;
                } else {
                    const var18 = 2048 - var3;
                    const var19 = var18 < 0 ? -var18 : var18;
                    const var20 = var19 << 12;
                    if (2048 - this.borderWidth === 0) {
                        throw new Error();
                    }
                    const var21 = (var20 / (2048 - this.borderWidth)) | 0;
                    var2[var4] = 4096 - var21;
                }
            }
        }
        return var2;
    }
}
