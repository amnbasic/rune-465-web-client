import Linkable2 from '#/datastruct/Linkable2.js';

export default abstract class Pix32 extends Linkable2 {
    xof: number = 0;
    ohi: number = 0;
    owi: number = 0;
    hi: number = 0;
    yof: number = 0;
    wi: number = 0;

    abstract scalePlotSprite(arg0: number, arg1: number, arg2: number, arg3: number): void;

    abstract quickPlotSprite(arg0: number, arg1: number): void;

    pixelPerfectRotateScalePlotSprite(arg0: number, arg1: number, arg2: number, arg3: number): void;
    pixelPerfectRotateScalePlotSprite(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number): void;
    pixelPerfectRotateScalePlotSprite(arg0: number, arg1: number, arg2: number, arg3: number, arg4?: number, arg5?: number): void {
        if (arg4 !== undefined && arg5 !== undefined) {
            throw new Error();
        }
        const var5 = this.ohi << 3;
        const var6 = (var5 & 0xf) + (arg0 << 4);
        const var7 = this.owi << 3;
        const var8 = (var7 & 0xf) + (arg1 << 4);
        this.pixelPerfectRotateScalePlotSprite(var7, var5, var8, var6, arg3, arg2);
    }

    /**
     * `arg5` (tagAlpha) switches this from BLENDING against the frame to WRITING a per-pixel alpha
     * tag the present pass turns into real canvas alpha. See SoftwarePix32.alphaScale and
     * PixMap.GL_TRANSPARENT — it is what makes a see-through HUD work over the GPU scene, which
     * lives on a canvas underneath and is therefore not in the frame to blend with.
     */
    abstract transScalePlotSprite(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5?: boolean): void;

    abstract transPlotSprite(arg0: number, arg1: number, arg2: number): void;

    abstract litPlotSprite(arg0: number, arg1: number): void;

    abstract plotSprite(arg0: number, arg1: number): void;
}
