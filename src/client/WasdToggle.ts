import SoftwarePix8 from '#/graphics/SoftwarePix8.js';
import WasdToggleData from '#/client/WasdToggleData.js';

// Title/login-screen WASD-camera toggle button.
//
// Mirrors the Java client's WasdCamera.renderLoginToggle/handleLoginClick: same column as the
// music-mute button (x=725, which is drawn at y=463) and stacked directly above it with a 4px
// gap, using the same on/off key-cap icons. The art is baked into WasdToggleData rather than
// loaded from disk like the Java version did, so there is no new asset-loading path.
export default class WasdToggle {
    static readonly X: number = 725;
    static readonly GAP: number = 4;
    static readonly MUTE_Y: number = 463;
    static readonly SIZE: number = WasdToggleData.size;
    static readonly Y: number = WasdToggle.MUTE_Y - WasdToggleData.size - WasdToggle.GAP;

    private static sprites: SoftwarePix8[] | null = null;

    // jag-style palette sprite: index 0 is the transparent hole, palette entry n -> index n+1
    private static build(art: { palette: number[]; pixels: string }): SoftwarePix8 {
        const size = WasdToggleData.size;
        const packed = atob(art.pixels);
        const data = new Int8Array(size * size);
        for (let i = 0; i < data.length; i++) {
            data[i] = packed.charCodeAt(i);
        }
        const palette = new Int32Array(256);
        for (let i = 0; i < art.palette.length; i++) {
            palette[i + 1] = art.palette[i];
        }
        return new SoftwarePix8(size, size, 0, 0, size, size, data, palette);
    }

    private static get(on: boolean): SoftwarePix8 {
        if (WasdToggle.sprites === null) {
            WasdToggle.sprites = [WasdToggle.build(WasdToggleData.off), WasdToggle.build(WasdToggleData.on)];
        }
        return WasdToggle.sprites[on ? 1 : 0];
    }

    static draw(on: boolean): void {
        WasdToggle.get(on).plotSprite(WasdToggle.X, WasdToggle.Y);
    }

    // Its own click region, entirely above the mute button's (which is x>=715, y>=453).
    static hit(x: number, y: number): boolean {
        return x >= WasdToggle.X && x < WasdToggle.X + WasdToggle.SIZE && y >= WasdToggle.Y && y < WasdToggle.Y + WasdToggle.SIZE;
    }
}
