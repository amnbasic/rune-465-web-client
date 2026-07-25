import AnimBase from '#/dash3d/AnimBase.js';

import Packet from '#/io/Packet.js';

// jag::oldscape::dash3d::AnimFrame
export default class AnimFrame {
    // jag::oldscape::dash3d::AnimFrame::m_tempTi
    static readonly tempTi: Int16Array = new Int16Array(500);

    // jag::oldscape::dash3d::AnimFrame::m_tempTx
    static readonly tempTx: Int16Array = new Int16Array(500);

    // jag::oldscape::dash3d::AnimFrame::m_tempTy
    static readonly tempTy: Int16Array = new Int16Array(500);

    // jag::oldscape::dash3d::AnimFrame::m_tempTz
    static readonly tempTz: Int16Array = new Int16Array(500);

    static readonly field3784: Int16Array = new Int16Array(500); // todo: identify

    base: AnimBase;
    size: number = -1;
    ti: Int16Array;
    tx: Int16Array;
    ty: Int16Array;
    tz: Int16Array;
    field3774: Int16Array; // todo: identify
    animateTransparencies: boolean = false;

    constructor(src: Uint8Array, base: AnimBase) {
        this.base = base;
        const var3 = new Packet(src);
        const var4 = new Packet(src);
        var3.pos = 2;
        const var5 = var3.g1();
        let var6 = 0;
        let var7 = -1;
        let var8 = -1;
        var4.pos = var3.pos + var5;

        for (let var9 = 0; var9 < var5; var9++) {
            if (this.base.type[var9] === 0) {
                var7 = var9;
            }

            const var10 = var3.g1();
            if (var10 > 0) {
                if (this.base.type[var9] === 0) {
                    var8 = var9;
                }

                AnimFrame.tempTi[var6] = var9;
                let var11 = 0;
                if (this.base.type[var9] === 3) {
                    var11 = 128;
                }

                if ((var10 & 0x1) === 0) {
                    AnimFrame.tempTx[var6] = var11;
                } else {
                    AnimFrame.tempTx[var6] = var4.method342();
                }
                if ((var10 & 0x2) === 0) {
                    AnimFrame.tempTy[var6] = var11;
                } else {
                    AnimFrame.tempTy[var6] = var4.method342();
                }
                if ((var10 & 0x4) === 0) {
                    AnimFrame.tempTz[var6] = var11;
                } else {
                    AnimFrame.tempTz[var6] = var4.method342();
                }
                if (this.base.type[var9] === 2) {
                    AnimFrame.tempTx[var6] = ((AnimFrame.tempTx[var6] & 0xff) << 3) + ((AnimFrame.tempTx[var6] >> 8) & 0x7);
                    AnimFrame.tempTy[var6] = ((AnimFrame.tempTy[var6] & 0xff) << 3) + ((AnimFrame.tempTy[var6] >> 8) & 0x7);
                    AnimFrame.tempTz[var6] = ((AnimFrame.tempTz[var6] & 0xff) << 3) + ((AnimFrame.tempTz[var6] >> 8) & 0x7);
                }
                AnimFrame.field3784[var6] = -1;
                if (this.base.type[var9] >= 1 && this.base.type[var9] <= 3 && var7 > var8) {
                    AnimFrame.field3784[var6] = var7;
                    var8 = var7;
                }
                var6++;

                if (this.base.type[var9] === 5) {
                    this.animateTransparencies = true;
                }
            }
        }

        if (var4.pos !== src.length) {
            throw new Error();
        }

        this.size = var6;
        this.ti = new Int16Array(var6);
        this.tx = new Int16Array(var6);
        this.ty = new Int16Array(var6);
        this.tz = new Int16Array(var6);
        this.field3774 = new Int16Array(var6);

        for (let var12 = 0; var12 < var6; var12++) {
            this.ti[var12] = AnimFrame.tempTi[var12];
            this.tx[var12] = AnimFrame.tempTx[var12];
            this.ty[var12] = AnimFrame.tempTy[var12];
            this.tz[var12] = AnimFrame.tempTz[var12];
            this.field3774[var12] = AnimFrame.field3784[var12];
        }
    }
}
