import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import PixLoader from '#/graphics/PixLoader.js';
import Packet from '#/io/Packet.js';

export default class TextureOpImage extends TextureOp {
    imageId = -1;
    height = 0;
    width = 0;
    pixels: Int32Array | null = null;

    constructor() {
        super(0, false);
    }

    override getImageId(): number {
        return this.imageId;
    }

    override renderColour(arg0: number): [Int32Array, Int32Array, Int32Array] {
        const var2 = this.colourCache.getFrame(arg0);
        if (this.colourCache.field4310 && this.loadImage()) {
            const var3 = var2[1];
            const var4 = var2[2];
            let var5 = this.width * (this.height === Texture.height ? arg0 : Math.trunc((this.height * arg0) / Texture.height));
            const var6 = var2[0];
            if (this.width === Texture.width) {
                for (let var10 = 0; var10 < Texture.width; var10++) {
                    const var11 = this.pixels![var5++];
                    var4[var10] = (var11 & 0xff) << 4;
                    var3[var10] = (var11 >> 4) & 0xff0;
                    var6[var10] = (var11 >> 12) & 0xff0;
                }
            } else {
                for (let var7 = 0; var7 < Texture.width; var7++) {
                    const var8 = ((var7 * this.width) / Texture.width) | 0;
                    const var9 = this.pixels![var8 + var5];
                    var4[var7] = (var9 & 0xff) << 4;
                    var3[var7] = (var9 >> 4) & 0xff0;
                    var6[var7] = (var9 >> 12) & 0xff0;
                }
            }
        }
        return var2;
    }

    loadImage(): boolean {
        if (this.pixels !== null) {
            return true;
        } else if (this.imageId >= 0) {
            const var1 = PixLoader.makeSoftwarePix32(Texture.sprites, this.imageId)!;
            var1.trim();
            this.width = var1.wi;
            this.height = var1.hi;
            this.pixels = var1.data;
            return true;
        } else {
            return false;
        }
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.imageId = arg0.g2();
        }
    }

    override clearCache(): void {
        super.clearCache();
        this.pixels = null;
    }
}
