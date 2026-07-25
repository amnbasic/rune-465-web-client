import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';

export default class TextureOpGrayscale extends TextureOp {
    constructor() {
        super(1, true);
    }

    override renderMono(arg0: number): Int32Array {
        const var2 = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            const var3 = this.getInputColour(0, arg0);
            const var4 = var3[1];
            const var5 = var3[2];
            const var6 = var3[0];
            for (let var7 = 0; var7 < Texture.width; var7++) {
                var2[var7] = ((var4[var7] + var6[var7] + var5[var7]) / 3) | 0;
            }
        }
        return var2;
    }
}
