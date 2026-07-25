import SpotType from '#/config/SpotType.js';
import SeqType from '#/config/SeqType.js';

import type ModelLit from '#/dash3d/ModelLit.js';
import ModelSource, { type SceneTag } from '#/dash3d/ModelSource.js';

// jag::oldscape::ClientProj::ClientProj
export default class ClientProj extends ModelSource {
    readonly spotanim: number;
    readonly level: number;
    readonly srcX: number;
    readonly srcZ: number;
    readonly h1: number;
    readonly h2: number;
    readonly t1: number;
    readonly t2: number;
    readonly angle: number;
    readonly startpos: number;
    readonly target: number;
    mobile: boolean = false;
    x: number = 0.0;
    z: number = 0.0;
    y: number = 0.0;
    velocityX: number = 0.0;
    velocityZ: number = 0.0;
    velocity: number = 0.0;
    velocityY: number = 0.0;
    accelerationY: number = 0.0;
    yaw: number = 0;
    pitch: number = 0;
    readonly anim: SeqType | null;
    animFrame: number = 0;
    animCycle: number = 0;
    height: number = -32768;

    constructor(spotanim: number, level: number, srcX: number, srcZ: number, h1: number, t1: number, t2: number, angle: number, startpos: number, target: number, h2: number) {
        super();

        this.startpos = startpos;
        this.h2 = h2;
        this.angle = angle;
        this.spotanim = spotanim;
        this.t1 = t1;
        this.level = level;
        this.t2 = t2;
        this.h1 = h1;
        this.mobile = false;
        this.srcZ = srcZ;
        this.srcX = srcX;
        this.target = target;
        const seq = SpotType.list(this.spotanim).anim;
        if (seq === -1) {
            this.anim = null;
        } else {
            this.anim = SeqType.list(seq);
        }
    }

    // jag::oldscape::ClientProj::SetTarget
    setTarget(arg0: number, arg1: number, arg2: number, arg3: number): void {
        if (!this.mobile) {
            const var5 = arg3 - this.srcZ;
            const var7 = arg0 - this.srcX;
            const var9 = Math.sqrt(var7 * var7 + var5 * var5);
            this.x = (var7 * this.startpos) / var9 + this.srcX;
            this.z = this.srcZ + (this.startpos * var5) / var9;
            this.y = this.h1;
        }
        const var11 = this.t2 + 1 - arg1;
        this.velocityZ = (arg3 - this.z) / var11;
        this.velocityX = (arg0 - this.x) / var11;
        this.velocity = Math.sqrt(this.velocityX * this.velocityX + this.velocityZ * this.velocityZ);
        if (!this.mobile) {
            this.velocityY = -this.velocity * Math.tan(this.angle * 0.02454369);
        }
        this.accelerationY = ((arg2 - this.velocityY * var11 - this.y) * 2.0) / (var11 * var11);
    }

    // jag::oldscape::ClientProj::Move
    move(arg0: number): void {
        this.mobile = true;
        this.y += arg0 * 0.5 * this.accelerationY * arg0 + this.velocityY * arg0;
        this.x += arg0 * this.velocityX;
        this.z += this.velocityZ * arg0;
        this.velocityY += arg0 * this.accelerationY;
        this.yaw = (((Math.atan2(this.velocityX, this.velocityZ) * 325.949) | 0) + 1024) & 0x7ff;
        this.pitch = ((Math.atan2(this.velocityY, this.velocity) * 325.949) | 0) & 0x7ff;

        if (this.anim === null) {
            return;
        }
        this.animCycle += arg0;
        while (true) {
            do {
                do {
                    if (this.animCycle <= this.anim.delay![this.animFrame]) {
                        return;
                    }
                    this.animCycle -= this.anim.delay![this.animFrame];
                    this.animFrame++;
                } while (this.animFrame < this.anim.frames!.length);
                this.animFrame -= this.anim.loops;
            } while (this.animFrame >= 0 && this.anim.frames!.length > this.animFrame);
            this.animFrame = 0;
        }
    }

    // jag::oldscape::ClientProj::GetTempModel
    getTempModel(): ModelLit | null {
        const var1 = SpotType.list(this.spotanim);
        const var2 = var1.getTempModel2(this.animFrame);
        if (var2 === null) {
            return null;
        } else {
            var2.rotateXAxis(this.pitch);
            return var2;
        }
    }

    override method87(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: SceneTag): void {
        const var11 = this.getTempModel();
        if (var11 != null) {
            var11.method87(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
            this.height = var11.method88();
        }
    }

    override method88(): number {
        return this.height;
    }
}
