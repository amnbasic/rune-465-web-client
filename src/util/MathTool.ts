// jag::oldscape::core::math::MathTool
export default class MathTool {
    // jag::oldscape::core::math::MathTool::Hcf
    static hcf(b: number, a: number): number {
        if (b > 22050) {
            a = b;
            b = 22050;
        }
        while (b !== 0) {
            const var2 = a % b;
            a = b;
            b = var2;
        }
        return a;
    }

    // jag::oldscape::core::math::MathTool::BitsRequired
    static bitsRequired(v: number): number {
        let bits = 0;
        if (v < 0 || v >= 65536) {
            v >>>= 16;
            bits += 16;
        }
        if (v >= 256) {
            v >>>= 8;
            bits += 8;
        }
        if (v >= 16) {
            bits += 4;
            v >>>= 4;
        }
        if (v >= 4) {
            v >>>= 2;
            bits += 2;
        }
        if (v >= 1) {
            bits++;
            v >>>= 1;
        }
        return bits + v;
    }

    // todo: identify
    static method1524(arg0: number, arg1: number): number {
        let var2 = 0;
        while (arg1 > 0) {
            var2 = (arg0 & 1) | (var2 << 1);
            arg0 >>>= 1;
            arg1--;
        }
        return var2;
    }
}
