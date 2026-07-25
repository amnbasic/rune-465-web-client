import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import ArrayUtil from '#/util/ArrayUtil.js';

export default class TextureOpMonoAnim extends TextureOp {
    constructor() {
        super(0, true);
    }

    override renderMono(arg0: number): Int32Array {
        const var2 = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            ArrayUtil.method837(var2, 0, Texture.width, Texture.rowLut[arg0]);
        }
        return var2;
    }
}
