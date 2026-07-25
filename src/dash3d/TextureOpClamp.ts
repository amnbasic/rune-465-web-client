import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpClamp extends TextureOp {
    maxValue = 4096;
    minValue = 0;

    constructor() {
        super(1, false);
    }

    override renderMono(arg0: number): Int32Array {
        const var2 = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            const var3 = this.getInputMono(arg0, 0);
            for (let var4 = 0; var4 < Texture.width; var4++) {
                const var5 = var3[var4];
                if (this.minValue > var5) {
                    var2[var4] = this.minValue;
                } else if (this.maxValue >= var5) {
                    var2[var4] = var5;
                } else {
                    var2[var4] = this.maxValue;
                }
            }
        }
        return var2;
    }

    override renderColour(arg0: number): [Int32Array, Int32Array, Int32Array] {
        const var2 = this.colourCache.getFrame(arg0);
        if (this.colourCache.field4310) {
            const var3 = this.getInputColour(0, arg0);
            const var4 = var3[0];
            const var5 = var3[2];
            const var6 = var3[1];
            const var7 = var2[1];
            const var8 = var2[2];
            const var9 = var2[0];
            for (let var10 = 0; var10 < Texture.width; var10++) {
                const var11 = var4[var10];
                const var12 = var6[var10];
                const var13 = var5[var10];
                if (var11 < this.minValue) {
                    var9[var10] = this.minValue;
                } else if (this.maxValue >= var11) {
                    var9[var10] = var11;
                } else {
                    var9[var10] = this.maxValue;
                }
                if (this.minValue > var12) {
                    var7[var10] = this.minValue;
                } else if (this.maxValue < var12) {
                    var7[var10] = this.maxValue;
                } else {
                    var7[var10] = var12;
                }
                if (var13 < this.minValue) {
                    var8[var10] = this.minValue;
                } else if (var13 > this.maxValue) {
                    var8[var10] = this.maxValue;
                } else {
                    var8[var10] = var13;
                }
            }
        }
        return var2;
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.minValue = arg0.g2();
        } else if (arg1 === 1) {
            this.maxValue = arg0.g2();
        } else if (arg1 === 2) {
            this.monochrome = arg0.g1() === 1;
        }
    }
}
