"""
The three left-edge control glyphs: chat, settings, fullscreen.

These replace the inline SVGs in MobileTouch.ts (ICON_CHAT / ICON_FULLSCREEN, and the
gear). They are drawn to the same rules as the normalised tab icons, and share the
outline pass with them literally -- `unify_rim` is imported, not reimplemented, so the
glyphs cannot drift from the icon set by anyone editing one and not the other.

Two things are deliberately NOT copied from the tab icons. The tab icons are objects in
three-quarter perspective, because that is what a 2007 inventory sprite is; a control
affordance drawn that way reads as clutter. And they are full-colour, whereas a control
has to stay legible against both the stone panel and the red active cell, which is what
the existing SVGs got right by being one flat colour.

So: flat-on shapes, cache tones, lit from the top-left the way the cache art is.
"""
from PIL import Image
import math, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from normalise import unify_rim  # noqa: E402  -- the icon set's own outline rule

OUT = '/home/claude/work/out/glyphs'

# Sampled, not invented. TEXT is the tone the client already renders this chrome in
# (HudSkin.TEXT, and what `currentColor` resolved to on the SVGs); the other two are the
# most common pixels in chatbox_parchment.png and trim_top.png respectively.
LIGHT = (0xe6, 0xdc, 0xc6)
MID = (0xba, 0xab, 0x8a)
DARK = (0x77, 0x67, 0x54)

CORE = 22  # the outline pass takes this to 24


def shade(mask, W, H):
    """Light from the top-left, shadow to the bottom-right -- the cache's own convention.

    Worked out from the boundary rather than from a light vector, because at this size a
    dot product produces a dithered mess: what reads as form on a 22px shape is a clean
    one-pixel lit edge on the up-left side and a clean one-pixel shadow on the down-right.
    """
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = img.load()
    for y in range(H):
        for x in range(W):
            if not mask[y][x]:
                continue
            edge_up = (y == 0 or not mask[y - 1][x]) or (x == 0 or not mask[y][x - 1])
            edge_dn = (y == H - 1 or not mask[y + 1][x]) or (x == W - 1 or not mask[y][x + 1])
            if edge_up and not edge_dn:
                px[x, y] = LIGHT + (255,)
            elif edge_dn and not edge_up:
                px[x, y] = DARK + (255,)
            else:
                px[x, y] = MID + (255,)
    return img


def blank(W, H):
    return [[False] * W for _ in range(H)]


def gear(W=CORE, H=CORE):
    """Settings. Eight teeth and an open hub.

    The teeth are placed as explicit shapes rather than carved out of an angular window.
    The window version was the obvious way and it came out lumpy: a tooth's edge is then
    a ray, and a ray crossing a 22px grid at 22.5 degrees is a staircase with no two steps
    the same. Axis teeth as rectangles and diagonal teeth as squares are the two things
    this grid can actually draw square, so that is what the gear is built from.
    """
    m = blank(W, H)
    cx, cy = (W - 1) / 2, (H - 1) / 2
    R_BODY, R_HUB = 8.1, 3.4

    for y in range(H):
        for x in range(W):
            r = math.hypot(x - cx, y - cy)
            if R_HUB < r <= R_BODY:
                m[y][x] = True

    def box(ox, oy, w, h):
        for y in range(int(oy), int(oy + h)):
            for x in range(int(ox), int(ox + w)):
                if 0 <= x < W and 0 <= y < H:
                    m[y][x] = True

    # four teeth on the axes, 6 wide and reaching 3px past the body
    box(cx - 2.5, 0, 6, 4)
    box(cx - 2.5, H - 4, 6, 4)
    box(0, cy - 2.5, 4, 6)
    box(W - 4, cy - 2.5, 4, 6)
    # four on the diagonals, as squares on the 45s
    d = R_BODY * 0.72
    for sx, sy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        box(round(cx + sx * d) - 2 + (0 if sx < 0 else 1),
            round(cy + sy * d) - 2 + (0 if sy < 0 else 1), 4, 4)

    # re-open the hub, in case a tooth box reached it
    for y in range(H):
        for x in range(W):
            if math.hypot(x - cx, y - cy) <= R_HUB:
                m[y][x] = False
    return m


def balloon(W=CORE, H=CORE):
    """Chat. A speech balloon with the tail on the lower left, as the SVG had it."""
    m = blank(W, H)
    bw, bh, r = W, H - 6, 5
    for y in range(bh):
        for x in range(bw):
            ix = min(x, bw - 1 - x)
            iy = min(y, bh - 1 - y)
            if ix >= r or iy >= r:
                m[y][x] = True
            elif math.hypot(r - ix, r - iy) <= r + 0.35:
                m[y][x] = True
    for i in range(6):
        y = bh - 1 + i
        if y >= H:
            break
        for x in range(4, 4 + max(1, 5 - i)):
            if x < W:
                m[y][x] = True
    return m


# Two lines of "text" punched out of the balloon. Solid, the balloon is by a wide margin
# the heaviest of the three and reads as a blank slab next to a gear and a bracket set;
# the holes cost it the excess weight and say "speech" at a glance instead of "panel".
BALLOON_HOLES = [(6, 5, 11, 2), (6, 9, 8, 2)]


def brackets(W=CORE, H=CORE):
    """Fullscreen. Four corner brackets, which is what the SVG drew and what the control
    means -- an arrow cluster at this size collapses into four blobs.

    Arms are 4px thick rather than the 3 they started at. Three matched the SVG's stroke
    but the SVG has no outline eating into it; once each arm carries a dark pixel down
    both sides there is one lit pixel left in the middle and the set reads far lighter
    than the gear it sits under.
    """
    m = blank(W, H)
    ARM, TH = 9, 4
    for cx, cy in ((0, 0), (1, 0), (0, 1), (1, 1)):
        for i in range(ARM):
            for t in range(TH):
                x = i if cx == 0 else W - 1 - i
                y = t if cy == 0 else H - 1 - t
                m[y][x] = True
                x2 = t if cx == 0 else W - 1 - t
                y2 = i if cy == 0 else H - 1 - i
                m[y2][x2] = True
    return m


def build(mask, name, holes=()):
    for (hx, hy, hw, hh) in holes:
        for y in range(hy, hy + hh):
            for x in range(hx, hx + hw):
                mask[y][x] = False
    art = shade(mask, len(mask[0]), len(mask))
    art = art.crop(art.getbbox())
    final, _added = unify_rim(art)
    canvas = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    canvas.paste(final, ((32 - final.width) // 2, (32 - final.height) // 2))
    canvas.save(os.path.join(OUT, name + '.png'))
    canvas.resize((256, 256), Image.NEAREST).save(os.path.join(OUT, name + '@8x.png'))
    print(f'{name:12s} art {final.width}x{final.height}')
    return canvas


def main():
    os.makedirs(OUT, exist_ok=True)
    build(balloon(), 'ui_chat', BALLOON_HOLES)
    build(gear(), 'ui_settings')
    build(brackets(), 'ui_fullscreen')


if __name__ == '__main__':
    main()
