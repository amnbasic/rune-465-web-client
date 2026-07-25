import TextureOpSubShape from '#/dash3d/TextureOpSubShape.js';
import TextureOpVector from '#/dash3d/TextureOpVector.js';
import Packet from '#/io/Packet.js';

export default class TextureOpSubShape1 extends TextureOpSubShape {
    readonly field1854: number;
    readonly field1855: number;
    readonly field1856: number;
    readonly field1859: number;
    readonly field1860: number;
    readonly field1861: number;
    readonly field1865: number;
    readonly field1867: number;

    constructor(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number, arg9: number) {
        super(-1, arg8, arg9);
        this.field1861 = arg1;
        this.field1855 = arg7;
        this.field1865 = arg4;
        this.field1860 = arg2;
        this.field1859 = arg5;
        this.field1856 = arg3;
        this.field1854 = arg0;
        this.field1867 = arg6;
    }

    static method936(arg0: Packet): TextureOpSubShape1 {
        return new TextureOpSubShape1(arg0.g2b(), arg0.g2b(), arg0.g2b(), arg0.g2b(), arg0.g2b(), arg0.g2b(), arg0.g2b(), arg0.g2b(), arg0.g3(), arg0.g1());
    }

    override method377(arg0: number, arg1: number): void {
        const var3 = (arg0 * this.field1860) >> 12;
        const var4 = (this.field1856 * arg1) >> 12;
        const var5 = (this.field1859 * arg1) >> 12;
        const var6 = (this.field1854 * arg0) >> 12;
        const var7 = (arg1 * this.field1861) >> 12;
        const var8 = (this.field1867 * arg0) >> 12;
        const var9 = (this.field1865 * arg0) >> 12;
        const var10 = (arg1 * this.field1855) >> 12;
        TextureOpVector.method739(var4, var7, var6, var3, var5, var8, var10, this.field927, var9);
    }

    override method373(arg0: number, arg1: number): void {}

    override method371(arg0: number, arg1: number): void {}
}
