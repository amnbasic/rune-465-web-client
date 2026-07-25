import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';
import Statics from '#/deob/Statics.js';
import ArrayUtil from '#/util/ArrayUtil.js';
import JavaRandom from '#/util/JavaRandom.js';

export default class TextureOpClouds extends TextureOp {
    halfEdge: number = 0;
    edgeWidth: number = 81;
    noiseAmplitudeY: number = 204;
    cellWidth: number = 0;
    cells: Int32Array[] = [];
    cellHeight: number = 0;
    cellsX: number = 4;
    cellBrightness: number = 1024;
    cellsY: number = 8;
    contrast: number = 1024;
    noiseAmplitudeX: number = 409;
    timeOffset: number = 0;
    rowBounds: Int32Array = new Int32Array(0);
    cellBoundsX: Int32Array[] = [];

    constructor() {
        super(0, true);
    }

    generateNoise(): void {
        const var1 = new JavaRandom(this.cellsY);
        this.cells = Array.from({ length: this.cellsY }, () => new Int32Array(this.cellsX));
        this.cellBoundsX = Array.from({ length: this.cellsY }, () => new Int32Array(this.cellsX + 1));
        if (this.cellsX === 0) {
            throw new Error();
        }
        this.cellHeight = (4096 / this.cellsX) | 0;
        this.halfEdge = (this.edgeWidth / 2) | 0;
        this.rowBounds = new Int32Array(this.cellsY + 1);
        this.rowBounds[0] = 0;
        if (this.cellsY === 0) {
            throw new Error();
        }
        this.cellWidth = (4096 / this.cellsY) | 0;
        const var2 = (this.cellHeight / 2) | 0;
        const var3 = (this.cellWidth / 2) | 0;
        for (let var4 = 0; var4 < this.cellsY; var4++) {
            if (var4 > 0) {
                const var5 = this.cellWidth;
                const var6 = Math.imul(Statics.method812(4096, var1) - 2048, this.noiseAmplitudeY) >> 12;
                const var7 = var5 + (Math.imul(var3, var6) >> 12);
                this.rowBounds[var4] = var7 + this.rowBounds[var4 - 1];
            }
            this.cellBoundsX[var4][0] = 0;
            for (let var8 = 0; var8 < this.cellsX; var8++) {
                if (var8 > 0) {
                    const var9 = this.cellHeight;
                    const var10 = Math.imul(Statics.method812(4096, var1) - 2048, this.noiseAmplitudeX) >> 12;
                    const var11 = var9 + (Math.imul(var10, var2) >> 12);
                    this.cellBoundsX[var4][var8] = var11 + this.cellBoundsX[var4][var8 - 1];
                }
                this.cells[var4][var8] = this.cellBrightness <= 0 ? 4096 : 4096 - Statics.method812(this.cellBrightness, var1);
            }
            this.cellBoundsX[var4][this.cellsX] = 4096;
        }
        this.rowBounds[this.cellsY] = 4096;
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.cellsX = arg0.g1();
        } else if (arg1 === 1) {
            this.cellsY = arg0.g1();
        } else if (arg1 === 2) {
            this.noiseAmplitudeX = arg0.g2();
        } else if (arg1 === 3) {
            this.noiseAmplitudeY = arg0.g2();
        } else if (arg1 === 4) {
            this.contrast = arg0.g2();
        } else if (arg1 === 5) {
            this.timeOffset = arg0.g2();
        } else if (arg1 === 6) {
            this.edgeWidth = arg0.g2();
        } else if (arg1 === 7) {
            this.cellBrightness = arg0.g2();
        }
    }

    override renderMono(arg0: number): Int32Array {
        const var2 = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            let var3 = 0;
            let var4: number;
            for (var4 = this.timeOffset + Texture.rowLut[arg0]; var4 < 0; var4 += 4096) {}
            while (var4 > 4096) {
                var4 -= 4096;
            }
            while (this.cellsY > var3 && var4 >= this.rowBounds[var3]) {
                var3++;
            }
            const var5 = this.rowBounds[var3];
            const var6 = (var3 & 0x1) === 0;
            const var7 = var3 - 1;
            const var8 = this.rowBounds[var3 - 1];
            if (var4 > this.halfEdge + var8 && var5 - this.halfEdge > var4) {
                for (let var9 = 0; var9 < Texture.width; var9++) {
                    const var10 = var6 ? this.contrast : -this.contrast;
                    let var11 = 0;
                    let var12: number;
                    for (var12 = ((var10 * this.cellHeight) >> 12) + Texture.columnLut[var9]; var12 < 0; var12 += 4096) {}
                    while (var12 > 4096) {
                        var12 -= 4096;
                    }
                    while (this.cellsX > var11 && this.cellBoundsX[var7][var11] <= var12) {
                        var11++;
                    }
                    const var13 = this.cellBoundsX[var7][var11];
                    const var14 = var11 - 1;
                    const var15 = this.cellBoundsX[var7][var14];
                    if (var15 + this.halfEdge < var12 && var12 < var13 - this.halfEdge) {
                        var2[var9] = this.cells[var7][var14];
                    } else {
                        var2[var9] = 0;
                    }
                }
            } else {
                ArrayUtil.method837(var2, 0, Texture.width, 0);
            }
        }
        return var2;
    }

    override postDecode(): void {
        this.generateNoise();
    }
}
