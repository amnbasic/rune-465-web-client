import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';
import Statics from '#/deob/Statics.js';

export default class TextureOpStar extends TextureOp {
    centerY: number = 0;
    modulation: number = 8192;
    centerY2: number = 2048;
    frequency: number = 12288;
    thickness: number = 4096;
    centerX: number = 2048;
    centerX2: number = 0;

    constructor() {
        super(0, true);
    }

    testLine2(arg0: number, arg1: number): boolean {
        const var3 = Math.imul(this.frequency, (arg1 + arg0) | 0) >> 12;
        const var4 = Statics.field2920![(Math.imul(var3, 255) >> 12) & 0xff];
        if (this.frequency === 0) {
            throw new Error();
        }
        const var5 = ((var4 << 12) / this.frequency) | 0;
        if (this.modulation === 0) {
            throw new Error();
        }
        const var6 = ((var5 << 12) / this.modulation) | 0;
        const var7 = Math.imul(this.thickness, var6) >> 12;
        return ((arg1 - arg0) | 0) < var7 && -var7 < ((arg1 - arg0) | 0);
    }

    override postDecode(): void {
        Statics.method740();
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.centerX = arg0.g2();
        } else if (arg1 === 1) {
            this.centerY = arg0.g2();
        } else if (arg1 === 2) {
            this.centerX2 = arg0.g2();
        } else if (arg1 === 3) {
            this.centerY2 = arg0.g2();
        } else if (arg1 === 4) {
            this.frequency = arg0.g2();
        } else if (arg1 === 5) {
            this.thickness = arg0.g2();
        } else if (arg1 === 6) {
            this.modulation = arg0.g2();
        }
    }

    override renderMono(arg0: number): Int32Array {
        const var2 = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            const var3 = Texture.rowLut[arg0] - 2048;
            for (let var4 = 0; var4 < Texture.width; var4++) {
                const var5 = Texture.columnLut[var4] - 2048;
                const var6 = var5 + this.centerX;
                const var7 = this.centerY + var3;
                const var8 = var7 >= -2048 ? var7 : var7 + 4096;
                const var9 = var8 > 2048 ? var8 - 4096 : var8;
                const var10 = var6 < -2048 ? var6 + 4096 : var6;
                const var11 = var10 <= 2048 ? var10 : var10 - 4096;
                const var12 = this.centerY2 + var3;
                const var13 = var12 < -2048 ? var12 + 4096 : var12;
                const var14 = var13 <= 2048 ? var13 : var13 - 4096;
                const var15 = this.centerX2 + var5;
                const var16 = var15 >= -2048 ? var15 : var15 + 4096;
                const var17 = var16 <= 2048 ? var16 : var16 - 4096;
                var2[var4] = this.testLine1(var11, var9) || this.testLine2(var17, var14) ? 4096 : 0;
            }
        }
        return var2;
    }

    testLine1(arg0: number, arg1: number): boolean {
        const var3 = Math.imul((arg1 - arg0) | 0, this.frequency) >> 12;
        const var4 = Statics.field2920![(Math.imul(var3, 255) >> 12) & 0xff];
        if (this.frequency === 0) {
            throw new Error();
        }
        const var5 = ((var4 << 12) / this.frequency) | 0;
        if (this.modulation === 0) {
            throw new Error();
        }
        const var6 = ((var5 << 12) / this.modulation) | 0;
        const var7 = Math.imul(this.thickness, var6) >> 12;
        return var7 > ((arg0 + arg1) | 0) && -var7 < ((arg1 + arg0) | 0);
    }
}
