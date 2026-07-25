import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpEdgeDetect extends TextureOp {
    strength = 4096;

    constructor() {
        super(1, true);
    }

    override renderMono(arg0: number): Int32Array {
        const out = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            const prev = this.getInputMono(Texture.heightMask & (arg0 - 1), 0);
            const cur = this.getInputMono(arg0, 0);
            const next = this.getInputMono((arg0 + 1) & Texture.heightMask, 0);
            for (let i = 0; i < Texture.width; i++) {
                const dy = this.strength * (next[i] - prev[i]);
                const dx = (cur[(i + 1) & Texture.widthMask] - cur[Texture.widthMask & (i - 1)]) * this.strength;
                const sx = dx >> 12;
                const sy = dy >> 12;
                const xx = (sx * sx) >> 12;
                const yy = (sy * sy) >> 12;
                const mag = (Math.sqrt((xx + yy + 4096) / 4096.0) * 4096.0) | 0;
                const inv = mag === 0 ? 0 : (16777216 / mag) | 0;
                out[i] = 4096 - inv;
            }
        }
        return out;
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.strength = arg0.g2();
        }
    }
}
