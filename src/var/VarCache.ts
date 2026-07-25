import VarBitType from '#/config/VarBitType.js';

export default class VarCache {
    static mask: Int32Array = new Int32Array(32);
    static varServ: Int32Array = new Int32Array(2000);
    static var: Int32Array = new Int32Array(2000);
    static varcInt: Int32Array = new Int32Array(2000);

    static {
        let acc = 2;
        for (let b = 0; b < 32; b++) {
            VarCache.mask[b] = acc - 1;
            acc += acc;
        }
    }

    static getVarbit(id: number): number {
        const varbit = VarBitType.list(id);
        const startbit = varbit.startbit;
        const endibt = varbit.endbit;
        const basevar = varbit.basevar;
        const mask = VarCache.mask[endibt - startbit];
        return (VarCache.var[basevar] >> startbit) & mask;
    }

    static setVarbit(id: number, value: number): void {
        const varbit = VarBitType.list(id);
        const basevar = varbit.basevar;
        const startbit = varbit.startbit;
        const endbit = varbit.endbit;
        const mask = VarCache.mask[endbit - startbit];
        if (value < 0 || value > mask) {
            value = 0;
        }
        const otherMask = mask << startbit;
        VarCache.var[basevar] = (~otherMask & VarCache.var[basevar]) | (otherMask & (value << startbit));
    }
}
