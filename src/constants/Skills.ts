// jag::oldscape::constants::skills
export default class Skills {
    // jag::oldscape::constants::skills::used
    static readonly used: boolean[] = [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, false];

    // jag::oldscape::constants::skills::skillxp
    static readonly skillxp: Int32Array = new Int32Array(99);

    static {
        let var0 = 0;
        for (let var1 = 0; var1 < 99; var1++) {
            const var2 = var1 + 1;
            const var3 = (var2 + Math.pow(2.0, var2 / 7.0) * 300.0) | 0;
            var0 += var3;
            Skills.skillxp[var1] = (var0 / 4) | 0;
        }
    }
}
