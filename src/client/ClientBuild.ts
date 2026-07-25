import { Client } from '#/client/Client.js';
import FloType from '#/config/FloType.js';
import FluType from '#/config/FluType.js';
import LocType from '#/config/LocType.js';
import BgSound from '#/sound/BgSound.js';

import ClientLocAnim from '#/dash3d/ClientLocAnim.js';
import CollisionMap, { BuildArea } from '#/dash3d/CollisionMap.js';
import ModelLit from '#/dash3d/ModelLit.js';
import type ModelSource from '#/dash3d/ModelSource.js';
import RegionRotate from '#/dash3d/RegionRotate.js';
import World from '#/dash3d/World.js';

import Pix3D from '#/dash3d/Pix3D.js';

import Packet from '#/io/Packet.js';

// jag::oldscape::ClientBuild
export default class ClientBuild {
    // jag::oldscape::ClientBuild::m_groundh
    static groundh: Int32Array[][] | null = null;

    // jag::oldscape::ClientBuild::m_mapl
    static mapl: Uint8Array[][] = Array.from({ length: BuildArea.LEVELS }, () => Array.from({ length: BuildArea.SIZE }, () => new Uint8Array(BuildArea.SIZE)));

    // jag::oldscape::ClientBuild::minusedlevel
    static minusedlevel: number = 99;

    // jag::oldscape::ClientBuild::m_floort1
    static floort1: Uint8Array[][] | null = null;

    // jag::oldscape::ClientBuild::m_floort2
    static floort2: Uint8Array[][] | null = null;

    // jag::oldscape::ClientBuild::m_floors
    static floors: Uint8Array[][] | null = null;

    // jag::oldscape::ClientBuild::m_floorr
    static floorr: Uint8Array[][] | null = null;

    // jag::oldscape::ClientBuild::m_shadow
    static shadow: Uint8Array[][] | null = null;

    // jag::oldscape::ClientBuild::m_lightmap
    static lightmap: Int32Array[] | null = null;

    // jag::oldscape::ClientBuild::m_huetot
    static huetot: Int32Array | null = null;

    // jag::oldscape::ClientBuild::m_sattot
    static sattot: Int32Array | null = null;

    // jag::oldscape::ClientBuild::m_ligtot
    static ligtot: Int32Array | null = null;

    // jag::oldscape::ClientBuild::m_comtot
    static comtot: Int32Array | null = null;

    // jag::oldscape::ClientBuild::m_tot
    static tot: Int32Array | null = null;

    // jag::oldscape::ClientBuild::m_mapo
    static mapo: Int32Array[][] | null = null;

    // jag::oldscape::ClientBuild::WSHAPE0
    static readonly WSHAPE0: Int32Array = Int32Array.of(1, 2, 4, 8);

    // jag::oldscape::ClientBuild::WSHAPE1
    static readonly WSHAPE1: Int32Array = Int32Array.of(16, 32, 64, 128);

    // jag::oldscape::ClientBuild::DECORXOF
    static readonly DECORXOF: Int32Array = Int32Array.of(1, 0, -1, 0);

    // jag::oldscape::ClientBuild::DECORZOF
    static readonly DECORZOF: Int32Array = Int32Array.of(0, -1, 0, 1);

    // jag::oldscape::ClientBuild::DECORXOF2
    static readonly DECORXOF2: Int32Array = Int32Array.of(1, -1, -1, 1);

    // jag::oldscape::ClientBuild::DECORZOF2
    static readonly DECORZOF2: Int32Array = Int32Array.of(-1, -1, 1, 1);

    // jag::oldscape::ClientBuild::m_hueOff
    static hueOff: number = ((Math.random() * 17.0) | 0) - 8;

    // jag::oldscape::ClientBuild::m_ligOff
    static ligOff: number = ((Math.random() * 33.0) | 0) - 16;

    // todo: move to client?
    static readonly zoneMapArchiveIds: Int32Array[][] = Array.from({ length: BuildArea.LEVELS }, () => Array.from({ length: 13 }, () => new Int32Array(13)));
    static field3221: (Uint8Array | null)[] | null = null;
    static field2731: Int32Array | null = null;
    static field774: (Uint8Array | null)[] | null = null;

    // jag::oldscape::ClientBuild::Quit
    static quit(): void {
        ClientBuild.ligtot = null;
        ClientBuild.comtot = null;
        ClientBuild.floorr = null;
        ClientBuild.sattot = null;
        ClientBuild.mapo = null;
        ClientBuild.tot = null;
        ClientBuild.shadow = null;
        ClientBuild.floors = null;
        ClientBuild.floort1 = null;
        ClientBuild.floort2 = null;
        ClientBuild.huetot = null;
    }

    // jag::oldscape::ClientBuild::FadeAdjacent
    static fadeAdjacent(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number): void {
        for (let var5 = arg3; var5 <= arg1 + arg3; var5++) {
            for (let var6 = arg4; var6 <= arg4 + arg2; var6++) {
                if (var6 >= 0 && var6 < 104 && var5 >= 0 && var5 < 104) {
                    ClientBuild.shadow![arg0][var6][var5] = 127;
                }
            }
        }
        for (let var7 = arg3; var7 < arg1 + arg3; var7++) {
            for (let var8 = arg4; var8 < arg2 + arg4; var8++) {
                if (var8 >= 0 && var8 < 104 && var7 >= 0 && var7 < 104) {
                    ClientBuild.groundh![arg0][var8][var7] = arg0 <= 0 ? 0 : ClientBuild.groundh![arg0 - 1][var8][var7];
                }
            }
        }
        if (arg4 > 0 && arg4 < 104) {
            for (let var9 = arg3 + 1; var9 < arg1 + arg3; var9++) {
                if (var9 >= 0 && var9 < 104) {
                    ClientBuild.groundh![arg0][arg4][var9] = ClientBuild.groundh![arg0][arg4 - 1][var9];
                }
            }
        }
        if (arg3 > 0 && arg3 < 104) {
            for (let var10 = arg4 + 1; var10 < arg2 + arg4; var10++) {
                if (var10 >= 0 && var10 < 104) {
                    ClientBuild.groundh![arg0][var10][arg3] = ClientBuild.groundh![arg0][var10][arg3 - 1];
                }
            }
        }
        if (arg4 >= 0 && arg3 >= 0 && arg4 < 104 && arg3 < 104) {
            if (arg0 === 0) {
                if (arg4 > 0 && ClientBuild.groundh![arg0][arg4 - 1][arg3] !== 0) {
                    ClientBuild.groundh![arg0][arg4][arg3] = ClientBuild.groundh![arg0][arg4 - 1][arg3];
                } else if (arg3 > 0 && ClientBuild.groundh![arg0][arg4][arg3 - 1] !== 0) {
                    ClientBuild.groundh![arg0][arg4][arg3] = ClientBuild.groundh![arg0][arg4][arg3 - 1];
                } else if (arg4 > 0 && arg3 > 0 && ClientBuild.groundh![arg0][arg4 - 1][arg3 - 1] !== 0) {
                    ClientBuild.groundh![arg0][arg4][arg3] = ClientBuild.groundh![arg0][arg4 - 1][arg3 - 1];
                }
            } else {
                if (arg4 > 0 && ClientBuild.groundh![arg0 - 1][arg4 - 1][arg3] !== ClientBuild.groundh![arg0][arg4 - 1][arg3]) {
                    ClientBuild.groundh![arg0][arg4][arg3] = ClientBuild.groundh![arg0][arg4 - 1][arg3];
                } else if (arg3 > 0 && ClientBuild.groundh![arg0][arg4][arg3 - 1] !== ClientBuild.groundh![arg0 - 1][arg4][arg3 - 1]) {
                    ClientBuild.groundh![arg0][arg4][arg3] = ClientBuild.groundh![arg0][arg4][arg3 - 1];
                } else if (arg4 > 0 && arg3 > 0 && ClientBuild.groundh![arg0 - 1][arg4 - 1][arg3 - 1] !== ClientBuild.groundh![arg0][arg4 - 1][arg3 - 1]) {
                    ClientBuild.groundh![arg0][arg4][arg3] = ClientBuild.groundh![arg0][arg4 - 1][arg3 - 1];
                }
            }
        }
    }

    // jag::oldscape::ClientBuild::LoadGround
    static loadGround(): void;
    static loadGround(originZ: number, xOffset: number, originX: number, collisions: Array<CollisionMap | null>, zOffset: number, src: Uint8Array): void;
    static loadGround(arg0?: number, arg1?: number, arg2?: number, arg3?: Array<CollisionMap | null>, arg4?: number, arg5?: Uint8Array): void {
        if (arg0 === undefined) {
            const var0 = ClientBuild.field3221!;
            const var1 = var0.length;
            for (let var2 = 0; var2 < var1; var2++) {
                const var3 = ((ClientBuild.field2731![var2] >> 8) * 64 - Client.mapBuildBaseX) | 0;
                const var4 = var0[var2];
                const var5 = ((ClientBuild.field2731![var2] & 0xff) * 64 - Client.mapBuildBaseZ) | 0;
                if (var4 != null) {
                    Client.doAudio();
                    ClientBuild.loadGround(Client.mapBuildCentreZoneZ * 8 - 48, var3, (Client.mapBuildCentreZoneX - 6) * 8, Client.collision, var5, var4);
                }
            }
            for (let var6 = 0; var6 < var1; var6++) {
                const var7 = ((ClientBuild.field2731![var6] >> 8) * 64 - Client.mapBuildBaseX) | 0;
                const var8 = ((ClientBuild.field2731![var6] & 0xff) * 64 - Client.mapBuildBaseZ) | 0;
                const var9 = var0[var6];
                if (var9 == null && Client.mapBuildCentreZoneZ < 800) {
                    Client.doAudio();
                    for (let var10 = 0; var10 < 4; var10++) {
                        ClientBuild.fadeAdjacent(var10, 64, 64, var8, var7);
                    }
                }
            }
            return;
        }
        for (let var6 = 0; var6 < 4; var6++) {
            for (let var7 = 0; var7 < 64; var7++) {
                for (let var8 = 0; var8 < 64; var8++) {
                    if (var7 + arg1! > 0 && var7 + arg1! < 103 && var8 + arg4! > 0 && arg4! + var8 < 103) {
                        arg3![var6]!.flags[var7 + arg1!][var8 + arg4!] &= 0xfeffffff;
                    }
                }
            }
        }

        const var9 = new Packet(arg5!);
        for (let var10 = 0; var10 < 4; var10++) {
            for (let var11 = 0; var11 < 64; var11++) {
                for (let var12 = 0; var12 < 64; var12++) {
                    ClientBuild.loadGroundSquare(var11 + arg1!, var9, arg0, arg2!, var12 + arg4!, 0, var10);
                }
            }
        }
    }

    // jag::oldscape::ClientBuild::LoadGroundRegion
    static loadGroundRegion(): void;
    static loadGroundRegion(dstX: number, rotation: number, srcX: number, srcZ: number, collisions: Array<CollisionMap | null>, srcLevel: number, src: Uint8Array, dstZ: number, dstLevel: number): void;
    static loadGroundRegion(arg0?: number, arg1?: number, arg2?: number, arg3?: number, arg4?: Array<CollisionMap | null>, arg5?: number, arg6?: Uint8Array, arg7?: number, arg8?: number): void {
        if (arg0 === undefined) {
            const var0 = ClientBuild.field3221!;
            for (let var1 = 0; var1 < 4; var1++) {
                Client.doAudio();
                for (let var2 = 0; var2 < 13; var2++) {
                    for (let var3 = 0; var3 < 13; var3++) {
                        let var4 = false;
                        const var5 = ClientBuild.zoneMapArchiveIds[var1][var2][var3];
                        if (var5 !== -1) {
                            const var6 = (var5 >> 24) & 0x3;
                            const var7 = (var5 >> 14) & 0x3ff;
                            const var8 = (var5 >> 1) & 0x3;
                            const var9 = (var5 >> 3) & 0x7ff;
                            const var10 = ((var9 / 8) | 0) + (((var7 / 8) | 0) << 8);
                            for (let var11 = 0; var11 < ClientBuild.field2731!.length; var11++) {
                                if (var10 === ClientBuild.field2731![var11] && var0[var11] != null) {
                                    ClientBuild.loadGroundRegion(var2 * 8, var8, (var7 & 0x7) * 8, (var9 & 0x7) * 8, Client.collision, var6, var0[var11]!, var3 * 8, var1);
                                    var4 = true;
                                    break;
                                }
                            }
                        }
                        if (!var4) {
                            ClientBuild.fadeAdjacent(var1, 8, 8, var3 * 8, var2 * 8);
                        }
                    }
                }
            }
            return;
        }
        for (let var9 = 0; var9 < 8; var9++) {
            for (let var10 = 0; var10 < 8; var10++) {
                if (var9 + arg0 > 0 && var9 + arg0 < 103 && arg7! + var10 > 0 && var10 + arg7! < 103) {
                    arg4![arg8!]!.flags[arg0 + var9][arg7! + var10] &= 0xfeffffff;
                }
            }
        }

        const var11 = new Packet(arg6!);
        for (let var12 = 0; var12 < 4; var12++) {
            for (let var13 = 0; var13 < 64; var13++) {
                for (let var14 = 0; var14 < 64; var14++) {
                    if (var12 === arg5 && var13 >= arg2! && var13 < arg2! + 8 && var14 >= arg3! && var14 < arg3! + 8) {
                        ClientBuild.loadGroundSquare(RegionRotate.DX(arg1!, var13 & 0x7, var14 & 0x7) + arg0, var11, 0, 0, arg7! + RegionRotate.DZ(var14 & 0x7, var13 & 0x7, arg1!), arg1!, arg8!);
                    } else {
                        ClientBuild.loadGroundSquare(-1, var11, 0, 0, -1, 0, 0);
                    }
                }
            }
        }
    }

    // jag::oldscape::ClientBuild::LoadGroundSquare
    static loadGroundSquare(arg0: number, arg1: Packet, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number): void {
        if (arg0 < 0 || arg0 >= 104 || arg4 < 0 || arg4 >= 104) {
            while (true) {
                const var7 = arg1.g1();
                if (var7 === 0) {
                    return;
                }
                if (var7 === 1) {
                    arg1.g1();
                    return;
                }
                if (var7 <= 49) {
                    arg1.g1();
                }
            }
        }

        ClientBuild.mapl[arg6][arg0][arg4] = 0;
        while (true) {
            const var8 = arg1.g1();
            if (var8 === 0) {
                if (arg6 === 0) {
                    ClientBuild.groundh![0][arg0][arg4] = -ClientBuild.perlinNoise(arg3 + arg0 + 932731, 556238 - -arg4 - -arg2) * 8;
                    return;
                } else {
                    ClientBuild.groundh![arg6][arg0][arg4] = ClientBuild.groundh![arg6 - 1][arg0][arg4] - 240;
                    return;
                }
            }

            if (var8 === 1) {
                let var9 = arg1.g1();
                if (var9 === 1) {
                    var9 = 0;
                }
                if (arg6 === 0) {
                    ClientBuild.groundh![0][arg0][arg4] = -var9 * 8;
                    return;
                }
                ClientBuild.groundh![arg6][arg0][arg4] = ClientBuild.groundh![arg6 - 1][arg0][arg4] - var9 * 8;
                return;
            }

            if (var8 <= 49) {
                ClientBuild.floort2![arg6][arg0][arg4] = arg1.g1b();
                ClientBuild.floors![arg6][arg0][arg4] = (((var8 - 2) / 4) | 0) & 0xff;
                ClientBuild.floorr![arg6][arg0][arg4] = (arg5 + var8 - 2) & 0x3 & 0xff;
            } else if (var8 <= 81) {
                ClientBuild.mapl[arg6][arg0][arg4] = (var8 - 49) & 0xff;
            } else {
                ClientBuild.floort1![arg6][arg0][arg4] = (var8 - 81) & 0xff;
            }
        }
    }

    // jag::oldscape::ClientBuild::CheckLocations
    static checkLocations(arg0: Uint8Array, arg1: number, arg2: number): boolean {
        const var3 = new Packet(arg0);
        let var4 = true;
        let var5 = -1;
        label68: while (true) {
            const var6 = var3.gVarSmart();
            if (var6 === 0) {
                return var4;
            }
            let var7 = 0;
            var5 += var6;
            let var8 = false;
            while (true) {
                let var12: number;
                let var15: LocType;
                do {
                    let var13: number;
                    let var14: number;
                    do {
                        do {
                            do {
                                do {
                                    while (var8) {
                                        const var16 = var3.gsmart();
                                        if (var16 === 0) {
                                            continue label68;
                                        }
                                        var3.g1();
                                    }
                                    const var9 = var3.gsmart();
                                    if (var9 === 0) {
                                        continue label68;
                                    }
                                    var7 += var9 - 1;
                                    const var10 = (var7 >> 6) & 0x3f;
                                    const var11 = var7 & 0x3f;
                                    var12 = var3.g1() >> 2;
                                    var13 = arg2 + var10;
                                    var14 = var11 + arg1;
                                } while (var13 <= 0);
                            } while (var14 <= 0);
                        } while (var13 >= 103);
                    } while (var14 >= 103);
                    var15 = LocType.list(var5);
                } while (var12 === 22 && Client.lowMem && var15.active === 0 && var15.blockwalk !== 1 && !var15.forcedecor);
                var8 = true;
                if (!var15.checkModelAll()) {
                    var4 = false;
                    Client.field2045++;
                }
            }
        }
    }

    // jag::oldscape::ClientBuild::LoadLocations
    static loadLocations(): void;
    static loadLocations(collisions: Array<CollisionMap | null>, src: Uint8Array, xOffset: number, zOffset: number): void;
    static loadLocations(arg0?: Array<CollisionMap | null>, arg1?: Uint8Array, arg2?: number, arg3?: number): void {
        if (arg0 === undefined) {
            const var1 = ClientBuild.field774!;
            const var2 = ClientBuild.field3221!.length;
            for (let var3 = 0; var3 < var2; var3++) {
                const var4 = var1[var3];
                if (var4 != null) {
                    const var5 = ((ClientBuild.field2731![var3] >> 8) * 64 - Client.mapBuildBaseX) | 0;
                    const var6 = ((ClientBuild.field2731![var3] & 0xff) * 64 - Client.mapBuildBaseZ) | 0;
                    Client.doAudio();
                    ClientBuild.loadLocations(Client.collision, var4, var5, var6);
                }
            }
            return;
        }
        const var4 = new Packet(arg1!);
        let var5 = -1;

        while (true) {
            const var6 = var4.gVarSmart();
            if (var6 === 0) {
                return;
            }
            var5 += var6;
            let var7 = 0;
            while (true) {
                const var8 = var4.gsmart();
                if (var8 === 0) {
                    break;
                }
                var7 += var8 - 1;
                const var9 = var7 & 0x3f;
                const var10 = (var7 >> 6) & 0x3f;
                const var11 = var4.g1();
                const var12 = var7 >> 12;
                const var13 = arg3! + var9;
                const var14 = var11 & 0x3;
                const var15 = var10 + arg2!;
                const var16 = var11 >> 2;
                if (var15 > 0 && var13 > 0 && var15 < 103 && var13 < 103) {
                    let var17: CollisionMap | null = null;
                    let var18 = var12;
                    if ((ClientBuild.mapl[1][var15][var13] & 0x2) === 2) {
                        var18 = var12 - 1;
                    }
                    if (var18 >= 0) {
                        var17 = arg0[var18];
                    }
                    ClientBuild.addLoc(true, var12, var14, var16, Client.lowMem, var5, var12, var17, var13, var15);
                }
            }
        }
    }

    // jag::oldscape::ClientBuild::LoadLocationsRegion
    static loadLocationsRegion(): void;
    static loadLocationsRegion(rotation: number, srcX: number, collisions: Array<CollisionMap | null>, srcZ: number, dstLevel: number, src: Uint8Array, srcLevel: number, dstZ: number, dstX: number): void;
    static loadLocationsRegion(arg0?: number, arg1?: number, arg2?: Array<CollisionMap | null>, arg3?: number, arg4?: number, arg5?: Uint8Array, arg6?: number, arg7?: number, arg8?: number): void {
        if (arg0 === undefined) {
            const var0 = ClientBuild.field774!;
            for (let var1 = 0; var1 < 4; var1++) {
                Client.doAudio();
                for (let var2 = 0; var2 < 13; var2++) {
                    for (let var3 = 0; var3 < 13; var3++) {
                        const var4 = ClientBuild.zoneMapArchiveIds[var1][var2][var3];
                        if (var4 !== -1) {
                            const var5 = (var4 >> 24) & 0x3;
                            const var6 = (var4 >> 1) & 0x3;
                            const var7 = (var4 >> 14) & 0x3ff;
                            const var8 = (var4 >> 3) & 0x7ff;
                            const var9 = (((var7 / 8) | 0) << 8) + ((var8 / 8) | 0);
                            for (let var10 = 0; var10 < ClientBuild.field2731!.length; var10++) {
                                if (var9 === ClientBuild.field2731![var10] && var0[var10] != null) {
                                    ClientBuild.loadLocationsRegion(var6, (var7 & 0x7) * 8, Client.collision, (var8 & 0x7) * 8, var1, var0[var10]!, var5, var3 * 8, var2 * 8);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            return;
        }
        let var9 = -1;
        const var10 = new Packet(arg5!);

        while (true) {
            const var11 = var10.gVarSmart();
            if (var11 === 0) {
                return;
            }
            let var12 = 0;
            var9 += var11;

            while (true) {
                const var13 = var10.gsmart();
                if (var13 === 0) {
                    break;
                }
                var12 += var13 - 1;
                const var14 = (var12 >> 6) & 0x3f;
                const var15 = var12 & 0x3f;
                const var16 = var12 >> 12;
                const var17 = var10.g1();
                const var18 = var17 >> 2;
                const var19 = var17 & 0x3;
                if (arg6 === var16 && arg1! <= var14 && var14 < arg1! + 8 && arg3! <= var15 && var15 < arg3! + 8) {
                    const var20 = LocType.list(var9);
                    const var21 = RegionRotate.DX(var20.width, arg0, var15 & 0x7, var14 & 0x7, var20.length, var19) + arg8!;
                    const var22 = RegionRotate.DZ(var15 & 0x7, var14 & 0x7, var19, var20.length, var20.width, arg0) + arg7!;
                    if (var21 > 0 && var22 > 0 && var21 < 103 && var22 < 103) {
                        let var23: CollisionMap | null = null;
                        let var24 = arg4!;
                        if ((ClientBuild.mapl[1][var21][var22] & 0x2) === 2) {
                            var24 = arg4! - 1;
                        }
                        if (var24 >= 0) {
                            var23 = arg2![var24];
                        }
                        ClientBuild.addLoc(true, arg4!, (arg0 + var19) & 0x3, var18, Client.lowMem, var9, arg4!, var23, var22, var21);
                    }
                }
            }
        }
    }

    // jag::oldscape::ClientBuild::AddLoc
    static addLoc(arg0: boolean, arg1: number, arg2: number, arg3: number, arg4: boolean, arg5: number, arg6: number, arg7: CollisionMap | null, arg8: number, arg9: number): void {
        if (arg4 && (ClientBuild.mapl[0][arg9][arg8] & 0x2) === 0) {
            if ((ClientBuild.mapl[arg1][arg9][arg8] & 0x10) !== 0) {
                return;
            }
            if (ClientBuild.getDrawLevel(arg8, arg9, arg1) !== Client.lastBuiltLevel) {
                return;
            }
        }
        if (arg1 < ClientBuild.minusedlevel) {
            ClientBuild.minusedlevel = arg1;
        }

        const var10: LocType = LocType.list(arg5);
        let var11: number;
        let var12: number;
        if (arg2 === 1 || arg2 === 3) {
            var11 = var10.length;
            var12 = var10.width;
        } else {
            var12 = var10.length;
            var11 = var10.width;
        }
        let var13: number;
        let var14: number;
        if (var11 + arg9 <= 104) {
            var13 = (var11 >> 1) + arg9;
            var14 = ((var11 + 1) >> 1) + arg9;
        } else {
            var13 = arg9;
            var14 = arg9 + 1;
        }
        let var15: number;
        let var16: number;
        if (arg8 + var12 > 104) {
            var15 = arg8;
            var16 = arg8 + 1;
        } else {
            var15 = (var12 >> 1) + arg8;
            var16 = arg8 + ((var12 + 1) >> 1);
        }
        const var17 = ClientBuild.groundh![arg6];
        const var18 = (var11 << 6) + (arg9 << 7);
        const var19 = (var17[var14][var16] + var17[var13][var16] + var17[var14][var15] + var17[var13][var15]) >> 2;
        const var20 = (var12 << 6) + (arg8 << 7);
        let var21: Int32Array[] | null = null;
        let var22 = (BigInt(arg2 | 0x400) << 20n) | BigInt((arg3 << 14) | (arg8 << 7) | arg9);
        if (var10.active === 0) {
            var22 |= -9223372036854775808n;
        }
        if (arg6 < 3) {
            var21 = ClientBuild.groundh![arg6 + 1];
        }
        if (var10.raiseobject === 1) {
            var22 |= 0x400000n;
        }
        const var24 = var22 | (BigInt(arg5) << 32n);
        if (arg0 && var10.hasBgSound()) {
            BgSound.addSound(arg9, arg1, arg2, arg8, var10);
        }
        if (arg3 === 22) {
            if (!arg4 || var10.active !== 0 || var10.blockwalk === 1 || var10.forcedecor) {
                let var27: ModelSource | null;
                if (var10.anim === -1 && var10.multiloc === null) {
                    const var26 = var10.getModel(22, var21, var17, var18, arg0, var20, arg2, var19);
                    var27 = var26.model;
                } else {
                    var27 = new ClientLocAnim(arg5, 22, arg2, arg6, arg9, arg8, var10.anim, var10.randomanimframe, null);
                }
                World.setGroundDecor(arg1, arg9, arg8, var19, var27, var24, var10.field2799);
                if (var10.blockwalk === 1 && arg7 !== null) {
                    arg7.blockGroundDecor(arg8, arg9);
                }
            }
        } else if (arg3 === 10 || arg3 === 11) {
            let var29: ModelSource | null;
            if (var10.anim === -1 && var10.multiloc === null) {
                const var28 = var10.getModel(10, var21, var17, var18, arg0, var20, arg2, var19);
                var29 = var28.model;
            } else {
                var29 = new ClientLocAnim(arg5, 10, arg2, arg6, arg9, arg8, var10.anim, var10.randomanimframe, null);
            }
            if (var29 !== null) {
                const var30 = World.addScenery(arg1, arg9, arg8, var19, var11, var12, var29, arg3 === 11 ? 256 : 0, var24);
                if (var10.shadow && var30 && arg0) {
                    let var31 = 15;
                    if (var29 instanceof ModelLit) {
                        var31 = (var29.getRadiusCylinder() / 4) | 0;
                        if (var31 > 30) {
                            var31 = 30;
                        }
                    }
                    for (let var32 = 0; var32 <= var11; var32++) {
                        for (let var33 = 0; var33 <= var12; var33++) {
                            if (var31 > ClientBuild.shadow![arg1][arg9 + var32][var33 + arg8]) {
                                ClientBuild.shadow![arg1][arg9 + var32][var33 + arg8] = var31;
                            }
                        }
                    }
                }
            }
            if (var10.blockwalk !== 0 && arg7 !== null) {
                arg7.addLoc(var11, var12, var10.blockrange, arg9, arg8);
            }
        } else if (arg3 >= 12) {
            let var35: ModelSource | null;
            if (var10.anim === -1 && var10.multiloc === null) {
                const var34 = var10.getModel(arg3, var21, var17, var18, arg0, var20, arg2, var19);
                var35 = var34.model;
            } else {
                var35 = new ClientLocAnim(arg5, arg3, arg2, arg6, arg9, arg8, var10.anim, var10.randomanimframe, null);
            }
            World.addScenery(arg1, arg9, arg8, var19, 1, 1, var35, 0, var24);
            if (arg0 && arg3 >= 12 && arg3 <= 17 && arg3 !== 13 && arg1 > 0) {
                ClientBuild.mapo![arg1][arg9][arg8] |= 0x924;
            }
            if (var10.blockwalk !== 0 && arg7 !== null) {
                arg7.addLoc(var11, var12, var10.blockrange, arg9, arg8);
            }
        } else if (arg3 === 0) {
            let var36: ModelSource | null;
            if (var10.anim === -1 && var10.multiloc === null) {
                const var37 = var10.getModel(0, var21, var17, var18, arg0, var20, arg2, var19);
                var36 = var37.model;
            } else {
                var36 = new ClientLocAnim(arg5, 0, arg2, arg6, arg9, arg8, var10.anim, var10.randomanimframe, null);
            }
            World.setWall(arg1, arg9, arg8, var19, var36, null, ClientBuild.WSHAPE0[arg2], 0, var24);
            if (arg0) {
                if (arg2 === 0) {
                    if (var10.shadow) {
                        ClientBuild.shadow![arg1][arg9][arg8] = 50;
                        ClientBuild.shadow![arg1][arg9][arg8 + 1] = 50;
                    }
                    if (var10.occlude) {
                        ClientBuild.mapo![arg1][arg9][arg8] |= 0x249;
                    }
                } else if (arg2 === 1) {
                    if (var10.shadow) {
                        ClientBuild.shadow![arg1][arg9][arg8 + 1] = 50;
                        ClientBuild.shadow![arg1][arg9 + 1][arg8 + 1] = 50;
                    }
                    if (var10.occlude) {
                        ClientBuild.mapo![arg1][arg9][arg8 + 1] |= 0x492;
                    }
                } else if (arg2 === 2) {
                    if (var10.shadow) {
                        ClientBuild.shadow![arg1][arg9 + 1][arg8] = 50;
                        ClientBuild.shadow![arg1][arg9 + 1][arg8 + 1] = 50;
                    }
                    if (var10.occlude) {
                        ClientBuild.mapo![arg1][arg9 + 1][arg8] |= 0x249;
                    }
                } else if (arg2 === 3) {
                    if (var10.shadow) {
                        ClientBuild.shadow![arg1][arg9][arg8] = 50;
                        ClientBuild.shadow![arg1][arg9 + 1][arg8] = 50;
                    }
                    if (var10.occlude) {
                        ClientBuild.mapo![arg1][arg9][arg8] |= 0x492;
                    }
                }
            }
            if (var10.blockwalk !== 0 && arg7 !== null) {
                arg7.addWall(arg3, arg8, var10.blockrange, arg2, arg9);
            }
            if (var10.wallwidth !== 16) {
                World.moveDecor(arg1, arg9, arg8, var10.wallwidth);
            }
        } else if (arg3 === 1) {
            let var38: ModelSource | null;
            if (var10.anim === -1 && var10.multiloc === null) {
                const var39 = var10.getModel(1, var21, var17, var18, arg0, var20, arg2, var19);
                var38 = var39.model;
            } else {
                var38 = new ClientLocAnim(arg5, 1, arg2, arg6, arg9, arg8, var10.anim, var10.randomanimframe, null);
            }
            World.setWall(arg1, arg9, arg8, var19, var38, null, ClientBuild.WSHAPE1[arg2], 0, var24);
            if (var10.shadow && arg0) {
                if (arg2 === 0) {
                    ClientBuild.shadow![arg1][arg9][arg8 + 1] = 50;
                } else if (arg2 === 1) {
                    ClientBuild.shadow![arg1][arg9 + 1][arg8 + 1] = 50;
                } else if (arg2 === 2) {
                    ClientBuild.shadow![arg1][arg9 + 1][arg8] = 50;
                } else if (arg2 === 3) {
                    ClientBuild.shadow![arg1][arg9][arg8] = 50;
                }
            }
            if (var10.blockwalk !== 0 && arg7 !== null) {
                arg7.addWall(arg3, arg8, var10.blockrange, arg2, arg9);
            }
        } else if (arg3 === 2) {
            const var40 = (arg2 + 1) & 0x3;
            let var41: ModelSource | null;
            let var42: ModelSource | null;
            if (var10.anim === -1 && var10.multiloc === null) {
                const var43 = var10.getModel(2, var21, var17, var18, arg0, var20, arg2 + 4, var19);
                var41 = var43.model;
                const var44 = var10.getModel(2, var21, var17, var18, arg0, var20, var40, var19);
                var42 = var44.model;
            } else {
                var41 = new ClientLocAnim(arg5, 2, arg2 + 4, arg6, arg9, arg8, var10.anim, var10.randomanimframe, null);
                var42 = new ClientLocAnim(arg5, 2, var40, arg6, arg9, arg8, var10.anim, var10.randomanimframe, null);
            }
            World.setWall(arg1, arg9, arg8, var19, var41, var42, ClientBuild.WSHAPE0[arg2], ClientBuild.WSHAPE0[var40], var24);
            if (var10.occlude && arg0) {
                if (arg2 === 0) {
                    ClientBuild.mapo![arg1][arg9][arg8] |= 0x249;
                    ClientBuild.mapo![arg1][arg9][arg8 + 1] |= 0x492;
                } else if (arg2 === 1) {
                    ClientBuild.mapo![arg1][arg9][arg8 + 1] |= 0x492;
                    ClientBuild.mapo![arg1][arg9 + 1][arg8] |= 0x249;
                } else if (arg2 === 2) {
                    ClientBuild.mapo![arg1][arg9 + 1][arg8] |= 0x249;
                    ClientBuild.mapo![arg1][arg9][arg8] |= 0x492;
                } else if (arg2 === 3) {
                    ClientBuild.mapo![arg1][arg9][arg8] |= 0x492;
                    ClientBuild.mapo![arg1][arg9][arg8] |= 0x249;
                }
            }
            if (var10.blockwalk !== 0 && arg7 !== null) {
                arg7.addWall(arg3, arg8, var10.blockrange, arg2, arg9);
            }
            if (var10.wallwidth !== 16) {
                World.moveDecor(arg1, arg9, arg8, var10.wallwidth);
            }
        } else if (arg3 === 3) {
            let var46: ModelSource | null;
            if (var10.anim === -1 && var10.multiloc === null) {
                const var45 = var10.getModel(3, var21, var17, var18, arg0, var20, arg2, var19);
                var46 = var45.model;
            } else {
                var46 = new ClientLocAnim(arg5, 3, arg2, arg6, arg9, arg8, var10.anim, var10.randomanimframe, null);
            }
            World.setWall(arg1, arg9, arg8, var19, var46, null, ClientBuild.WSHAPE1[arg2], 0, var24);
            if (var10.shadow && arg0) {
                if (arg2 === 0) {
                    ClientBuild.shadow![arg1][arg9][arg8 + 1] = 50;
                } else if (arg2 === 1) {
                    ClientBuild.shadow![arg1][arg9 + 1][arg8 + 1] = 50;
                } else if (arg2 === 2) {
                    ClientBuild.shadow![arg1][arg9 + 1][arg8] = 50;
                } else if (arg2 === 3) {
                    ClientBuild.shadow![arg1][arg9][arg8] = 50;
                }
            }
            if (var10.blockwalk !== 0 && arg7 !== null) {
                arg7.addWall(arg3, arg8, var10.blockrange, arg2, arg9);
            }
        } else if (arg3 === 9) {
            let var47: ModelSource | null;
            if (var10.anim === -1 && var10.multiloc === null) {
                const var48 = var10.getModel(arg3, var21, var17, var18, arg0, var20, arg2, var19);
                var47 = var48.model;
            } else {
                var47 = new ClientLocAnim(arg5, arg3, arg2, arg6, arg9, arg8, var10.anim, var10.randomanimframe, null);
            }
            World.addScenery(arg1, arg9, arg8, var19, 1, 1, var47, 0, var24);
            if (var10.blockwalk !== 0 && arg7 !== null) {
                arg7.addLoc(var11, var12, var10.blockrange, arg9, arg8);
            }
            if (var10.wallwidth !== 16) {
                World.moveDecor(arg1, arg9, arg8, var10.wallwidth);
            }
        } else if (arg3 === 4) {
            let var49: ModelSource | null;
            if (var10.anim === -1 && var10.multiloc === null) {
                const var50 = var10.getModel(4, var21, var17, var18, arg0, var20, arg2, var19);
                var49 = var50.model;
            } else {
                var49 = new ClientLocAnim(arg5, 4, arg2, arg6, arg9, arg8, var10.anim, var10.randomanimframe, null);
            }
            World.setDecor(arg1, arg9, arg8, var19, var49, null, ClientBuild.WSHAPE0[arg2], 0, 0, 0, var24);
        } else if (arg3 === 5) {
            let var51 = 16;
            const var52 = World.wallType(arg1, arg9, arg8);
            if (var52 != 0) {
                var51 = LocType.list(Number((BigInt(var52) >> 32n) & 0x7fffffffn)).wallwidth;
            }
            let var54: ModelSource | null;
            if (var10.anim === -1 && var10.multiloc === null) {
                const var55 = var10.getModel(4, var21, var17, var18, arg0, var20, arg2, var19);
                var54 = var55.model;
            } else {
                var54 = new ClientLocAnim(arg5, 4, arg2, arg6, arg9, arg8, var10.anim, var10.randomanimframe, null);
            }
            World.setDecor(arg1, arg9, arg8, var19, var54, null, ClientBuild.WSHAPE0[arg2], 0, var51 * ClientBuild.DECORXOF[arg2], var51 * ClientBuild.DECORZOF[arg2], var24);
        } else if (arg3 === 6) {
            let var56 = 8;
            const var57 = World.wallType(arg1, arg9, arg8);
            if (var57 != 0) {
                var56 = (LocType.list(Number((BigInt(var57) >> 32n) & 0x7fffffffn)).wallwidth / 2) | 0;
            }
            let var59: ModelSource | null;
            if (var10.anim === -1 && var10.multiloc === null) {
                const var60 = var10.getModel(4, var21, var17, var18, arg0, var20, arg2 + 4, var19);
                var59 = var60.model;
            } else {
                var59 = new ClientLocAnim(arg5, 4, arg2 + 4, arg6, arg9, arg8, var10.anim, var10.randomanimframe, null);
            }
            World.setDecor(arg1, arg9, arg8, var19, var59, null, 256, arg2, ClientBuild.DECORXOF2[arg2] * var56, ClientBuild.DECORZOF2[arg2] * var56, var24);
        } else if (arg3 === 7) {
            const var61 = (arg2 + 2) & 0x3;
            let var63: ModelSource | null;
            if (var10.anim === -1 && var10.multiloc === null) {
                const var62 = var10.getModel(4, var21, var17, var18, arg0, var20, var61 + 4, var19);
                var63 = var62.model;
            } else {
                var63 = new ClientLocAnim(arg5, 4, var61 + 4, arg6, arg9, arg8, var10.anim, var10.randomanimframe, null);
            }
            World.setDecor(arg1, arg9, arg8, var19, var63, null, 256, var61, 0, 0, var24);
        } else if (arg3 === 8) {
            let var64 = 8;
            const var65 = World.wallType(arg1, arg9, arg8);
            if (var65 != 0) {
                var64 = (LocType.list(Number((BigInt(var65) >> 32n) & 0x7fffffffn)).wallwidth / 2) | 0;
            }
            const var67 = (arg2 + 2) & 0x3;
            let var68: ModelSource | null;
            let var69: ModelSource | null;
            if (var10.anim === -1 && var10.multiloc === null) {
                const var70 = var10.getModel(4, var21, var17, var18, arg0, var20, arg2 + 4, var19);
                var68 = var70.model;
                const var71 = var10.getModel(4, var21, var17, var18, arg0, var20, var67 + 4, var19);
                var69 = var71.model;
            } else {
                var68 = new ClientLocAnim(arg5, 4, arg2 + 4, arg6, arg9, arg8, var10.anim, var10.randomanimframe, null);
                var69 = new ClientLocAnim(arg5, 4, var67 + 4, arg6, arg9, arg8, var10.anim, var10.randomanimframe, null);
            }
            World.setDecor(arg1, arg9, arg8, var19, var68, var69, 256, arg2, ClientBuild.DECORXOF2[arg2] * var64, var64 * ClientBuild.DECORZOF2[arg2], var24);
        }
    }

    // jag::oldscape::ClientBuild::FinishBuild
    static finishBuild(arg0: Array<CollisionMap | null>): void {
        for (let var1: number = 0; var1 < 4; var1++) {
            for (let var2: number = 0; var2 < 104; var2++) {
                for (let var3: number = 0; var3 < 104; var3++) {
                    if ((ClientBuild.mapl[var1][var2][var3] & 0x1) === 1) {
                        let var4: number = var1;
                        if ((ClientBuild.mapl[1][var2][var3] & 0x2) === 2) {
                            var4 = var1 - 1;
                        }
                        if (var4 >= 0) {
                            arg0[var4]!.blockGround(var3, var2);
                        }
                    }
                }
            }
        }
        ClientBuild.ligOff += ((Math.random() * 5.0) | 0) - 2;
        ClientBuild.hueOff += ((Math.random() * 5.0) | 0) - 2;
        if (ClientBuild.hueOff < -8) {
            ClientBuild.hueOff = -8;
        }
        if (ClientBuild.hueOff > 8) {
            ClientBuild.hueOff = 8;
        }
        if (ClientBuild.ligOff < -16) {
            ClientBuild.ligOff = -16;
        }
        if (ClientBuild.ligOff > 16) {
            ClientBuild.ligOff = 16;
        }
        const var5: number = ClientBuild.ligOff >> 1;
        const var6: number = (ClientBuild.hueOff >> 2) << 10;
        const var7: Int32Array[] = Array.from({ length: 104 }, () => new Int32Array(104));
        const var8: Int32Array[] = Array.from({ length: 104 }, () => new Int32Array(104));
        for (let var9: number = 0; var9 < 4; var9++) {
            const var10: Uint8Array[] = ClientBuild.shadow![var9];
            const var11: number = Math.sqrt(5100.0) | 0;
            const var12: number = (var11 * 768) >> 8;
            for (let var13: number = 1; var13 < 103; var13++) {
                for (let var14: number = 1; var14 < 103; var14++) {
                    const var15: number = ClientBuild.groundh![var9][var14 + 1][var13] - ClientBuild.groundh![var9][var14 - 1][var13];
                    const var16: number = ClientBuild.groundh![var9][var14][var13 + 1] - ClientBuild.groundh![var9][var14][var13 - 1];
                    const var17: number = Math.sqrt((Math.imul(var15, var15) + Math.imul(var16, var16) + 65536) | 0) | 0;
                    const var18: number = ((var15 << 8) / var17) | 0;
                    const var19: number = (-65536 / var17) | 0;
                    const var20: number = ((var16 << 8) / var17) | 0;
                    const var21: number = ((((((Math.imul(var18, -50) + Math.imul(var19, -10)) | 0) + Math.imul(var20, -50)) | 0) / var12) | 0) + 74;
                    const var22: number = (var10[var14][var13] >> 1) + (var10[var14][var13 + 1] >> 3) + (var10[var14][var13 + -1] >> 2) + (var10[var14 + 1][var13] >> 3) + (var10[var14 + -1][var13] >> 2);
                    var8[var14][var13] = var21 - var22;
                }
            }
            for (let var23: number = 0; var23 < 104; var23++) {
                ClientBuild.huetot![var23] = 0;
                ClientBuild.sattot![var23] = 0;
                ClientBuild.ligtot![var23] = 0;
                ClientBuild.comtot![var23] = 0;
                ClientBuild.tot![var23] = 0;
            }
            for (let var24: number = -5; var24 < 104; var24++) {
                for (let var25: number = 0; var25 < 104; var25++) {
                    const var26: number = var24 + 5;
                    let var10002: number;
                    if (var26 < 104) {
                        const var27: number = ClientBuild.floort1![var9][var26][var25] & 0xff;
                        if (var27 > 0) {
                            const var28: FluType = FluType.list(var27 - 1);
                            ClientBuild.huetot![var25] += var28.hue;
                            ClientBuild.sattot![var25] += var28.saturation;
                            ClientBuild.ligtot![var25] += var28.lightness;
                            ClientBuild.comtot![var25] += var28.chroma;
                            var10002 = ClientBuild.tot![var25]++;
                        }
                    }
                    const var29: number = var24 - 5;
                    if (var29 >= 0) {
                        const var30: number = ClientBuild.floort1![var9][var29][var25] & 0xff;
                        if (var30 > 0) {
                            const var31: FluType = FluType.list(var30 - 1);
                            ClientBuild.huetot![var25] -= var31.hue;
                            ClientBuild.sattot![var25] -= var31.saturation;
                            ClientBuild.ligtot![var25] -= var31.lightness;
                            ClientBuild.comtot![var25] -= var31.chroma;
                            var10002 = ClientBuild.tot![var25]--;
                        }
                    }
                }
                if (var24 >= 0) {
                    let var32: number = 0;
                    let var33: number = 0;
                    let var34: number = 0;
                    let var35: number = 0;
                    let var36: number = 0;
                    for (let var37: number = -5; var37 < 104; var37++) {
                        const var38: number = var37 + 5;
                        const var39: number = var37 - 5;
                        if (var38 < 104) {
                            var36 += ClientBuild.tot![var38];
                            var33 += ClientBuild.sattot![var38];
                            var35 += ClientBuild.ligtot![var38];
                            var34 += ClientBuild.comtot![var38];
                            var32 += ClientBuild.huetot![var38];
                        }
                        if (var39 >= 0) {
                            var34 -= ClientBuild.comtot![var39];
                            var33 -= ClientBuild.sattot![var39];
                            var36 -= ClientBuild.tot![var39];
                            var32 -= ClientBuild.huetot![var39];
                            var35 -= ClientBuild.ligtot![var39];
                        }
                        if (var37 >= 0 && var36 > 0) {
                            if (var34 === 0) {
                                throw new Error();
                            }
                            var7[var24][var37] = ClientBuild.getTable((Math.imul(var32, 256) / var34) | 0, (var35 / var36) | 0, (var33 / var36) | 0);
                        }
                    }
                }
            }
            for (let var40: number = 1; var40 < 103; var40++) {
                for (let var41: number = 1; var41 < 103; var41++) {
                    if (!Client.lowMem || (ClientBuild.mapl[0][var40][var41] & 0x2) !== 0 || ((ClientBuild.mapl[var9][var40][var41] & 0x10) === 0 && ClientBuild.getDrawLevel(var41, var40, var9) === Client.lastBuiltLevel)) {
                        if (var9 < ClientBuild.minusedlevel) {
                            ClientBuild.minusedlevel = var9;
                        }
                        const var42: number = ClientBuild.floort1![var9][var40][var41] & 0xff;
                        const var43: number = ClientBuild.floort2![var9][var40][var41] & 0xff;
                        if (var42 > 0 || var43 > 0) {
                            const var44: number = ClientBuild.groundh![var9][var40 + 1][var41];
                            const var45: number = ClientBuild.groundh![var9][var40][var41];
                            const var46: number = ClientBuild.groundh![var9][var40 + 1][var41 + 1];
                            const var47: number = ClientBuild.groundh![var9][var40][var41 + 1];
                            if (var9 > 0) {
                                let var48: boolean = true;
                                if (var42 === 0 && ClientBuild.floors![var9][var40][var41] !== 0) {
                                    var48 = false;
                                }
                                if (var43 > 0 && !FloType.list(var43 - 1).occlude) {
                                    var48 = false;
                                }
                                if (var48 && var44 === var45 && var46 === var45 && var47 === var45) {
                                    ClientBuild.mapo![var9][var40][var41] |= 0x924;
                                }
                            }
                            let var49: number;
                            let var52: number;
                            if (var42 > 0) {
                                var49 = var7[var40][var41];
                                let var50: number = var5 + (var49 & 0x7f);
                                if (var50 < 0) {
                                    var50 = 0;
                                } else if (var50 > 127) {
                                    var50 = 127;
                                }
                                const var51: number = var50 + ((var49 + var6) & 0xfc00) + (var49 & 0x380);
                                var52 = Pix3D.colourTable[ClientBuild.getUCol(96, var51)];
                            } else {
                                var49 = -1;
                                var52 = 0;
                            }
                            const var53: number = var8[var40][var41];
                            const var54: number = var8[var40 + 1][var41];
                            const var55: number = var8[var40][var41 + 1];
                            const var56: number = var8[var40 + 1][var41 + 1];
                            if (var43 === 0) {
                                World.setGround(
                                    var9,
                                    var40,
                                    var41,
                                    0,
                                    0,
                                    -1,
                                    var45,
                                    var44,
                                    var46,
                                    var47,
                                    ClientBuild.getUCol(var53, var49),
                                    ClientBuild.getUCol(var54, var49),
                                    ClientBuild.getUCol(var56, var49),
                                    ClientBuild.getUCol(var55, var49),
                                    0,
                                    0,
                                    0,
                                    0,
                                    var52,
                                    0
                                );
                            } else {
                                const var57: number = ClientBuild.floors![var9][var40][var41] + 1;
                                const var58: number = ClientBuild.floorr![var9][var40][var41];
                                const var59: FloType = FloType.list(var43 - 1);
                                if (ClientBuild.lightmap !== null && var9 === 0) {
                                    ClientBuild.lightmap[var40][var41] = var59.waterfogcolour + (var59.waterfogscale << 24);
                                }
                                let var60: number = var59.material;
                                if (var60 >= 0 && !Pix3D.textureManager!.isTextureEnabled(var60)) {
                                    var60 = -1;
                                }
                                let var61: number;
                                let var62: number;
                                if (var60 >= 0) {
                                    var61 = -1;
                                    var62 = Pix3D.colourTable[ClientBuild.getOCol(96, Pix3D.textureManager!.getAverageRgb(var60))];
                                } else if (var59.colour === -1) {
                                    var62 = 0;
                                    var61 = -2;
                                } else {
                                    var61 = var59.colour;
                                    let var63: number = (var61 & 0x7f) + var5;
                                    if (var63 < 0) {
                                        var63 = 0;
                                    } else if (var63 > 127) {
                                        var63 = 127;
                                    }
                                    const var64: number = var63 + ((var61 + var6) & 0xfc00) + (var61 & 0x380);
                                    var62 = Pix3D.colourTable[ClientBuild.getOCol(96, var64)];
                                }
                                if (var59.mapcolour >= 0) {
                                    const var65: number = var59.mapcolour;
                                    let var66: number = (var65 & 0x7f) + var5;
                                    if (var66 < 0) {
                                        var66 = 0;
                                    } else if (var66 > 127) {
                                        var66 = 127;
                                    }
                                    const var67: number = var66 + ((var6 + var65) & 0xfc00) + (var65 & 0x380);
                                    var62 = Pix3D.colourTable[ClientBuild.getOCol(96, var67)];
                                }
                                World.setGround(
                                    var9,
                                    var40,
                                    var41,
                                    var57,
                                    var58,
                                    var60,
                                    var45,
                                    var44,
                                    var46,
                                    var47,
                                    ClientBuild.getUCol(var53, var49),
                                    ClientBuild.getUCol(var54, var49),
                                    ClientBuild.getUCol(var56, var49),
                                    ClientBuild.getUCol(var55, var49),
                                    ClientBuild.getOCol(var53, var61),
                                    ClientBuild.getOCol(var54, var61),
                                    ClientBuild.getOCol(var56, var61),
                                    ClientBuild.getOCol(var55, var61),
                                    var52,
                                    var62
                                );
                            }
                        }
                    }
                }
            }
            for (let var68: number = 1; var68 < 103; var68++) {
                for (let var69: number = 1; var69 < 103; var69++) {
                    World.setLayer(var9, var69, var68, ClientBuild.getDrawLevel(var68, var69, var9));
                }
            }
            ClientBuild.floort1![var9] = null as unknown as Uint8Array[];
            ClientBuild.floort2![var9] = null as unknown as Uint8Array[];
            ClientBuild.floors![var9] = null as unknown as Uint8Array[];
            ClientBuild.floorr![var9] = null as unknown as Uint8Array[];
            ClientBuild.shadow![var9] = null as unknown as Uint8Array[];
        }
        World.shareLight();
        for (let var70: number = 0; var70 < 104; var70++) {
            for (let var71: number = 0; var71 < 104; var71++) {
                if ((ClientBuild.mapl[1][var70][var71] & 0x2) === 2) {
                    World.pushDown(var70, var71);
                }
            }
        }
        let var72: number = 2;
        let var73: number = 1;
        let var74: number = 4;
        for (let var75: number = 0; var75 < 4; var75++) {
            if (var75 > 0) {
                var72 <<= 0x3;
                var74 <<= 0x3;
                var73 <<= 0x3;
            }
            for (let var76: number = 0; var76 <= var75; var76++) {
                for (let var77: number = 0; var77 <= 104; var77++) {
                    for (let var78: number = 0; var78 <= 104; var78++) {
                        if ((var73 & ClientBuild.mapo![var76][var78][var77]) !== 0) {
                            let var79: number = var77;
                            let var80: number = var76;
                            let var81: number = var76;
                            let var82: number = var77;
                            while (var79 > 0 && (ClientBuild.mapo![var76][var78][var79 - 1] & var73) !== 0) {
                                var79--;
                            }
                            while (var82 < 104 && (ClientBuild.mapo![var76][var78][var82 + 1] & var73) !== 0) {
                                var82++;
                            }
                            label356: while (var80 > 0) {
                                for (let var83: number = var79; var83 <= var82; var83++) {
                                    if ((ClientBuild.mapo![var80 - 1][var78][var83] & var73) === 0) {
                                        break label356;
                                    }
                                }
                                var80--;
                            }
                            label345: while (var81 < var75) {
                                for (let var84: number = var79; var84 <= var82; var84++) {
                                    if ((ClientBuild.mapo![var81 + 1][var78][var84] & var73) === 0) {
                                        break label345;
                                    }
                                }
                                var81++;
                            }
                            const var85: number = (var82 + 1 - var79) * (var81 + 1 - var80);
                            if (var85 >= 8) {
                                const var86: number = ClientBuild.groundh![var80][var78][var79];
                                const var87: number = ClientBuild.groundh![var81][var78][var79] - 240;
                                World.setOcclude(var75, 1, var78 * 128, var78 * 128, var79 * 128, var82 * 128 + 128, var87, var86);
                                for (let var88: number = var80; var88 <= var81; var88++) {
                                    for (let var89: number = var79; var89 <= var82; var89++) {
                                        ClientBuild.mapo![var88][var78][var89] &= ~var73;
                                    }
                                }
                            }
                        }
                        if ((var72 & ClientBuild.mapo![var76][var78][var77]) !== 0) {
                            let var90: number = var78;
                            let var91: number;
                            for (var91 = var78; var91 > 0 && (var72 & ClientBuild.mapo![var76][var91 - 1][var77]) !== 0; var91--) {}
                            let var92: number = var76;
                            while (var90 < 104 && (var72 & ClientBuild.mapo![var76][var90 + 1][var77]) !== 0) {
                                var90++;
                            }
                            label410: while (var92 > 0) {
                                for (let var93: number = var91; var93 <= var90; var93++) {
                                    if ((ClientBuild.mapo![var92 - 1][var93][var77] & var72) === 0) {
                                        break label410;
                                    }
                                }
                                var92--;
                            }
                            let var94: number;
                            label398: for (var94 = var76; var94 < var75; var94++) {
                                for (let var95: number = var91; var95 <= var90; var95++) {
                                    if ((var72 & ClientBuild.mapo![var94 + 1][var95][var77]) === 0) {
                                        break label398;
                                    }
                                }
                            }
                            const var96: number = (var90 + 1 - var91) * (var94 + 1 - var92);
                            if (var96 >= 8) {
                                const var97: number = ClientBuild.groundh![var92][var91][var77];
                                const var98: number = ClientBuild.groundh![var94][var91][var77] - 240;
                                World.setOcclude(var75, 2, var91 * 128, var90 * 128 + 128, var77 * 128, var77 * 128, var98, var97);
                                for (let var99: number = var92; var99 <= var94; var99++) {
                                    for (let var100: number = var91; var100 <= var90; var100++) {
                                        ClientBuild.mapo![var99][var100][var77] &= ~var72;
                                    }
                                }
                            }
                        }
                        if ((var74 & ClientBuild.mapo![var76][var78][var77]) !== 0) {
                            let var101: number = var78;
                            let var102: number = var78;
                            let var103: number;
                            for (var103 = var77; var103 > 0 && (var74 & ClientBuild.mapo![var76][var78][var103 - 1]) !== 0; var103--) {}
                            let var104: number;
                            for (var104 = var77; var104 < 104 && (var74 & ClientBuild.mapo![var76][var78][var104 + 1]) !== 0; var104++) {}
                            label464: while (var102 > 0) {
                                for (let var105: number = var103; var105 <= var104; var105++) {
                                    if ((ClientBuild.mapo![var76][var102 - 1][var105] & var74) === 0) {
                                        break label464;
                                    }
                                }
                                var102--;
                            }
                            label453: while (var101 < 104) {
                                for (let var106: number = var103; var106 <= var104; var106++) {
                                    if ((var74 & ClientBuild.mapo![var76][var101 + 1][var106]) === 0) {
                                        break label453;
                                    }
                                }
                                var101++;
                            }
                            if ((var101 + 1 - var102) * (-var103 + 1 + var104) >= 4) {
                                const var107: number = ClientBuild.groundh![var76][var102][var103];
                                World.setOcclude(var75, 4, var102 * 128, var101 * 128 + 128, var103 * 128, var104 * 128 + 128, var107, var107);
                                for (let var108: number = var102; var108 <= var101; var108++) {
                                    for (let var109: number = var103; var109 <= var104; var109++) {
                                        ClientBuild.mapo![var76][var108][var109] &= ~var74;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // jag::oldscape::ClientBuild::PerlinNoise
    static perlinNoise(arg0: number, arg1: number): number {
        const var2: number = ClientBuild.interpolatedNoise(arg1 + 91923, 4, arg0 + 45365) + ((ClientBuild.interpolatedNoise(arg1 + 37821, 2, arg0 + 10294) - 128) >> 1) + ((ClientBuild.interpolatedNoise(arg1, 1, arg0) + -128) >> 2) - 128;
        let var3: number = ((var2 * 0.3) | 0) + 35;
        if (var3 < 10) {
            var3 = 10;
        } else if (var3 > 60) {
            var3 = 60;
        }
        return var3;
    }

    // jag::oldscape::ClientBuild::InterpolatedNoise
    static interpolatedNoise(arg0: number, arg1: number, arg2: number): number {
        if (arg1 === 0) {
            throw new Error('/ by zero');
        }
        const var3: number = (arg2 / arg1) | 0;
        const var4: number = (arg1 - 1) & arg2;
        const var5: number = (arg1 - 1) & arg0;
        const var6: number = (arg0 / arg1) | 0;
        const var7: number = ClientBuild.smoothNoise(var6, var3);
        const var8: number = ClientBuild.smoothNoise(var6, var3 + 1);
        const var9: number = ClientBuild.smoothNoise(var6 + 1, var3);
        const var10: number = ClientBuild.smoothNoise(var6 + 1, var3 + 1);
        const var11: number = ClientBuild.interpolate(arg1, var7, var4, var8);
        const var12: number = ClientBuild.interpolate(arg1, var9, var4, var10);
        return ClientBuild.interpolate(arg1, var11, var5, var12);
    }

    // jag::oldscape::ClientBuild::SmoothNoise
    static smoothNoise(arg0: number, arg1: number): number {
        const var2: number = ClientBuild.noise(arg0 - 1, arg1 + -1) + ClientBuild.noise(arg0 - 1, arg1 + 1) + ClientBuild.noise(arg0 + 1, arg1 + -1) + ClientBuild.noise(arg0 - -1, arg1 - -1);
        const var3: number = ClientBuild.noise(arg0, arg1 - 1) + ClientBuild.noise(arg0, arg1 + 1) + ClientBuild.noise(arg0 + -1, arg1) + ClientBuild.noise(arg0 - -1, arg1);
        const var4: number = ClientBuild.noise(arg0, arg1);
        return ((var2 / 16) | 0) + ((var3 / 8) | 0) + ((var4 / 4) | 0);
    }

    // jag::oldscape::ClientBuild::Noise
    static noise(arg0: number, arg1: number): number {
        const var2: number = Math.imul(arg0, 57) + arg1;
        const var3: number = (var2 << 13) ^ var2;
        const var4: number = 0x7fffffff & (Math.imul(var3, Math.imul(Math.imul(var3, var3), 15731) + 789221) + 1376312589);
        return (var4 >> 19) & 0xff;
    }

    // jag::oldscape::ClientBuild::GetUCol
    static getUCol(arg0: number, arg1: number): number {
        if (arg1 === -1) {
            return 12345678;
        }

        let var2 = (arg0 * (arg1 & 0x7f)) >> 7;
        if (var2 < 2) {
            var2 = 2;
        } else if (var2 > 126) {
            var2 = 126;
        }

        return var2 + (arg1 & 0xff80);
    }

    // jag::oldscape::ClientBuild::GetOCol
    static getOCol(arg0: number, arg1: number): number {
        if (arg1 === -2) {
            return 12345678;
        } else if (arg1 === -1) {
            if (arg0 < 2) {
                arg0 = 2;
            } else if (arg0 > 126) {
                arg0 = 126;
            }
            return arg0;
        } else {
            let var2 = ((arg1 & 0x7f) * arg0) >> 7;
            if (var2 < 2) {
                var2 = 2;
            } else if (var2 > 126) {
                var2 = 126;
            }
            return (arg1 & 0xff80) + var2;
        }
    }

    // jag::oldscape::ClientBuild::GetTable
    static getTable(arg0: number, arg1: number, arg2: number): number {
        if (arg1 > 243) {
            arg2 >>= 4;
        } else if (arg1 > 217) {
            arg2 >>= 3;
        } else if (arg1 > 192) {
            arg2 >>= 2;
        } else if (arg1 > 179) {
            arg2 >>= 1;
        }
        return (arg1 >> 1) + ((arg0 >> 2) << 10) + ((arg2 >> 5) << 7);
    }

    // jag::oldscape::ClientBuild::ChangeLocAvailable
    static changeLocAvailable(arg0: number, arg1: number): boolean {
        const var2 = LocType.list(arg1);
        if (arg0 == 11) {
            arg0 = 10;
        }
        if (arg0 >= 5 && arg0 <= 8) {
            arg0 = 4;
        }
        return var2.checkModel(arg0);
    }

    // jag::oldscape::ClientBuild::ChangeLocUnchecked
    static changeLocUnchecked(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number): void {
        if (arg6 < 1 || arg2 < 1 || arg6 > 102 || arg2 > 102) {
            return;
        }
        if (Client.lowMem && (ClientBuild.mapl[0][arg6][arg2] & 0x2) === 0) {
            let var7 = arg0;
            if ((ClientBuild.mapl[arg0][arg6][arg2] & 0x8) !== 0) {
                var7 = 0;
            }
            if (Client.lastBuiltLevel !== var7) {
                return;
            }
        }
        let var8 = arg0;
        if (arg0 < 3 && (ClientBuild.mapl[1][arg6][arg2] & 0x2) === 2) {
            var8 = arg0 + 1;
        }
        Client.locChangeUnchecked(Client.collision[arg0], arg6, var8, arg1, arg0, arg2);
        if (arg4 >= 0) {
            ClientBuild.addLoc(false, arg0, arg5, arg3, false, arg4, var8, Client.collision[arg0], arg2, arg6);
            return;
        }
    }

    // jag::oldscape::ClientBuild::Init
    static init(): void {
        ClientBuild.tot = new Int32Array(BuildArea.SIZE);
        ClientBuild.minusedlevel = 99;
        ClientBuild.huetot = new Int32Array(BuildArea.SIZE);
        ClientBuild.sattot = new Int32Array(BuildArea.SIZE);
        ClientBuild.ligtot = new Int32Array(BuildArea.SIZE);
        ClientBuild.comtot = new Int32Array(BuildArea.SIZE);
        ClientBuild.shadow = Array.from({ length: BuildArea.LEVELS }, () => Array.from({ length: BuildArea.SIZE + 1 }, () => new Uint8Array(BuildArea.SIZE + 1)));
        ClientBuild.floort2 = Array.from({ length: BuildArea.LEVELS }, () => Array.from({ length: BuildArea.SIZE }, () => new Uint8Array(BuildArea.SIZE)));
        ClientBuild.floort1 = Array.from({ length: BuildArea.LEVELS }, () => Array.from({ length: BuildArea.SIZE }, () => new Uint8Array(BuildArea.SIZE)));
        ClientBuild.floorr = Array.from({ length: BuildArea.LEVELS }, () => Array.from({ length: BuildArea.SIZE }, () => new Uint8Array(BuildArea.SIZE)));
        ClientBuild.mapo = Array.from({ length: BuildArea.LEVELS }, () => Array.from({ length: BuildArea.SIZE + 1 }, () => new Int32Array(BuildArea.SIZE + 1)));
        ClientBuild.floors = Array.from({ length: BuildArea.LEVELS }, () => Array.from({ length: BuildArea.SIZE }, () => new Uint8Array(BuildArea.SIZE)));
    }

    // todo: placement
    static getDrawLevel(arg0: number, arg1: number, arg2: number): number {
        if ((ClientBuild.mapl[arg2][arg1][arg0] & 0x8) === 0) {
            return arg2 <= 0 || (ClientBuild.mapl[1][arg1][arg0] & 0x2) === 0 ? arg2 : arg2 - 1;
        } else {
            return 0;
        }
    }

    // todo: placement
    static interpolate(arg0: number, arg1: number, arg2: number, arg3: number): number {
        if (arg0 === 0) {
            throw new Error('/ by zero');
        }
        const var4: number = (65536 - Pix3D.cosTable[(Math.imul(arg2, 1024) / arg0) | 0]) >> 1;
        return (Math.imul(arg1, 65536 - var4) >> 16) + (Math.imul(arg3, var4) >> 16);
    }
}
