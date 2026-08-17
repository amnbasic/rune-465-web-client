"""
The mobile skin: the five surfaces that carry the tab rows and the chat bar.

Every colour here is a HudSkin token, deliberately. HudSkin.ts opens with the note that
every drift this HUD has suffered was a constant living next to its draw site, and art
files are exactly that failure mode with a longer feedback loop -- a PNG cannot read a
custom property, so if these were eyeballed they would be a sixth owner of the palette.
They are generated from the token values instead, and TOKENS below is the only place they
appear. Change HudSkin, rerun this, the art follows.

The visual language is Mobile UI Rework 2.0 as HudSkin describes it: warm dark stone, a
hairline edge one shade LIGHTER than the fill, uniform rounded cells, one red for "open".
What that replaces is a hand-painted cobble strip whose every stone is a different shape
-- gorgeous at 100% on a monitor, and mush under a thumb on a phone.

Authored sizes are preserved to the pixel. The client lays these out by the cache's own
metrics and a single pixel of drift moves every tab.
"""
from PIL import Image
import os, json

OUT = '/home/claude/work/out/skin'

# --- HudSkin.ts tokens, mirrored ------------------------------------------------------
TOKENS = {
    'SURFACE': 0x3b342c,
    'SURFACE_LOW': 0x2a251f,
    'EDGE': 0x564c3c,
    'CELL': 0x5c5142,
    'CELL_LOW': 0x483d31,
    'ACTIVE': 0x8c3a33,
    'ACTIVE_LOW': 0x6b2a24,
    'R_PANEL': 12,
    'R_CELL': 8,
}


def rgb(v):
    return ((v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff)


def mix(a, b, t):
    ca, cb = rgb(a), rgb(b)
    return tuple(round(ca[i] + (cb[i] - ca[i]) * t) for i in range(3))


def rounded_mask(w, h, r):
    """A rounded rectangle with hard edges -- no anti-aliasing.

    The 0.5 offsets sample each pixel at its CENTRE. Testing the corner against integer
    coordinates instead biases the curve by half a pixel, which is invisible at r=12 on
    one corner and glaring when the four corners of a 34px plate disagree with each other.
    """
    r = max(0, min(r, w // 2, h // 2))
    m = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            ix, iy = min(x, w - 1 - x), min(y, h - 1 - y)
            if ix >= r or iy >= r:
                m[y][x] = True
            else:
                dx, dy = (r - 0.5) - ix, (r - 0.5) - iy
                m[y][x] = (dx * dx + dy * dy) <= (r - 0.5) ** 2 + 0.25
    return m


def surface(w, h, r, fill, low, edge, lip=2):
    """A panel: flat fill, a lit lip along the top, a shadowed foot along the bottom, and
    a one-pixel hairline a shade LIGHTER than the fill.

    The first version ramped the fill across the panel's whole height in four bands. On a
    34px plate that is fine and on a 496x50 chat bar it is three horizontal stripes -- the
    steps are further apart than the eye's threshold for a flat surface, so what should
    read as one slab reads as a set of bars. Confining the shading to two pixels at each
    end fixes it and is closer to the reference anyway: Mobile UI Rework 2.0 panels are
    flat, and it is the edge treatment that gives them their form.
    """
    m = rounded_mask(w, h, r)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = im.load()

    body = rgb(fill)
    top = mix(fill, edge, 0.45)
    foot = mix(fill, low, 0.55)
    for y in range(h):
        if y < lip:
            col = top
        elif y >= h - lip:
            col = foot
        else:
            col = body
        for x in range(w):
            if m[y][x]:
                px[x, y] = col + (255,)

    for y in range(h):
        for x in range(w):
            if not m[y][x]:
                continue
            if any(not (0 <= x + dx < w and 0 <= y + dy < h) or not m[y + dy][x + dx]
                   for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px[x, y] = rgb(edge) + (255,)
    return im


def main():
    os.makedirs(OUT, exist_ok=True)
    T = TOKENS
    made = []

    # The two tab-row strips and the chat bar: panels.
    for name, w, h in (('tabrow_upper_backdrop', 249, 45),
                       ('tabrow_lower_backdrop', 269, 37),
                       ('chatbar_backdrop', 496, 50)):
        im = surface(w, h, T['R_PANEL'], T['SURFACE'], T['SURFACE_LOW'], T['EDGE'])
        im.save(os.path.join(OUT, name + '.png'))
        made.append((name, w, h))

    # The tab plates. The cache art at these filenames is the SELECTED plate -- that dark
    # red is where OSRS's selected-tab colour comes from -- so the same filename keeps the
    # same meaning and stays red. The idle face the cache never had a sprite for (the
    # stone showed through) ships alongside, since a mobile row needs a visible cell in
    # both states or the untapped tabs read as holes.
    for name, w, h in (('tabplate_wide', 34, 36),
                       ('tabplate_narrow', 30, 37),
                       ('tabplate_inventory', 44, 35)):
        act = surface(w, h, T['R_CELL'], T['ACTIVE'], T['ACTIVE_LOW'], T['EDGE'], lip=1)
        act.save(os.path.join(OUT, name + '.png'))
        idle = surface(w, h, T['R_CELL'], T['CELL'], T['CELL_LOW'], T['EDGE'], lip=1)
        idle.save(os.path.join(OUT, name + '_idle.png'))
        made.append((name, w, h))
        made.append((name + '_idle', w, h))

    for name, w, h in made:
        Image.open(os.path.join(OUT, name + '.png')).resize(
            (w * 4, h * 4), Image.NEAREST).save(os.path.join(OUT, name + '@4x.png'))

    json.dump({'tokens': {k: (f'#{v:06x}' if k.startswith(('S', 'E', 'C', 'A')) else v)
                          for k, v in T.items()},
               'files': [{'name': n, 'w': w, 'h': h} for n, w, h in made]},
              open(os.path.join(OUT, 'skin.json'), 'w'), indent=1)
    print(f'{len(made)} skin surfaces -> {OUT}')
    for n, w, h in made:
        print(f'  {n:26s} {w}x{h}')


if __name__ == '__main__':
    main()
