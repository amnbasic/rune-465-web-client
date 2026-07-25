export default class RegionRotate {
    static DX(rotation: number, x: number, z: number): number;
    static DX(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number): number;
    static DX(arg0: number, arg1: number, arg2: number, arg3?: number, arg4?: number, arg5?: number): number {
        if (arg3 === undefined || arg4 === undefined || arg5 === undefined) {
            const var3 = arg0 & 0x3;
            if (var3 === 0) {
                return arg1;
            } else if (var3 === 1) {
                return arg2;
            } else if (var3 === 2) {
                return 7 - arg1;
            } else {
                return 7 - arg2;
            }
        }

        if ((arg5 & 0x1) === 1) {
            const var6 = arg0;
            arg0 = arg4;
            arg4 = var6;
        }
        const var7 = arg1 & 0x3;
        if (var7 === 0) {
            return arg3;
        } else if (var7 === 1) {
            return arg2;
        } else if (var7 === 2) {
            return 1 + 7 - arg0 - arg3;
        } else {
            return 8 - arg2 - arg4;
        }
    }

    static DZ(z: number, x: number, rotation: number): number;
    static DZ(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number): number;
    static DZ(arg0: number, arg1: number, arg2: number, arg3?: number, arg4?: number, arg5?: number): number {
        if (arg3 === undefined || arg4 === undefined || arg5 === undefined) {
            const var3 = arg2 & 0x3;
            if (var3 === 0) {
                return arg0;
            } else if (var3 === 1) {
                return 7 - arg1;
            } else if (var3 === 2) {
                return 7 - arg0;
            } else {
                return arg1;
            }
        }

        const var6 = arg5 & 0x3;
        if ((arg2 & 0x1) === 1) {
            const var7 = arg4;
            arg4 = arg3;
            arg3 = var7;
        }
        if (var6 === 0) {
            return arg0;
        } else if (var6 === 1) {
            return 1 + 7 - arg4 - arg1;
        } else if (var6 === 2) {
            return 1 + 7 - arg0 - arg3;
        } else {
            return arg1;
        }
    }
}
