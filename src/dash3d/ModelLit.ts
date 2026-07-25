import type AnimFrameSet from '#/dash3d/AnimFrameSet.js';
import ModelSource, { type SceneTag } from '#/dash3d/ModelSource.js';

export default abstract class ModelLit extends ModelSource {
    // jag::oldscape::dash3d::MousePickingHelper::m_mouseCheck
    static mouseCheck: boolean = false;

    // jag::oldscape::dash3d::MousePickingHelper::m_mouseX
    static mouseX: number = 0;

    // jag::oldscape::dash3d::MousePickingHelper::m_mouseY
    static mouseY: number = 0;

    // jag::oldscape::dash3d::ModelLit::m_useAABBMouseCheck
    useAABBMouseCheck: boolean = false;

    static method195(arg0: Int32Array[], arg1: number, arg2: number): number {
        const var3 = arg1 >> 7;
        const var4 = arg2 >> 7;
        if (var3 < 0 || var4 < 0 || var3 >= arg0.length || var4 >= arg0[0].length) {
            return 0;
        }
        const var5 = arg1 & 0x7f;
        const var6 = arg2 & 0x7f;
        const var7 = (arg0[var3][var4] * (128 - var5) + arg0[var3 + 1][var4] * var5) >> 7;
        const var8 = (arg0[var3][var4 + 1] * (128 - var5) + arg0[var3 + 1][var4 + 1] * var5) >> 7;
        return (var7 * (128 - var6) + var8 * var6) >> 7;
    }

    abstract translate(arg0: number, arg1: number, arg2: number): void;

    abstract rotate270(): void;

    abstract rotate90(): void;

    abstract resize(arg0: number, arg1: number, arg2: number): void;

    abstract copyForAnim(arg0: boolean, arg1: boolean): ModelLit;

    abstract copyForAnim2(arg0: boolean, arg1: boolean): ModelLit;

    abstract method186(): number;

    abstract animate(arg0: AnimFrameSet, arg1: number, arg2: boolean): void;

    abstract override method87(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: SceneTag): void;

    abstract method188(arg0: number): void;

    abstract maskAnimate(arg0: AnimFrameSet, arg1: number, arg2: AnimFrameSet, arg3: number, arg4: Int32Array | null, arg5: boolean): void;

    abstract rotate180(): void;

    abstract method191(arg0: number): void;

    abstract getRadiusCylinder(): number;

    abstract method193(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number): void;

    abstract method194(): number;

    abstract method196(): number;

    abstract rotateXAxis(arg0: number): void;

    abstract method198(): number;

    method199(arg0: Int32Array[], arg1: number, arg2: number, arg3: number, arg4: number, arg5: number): void {
        const var7 = Math.trunc(-arg4 / 2);
        const var8 = Math.trunc(-arg5 / 2);
        const var9 = ModelLit.method195(arg0, arg1 + var7, arg3 + var8);
        const var10 = Math.trunc(arg4 / 2);
        const var11 = Math.trunc(-arg5 / 2);
        const var12 = ModelLit.method195(arg0, arg1 + var10, arg3 + var11);
        const var13 = Math.trunc(-arg4 / 2);
        const var14 = Math.trunc(arg5 / 2);
        const var15 = ModelLit.method195(arg0, arg1 + var13, arg3 + var14);
        const var16 = Math.trunc(arg4 / 2);
        const var17 = Math.trunc(arg5 / 2);
        const var18 = ModelLit.method195(arg0, arg1 + var16, arg3 + var17);
        const var19 = var9 < var12 ? var9 : var12;
        const var20 = var15 < var18 ? var15 : var18;
        const var21 = var12 < var18 ? var12 : var18;
        const var22 = var9 < var15 ? var9 : var15;
        const var23 = Math.trunc(Math.atan2(var19 - var20, arg5) * 325.95) & 0x7ff;
        if (var23 !== 0) {
            this.rotateXAxis(var23);
        }
        const var24 = Math.trunc(Math.atan2(var22 - var21, arg4) * 325.95) & 0x7ff;
        if (var24 !== 0) {
            this.method191(var24);
        }
        let var25 = var9 + var18;
        if (var12 + var15 < var25) {
            var25 = var12 + var15;
        }
        const var26 = (var25 >> 1) - arg2;
        if (var26 !== 0) {
            this.translate(0, var26, 0);
        }
    }

    abstract override method88(): number;
}
