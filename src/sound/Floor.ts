import JagVorbis from '#/sound/JagVorbis.js';
import MathTool from '#/util/MathTool.js';

// jag::oldscape::sound::Floor
export default class Floor {
    // jag::oldscape::sound::Floor::m_rangeVector
    static readonly rangeVector: Int32Array = Int32Array.from([256, 128, 86, 64]);

    // jag::oldscape::sound::Floor::m_inverseDBTable
    static readonly inverseDBTable: Float32Array = Float32Array.from([
        1.0649863e-7, 1.1341951e-7, 1.2079015e-7, 1.2863978e-7, 1.369995e-7, 1.459025e-7, 1.5538409e-7, 1.6548181e-7, 1.7623574e-7, 1.8768856e-7, 1.998856e-7, 2.128753e-7, 2.2670913e-7, 2.4144197e-7, 2.5713223e-7, 2.7384212e-7, 2.9163792e-7,
        3.1059022e-7, 3.307741e-7, 3.5226967e-7, 3.7516213e-7, 3.995423e-7, 4.255068e-7, 4.5315863e-7, 4.8260745e-7, 5.1397e-7, 5.4737063e-7, 5.829419e-7, 6.208247e-7, 6.611694e-7, 7.041359e-7, 7.4989464e-7, 7.98627e-7, 8.505263e-7, 9.057983e-7,
        9.646621e-7, 1.0273513e-6, 1.0941144e-6, 1.1652161e-6, 1.2409384e-6, 1.3215816e-6, 1.4074654e-6, 1.4989305e-6, 1.5963394e-6, 1.7000785e-6, 1.8105592e-6, 1.9282195e-6, 2.053526e-6, 2.1869757e-6, 2.3290977e-6, 2.4804558e-6, 2.6416496e-6,
        2.813319e-6, 2.9961443e-6, 3.1908505e-6, 3.39821e-6, 3.619045e-6, 3.8542307e-6, 4.1047006e-6, 4.371447e-6, 4.6555283e-6, 4.958071e-6, 5.280274e-6, 5.623416e-6, 5.988857e-6, 6.3780467e-6, 6.7925284e-6, 7.2339453e-6, 7.704048e-6, 8.2047e-6,
        8.737888e-6, 9.305725e-6, 9.910464e-6, 1.0554501e-5, 1.1240392e-5, 1.1970856e-5, 1.2748789e-5, 1.3577278e-5, 1.4459606e-5, 1.5399271e-5, 1.6400005e-5, 1.7465769e-5, 1.8600793e-5, 1.9809577e-5, 2.1096914e-5, 2.2467912e-5, 2.3928002e-5,
        2.5482977e-5, 2.7139005e-5, 2.890265e-5, 3.078091e-5, 3.2781227e-5, 3.4911533e-5, 3.718028e-5, 3.9596467e-5, 4.2169668e-5, 4.491009e-5, 4.7828602e-5, 5.0936775e-5, 5.424693e-5, 5.7772202e-5, 6.152657e-5, 6.552491e-5, 6.9783084e-5,
        7.4317984e-5, 7.914758e-5, 8.429104e-5, 8.976875e-5, 9.560242e-5, 1.0181521e-4, 1.0843174e-4, 1.1547824e-4, 1.2298267e-4, 1.3097477e-4, 1.3948625e-4, 1.4855085e-4, 1.5820454e-4, 1.6848555e-4, 1.7943469e-4, 1.9109536e-4, 2.0351382e-4,
        2.167393e-4, 2.3082423e-4, 2.4582449e-4, 2.6179955e-4, 2.7881275e-4, 2.9693157e-4, 3.1622787e-4, 3.3677815e-4, 3.5866388e-4, 3.8197188e-4, 4.0679457e-4, 4.3323037e-4, 4.613841e-4, 4.913675e-4, 5.2329927e-4, 5.573062e-4, 5.935231e-4,
        6.320936e-4, 6.731706e-4, 7.16917e-4, 7.635063e-4, 8.1312325e-4, 8.6596457e-4, 9.2223985e-4, 9.821722e-4, 0.0010459992, 0.0011139743, 0.0011863665, 0.0012634633, 0.0013455702, 0.0014330129, 0.0015261382, 0.0016253153, 0.0017309374,
        0.0018434235, 0.0019632196, 0.0020908006, 0.0022266726, 0.0023713743, 0.0025254795, 0.0026895993, 0.0028643848, 0.0030505287, 0.003248769, 0.0034598925, 0.0036847359, 0.0039241905, 0.0041792067, 0.004450795, 0.004740033, 0.005048067,
        0.0053761187, 0.005725489, 0.0060975635, 0.0064938175, 0.0069158226, 0.0073652514, 0.007843887, 0.008353627, 0.008896492, 0.009474637, 0.010090352, 0.01074608, 0.011444421, 0.012188144, 0.012980198, 0.013823725, 0.014722068, 0.015678791,
        0.016697686, 0.017782796, 0.018938422, 0.020169148, 0.021479854, 0.022875736, 0.02436233, 0.025945531, 0.027631618, 0.029427277, 0.031339627, 0.03337625, 0.035545226, 0.037855156, 0.0403152, 0.042935107, 0.045725275, 0.048696756, 0.05186135,
        0.05523159, 0.05882085, 0.062643364, 0.06671428, 0.07104975, 0.075666964, 0.08058423, 0.08582105, 0.09139818, 0.097337745, 0.1036633, 0.11039993, 0.11757434, 0.12521498, 0.13335215, 0.14201812, 0.15124726, 0.16107617, 0.1715438, 0.18269168,
        0.19456401, 0.20720787, 0.22067343, 0.23501402, 0.25028655, 0.26655158, 0.28387362, 0.3023213, 0.32196787, 0.34289113, 0.36517414, 0.3889052, 0.41417846, 0.44109413, 0.4697589, 0.50028646, 0.53279793, 0.5674221, 0.6042964, 0.64356697,
        0.6853896, 0.72993004, 0.777365, 0.8278826, 0.88168305, 0.9389798, 1.0
    ]);

    readonly Xlist: Int32Array;
    readonly floor1_multiplier: number;
    readonly partition_class_list: Int32Array;
    readonly class_dimensions: Int32Array;
    readonly class_subclasses: Int32Array;
    readonly class_masterbooks: Int32Array;
    readonly subclass_books: Int32Array[];
    static sortedX: Int32Array;
    static post: Int32Array;
    static stepFlags: boolean[];

    // jag::oldscape::sound::Floor::LowNeighbour
    static lowNeighbour(arg0: Int32Array | number[], arg1: number): number {
        const var2 = arg0[arg1];
        let var3 = -1;
        let var4 = -2147483648;
        for (let var5 = 0; var5 < arg1; var5++) {
            const var6 = arg0[var5];
            if (var6 < var2 && var6 > var4) {
                var3 = var5;
                var4 = var6;
            }
        }
        return var3;
    }

    // jag::oldscape::sound::Floor::HighNeighbour
    static highNeighbour(arg0: Int32Array | number[], arg1: number): number {
        const var2 = arg0[arg1];
        let var3 = -1;
        let var4 = 2147483647;
        for (let var5 = 0; var5 < arg1; var5++) {
            const var6 = arg0[var5];
            if (var6 > var2 && var6 < var4) {
                var3 = var5;
                var4 = var6;
            }
        }
        return var3;
    }

    // jag::oldscape::sound::Floor::RenderPoint
    renderPoint(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number): number {
        const var6 = arg3 - arg1;
        const var7 = arg2 - arg0;
        const var8 = var6 < 0 ? -var6 : var6;
        const var9 = Math.imul(var8, arg4 - arg0);
        if (var7 === 0) {
            throw new Error();
        }
        const var10 = (var9 / var7) | 0;
        return var6 < 0 ? arg1 - var10 : arg1 + var10;
    }

    // jag::oldscape::sound::Floor::RenderLine
    renderLine(arg0: number, arg1: number, arg2: number, arg3: number, arg4: Float32Array | number[], arg5: number): void {
        const var7 = arg3 - arg1;
        const var8 = arg2 - arg0;
        const var9 = var7 < 0 ? -var7 : var7;
        if (var8 === 0) {
            throw new Error();
        }
        const var10 = (var7 / var8) | 0;
        let var11 = arg1;
        let var12 = 0;
        const var13 = var7 < 0 ? var10 - 1 : var10 + 1;
        const var14 = var9 - Math.imul(var10 < 0 ? -var10 : var10, var8);
        arg4[arg0] *= Floor.inverseDBTable[arg1];
        if (arg2 > arg5) {
            arg2 = arg5;
        }
        for (let var15 = arg0 + 1; var15 < arg2; var15++) {
            var12 += var14;
            if (var12 >= var8) {
                var12 -= var8;
                var11 += var13;
            } else {
                var11 += var10;
            }
            arg4[var15] *= Floor.inverseDBTable[var11];
        }
    }

    // jag::oldscape::sound::Floor::FloorDecoder::QuickSort
    quickSort(arg0: number, arg1: number): void {
        if (arg0 >= arg1) {
            return;
        }
        let var3 = arg0;
        const var4 = Floor.sortedX[arg0];
        const var5 = Floor.post[arg0];
        const var6 = Floor.stepFlags[arg0];
        for (let var7 = arg0 + 1; var7 <= arg1; var7++) {
            const var8 = Floor.sortedX[var7];
            if (var8 < var4) {
                Floor.sortedX[var3] = var8;
                Floor.post[var3] = Floor.post[var7];
                Floor.stepFlags[var3] = Floor.stepFlags[var7];
                var3++;
                Floor.sortedX[var7] = Floor.sortedX[var3];
                Floor.post[var7] = Floor.post[var3];
                Floor.stepFlags[var7] = Floor.stepFlags[var3];
            }
        }
        Floor.sortedX[var3] = var4;
        Floor.post[var3] = var5;
        Floor.stepFlags[var3] = var6;
        this.quickSort(arg0, var3 - 1);
        this.quickSort(var3 + 1, arg1);
    }

    constructor() {
        const var1 = JagVorbis.readBits(16);
        if (var1 !== 1) {
            throw new Error();
        }
        const var2 = JagVorbis.readBits(5);
        let var3 = 0;
        this.partition_class_list = new Int32Array(var2);
        for (let var4 = 0; var4 < var2; var4++) {
            const var5 = JagVorbis.readBits(4);
            this.partition_class_list[var4] = var5;
            if (var5 >= var3) {
                var3 = var5 + 1;
            }
        }
        this.class_dimensions = new Int32Array(var3);
        this.class_subclasses = new Int32Array(var3);
        this.class_masterbooks = new Int32Array(var3);
        this.subclass_books = new Array(var3);
        for (let var6 = 0; var6 < var3; var6++) {
            this.class_dimensions[var6] = JagVorbis.readBits(3) + 1;
            const var7 = (this.class_subclasses[var6] = JagVorbis.readBits(2));
            if (var7 !== 0) {
                this.class_masterbooks[var6] = JagVorbis.readBits(8);
            }
            const var8 = 1 << var7;
            const var9 = new Int32Array(var8);
            this.subclass_books[var6] = var9;
            for (let var10 = 0; var10 < var8; var10++) {
                var9[var10] = JagVorbis.readBits(8) - 1;
            }
        }
        this.floor1_multiplier = JagVorbis.readBits(2) + 1;
        const var11 = JagVorbis.readBits(4);
        let var12 = 2;
        for (let var13 = 0; var13 < var2; var13++) {
            var12 += this.class_dimensions[this.partition_class_list[var13]];
        }
        this.Xlist = new Int32Array(var12);
        this.Xlist[0] = 0;
        this.Xlist[1] = 1 << var11;
        let var14 = 2;
        for (let var15 = 0; var15 < var2; var15++) {
            const var16 = this.partition_class_list[var15];
            for (let var17 = 0; var17 < this.class_dimensions[var16]; var17++) {
                this.Xlist[var14++] = JagVorbis.readBits(var11);
            }
        }
        if (Floor.sortedX === undefined || Floor.sortedX.length < var14) {
            Floor.sortedX = new Int32Array(var14);
            Floor.post = new Int32Array(var14);
            Floor.stepFlags = new Array(var14).fill(false);
        }
    }

    // jag::oldscape::sound::Floor::PacketDecode
    packetDecode(): boolean {
        const var1 = JagVorbis.readBit() !== 0;
        if (!var1) {
            return false;
        }
        const var2 = this.Xlist.length;
        for (let var3 = 0; var3 < var2; var3++) {
            Floor.sortedX[var3] = this.Xlist[var3];
        }
        const var4 = Floor.rangeVector[this.floor1_multiplier - 1];
        const var5 = MathTool.bitsRequired(var4 - 1);
        Floor.post[0] = JagVorbis.readBits(var5);
        Floor.post[1] = JagVorbis.readBits(var5);
        let var6 = 2;
        for (let var7 = 0; var7 < this.partition_class_list.length; var7++) {
            const var8 = this.partition_class_list[var7];
            const var9 = this.class_dimensions[var8];
            const var10 = this.class_subclasses[var8];
            const var11 = (1 << var10) - 1;
            let var12 = 0;
            if (var10 > 0) {
                var12 = JagVorbis.codebooks[this.class_masterbooks[var8]].decodeScalar();
            }
            for (let var13 = 0; var13 < var9; var13++) {
                const var14 = this.subclass_books[var8][var12 & var11];
                var12 >>>= var10;
                Floor.post[var6++] = var14 >= 0 ? JagVorbis.codebooks[var14].decodeScalar() : 0;
            }
        }
        return true;
    }

    // jag::oldscape::sound::Floor::FloorDecoder::SynthMul
    synthMul(arg0: Float32Array | number[], arg1: number): void {
        const var3 = this.Xlist.length;
        const var4 = Floor.rangeVector[this.floor1_multiplier - 1];
        Floor.stepFlags[0] = Floor.stepFlags[1] = true;
        for (let var5 = 2; var5 < var3; var5++) {
            const var6 = Floor.lowNeighbour(Floor.sortedX, var5);
            const var7 = Floor.highNeighbour(Floor.sortedX, var5);
            const var8 = this.renderPoint(Floor.sortedX[var6], Floor.post[var6], Floor.sortedX[var7], Floor.post[var7], Floor.sortedX[var5]);
            const var9 = Floor.post[var5];
            const var10 = var4 - var8;
            const var11 = (var10 < var8 ? var10 : var8) << 1;
            if (var9 === 0) {
                Floor.stepFlags[var5] = false;
                Floor.post[var5] = var8;
            } else {
                Floor.stepFlags[var6] = Floor.stepFlags[var7] = true;
                Floor.stepFlags[var5] = true;
                if (var9 >= var11) {
                    Floor.post[var5] = var10 > var8 ? var9 + var8 - var8 : var8 - var9 + var10 - 1;
                } else {
                    Floor.post[var5] = (var9 & 0x1) === 0 ? var8 + ((var9 / 2) | 0) : var8 - (((var9 + 1) / 2) | 0);
                }
            }
        }
        this.quickSort(0, var3 - 1);
        let var12 = 0;
        let var13 = Floor.post[0] * this.floor1_multiplier;
        for (let var14 = 1; var14 < var3; var14++) {
            if (Floor.stepFlags[var14]) {
                const var15 = Floor.sortedX[var14];
                const var16 = Floor.post[var14] * this.floor1_multiplier;
                this.renderLine(var12, var13, var15, var16, arg0, arg1);
                if (var15 >= arg1) {
                    return;
                }
                var12 = var15;
                var13 = var16;
            }
        }
        const var17 = Floor.inverseDBTable[var13];
        for (let var18 = var12; var18 < arg1; var18++) {
            arg0[var18] *= var17;
        }
    }
}
