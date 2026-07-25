import AnimBase from '#/dash3d/AnimBase.js';
import AnimFrame from '#/dash3d/AnimFrame.js';
import LinkList from '#/datastruct/LinkList.js';
import Linkable2 from '#/datastruct/Linkable2.js';

import type Js5 from '#/js5/Js5.js';

// jag::oldscape::dash3d::AnimFrameSet
export default class AnimFrameSet extends Linkable2 {
    list: (AnimFrame | null)[];

    constructor(arg0: Js5, arg1: Js5, arg2: number, arg3: boolean) {
        super();
        const var5 = new LinkList<AnimBase>();
        const var6 = arg0.getFileIdLimit(arg2);
        this.list = new Array(var6);
        const var7 = arg0.getFileList(arg2)!;
        for (let var8 = 0; var8 < var7.length; var8++) {
            const var9 = arg0.getFile(var7[var8], arg2)!;
            const var10 = ((var9[0] & 0xff) << 8) | (var9[1] & 0xff);
            let var11: AnimBase | null = null;
            for (let var12 = var5.head(); var12 !== null; var12 = var5.next()) {
                if (var10 === var12.id) {
                    var11 = var12;
                    break;
                }
            }

            if (var11 === null) {
                const var13 = arg1.peekFile(0, var10)!;
                var11 = new AnimBase(var10, var13);
                var5.push(var11);
            }

            this.list[var7[var8]] = new AnimFrame(var9, var11);
        }
    }

    // jag::oldscape::dash3d::AnimFrameSet::GetAnimateTransparencies
    getAnimateTransparencies(arg0: number): boolean {
        return this.list[arg0]!.animateTransparencies;
    }
}
