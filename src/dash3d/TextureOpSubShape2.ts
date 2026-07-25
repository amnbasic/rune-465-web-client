import TextureOpSubShape from '#/dash3d/TextureOpSubShape.js';
import TextureOpVector from '#/dash3d/TextureOpVector.js';
import Packet from '#/io/Packet.js';

export default class TextureOpSubShape2 extends TextureOpSubShape {
    readonly field1340: number;
    readonly field1343: number;
    readonly field1345: number;
    readonly field1346: number;

    constructor(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number) {
        super(arg4, arg5, arg6);
        this.field1343 = arg3;
        this.field1345 = arg2;
        this.field1340 = arg0;
        this.field1346 = arg1;
    }

    static method62(arg0: Packet): TextureOpSubShape2 {
        return new TextureOpSubShape2(arg0.g2b(), arg0.g2b(), arg0.g2b(), arg0.g2b(), arg0.g3(), arg0.g3(), arg0.g1());
    }

    override method377(arg0: number, arg1: number): void {
        const var3 = (this.field1340 * arg0) >> 12;
        const var4 = (this.field1345 * arg0) >> 12;
        const var5 = (arg1 * this.field1346) >> 12;
        const var6 = (arg1 * this.field1343) >> 12;
        TextureOpVector.method887(this.field931, var5, var4, var6, this.field927, var3);
    }

    override method373(arg0: number, arg1: number): void {
        const var3 = (this.field1345 * arg1) >> 12;
        const var4 = (arg1 * this.field1340) >> 12;
        const var5 = (this.field1346 * arg0) >> 12;
        const var6 = (arg0 * this.field1343) >> 12;
        TextureOpVector.method26(var6, var5, this.field925, var4, var3);
    }

    override method371(arg0: number, arg1: number): void {
        const var3 = (arg0 * this.field1340) >> 12;
        const var4 = (arg0 * this.field1345) >> 12;
        const var5 = (this.field1346 * arg1) >> 12;
        const var6 = (arg1 * this.field1343) >> 12;
        TextureOpVector.method368(var4, this.field927, var5, this.field931, this.field925, var3, var6);
    }
}
