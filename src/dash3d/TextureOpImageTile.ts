import Texture from '#/dash3d/Texture.js';
import TextureOpImage from '#/dash3d/TextureOpImage.js';

export default class TextureOpImageTile extends TextureOpImage {
    override renderColour(arg0: number): [Int32Array, Int32Array, Int32Array] {
        const var2 = this.colourCache.getFrame(arg0);
        if (this.colourCache.field4310 && this.loadImage()) {
            const var3 = var2[1];
            const var4 = var2[0];
            const var5 = var2[2];
            const var6 = (arg0 % this.height) * this.height;
            for (let var7 = 0; var7 < Texture.width; var7++) {
                const var8 = this.pixels![(var7 % this.width) + var6];
                var5[var7] = (var8 & 0xff) << 4;
                var3[var7] = (var8 >> 4) & 0xff0;
                var4[var7] = (var8 >> 12) & 0xff0;
            }
        }
        return var2;
    }
}
