import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpThreshold extends TextureOp {
    maxThreshold = 4096;
    minThreshold = 0;

    constructor() {
        super(1, true);
    }

    override renderMono(arg0: number): Int32Array {
        const out = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            const input = this.getInputMono(arg0, 0);
            for (let i = 0; i < Texture.width; i++) {
                const value = input[i];
                out[i] = value >= this.minThreshold && value <= this.maxThreshold ? 4096 : 0;
            }
        }
        return out;
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.minThreshold = arg0.g2();
        } else if (arg1 === 1) {
            this.maxThreshold = arg0.g2();
        }
    }
}
