import NpcType from '#/config/NpcType.js';
import SeqType from '#/config/SeqType.js';
import SpotType from '#/config/SpotType.js';
import { Client } from '#/client/Client.js';

import ClientEntity from '#/dash3d/ClientEntity.js';

import type ModelLit from '#/dash3d/ModelLit.js';
import type { SceneTag } from '#/dash3d/ModelSource.js';
import Pix3D from '#/dash3d/Pix3D.js';
import SoftwareModelLit from '#/dash3d/SoftwareModelLit.js';

export default class ClientNpc extends ClientEntity {
    type: NpcType | null = null;

    // jag::oldscape::ClientNpc::GetTempModel
    override method87(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: SceneTag): void {
        if (this.type == null) {
            return;
        }
        const var11: SeqType | null = this.primarySeqId != -1 && this.primarySeqDelay == 0 ? SeqType.list(this.primarySeqId) : null;
        const var12: SeqType | null = this.secondarySeqId == -1 || (this.readyanim == this.secondarySeqId && var11 != null) ? null : SeqType.list(this.secondarySeqId);
        let var13 = this.type.getTempModel(var12, this.secondarySeqFrame, this.primarySeqFrame, var11);
        if (var13 == null) {
            return;
        }
        this.height = var13.method88();
        let var14 = 0;
        let var15 = 0;
        let var16 = 0;
        if (this.type.field2350 != 0 && this.type.field2329 != 0) {
            const var17 = Pix3D.sinTable[arg0];
            const var18 = Pix3D.cosTable[arg0];
            const var19 = this.type.field2350;
            const var20 = this.type.field2329;
            const var21 = (-var19 / 2) | 0;
            const var22 = (-var20 / 2) | 0;
            const var23 = (var18 * var22 - var17 * var21) >> 16;
            const var24 = (var21 * var18 + var17 * var22) >> 16;
            const var25 = Client.getAvH(this.x + var24, var23 + this.z, Client.minusedlevel);
            const var26 = (var19 / 2) | 0;
            const var27 = (-var20 / 2) | 0;
            const var28 = (var18 * var26 + var17 * var27) >> 16;
            const var29 = (var27 * var18 - var26 * var17) >> 16;
            const var30 = Client.getAvH(var28 + this.x, var29 + this.z, Client.minusedlevel);
            const var31 = (-var19 / 2) | 0;
            const var32 = (var20 / 2) | 0;
            const var33 = (var18 * var31 + var32 * var17) >> 16;
            const var34 = (var32 * var18 - var17 * var31) >> 16;
            const var35 = (var19 / 2) | 0;
            const var36 = (var20 / 2) | 0;
            const var37 = (var17 * var36 + var18 * var35) >> 16;
            const var38 = Client.getAvH(this.x + var33, this.z - -var34, Client.minusedlevel);
            const var39 = (var18 * var36 - var17 * var35) >> 16;
            const var40 = Client.getAvH(this.x + var37, this.z - -var39, Client.minusedlevel);
            let var41 = var40 + var25;
            if (var41 > var30 + var38) {
                var41 = var30 + var38;
            }
            const var42 = var40 <= var30 ? var40 : var30;
            const var43 = var25 < var30 ? var25 : var30;
            const var44 = var25 < var38 ? var25 : var38;
            const var45 = var40 <= var38 ? var40 : var38;
            var14 = (Math.atan2(var43 - var45, var20) * 325.95) & 0x7ff;
            if (var14 != 0) {
                var13.rotateXAxis(var14);
            }
            var15 = (Math.atan2(var44 - var42, var19) * 325.95) & 0x7ff;
            if (var15 != 0) {
                var13.method191(var15);
            }
            var16 = (var41 >> 1) - this.y;
            if (var16 != 0) {
                var13.translate(0, var16, 0);
            }
        }
        let var46: ModelLit | null = null;
        if (this.spotanimId !== -1 && this.spotanimFrame !== -1) {
            const var47 = SpotType.list(this.spotanimId);
            var46 = var47.getTempModel2(this.spotanimFrame);
            if (var46 != null) {
                var46.translate(0, -this.spotanimHeight, 0);
                if (var47.hillskew) {
                    if (var14 != 0) {
                        var46.rotateXAxis(var14);
                    }
                    if (var15 != 0) {
                        var46.method191(var15);
                    }
                    if (var16 != 0) {
                        var46.translate(0, var16, 0);
                    }
                }
            }
        }
        if (var46 != null) {
            var13 = (var13 as SoftwareModelLit).method850(var46);
        }
        if (this.type.size === 1) {
            var13.useAABBMouseCheck = true;
        }
        var13.method87(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
    }

    // jag::oldscape::ClientNpc::Ready
    override ready(): boolean {
        return this.type !== null;
    }

    override method88(): number {
        return this.height;
    }
}
