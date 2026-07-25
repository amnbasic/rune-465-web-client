import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';

export default class TextureOpHashNoise extends TextureOp {
    constructor() {
        super(0, true);
    }

    override renderMono(arg0: number): Int32Array {
        const out = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            const y = Texture.rowLut[arg0];
            for (let x = 0; x < Texture.width; x++) {
                out[x] = this.hashXY(y, Texture.columnLut[x]) % 4096;
            }
        }
        return out;
    }

    hashXY(arg0: number, arg1: number): number {
        const v = arg1 + arg0 * 57;
        const h = v ^ (v << 1);
        return 4096 - ((((Math.imul(Math.imul(Math.imul(h, 15731), h) + 789221, h) + 1376312589) & 0x7fffffff) / 262144) | 0);
    }
}
