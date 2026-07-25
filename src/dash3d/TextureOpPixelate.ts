import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpPixelate extends TextureOp {
    pixelSizeX = 4;
    pixelSizeY = 4;

    constructor() {
        super(1, false);
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.pixelSizeX = arg0.g1();
        } else if (arg1 === 1) {
            this.pixelSizeY = arg0.g1();
        }
    }

    override renderMono(arg0: number): Int32Array {
        const var2 = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            if (this.pixelSizeX === 0) {
                throw new Error();
            }
            const var3 = (Texture.width / this.pixelSizeX) | 0;
            if (this.pixelSizeY === 0) {
                throw new Error();
            }
            const var4 = (Texture.height / this.pixelSizeY) | 0;
            let var6: Int32Array;
            if (var4 > 0) {
                const var5 = arg0 % var4;
                var6 = this.getInputMono((Math.imul(var5, Texture.height) / var4) | 0, 0);
            } else {
                var6 = this.getInputMono(0, 0);
            }
            for (let var7 = 0; var7 < Texture.width; var7++) {
                if (var3 <= 0) {
                    var2[var7] = var6[0];
                } else {
                    const var8 = var7 % var3;
                    var2[var7] = var6[(Math.imul(var8, Texture.width) / var3) | 0];
                }
            }
        }
        return var2;
    }

    override renderColour(arg0: number): [Int32Array, Int32Array, Int32Array] {
        const var2 = this.colourCache.getFrame(arg0);
        if (this.colourCache.field4310) {
            if (this.pixelSizeY === 0) {
                throw new Error();
            }
            const var3 = (Texture.height / this.pixelSizeY) | 0;
            if (this.pixelSizeX === 0) {
                throw new Error();
            }
            const var4 = (Texture.width / this.pixelSizeX) | 0;
            let var6: [Int32Array, Int32Array, Int32Array];
            if (var3 > 0) {
                const var5 = arg0 % var3;
                var6 = this.getInputColour(0, (Math.imul(Texture.height, var5) / var3) | 0);
            } else {
                var6 = this.getInputColour(0, 0);
            }
            const var7 = var6[0];
            const var8 = var6[1];
            const var9 = var6[2];
            const var10 = var2[0];
            const var11 = var2[2];
            const var12 = var2[1];
            for (let var13 = 0; var13 < Texture.width; var13++) {
                let var15: number;
                if (var4 > 0) {
                    const var14 = var13 % var4;
                    var15 = (Math.imul(Texture.width, var14) / var4) | 0;
                } else {
                    var15 = 0;
                }
                var10[var13] = var7[var15];
                var12[var13] = var8[var15];
                var11[var13] = var9[var15];
            }
        }
        return var2;
    }
}
