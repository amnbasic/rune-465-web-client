import TextureNoiseTable from '#/dash3d/TextureNoiseTable.js';
import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';
import Statics from '#/deob/Statics.js';
import JavaRandom from '#/util/JavaRandom.js';

export default class TextureOpVoronoi extends TextureOp {
    static field2472: number = 0;
    static field3809: number = 0;
    static field1850: number = 0;
    static field1452: number = 0;

    jitter: number = 2048;
    seed: number = 0;
    cellsX: number = 5;
    distanceMetric: number = 1;
    cellsY: number = 5;
    outputMetric: number = 2;
    permTable: Int8Array = new Int8Array(512);
    jitterTable: Int16Array = new Int16Array(512);

    constructor() {
        super(0, true);
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.cellsX = this.cellsY = arg0.g1();
        } else if (arg1 === 1) {
            this.seed = arg0.g1();
        } else if (arg1 === 2) {
            this.jitter = arg0.g2();
        } else if (arg1 === 3) {
            this.outputMetric = arg0.g1();
        } else if (arg1 === 4) {
            this.distanceMetric = arg0.g1();
        } else if (arg1 === 5) {
            this.cellsX = arg0.g1();
        } else if (arg1 === 6) {
            this.cellsY = arg0.g1();
        }
    }

    override renderMono(arg0: number): Int32Array {
        const var2 = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            const var3 = Texture.rowLut[arg0] * this.cellsY + 2048;
            const var4 = var3 >> 12;
            const var5 = var4 + 1;
            for (let var6 = 0; var6 < Texture.width; var6++) {
                TextureOpVoronoi.field1452 = 2147483647;
                TextureOpVoronoi.field1850 = 2147483647;
                TextureOpVoronoi.field3809 = 2147483647;
                TextureOpVoronoi.field2472 = 2147483647;
                const var7 = Texture.columnLut[var6] * this.cellsX + 2048;
                const var8 = var7 >> 12;
                const var9 = var8 + 1;
                for (let var10 = var4 - 1; var10 <= var5; var10++) {
                    const var11 = this.permTable[(var10 < this.cellsY ? var10 : var10 - this.cellsY) & 0xff] & 0xff;
                    for (let var12 = var8 - 1; var12 <= var9; var12++) {
                        const var13 = (this.permTable[(var11 + (this.cellsX <= var12 ? var12 - this.cellsX : var12)) & 0xff] & 0xff) * 2;
                        const var26 = var13 + 1;
                        const var14 = var7 - this.jitterTable[var13] - (var12 << 12);
                        const var15 = var3 - (var10 << 12) - this.jitterTable[var26];
                        const var16 = this.distanceMetric;
                        let var17: number;
                        if (var16 === 1) {
                            var17 = (var14 * var14 + var15 * var15) >> 12;
                        } else if (var16 === 3) {
                            const var18 = var15 >= 0 ? var15 : -var15;
                            const var19 = var14 < 0 ? -var14 : var14;
                            var17 = var19 <= var18 ? var18 : var19;
                        } else if (var16 === 4) {
                            const var20 = (Math.sqrt((var14 >= 0 ? var14 : -var14) / 4096.0) * 4096.0) | 0;
                            const var21 = (Math.sqrt((var15 < 0 ? -var15 : var15) / 4096.0) * 4096.0) | 0;
                            const var22 = var21 + var20;
                            var17 = (var22 * var22) >> 12;
                        } else if (var16 === 5) {
                            const var23 = var14 * var14;
                            const var24 = var15 * var15;
                            var17 = (Math.sqrt(Math.sqrt((var23 + var24) / 1.6777216e7)) * 4096.0) | 0;
                        } else if (var16 === 2) {
                            var17 = (var15 >= 0 ? var15 : -var15) + (var14 < 0 ? -var14 : var14);
                        } else {
                            var17 = (Math.sqrt((var15 * var15 + var14 * var14) / 1.6777216e7) * 4096.0) | 0;
                        }
                        if (TextureOpVoronoi.field2472 > var17) {
                            TextureOpVoronoi.field1452 = TextureOpVoronoi.field1850;
                            TextureOpVoronoi.field1850 = TextureOpVoronoi.field3809;
                            TextureOpVoronoi.field3809 = TextureOpVoronoi.field2472;
                            TextureOpVoronoi.field2472 = var17;
                        } else if (var17 < TextureOpVoronoi.field3809) {
                            TextureOpVoronoi.field1452 = TextureOpVoronoi.field1850;
                            TextureOpVoronoi.field1850 = TextureOpVoronoi.field3809;
                            TextureOpVoronoi.field3809 = var17;
                        } else if (var17 < TextureOpVoronoi.field1850) {
                            TextureOpVoronoi.field1452 = TextureOpVoronoi.field1850;
                            TextureOpVoronoi.field1850 = var17;
                        } else if (var17 < TextureOpVoronoi.field1452) {
                            TextureOpVoronoi.field1452 = var17;
                        }
                    }
                }
                const var25 = this.outputMetric;
                if (var25 === 0) {
                    var2[var6] = TextureOpVoronoi.field2472;
                } else if (var25 === 1) {
                    var2[var6] = TextureOpVoronoi.field3809;
                } else if (var25 === 3) {
                    var2[var6] = TextureOpVoronoi.field1850;
                } else if (var25 === 4) {
                    var2[var6] = TextureOpVoronoi.field1452;
                } else if (var25 === 2) {
                    var2[var6] = TextureOpVoronoi.field3809 - TextureOpVoronoi.field2472;
                }
            }
        }
        return var2;
    }

    override postDecode(): void {
        this.permTable = TextureNoiseTable.get(this.seed);
        this.generateJitter();
    }

    generateJitter(): void {
        const random = new JavaRandom(this.seed);
        this.jitterTable = new Int16Array(512);
        if (this.jitter > 0) {
            for (let i = 0; i < 512; i++) {
                this.jitterTable[i] = Statics.method812(this.jitter, random);
            }
        }
    }
}
