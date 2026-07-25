// a standard build area is 4x13x13 zones, or 4x104x104 tiles
export const enum BuildArea {
    LEVELS = 4,
    SIZE = 13 << 3
}

// jag::oldscape::movement::CollisionMap
export default class CollisionMap {
    readonly startX: number = 0;
    readonly startZ: number = 0;
    readonly sizeX: number = BuildArea.SIZE;
    readonly sizeZ: number = BuildArea.SIZE;
    readonly flags: Int32Array[] = Array.from({ length: this.sizeX }, () => new Int32Array(this.sizeZ));

    constructor(_arg0: number, _arg1: number) {
        this.reset();
    }

    // jag::oldscape::movement::CollisionMap::Reset
    reset(): void {
        for (let var1: number = 0; var1 < this.sizeX; var1++) {
            for (let var2: number = 0; var2 < this.sizeZ; var2++) {
                if (var1 === 0 || var2 === 0 || var1 >= this.sizeX - 5 || this.sizeZ - 5 <= var2) {
                    this.flags[var1][var2] = 0xffffff;
                } else {
                    this.flags[var1][var2] = 0x1000000;
                }
            }
        }
    }

    // jag::oldscape::movement::CollisionMap::AddWall
    addWall(arg0: number, arg1: number, arg2: boolean, arg3: number, arg4: number): void {
        const var6 = arg1 - this.startZ;
        const var7 = arg4 - this.startX;
        if (arg0 === 0) {
            if (arg3 === 0) {
                this.addCMap(var7, 128, var6);
                this.addCMap(var7 - 1, 8, var6);
            }
            if (arg3 === 1) {
                this.addCMap(var7, 2, var6);
                this.addCMap(var7, 32, var6 + 1);
            }
            if (arg3 === 2) {
                this.addCMap(var7, 8, var6);
                this.addCMap(var7 + 1, 128, var6);
            }
            if (arg3 === 3) {
                this.addCMap(var7, 32, var6);
                this.addCMap(var7, 2, var6 - 1);
            }
        }
        if (arg0 === 1 || arg0 === 3) {
            if (arg3 === 0) {
                this.addCMap(var7, 1, var6);
                this.addCMap(var7 - 1, 16, var6 + 1);
            }
            if (arg3 === 1) {
                this.addCMap(var7, 4, var6);
                this.addCMap(var7 + 1, 64, var6 + 1);
            }
            if (arg3 === 2) {
                this.addCMap(var7, 16, var6);
                this.addCMap(var7 + 1, 1, var6 - 1);
            }
            if (arg3 === 3) {
                this.addCMap(var7, 64, var6);
                this.addCMap(var7 - 1, 4, var6 - 1);
            }
        }
        if (arg0 === 2) {
            if (arg3 === 0) {
                this.addCMap(var7, 130, var6);
                this.addCMap(var7 - 1, 8, var6);
                this.addCMap(var7, 32, var6 + 1);
            }
            if (arg3 === 1) {
                this.addCMap(var7, 10, var6);
                this.addCMap(var7, 32, var6 + 1);
                this.addCMap(var7 + 1, 128, var6);
            }
            if (arg3 === 2) {
                this.addCMap(var7, 40, var6);
                this.addCMap(var7 + 1, 128, var6);
                this.addCMap(var7, 2, var6 - 1);
            }
            if (arg3 === 3) {
                this.addCMap(var7, 160, var6);
                this.addCMap(var7, 2, var6 - 1);
                this.addCMap(var7 - 1, 8, var6);
            }
        }
        if (!arg2) {
            return;
        }
        if (arg0 === 0) {
            if (arg3 === 0) {
                this.addCMap(var7, 65536, var6);
                this.addCMap(var7 - 1, 4096, var6);
            }
            if (arg3 === 1) {
                this.addCMap(var7, 1024, var6);
                this.addCMap(var7, 16384, var6 + 1);
            }
            if (arg3 === 2) {
                this.addCMap(var7, 4096, var6);
                this.addCMap(var7 + 1, 65536, var6);
            }
            if (arg3 === 3) {
                this.addCMap(var7, 16384, var6);
                this.addCMap(var7, 1024, var6 - 1);
            }
        }
        if (arg0 === 1 || arg0 === 3) {
            if (arg3 === 0) {
                this.addCMap(var7, 512, var6);
                this.addCMap(var7 - 1, 8192, var6 + 1);
            }
            if (arg3 === 1) {
                this.addCMap(var7, 2048, var6);
                this.addCMap(var7 + 1, 32768, var6 + 1);
            }
            if (arg3 === 2) {
                this.addCMap(var7, 8192, var6);
                this.addCMap(var7 + 1, 512, var6 - 1);
            }
            if (arg3 === 3) {
                this.addCMap(var7, 32768, var6);
                this.addCMap(var7 - 1, 2048, var6 - 1);
            }
        }
        if (arg0 !== 2) {
            return;
        }
        if (arg3 === 0) {
            this.addCMap(var7, 66560, var6);
            this.addCMap(var7 - 1, 4096, var6);
            this.addCMap(var7, 16384, var6 + 1);
        }
        if (arg3 === 1) {
            this.addCMap(var7, 5120, var6);
            this.addCMap(var7, 16384, var6 + 1);
            this.addCMap(var7 + 1, 65536, var6);
        }
        if (arg3 === 2) {
            this.addCMap(var7, 20480, var6);
            this.addCMap(var7 + 1, 65536, var6);
            this.addCMap(var7, 1024, var6 - 1);
        }
        if (arg3 === 3) {
            this.addCMap(var7, 81920, var6);
            this.addCMap(var7, 1024, var6 - 1);
            this.addCMap(var7 - 1, 4096, var6);
            return;
        }
    }

    // jag::oldscape::movement::CollisionMap::AddLoc
    addLoc(arg0: number, arg1: number, arg2: boolean, arg3: number, arg4: number): void {
        const var6 = arg4 - this.startZ;
        let var7 = 256;
        if (arg2) {
            var7 = 131328;
        }
        const var8 = arg3 - this.startX;
        for (let var9 = var8; var9 < var8 + arg0; var9++) {
            if (var9 >= 0 && var9 < this.sizeX) {
                for (let var10 = var6; var10 < arg1 + var6; var10++) {
                    if (var10 >= 0 && var10 < this.sizeZ) {
                        this.addCMap(var9, var7, var10);
                    }
                }
            }
        }
    }

    // jag::oldscape::movement::CollisionMap::BlockGround
    blockGround(arg0: number, arg1: number): void {
        const var3 = arg1 - this.startX;
        const var4 = arg0 - this.startZ;
        this.flags[var3][var4] |= 0x200000;
    }

    // jag::oldscape::movement::CollisionMap::BlockGroundDecor
    blockGroundDecor(arg0: number, arg1: number): void {
        const var3 = arg0 - this.startZ;
        const var4 = arg1 - this.startX;
        this.flags[var4][var3] |= 0x40000;
    }

    // jag::oldscape::movement::CollisionMap::AddCMap
    addCMap(arg0: number, arg1: number, arg2: number): void {
        this.flags[arg0][arg2] |= arg1;
    }

    // jag::oldscape::movement::CollisionMap::DelWall
    delWall(arg0: boolean, arg1: number, arg2: number, arg3: number, arg4: number): void {
        const var6 = arg4 - this.startX;
        const var7 = arg3 - this.startZ;
        if (arg1 === 0) {
            if (arg2 === 0) {
                this.remCMap(var6, var7, 128);
                this.remCMap(var6 - 1, var7, 8);
            }
            if (arg2 === 1) {
                this.remCMap(var6, var7, 2);
                this.remCMap(var6, var7 + 1, 32);
            }
            if (arg2 === 2) {
                this.remCMap(var6, var7, 8);
                this.remCMap(var6 + 1, var7, 128);
            }
            if (arg2 === 3) {
                this.remCMap(var6, var7, 32);
                this.remCMap(var6, var7 - 1, 2);
            }
        }
        if (arg1 === 1 || arg1 === 3) {
            if (arg2 === 0) {
                this.remCMap(var6, var7, 1);
                this.remCMap(var6 - 1, var7 + 1, 16);
            }
            if (arg2 === 1) {
                this.remCMap(var6, var7, 4);
                this.remCMap(var6 + 1, var7 + 1, 64);
            }
            if (arg2 === 2) {
                this.remCMap(var6, var7, 16);
                this.remCMap(var6 + 1, var7 + -1, 1);
            }
            if (arg2 === 3) {
                this.remCMap(var6, var7, 64);
                this.remCMap(var6 - 1, var7 + -1, 4);
            }
        }
        if (arg1 === 2) {
            if (arg2 === 0) {
                this.remCMap(var6, var7, 130);
                this.remCMap(var6 - 1, var7, 8);
                this.remCMap(var6, var7 + 1, 32);
            }
            if (arg2 === 1) {
                this.remCMap(var6, var7, 10);
                this.remCMap(var6, var7 + 1, 32);
                this.remCMap(var6 + 1, var7, 128);
            }
            if (arg2 === 2) {
                this.remCMap(var6, var7, 40);
                this.remCMap(var6 + 1, var7, 128);
                this.remCMap(var6, var7 - 1, 2);
            }
            if (arg2 === 3) {
                this.remCMap(var6, var7, 160);
                this.remCMap(var6, var7 - 1, 2);
                this.remCMap(var6 - 1, var7, 8);
            }
        }
        if (!arg0) {
            return;
        }
        if (arg1 === 0) {
            if (arg2 === 0) {
                this.remCMap(var6, var7, 65536);
                this.remCMap(var6 - 1, var7, 4096);
            }
            if (arg2 === 1) {
                this.remCMap(var6, var7, 1024);
                this.remCMap(var6, var7 + 1, 16384);
            }
            if (arg2 === 2) {
                this.remCMap(var6, var7, 4096);
                this.remCMap(var6 + 1, var7, 65536);
            }
            if (arg2 === 3) {
                this.remCMap(var6, var7, 16384);
                this.remCMap(var6, var7 - 1, 1024);
            }
        }
        if (arg1 === 1 || arg1 === 3) {
            if (arg2 === 0) {
                this.remCMap(var6, var7, 512);
                this.remCMap(var6 - 1, var7 + 1, 8192);
            }
            if (arg2 === 1) {
                this.remCMap(var6, var7, 2048);
                this.remCMap(var6 + 1, var7 + 1, 32768);
            }
            if (arg2 === 2) {
                this.remCMap(var6, var7, 8192);
                this.remCMap(var6 + 1, var7 - 1, 512);
            }
            if (arg2 === 3) {
                this.remCMap(var6, var7, 32768);
                this.remCMap(var6 - 1, var7 - 1, 2048);
            }
        }
        if (arg1 !== 2) {
            return;
        }
        if (arg2 === 0) {
            this.remCMap(var6, var7, 66560);
            this.remCMap(var6 - 1, var7, 4096);
            this.remCMap(var6, var7 + 1, 16384);
        }
        if (arg2 === 1) {
            this.remCMap(var6, var7, 5120);
            this.remCMap(var6, var7 + 1, 16384);
            this.remCMap(var6 + 1, var7, 65536);
        }
        if (arg2 === 2) {
            this.remCMap(var6, var7, 20480);
            this.remCMap(var6 + 1, var7, 65536);
            this.remCMap(var6, var7 - 1, 1024);
        }
        if (arg2 === 3) {
            this.remCMap(var6, var7, 81920);
            this.remCMap(var6, var7 - 1, 1024);
            this.remCMap(var6 - 1, var7, 4096);
            return;
        }
    }

    // jag::oldscape::movement::CollisionMap::DelLoc
    delLoc(arg0: number, arg1: boolean, arg2: number, arg3: number, arg4: number, arg5: number): void {
        if (arg2 === 1 || arg2 === 3) {
            const var7 = arg5;
            arg5 = arg4;
            arg4 = var7;
        }
        const var8 = arg3 - this.startZ;
        const var9 = arg0 - this.startX;
        let var10 = 256;
        if (arg1) {
            var10 = 131328;
        }
        for (let var11 = var9; var11 < arg5 + var9; var11++) {
            if (var11 >= 0 && var11 < this.sizeX) {
                for (let var12 = var8; var12 < arg4 + var8; var12++) {
                    if (var12 >= 0 && this.sizeZ > var12) {
                        this.remCMap(var11, var12, var10);
                    }
                }
            }
        }
    }

    // jag::oldscape::movement::CollisionMap::RemCMap
    remCMap(arg0: number, arg1: number, arg2: number): void {
        this.flags[arg0][arg1] &= ~arg2;
    }

    // jag::oldscape::movement::CollisionMap::UnblockGroundDecor
    unblockGroundDecor(arg0: number, arg1: number): void {
        const var3 = arg0 - this.startX;
        const var4 = arg1 - this.startZ;
        this.flags[var3][var4] &= 0xfffbffff;
    }

    // jag::oldscape::movement::CollisionMap::TestWall
    testWall(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number): boolean {
        if (arg4 === 1) {
            if (arg6 === arg2 && arg3 === arg0) {
                return true;
            }
        } else if (arg6 <= arg2 && arg2 <= arg6 + arg4 - 1 && arg3 >= arg3 && arg3 <= arg3 + arg4 - 1) {
            return true;
        }
        const var8 = arg2 - this.startX;
        const var9 = arg6 - this.startX;
        const var10 = arg3 - this.startZ;
        const var11 = arg0 - this.startZ;
        if (arg4 === 1) {
            if (arg1 === 0) {
                if (arg5 === 0) {
                    if (var9 === var8 - 1 && var11 === var10) {
                        return true;
                    }
                    if (var9 === var8 && var11 === var10 + 1 && (this.flags[var9][var11] & 0x12c0120) === 0) {
                        return true;
                    }
                    if (var8 === var9 && var11 === var10 - 1 && (this.flags[var9][var11] & 0x12c0102) === 0) {
                        return true;
                    }
                } else if (arg5 === 1) {
                    if (var8 === var9 && var10 + 1 === var11) {
                        return true;
                    }
                    if (var8 - 1 === var9 && var10 === var11 && (this.flags[var9][var11] & 0x12c0108) === 0) {
                        return true;
                    }
                    if (var9 === var8 + 1 && var10 === var11 && (this.flags[var9][var11] & 0x12c0180) === 0) {
                        return true;
                    }
                } else if (arg5 === 2) {
                    if (var8 + 1 === var9 && var11 === var10) {
                        return true;
                    }
                    if (var9 === var8 && var10 + 1 === var11 && (this.flags[var9][var11] & 0x12c0120) === 0) {
                        return true;
                    }
                    if (var8 === var9 && var10 - 1 === var11 && (this.flags[var9][var11] & 0x12c0102) === 0) {
                        return true;
                    }
                } else if (arg5 === 3) {
                    if (var9 === var8 && var10 - 1 === var11) {
                        return true;
                    }
                    if (var8 - 1 === var9 && var10 === var11 && (this.flags[var9][var11] & 0x12c0108) === 0) {
                        return true;
                    }
                    if (var9 === var8 + 1 && var11 === var10 && (this.flags[var9][var11] & 0x12c0180) === 0) {
                        return true;
                    }
                }
            }
            if (arg1 === 2) {
                if (arg5 === 0) {
                    if (var9 === var8 - 1 && var11 === var10) {
                        return true;
                    }
                    if (var9 === var8 && var11 === var10 + 1) {
                        return true;
                    }
                    if (var9 === var8 + 1 && var10 === var11 && (this.flags[var9][var11] & 0x12c0180) === 0) {
                        return true;
                    }
                    if (var9 === var8 && var10 - 1 === var11 && (this.flags[var9][var11] & 0x12c0102) === 0) {
                        return true;
                    }
                } else if (arg5 === 1) {
                    if (var8 - 1 === var9 && var10 === var11 && (this.flags[var9][var11] & 0x12c0108) === 0) {
                        return true;
                    }
                    if (var9 === var8 && var10 + 1 === var11) {
                        return true;
                    }
                    if (var9 === var8 + 1 && var11 === var10) {
                        return true;
                    }
                    if (var8 === var9 && var10 - 1 === var11 && (this.flags[var9][var11] & 0x12c0102) === 0) {
                        return true;
                    }
                } else if (arg5 === 2) {
                    if (var8 - 1 === var9 && var11 === var10 && (this.flags[var9][var11] & 0x12c0108) === 0) {
                        return true;
                    }
                    if (var9 === var8 && var10 + 1 === var11 && (this.flags[var9][var11] & 0x12c0120) === 0) {
                        return true;
                    }
                    if (var9 === var8 + 1 && var11 === var10) {
                        return true;
                    }
                    if (var9 === var8 && var11 === var10 - 1) {
                        return true;
                    }
                } else if (arg5 === 3) {
                    if (var9 === var8 - 1 && var10 === var11) {
                        return true;
                    }
                    if (var9 === var8 && var10 + 1 === var11 && (this.flags[var9][var11] & 0x12c0120) === 0) {
                        return true;
                    }
                    if (var8 + 1 === var9 && var10 === var11 && (this.flags[var9][var11] & 0x12c0180) === 0) {
                        return true;
                    }
                    if (var8 === var9 && var11 === var10 - 1) {
                        return true;
                    }
                }
            }
            if (arg1 === 9) {
                if (var9 === var8 && var11 === var10 + 1 && (this.flags[var9][var11] & 0x20) === 0) {
                    return true;
                }
                if (var9 === var8 && var10 - 1 === var11 && (this.flags[var9][var11] & 0x2) === 0) {
                    return true;
                }
                if (var9 === var8 - 1 && var11 === var10 && (this.flags[var9][var11] & 0x8) === 0) {
                    return true;
                }
                if (var9 === var8 + 1 && var10 === var11 && (this.flags[var9][var11] & 0x80) === 0) {
                    return true;
                }
            }
        } else {
            const var12 = var9 + arg4 - 1;
            const var13 = var11 + arg4 - 1;
            if (arg1 === 0) {
                if (arg5 === 0) {
                    if (var8 - arg4 === var9 && var11 <= var10 && var13 >= var10) {
                        return true;
                    }
                    if (var9 <= var8 && var8 <= var12 && var10 + 1 === var11 && (this.flags[var8][var11] & 0x12c0120) === 0) {
                        return true;
                    }
                    if (var9 <= var8 && var12 >= var8 && var11 === var10 - arg4 && (this.flags[var8][var13] & 0x12c0102) === 0) {
                        return true;
                    }
                } else if (arg5 === 1) {
                    if (var8 >= var9 && var8 <= var12 && var11 === var10 + 1) {
                        return true;
                    }
                    if (var9 === var8 - arg4 && var10 >= var11 && var10 <= var13 && (this.flags[var12][var10] & 0x12c0108) === 0) {
                        return true;
                    }
                    if (var9 === var8 + 1 && var10 >= var11 && var13 >= var10 && (this.flags[var9][var10] & 0x12c0180) === 0) {
                        return true;
                    }
                } else if (arg5 === 2) {
                    if (var8 + 1 === var9 && var10 >= var11 && var10 <= var13) {
                        return true;
                    }
                    if (var8 >= var9 && var8 <= var12 && var11 === var10 + 1 && (this.flags[var8][var11] & 0x12c0120) === 0) {
                        return true;
                    }
                    if (var9 <= var8 && var12 >= var8 && var10 - arg4 === var11 && (this.flags[var8][var13] & 0x12c0102) === 0) {
                        return true;
                    }
                } else if (arg5 === 3) {
                    if (var9 <= var8 && var8 <= var12 && var10 - arg4 === var11) {
                        return true;
                    }
                    if (var8 - arg4 === var9 && var10 >= var11 && var13 >= var10 && (this.flags[var12][var10] & 0x12c0108) === 0) {
                        return true;
                    }
                    if (var8 + 1 === var9 && var11 <= var10 && var13 >= var10 && (this.flags[var9][var10] & 0x12c0180) === 0) {
                        return true;
                    }
                }
            }
            if (arg1 === 2) {
                if (arg5 === 0) {
                    if (var8 - arg4 === var9 && var11 <= var10 && var13 >= var10) {
                        return true;
                    }
                    if (var8 >= var9 && var12 >= var8 && var11 === var10 + 1) {
                        return true;
                    }
                    if (var8 + 1 === var9 && var10 >= var11 && var13 >= var10 && (this.flags[var9][var10] & 0x12c0180) === 0) {
                        return true;
                    }
                    if (var8 >= var9 && var12 >= var8 && var11 === var10 - arg4 && (this.flags[var8][var13] & 0x12c0102) === 0) {
                        return true;
                    }
                } else if (arg5 === 1) {
                    if (var8 - arg4 === var9 && var11 <= var10 && var10 <= var13 && (this.flags[var12][var10] & 0x12c0108) === 0) {
                        return true;
                    }
                    if (var8 >= var9 && var12 >= var8 && var11 === var10 + 1) {
                        return true;
                    }
                    if (var9 === var8 + 1 && var11 <= var10 && var10 <= var13) {
                        return true;
                    }
                    if (var8 >= var9 && var8 <= var12 && var10 - arg4 === var11 && (this.flags[var8][var13] & 0x12c0102) === 0) {
                        return true;
                    }
                } else if (arg5 === 2) {
                    if (var8 - arg4 === var9 && var10 >= var11 && var10 <= var13 && (this.flags[var12][var10] & 0x12c0108) === 0) {
                        return true;
                    }
                    if (var8 >= var9 && var12 >= var8 && var11 === var10 + 1 && (this.flags[var8][var11] & 0x12c0120) === 0) {
                        return true;
                    }
                    if (var9 === var8 + 1 && var11 <= var10 && var10 <= var13) {
                        return true;
                    }
                    if (var8 >= var9 && var8 <= var12 && var11 === var10 - arg4) {
                        return true;
                    }
                } else if (arg5 === 3) {
                    if (var8 - arg4 === var9 && var11 <= var10 && var10 <= var13) {
                        return true;
                    }
                    if (var8 >= var9 && var8 <= var12 && var11 === var10 + 1 && (this.flags[var8][var11] & 0x12c0120) === 0) {
                        return true;
                    }
                    if (var8 + 1 === var9 && var10 >= var11 && var10 <= var13 && (this.flags[var9][var10] & 0x12c0180) === 0) {
                        return true;
                    }
                    if (var8 >= var9 && var12 >= var8 && var11 === var10 - arg4) {
                        return true;
                    }
                }
            }
            if (arg1 === 9) {
                if (var8 >= var9 && var12 >= var8 && var10 + 1 === var11 && (this.flags[var8][var11] & 0x12c0120) === 0) {
                    return true;
                }
                if (var8 >= var9 && var8 <= var12 && var10 - arg4 === var11 && (this.flags[var8][var13] & 0x12c0102) === 0) {
                    return true;
                }
                if (var8 - arg4 === var9 && var11 <= var10 && var13 >= var10 && (this.flags[var12][var10] & 0x12c0108) === 0) {
                    return true;
                }
                if (var8 + 1 === var9 && var11 <= var10 && var13 >= var10 && (this.flags[var9][var10] & 0x12c0180) === 0) {
                    return true;
                }
            }
        }
        return false;
    }

    // jag::oldscape::movement::CollisionMap::TestWDecor
    testWDecor(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number): boolean {
        if (arg4 === 1) {
            if (arg1 === arg6 && arg5 === arg3) {
                return true;
            }
        } else if (arg1 <= arg6 && arg6 <= arg4 + arg1 - 1 && arg3 <= arg3 && arg3 <= arg3 + arg4 - 1) {
            return true;
        }
        const var8 = arg1 - this.startX;
        const var9 = arg5 - this.startZ;
        const var10 = arg6 - this.startX;
        const var11 = arg3 - this.startZ;
        if (arg4 === 1) {
            if (arg2 === 6 || arg2 === 7) {
                if (arg2 === 7) {
                    arg0 = (arg0 + 2) & 0x3;
                }
                if (arg0 === 0) {
                    if (var10 + 1 === var8 && var9 === var11 && (this.flags[var8][var9] & 0x80) === 0) {
                        return true;
                    }
                    if (var8 === var10 && var9 === var11 - 1 && (this.flags[var8][var9] & 0x2) === 0) {
                        return true;
                    }
                } else if (arg0 === 1) {
                    if (var10 - 1 === var8 && var9 === var11 && (this.flags[var8][var9] & 0x8) === 0) {
                        return true;
                    }
                    if (var10 === var8 && var11 - 1 === var9 && (this.flags[var8][var9] & 0x2) === 0) {
                        return true;
                    }
                } else if (arg0 === 2) {
                    if (var8 === var10 - 1 && var11 === var9 && (this.flags[var8][var9] & 0x8) === 0) {
                        return true;
                    }
                    if (var10 === var8 && var9 === var11 + 1 && (this.flags[var8][var9] & 0x20) === 0) {
                        return true;
                    }
                } else if (arg0 === 3) {
                    if (var10 + 1 === var8 && var11 === var9 && (this.flags[var8][var9] & 0x80) === 0) {
                        return true;
                    }
                    if (var8 === var10 && var9 === var11 + 1 && (this.flags[var8][var9] & 0x20) === 0) {
                        return true;
                    }
                }
            }
            if (arg2 === 8) {
                if (var10 === var8 && var9 === var11 + 1 && (this.flags[var8][var9] & 0x20) === 0) {
                    return true;
                }
                if (var10 === var8 && var11 - 1 === var9 && (this.flags[var8][var9] & 0x2) === 0) {
                    return true;
                }
                if (var8 === var10 - 1 && var9 === var11 && (this.flags[var8][var9] & 0x8) === 0) {
                    return true;
                }
                if (var10 + 1 === var8 && var9 === var11 && (this.flags[var8][var9] & 0x80) === 0) {
                    return true;
                }
            }
        } else {
            const var12 = arg4 + var8 - 1;
            const var13 = var9 + arg4 - 1;
            if (arg2 === 6 || arg2 === 7) {
                if (arg2 === 7) {
                    arg0 = (arg0 + 2) & 0x3;
                }
                if (arg0 === 0) {
                    if (var10 + 1 === var8 && var9 <= var11 && var11 <= var13 && (this.flags[var8][var11] & 0x80) === 0) {
                        return true;
                    }
                    if (var8 <= var10 && var10 <= var12 && var9 === var11 - arg4 && (this.flags[var10][var13] & 0x2) === 0) {
                        return true;
                    }
                } else if (arg0 === 1) {
                    if (var8 === var10 - arg4 && var11 >= var9 && var13 >= var11 && (this.flags[var12][var11] & 0x8) === 0) {
                        return true;
                    }
                    if (var8 <= var10 && var12 >= var10 && var11 - arg4 === var9 && (this.flags[var10][var13] & 0x2) === 0) {
                        return true;
                    }
                } else if (arg0 === 2) {
                    if (var8 === var10 - arg4 && var9 <= var11 && var11 <= var13 && (this.flags[var12][var11] & 0x8) === 0) {
                        return true;
                    }
                    if (var8 <= var10 && var10 <= var12 && var9 === var11 + 1 && (this.flags[var10][var9] & 0x20) === 0) {
                        return true;
                    }
                } else if (arg0 === 3) {
                    if (var8 === var10 + 1 && var11 >= var9 && var13 >= var11 && (this.flags[var8][var11] & 0x80) === 0) {
                        return true;
                    }
                    if (var8 <= var10 && var10 <= var12 && var9 === var11 + 1 && (this.flags[var10][var9] & 0x20) === 0) {
                        return true;
                    }
                }
            }
            if (arg2 === 8) {
                if (var10 >= var8 && var10 <= var12 && var11 + 1 === var9 && (this.flags[var10][var9] & 0x20) === 0) {
                    return true;
                }
                if (var10 >= var8 && var12 >= var10 && var11 - arg4 === var9 && (this.flags[var10][var13] & 0x2) === 0) {
                    return true;
                }
                if (var10 - arg4 === var8 && var11 >= var9 && var13 >= var11 && (this.flags[var12][var11] & 0x8) === 0) {
                    return true;
                }
                if (var8 === var10 + 1 && var11 >= var9 && var13 >= var11 && (this.flags[var8][var11] & 0x80) === 0) {
                    return true;
                }
            }
        }
        return false;
    }

    // jag::oldscape::movement::CollisionMap::TestLoc
    testLoc(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number): boolean {
        if (arg0 > 1) {
            return this.testRectOverlap(arg2, arg0, arg0, arg4, arg3, arg1, arg5, arg6) ? true : this.testLocBoundary(arg0, arg3, arg5, arg2, arg4, arg0, arg1, arg6, arg7);
        }
        const var9 = arg1 + arg4 - 1;
        const var10 = arg6 + arg2 - 1;
        if (arg5 >= arg6 && arg5 <= var10 && arg1 <= arg3 && var9 >= arg3) {
            return true;
        } else if (arg5 === arg6 - 1 && arg3 >= arg1 && arg3 <= var9 && (this.flags[arg5 - this.startX][arg3 - this.startZ] & 0x8) === 0 && (arg7 & 0x8) === 0) {
            return true;
        } else if (arg5 === var10 + 1 && arg3 >= arg1 && arg3 <= var9 && (this.flags[arg5 - this.startX][arg3 - this.startZ] & 0x80) === 0 && (arg7 & 0x2) === 0) {
            return true;
        } else if (arg3 === arg1 - 1 && arg6 <= arg5 && var10 >= arg5 && (this.flags[arg5 - this.startX][arg3 - this.startZ] & 0x2) === 0 && (arg7 & 0x4) === 0) {
            return true;
        } else {
            return var9 + 1 === arg3 && arg6 <= arg5 && var10 >= arg5 && (this.flags[arg5 - this.startX][arg3 - this.startZ] & 0x20) === 0 && (arg7 & 0x1) === 0;
        }
    }

    // ---- todo: sort

    testLocBoundary(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number): boolean {
        const var10 = arg1 + arg5;
        const var11 = arg2 + arg0;
        const var12 = arg7 + arg3;
        const var13 = arg6 + arg4;
        if (arg7 <= arg2 && var12 > arg2) {
            if (arg6 === var10 && (arg8 & 0x4) === 0) {
                const var22 = var11 <= var12 ? var11 : var12;
                for (let var23 = arg2; var23 < var22; var23++) {
                    if ((this.flags[var23 - this.startX][var10 - this.startZ - 1] & 0x2) === 0) {
                        return true;
                    }
                }
            } else if (var13 === arg1 && (arg8 & 0x1) === 0) {
                let var24 = arg2;
                const var25 = var12 >= var11 ? var11 : var12;
                while (var24 < var25) {
                    if ((this.flags[var24 - this.startX][arg1 - this.startZ] & 0x20) === 0) {
                        return true;
                    }
                    var24++;
                }
            }
        } else if (arg7 < var11 && var11 <= var12) {
            if (var10 === arg6 && (arg8 & 0x4) === 0) {
                for (let var21 = arg7; var21 < var11; var21++) {
                    if ((this.flags[var21 - this.startX][var10 - this.startZ - 1] & 0x2) === 0) {
                        return true;
                    }
                }
            } else if (arg1 === var13 && (arg8 & 0x1) === 0) {
                for (let var20 = arg7; var20 < var11; var20++) {
                    if ((this.flags[var20 - this.startX][arg1 - this.startZ] & 0x20) === 0) {
                        return true;
                    }
                }
            }
        } else if (arg6 <= arg1 && var13 > arg1) {
            if (var11 === arg7 && (arg8 & 0x8) === 0) {
                let var14 = arg1;
                const var15 = var13 < var10 ? var13 : var10;
                while (var14 < var15) {
                    if ((this.flags[var11 - this.startX - 1][var14 - this.startZ] & 0x8) === 0) {
                        return true;
                    }
                    var14++;
                }
            } else if (var12 === arg2 && (arg8 & 0x2) === 0) {
                let var16 = arg1;
                const var17 = var13 >= var10 ? var10 : var13;
                while (var16 < var17) {
                    if ((this.flags[arg2 - this.startX][var16 - this.startZ] & 0x80) === 0) {
                        return true;
                    }
                    var16++;
                }
            }
        } else if (var10 > arg6 && var10 <= var13) {
            if (arg7 === var11 && (arg8 & 0x8) === 0) {
                for (let var18 = arg6; var18 < var10; var18++) {
                    if ((this.flags[var11 - this.startX - 1][var18 - this.startZ] & 0x8) === 0) {
                        return true;
                    }
                }
            } else if (var12 === arg2 && (arg8 & 0x2) === 0) {
                for (let var19 = arg6; var19 < var10; var19++) {
                    if ((this.flags[arg2 - this.startX][var19 - this.startZ] & 0x80) === 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    testRectOverlap(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number): boolean {
        if (arg6 < arg0 + arg7 && arg7 < arg2 + arg6) {
            return arg5 + arg3 > arg4 && arg1 + arg4 > arg5;
        } else {
            return false;
        }
    }
}
