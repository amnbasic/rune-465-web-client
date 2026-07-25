import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';
import ArrayUtil from '#/util/ArrayUtil.js';

export default class TextureOpMonoFill extends TextureOp {
    brightness: number;

    constructor(arg0: number);
    constructor();
    constructor(arg0: number = 4096) {
        super(0, true);
        this.brightness = 4096;
        this.brightness = 4096;
    }

    override renderMono(arg0: number): Int32Array {
        const var2 = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            ArrayUtil.method837(var2, 0, Texture.width, this.brightness);
        }
        return var2;
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.brightness = ((arg0.g1() << 12) / 255) | 0;
        }
    }
}
