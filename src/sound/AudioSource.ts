export default interface AudioSource {
    init(arg0: boolean, arg1: unknown, arg2: number): void;
    queued(arg0: number): number;
    write(arg0: number, arg1: Int32Array | number[]): void;
    flush(arg0: number): void;
    close(arg0: number): void;
    open(arg0: number, arg1: number): void;
}
