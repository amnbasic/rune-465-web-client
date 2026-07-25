import TextureOpSubShape from '#/dash3d/TextureOpSubShape.js';
import TextureOpVector from '#/dash3d/TextureOpVector.js';
import Packet from '#/io/Packet.js';

export default class TextureOpSubShape3 extends TextureOpSubShape {
    readonly field2220: number;
    readonly field2223: number;
    readonly field2224: number;
    readonly field2231: number;

    constructor(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number) {
        super(arg4, arg5, arg6);
        this.field2220 = arg3;
        this.field2223 = arg2;
        this.field2224 = arg1;
        this.field2231 = arg0;
    }

    static method577(arg0: Packet): TextureOpSubShape3 {
        return new TextureOpSubShape3(arg0.g2b(), arg0.g2b(), arg0.g2b(), arg0.g2b(), arg0.g3(), arg0.g3(), arg0.g1());
    }

    static method1565(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number): void {
        if (arg4 === arg0) {
            TextureOpVector.method1532(arg3, arg0, arg2, arg1);
        } else if (arg3 - arg0 >= TextureOpVector.field1207 && TextureOpVector.field183 >= arg0 + arg3 && arg2 - arg4 >= TextureOpVector.field919 && TextureOpVector.field279 >= arg4 + arg2) {
            TextureOpVector.method892(arg3, arg0, arg4, arg2, arg1);
        } else {
            TextureOpVector.method1438(arg3, arg4, arg2, arg1, arg0);
        }
    }

    override method371(arg0: number, arg1: number): void {
        const var3 = (arg1 * this.field2224) >> 12;
        const var4 = (arg1 * this.field2220) >> 12;
        const var5 = (this.field2231 * arg0) >> 12;
        const var6 = (this.field2223 * arg0) >> 12;
        TextureOpVector.method1514(this.field931, var4, var6, var5, this.field927, this.field925, var3);
    }

    override method373(arg0: number, arg1: number): void {
        const var3 = (this.field2231 * arg1) >> 12;
        const var4 = (arg1 * this.field2223) >> 12;
        const var5 = (arg0 * this.field2220) >> 12;
        const var6 = (arg0 * this.field2224) >> 12;
        TextureOpSubShape3.method1565(var4, this.field925, var6, var3, var5);
    }

    override method377(arg0: number, arg1: number): void {}
}
