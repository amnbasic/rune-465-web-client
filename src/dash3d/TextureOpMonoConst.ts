import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';

export default class TextureOpMonoConst extends TextureOp {
    constructor() {
        super(0, true);
    }

    override renderMono(arg0: number): Int32Array {
        return Texture.columnLut;
    }
}
