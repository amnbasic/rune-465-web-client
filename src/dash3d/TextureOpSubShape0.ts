import TextureOpSubShape from '#/dash3d/TextureOpSubShape.js';
import TextureOpVector from '#/dash3d/TextureOpVector.js';
import Packet from '#/io/Packet.js';

export default class TextureOpSubShape0 extends TextureOpSubShape {
    readonly field3869: number;
    readonly field3878: number;
    readonly field3873: number;
    readonly field3874: number;

    constructor(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number) {
        super(-1, arg4, arg5);
        this.field3878 = arg0;
        this.field3869 = arg3;
        this.field3873 = arg2;
        this.field3874 = arg1;
    }

    static method538(arg0: Packet): TextureOpSubShape0 {
        return new TextureOpSubShape0(arg0.g2b(), arg0.g2b(), arg0.g2b(), arg0.g2b(), arg0.g3(), arg0.g1());
    }

    override method373(arg0: number, arg1: number): void {}

    override method371(arg0: number, arg1: number): void {}

    override method377(arg0: number, arg1: number): void {
        const var3 = (arg0 * this.field3878) >> 12;
        const var4 = (arg0 * this.field3873) >> 12;
        const var5 = (arg1 * this.field3874) >> 12;
        const var6 = (this.field3869 * arg1) >> 12;
        TextureOpVector.method1529(var3, var6, var4, var5, this.field927);
    }
}
