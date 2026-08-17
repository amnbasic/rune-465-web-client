import Pix2D from '#/graphics/Pix2D.js';

export default class PixMap {
    /**
     * THE TOP BYTE OF A FRAME PIXEL IS AN ALPHA TAG. No 24-bit drawing op can set it, so the whole
     * range is ours and the common case costs one compare:
     *
     *   0        opaque — every ordinary pixel the engine draws
     *   1        fully transparent — the GL scene hole (GL_TRANSPARENT below)
     *   2..255   that alpha, verbatim — a translucent HUD panel over the GPU scene
     *
     * The third case is why this is a range rather than one sentinel. With the GPU renderer the
     * scene is on a canvas UNDERNEATH the frame, so a HUD panel that blends against the frame is
     * blending against the hole — i.e. against black — and comes out dark and opaque instead of
     * see-through. Tagging the alpha instead defers compositing to the browser, which has both
     * layers, so the panel lands over the real scene. See SoftwarePix32.alphaScale.
     *
     * Note the hole test WAS `pixel === GL_TRANSPARENT` and is now a test on the tag alone. That
     * is deliberately laxer: it means any pixel tagged 1 is a hole whatever its colour bits say.
     * Nothing writes tag 1 except the hole fill, and the old exact-match had the sharp edge that a
     * hole pixel touched by ANY blend silently became opaque.
     */
    static readonly GL_TRANSPARENT: number = 0x1000000;

    /** Lowest tag that means "real alpha"; 0 and 1 are taken by opaque and the hole. */
    static readonly ALPHA_MIN: number = 2;

    /**
     * A 0-255 alpha as the tag value to write in the top byte. Clamped into the usable range, so
     * a fully-opaque request stays opaque rather than wrapping onto the hole.
     */
    static alphaTag(alpha: number): number {
        return alpha >= 255 ? 0 : alpha <= PixMap.ALPHA_MIN ? PixMap.ALPHA_MIN : alpha | 0;
    }

    data: Int32Array;
    width: number;
    height: number;
    image: ImageData | null;

    protected ctx: CanvasRenderingContext2D;
    protected paint: Uint32Array;

    constructor(height: number, width: number, ctx: CanvasRenderingContext2D) {
        this.height = height;
        this.data = new Int32Array(width * height + 1);
        this.width = width;
        this.image = ctx.createImageData(width, height);
        this.paint = new Uint32Array(this.image.data.buffer);
        this.ctx = ctx;
        this.bind();
    }

    bind(): void {
        Pix2D.setPixels(this.data, this.width, this.height);
    }

    private updateImageData(): ImageData | null {
        if (!this.image) {
            return null;
        }

        const data = this.data;
        const paint = this.paint;
        const len = data.length;

        for (let i = 0; i < len; i++) {
            const pixel = data[i];
            const tag = pixel >>> 24;
            // Ordinary pixel first: it is all but every pixel of every frame.
            paint[i] = tag === 0 ? ((pixel & 0xff0000) >> 16) | (pixel & 0xff00) | ((pixel & 0xff) << 16) | 0xff000000 : tag === 1 ? 0 : ((pixel & 0xff0000) >> 16) | (pixel & 0xff00) | ((pixel & 0xff) << 16) | (tag << 24);
        }

        return this.image;
    }

    draw(x: number, y: number): void {
        const image = this.updateImageData();
        if (!image) {
            return;
        }

        this.ctx.putImageData(image, x, y);
    }

    /**
     * Convert only the rows/cols of a dirty rect. A sub-blit present must not pay for a
     * full-frame conversion: that cost scales with WINDOW size rather than rect size, so at
     * 1280x720 the per-component blit loop in mainredraw was converting ~920k pixels per
     * component, per frame.
     */
    private updateImageDataRect(x: number, y: number, w: number, h: number): ImageData | null {
        if (!this.image) {
            return null;
        }
        if (x < 0) {
            w += x;
            x = 0;
        }
        if (y < 0) {
            h += y;
            y = 0;
        }
        if (x + w > this.width) {
            w = this.width - x;
        }
        if (y + h > this.height) {
            h = this.height - y;
        }
        if (w <= 0 || h <= 0) {
            return null;
        }
        const data = this.data;
        const paint = this.paint;
        for (let row = y; row < y + h; row++) {
            let i = row * this.width + x;
            const end = i + w;
            for (; i < end; i++) {
                const pixel = data[i];
                const tag = pixel >>> 24;
                paint[i] = tag === 0 ? ((pixel & 0xff0000) >> 16) | (pixel & 0xff00) | ((pixel & 0xff) << 16) | 0xff000000 : tag === 1 ? 0 : ((pixel & 0xff0000) >> 16) | (pixel & 0xff00) | ((pixel & 0xff) << 16) | (tag << 24);
            }
        }
        return this.image;
    }

    draw2(height: number, width: number, y: number, x: number): void {
        if (width <= 0 || height <= 0) {
            return;
        }
        const image = this.updateImageDataRect(x, y, width, height);
        if (!image) {
            return;
        }

        this.ctx.putImageData(image, 0, 0, x, y, width, height);
    }
}
