import LocType from '#/config/LocType.js';
import SeqType from '#/config/SeqType.js';
import ClientBuild from '#/client/ClientBuild.js';
import { Client } from '#/client/Client.js';
import World from '#/dash3d/World.js';

import ModelSource, { type SceneTag } from '#/dash3d/ModelSource.js';

// jag::oldscape::ClientLocAnim
export default class ClientLocAnim extends ModelSource {
    readonly id: number;
    readonly shape: number;
    readonly angle: number;
    readonly level: number;
    readonly x: number;
    readonly z: number;
    anim: SeqType | null = null;
    animFrame: number = 0;
    animCycle: number = 0;

    // todo: sort
    height: number = -32768;

    constructor(id: number, shape: number, angle: number, level: number, x: number, z: number, arg6: number, arg7: boolean, arg8: ModelSource | null) {
        super();

        this.id = id;
        this.angle = angle;
        this.level = level;
        this.z = z;
        this.shape = shape;
        this.x = x;
        if (arg6 !== -1) {
            this.anim = SeqType.list(arg6);
            this.animFrame = 0;
            this.animCycle = Client.loopCycle - 1;
            if (this.anim.duplicatebehaviour === 0 && arg8 != null && arg8 instanceof ClientLocAnim) {
                const var10 = arg8;
                if (this.anim === var10.anim) {
                    this.animFrame = var10.animFrame;
                    this.animCycle = var10.animCycle;
                    return;
                }
            }
            if (arg7 && this.anim.loops !== -1) {
                this.animFrame = (this.anim.frames!.length * Math.random()) | 0;
                this.animCycle -= (Math.random() * this.anim.delay![this.animFrame]) | 0;
                return;
            }
        }
    }

    // jag::oldscape::ClientLocAnim::GetTempModel
    getTempModel(): ModelSource | null {
        const var1 = World.groundh !== ClientBuild.groundh;
        let var2: LocType | null = LocType.list(this.id);
        if (var2.multiloc != null) {
            var2 = var2.getMultiLoc();
        }
        if (var2 == null) {
            return null;
        }
        let var3: number;
        let var4: number;
        if (this.angle === 1 || this.angle === 3) {
            var4 = var2.width;
            var3 = var2.length;
        } else {
            var3 = var2.width;
            var4 = var2.length;
        }
        const var5 = ((var3 + 1) >> 1) + this.x;
        const var6 = (var3 >> 1) + this.x;
        const var7 = this.z + (var4 >> 1);
        const var8 = this.z + ((var4 + 1) >> 1);
        this.method537(var6 * 128, var7 * 128);
        const var9 = ClientBuild.groundh![this.level];
        const var10 = (var9[var5][var8] + var9[var6][var8] + var9[var6][var7] + var9[var5][var7]) >> 2;
        const var11 = (this.x << 7) + (var3 << 6);
        let var12: Int32Array[] | null = null;
        const var13 = (this.z << 7) + (var4 << 6);
        if (var1) {
            var12 = World.groundh![0];
        } else if (this.level < 3) {
            var12 = ClientBuild.groundh![this.level + 1];
        }
        let var14;
        if (this.anim === null) {
            var14 = var2.getModel(this.shape, var12, var9, var11, false, var13, this.angle, var10);
        } else {
            var14 = var2.getTempModel(var10, var11, this.shape, var13, this.animFrame, this.anim, var9, var12, this.angle);
        }
        return var14 === null ? null : var14.model;
    }

    override method87(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: SceneTag): void {
        const var11 = this.getTempModel();
        if (var11 != null) {
            var11.method87(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
            this.height = var11.method88();
        }
    }

    override method537(arg0: number, arg1: number): void {
        if (this.anim === null) {
            return;
        }
        let var3 = Client.loopCycle - this.animCycle;
        if (var3 > 100 && this.anim.loops > 0) {
            const var4 = this.anim.frames!.length - this.anim.loops;
            while (this.animFrame < var4 && var3 > this.anim.delay![this.animFrame]) {
                var3 -= this.anim.delay![this.animFrame];
                this.animFrame++;
            }
            if (var4 <= this.animFrame) {
                let var5 = 0;
                for (let var6 = var4; var6 < this.anim.frames!.length; var6++) {
                    var5 += this.anim.delay![var6];
                }
                var3 %= var5;
            }
        }
        label56: {
            do {
                do {
                    if (var3 <= this.anim.delay![this.animFrame]) {
                        break label56;
                    }
                    Client.triggerSeqSound(false, arg1, this.animFrame, arg0, this.anim);
                    var3 -= this.anim.delay![this.animFrame];
                    this.animFrame++;
                } while (this.anim.frames!.length > this.animFrame);
                this.animFrame -= this.anim.loops;
            } while (this.animFrame >= 0 && this.anim.frames!.length > this.animFrame);
            this.anim = null;
        }
        this.animCycle = Client.loopCycle - var3;
    }

    override method88(): number {
        return this.height;
    }
}
