import Statics from '#/deob/Statics.js';
import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpRadial extends TextureOp {
    scale = 1;
    distanceMode = 0;
    waveform = 0;

    constructor() {
        super(0, true);
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.distanceMode = arg0.g1();
        } else if (arg1 === 1) {
            this.waveform = arg0.g1();
        } else if (arg1 === 3) {
            this.scale = arg0.g1();
        }
    }

    override postDecode(): void {
        Statics.method740();
    }

    override renderMono(arg0: number): Int32Array {
        const out = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            const row = Texture.rowLut[arg0];
            const dy = (row - 2048) >> 1;
            for (let x = 0; x < Texture.width; x++) {
                const col = Texture.columnLut[x];
                const dx = (col - 2048) >> 1;
                let value: number;
                if (this.distanceMode === 0) {
                    value = (col - row) * this.scale;
                } else {
                    const distSq = (dy * dy + dx * dx) >> 12;
                    const dist = (Math.sqrt(distSq / 4096.0) * 4096.0) | 0;
                    value = (dist * this.scale * 3.141592653589793) | 0;
                }
                let phase = value - (value & 0xfffff000);
                if (this.waveform === 0) {
                    phase = (Statics.field1734![(phase >> 4) & 0xff] + 4096) >> 1;
                } else if (this.waveform === 2) {
                    phase -= 2048;
                    if (phase < 0) {
                        phase = -phase;
                    }
                    phase = (2048 - phase) << 1;
                }
                out[x] = phase;
            }
        }
        return out;
    }
}
