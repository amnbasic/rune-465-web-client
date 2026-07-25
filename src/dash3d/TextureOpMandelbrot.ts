import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpMandelbrot extends TextureOp {
    zoom = 1365;
    maxIterations = 20;
    centerX = 0;
    centerY = 0;

    constructor() {
        super(0, true);
    }

    override renderMono(arg0: number): Int32Array {
        const var2 = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            for (let var3 = 0; var3 < Texture.width; var3++) {
                if (this.zoom === 0) {
                    throw new Error();
                }
                const var4 = (this.centerX + (((Texture.columnLut[var3] << 12) / this.zoom) | 0)) | 0;
                const var5 = (this.centerY + (((Texture.rowLut[arg0] << 12) / this.zoom) | 0)) | 0;
                let var6 = var4;
                let var7 = Math.imul(var4, var4) >> 12;
                let var8 = var5;
                let var9 = Math.imul(var5, var5) >> 12;
                let var10 = 0;
                while (((var9 + var7) | 0) < 16384 && var10 < this.maxIterations) {
                    var8 = (Math.imul(Math.imul(var8, var6) >> 12, 2) + var5) | 0;
                    var6 = (var4 + var7 - var9) | 0;
                    var10++;
                    var9 = Math.imul(var8, var8) >> 12;
                    var7 = Math.imul(var6, var6) >> 12;
                }
                var2[var3] = this.maxIterations - 1 > var10 ? ((var10 << 12) / this.maxIterations) | 0 : 0;
            }
        }
        return var2;
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.zoom = arg0.g2();
        } else if (arg1 === 1) {
            this.maxIterations = arg0.g2();
        } else if (arg1 === 2) {
            this.centerX = arg0.g2();
        } else if (arg1 === 3) {
            this.centerY = arg0.g2();
        }
    }
}
