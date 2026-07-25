export default abstract class TextureOpSubShape {
    readonly field925: number;
    readonly field927: number;
    readonly field931: number;

    constructor(arg0: number, arg1: number, arg2: number) {
        this.field927 = arg1;
        this.field925 = arg0;
        this.field931 = arg2;
    }

    abstract method371(arg0: number, arg1: number): void;

    abstract method373(arg0: number, arg1: number): void;

    abstract method377(arg0: number, arg1: number): void;
}
