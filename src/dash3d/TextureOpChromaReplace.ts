import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpChromaReplace extends TextureOp {
    tolerance = 409;
    greenScale = 4096;
    readonly keyColour = new Int32Array(3);
    redScale = 4096;
    blueScale = 4096;

    constructor() {
        super(1, false);
    }

    override renderColour(arg0: number): [Int32Array, Int32Array, Int32Array] {
        const out = this.colourCache.getFrame(arg0);
        if (this.colourCache.field4310) {
            const input = this.getInputColour(0, arg0);
            const inR = input[0];
            const inG = input[1];
            const inB = input[2];
            const outR = out[0];
            const outG = out[1];
            const outB = out[2];
            for (let i = 0; i < Texture.width; i++) {
                const r = inR[i];
                let dr = r - this.keyColour[0];
                if (dr < 0) {
                    dr = -dr;
                }
                if (dr > this.tolerance) {
                    outR[i] = r;
                    outG[i] = inG[i];
                    outB[i] = inB[i];
                } else {
                    const g = inG[i];
                    let dg = g - this.keyColour[1];
                    if (dg < 0) {
                        dg = -dg;
                    }
                    if (this.tolerance < dg) {
                        outR[i] = r;
                        outG[i] = g;
                        outB[i] = inB[i];
                    } else {
                        const b = inB[i];
                        let db = b - this.keyColour[2];
                        if (db < 0) {
                            db = -db;
                        }
                        if (db > this.tolerance) {
                            outR[i] = r;
                            outG[i] = g;
                            outB[i] = b;
                        } else {
                            outR[i] = (this.redScale * r) >> 12;
                            outG[i] = (g * this.greenScale) >> 12;
                            outB[i] = (this.blueScale * b) >> 12;
                        }
                    }
                }
            }
        }
        return out;
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.tolerance = arg0.g2();
        } else if (arg1 === 1) {
            this.blueScale = arg0.g2();
        } else if (arg1 === 2) {
            this.greenScale = arg0.g2();
        } else if (arg1 === 3) {
            this.redScale = arg0.g2();
        } else if (arg1 === 4) {
            const var3 = arg0.g3();
            this.keyColour[0] = (var3 & 0xff0000) << 4;
            this.keyColour[1] = (var3 >> 4) & 0xff0;
            this.keyColour[2] = (var3 >> 12) & 0x0;
        }
    }
}
