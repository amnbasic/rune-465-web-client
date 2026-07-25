import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpNormalMap extends TextureOp {
    remapOutput = true;
    strength = 4096;

    constructor() {
        super(1, false);
    }

    override renderColour(arg0: number): [Int32Array, Int32Array, Int32Array] {
        const out = this.colourCache.getFrame(arg0);
        if (this.colourCache.field4310) {
            const prev = this.getInputMono(Texture.heightMask & (arg0 - 1), 0);
            const cur = this.getInputMono(arg0, 0);
            const next = this.getInputMono((arg0 + 1) & Texture.heightMask, 0);
            const outR = out[0];
            const outB = out[2];
            const outG = out[1];
            for (let x = 0; x < Texture.width; x++) {
                const dyRaw = (next[x] - prev[x]) * this.strength;
                const dxRaw = (cur[(x + 1) & Texture.widthMask] - cur[(x - 1) & Texture.widthMask]) * this.strength;
                const dx = dxRaw >> 12;
                const dy = dyRaw >> 12;
                const xx = (dx * dx) >> 12;
                const yy = (dy * dy) >> 12;
                const mag = (Math.sqrt((xx + yy + 4096) / 4096.0) * 4096.0) | 0;
                let ny: number;
                let nz: number;
                let nx: number;
                if (mag === 0) {
                    ny = 0;
                    nz = 0;
                    nx = 0;
                } else {
                    ny = (dyRaw / mag) | 0;
                    nz = (16777216 / mag) | 0;
                    nx = (dxRaw / mag) | 0;
                }
                if (this.remapOutput) {
                    nz = (nz >> 1) + 2048;
                    nx = (nx >> 1) + 2048;
                    ny = (ny >> 1) + 2048;
                }
                outR[x] = nx;
                outG[x] = ny;
                outB[x] = nz;
            }
        }
        return out;
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.strength = arg0.g2();
        } else if (arg1 === 1) {
            this.remapOutput = arg0.g1() === 1;
        }
    }
}
