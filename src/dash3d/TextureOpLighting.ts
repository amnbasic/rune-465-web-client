import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpLighting extends TextureOp {
    static field2431: Int8Array;

    static {
        let var0 = 0;
        TextureOpLighting.field2431 = new Int8Array(32896);
        for (let var1 = 0; var1 < 256; var1++) {
            for (let var2 = 0; var2 <= var1; var2++) {
                TextureOpLighting.field2431[var0++] = (255.0 / Math.sqrt((var2 * var2 + var1 * var1 + 65535) / 65535.0)) | 0;
            }
        }
    }

    readonly lightDir: Int32Array = new Int32Array(3);
    azimuth: number = 3216;
    altitude: number = 3216;
    intensity: number = 4096;

    constructor() {
        super(1, true);
    }

    override postDecode(): void {
        this.computeLightDir();
    }

    override renderMono(arg0: number): Int32Array {
        const out = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            const strength = (this.intensity * Texture.aspectScale) >> 12;
            const prev = this.getInputMono(Texture.heightMask & (arg0 - 1), 0);
            const row = this.getInputMono(arg0, 0);
            const next = this.getInputMono(Texture.heightMask & (arg0 + 1), 0);
            for (let x = 0; x < Texture.width; x++) {
                const dy = ((next[x] - prev[x]) * strength) >> 12;
                const dx = (strength * (row[Texture.widthMask & (x - 1)] - row[(x + 1) & Texture.widthMask])) >> 12;
                let absDx = dx >> 4;
                if (absDx < 0) {
                    absDx = -absDx;
                }
                if (absDx > 255) {
                    absDx = 255;
                }
                let absDy = dy >> 4;
                if (absDy < 0) {
                    absDy = -absDy;
                }
                if (absDy > 255) {
                    absDy = 255;
                }
                const norm = TextureOpLighting.field2431[(((absDy + 1) * absDy) >> 1) + absDx] & 0xff;
                const z = (norm * 4096) >> 8;
                const lightZ = (this.lightDir[2] * z) >> 12;
                const scaledDx = (dx * norm) >> 8;
                const lightX = (this.lightDir[0] * scaledDx) >> 12;
                const scaledDy = (dy * norm) >> 8;
                const lightY = (this.lightDir[1] * scaledDy) >> 12;
                out[x] = lightX + lightY + lightZ;
            }
        }
        return out;
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.intensity = arg0.g2();
        } else if (arg1 === 1) {
            this.azimuth = arg0.g2();
        } else if (arg1 === 2) {
            this.altitude = arg0.g2();
        }
    }

    computeLightDir(): void {
        const var1 = Math.cos(this.altitude / 4096.0);
        this.lightDir[0] = (var1 * Math.sin(this.azimuth / 4096.0) * 4096.0) | 0;
        this.lightDir[1] = (Math.cos(this.azimuth / 4096.0) * 4096.0 * var1) | 0;
        this.lightDir[2] = (Math.sin(this.altitude / 4096.0) * 4096.0) | 0;
        const var3 = (this.lightDir[1] * this.lightDir[1]) >> 12;
        const var4 = (this.lightDir[0] * this.lightDir[0]) >> 12;
        const var5 = (this.lightDir[2] * this.lightDir[2]) >> 12;
        const var6 = (Math.sqrt((var5 + var4 + var3) >> 12) * 4096.0) | 0;
        if (var6 !== 0) {
            this.lightDir[0] = ((this.lightDir[0] << 12) / var6) | 0;
            this.lightDir[2] = ((this.lightDir[2] << 12) / var6) | 0;
            this.lightDir[1] = ((this.lightDir[1] << 12) / var6) | 0;
        }
    }
}
