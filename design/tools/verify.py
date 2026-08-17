"""Check every claim the brief makes, against the actual output files."""
from PIL import Image
from collections import deque
import glob, os, sys, json

SRC = '/mnt/user-data/uploads/rune-465-web-client/design/_src/tab-icons'
OUT = '/home/claude/work/out/icons'
OUTLINE = (0x1a, 0x17, 0x12)

ADDED = {r['name']: {tuple(p) for p in r['added_outline_px']}
         for r in json.load(open('/home/claude/work/out/report.json'))}

fails = []


def relative_luma(c):
    """WCAG relative luminance. The sRGB channels have to be linearised first -- doing
    the weighted sum straight on the 0-255 values understates light colours badly and
    made the door icon read as a contrast failure when it is plainly legible."""
    def lin(v):
        v /= 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])


def contrast(a, b):
    la, lb = relative_luma(a), relative_luma(b)
    la, lb = max(la, lb), min(la, lb)
    return (la + 0.05) / (lb + 0.05)


for f in sorted(glob.glob(OUT + '/*.png')):
    name = os.path.basename(f)
    im = Image.open(f)
    src = Image.open(os.path.join(SRC, name)).convert('RGBA')
    bad = []

    # 1. canvas + format
    if im.size != (32, 32):
        bad.append(f'canvas {im.size} not 32x32')
    if im.mode != 'RGBA':
        bad.append(f'mode {im.mode} not RGBA')
    im = im.convert('RGBA')
    px = im.load()

    # 2. hard pixel edges: alpha may only be fully on or fully off
    alphas = {px[x, y][3] for y in range(32) for x in range(32)}
    if alphas - {0, 255}:
        bad.append(f'semi-transparent alpha present: {sorted(alphas - {0, 255})}')

    # 3. size of the artwork inside the canvas
    bb = im.getbbox()
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    if not (22 <= max(w, h) <= 24):
        bad.append(f'longest dim {max(w, h)} outside 22..24')

    # centring: at most a pixel off, which is unavoidable on odd sizes
    if abs(bb[0] - (32 - w - bb[0])) > 1 or abs(bb[1] - (32 - h - bb[1])) > 1:
        bad.append(f'not centred: bbox {bb}')

    solid = [[px[x, y][3] > 0 for x in range(32)] for y in range(32)]
    ext = [[False] * 32 for _ in range(32)]
    q = deque()
    for i in range(32):
        for (x, y) in ((i, 0), (i, 31), (0, i), (31, i)):
            if not solid[y][x] and not ext[y][x]:
                ext[y][x] = True; q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < 32 and 0 <= ny < 32 and not solid[ny][nx] and not ext[ny][nx]:
                ext[ny][nx] = True; q.append((nx, ny))

    # 4. the outline is CLOSED: no silhouette pixel touching outside is anything else
    open_px = 0
    for y in range(32):
        for x in range(32):
            if not solid[y][x]:
                continue
            if any(0 <= x + dx < 32 and 0 <= y + dy < 32 and ext[y + dy][x + dx]
                   for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                if px[x, y][:3] != OUTLINE:
                    open_px += 1
    if open_px:
        bad.append(f'{open_px} boundary px are not the outline colour')

    # 5. the outline is not DOUBLED. Only pixels this pass ADDED can double it -- a dark
    # area two pixels thick that the artist drew and that we merely recoloured is the
    # artwork, not a second ring, so it is checked against the added-pixel manifest.
    doubled = 0
    for (x, y) in ADDED[name]:
        if not any(0 <= x + dx < 32 and 0 <= y + dy < 32 and solid[y + dy][x + dx]
                   and px[x + dx, y + dy][:3] != OUTLINE
                   for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
            doubled += 1
    if doubled:
        bad.append(f'{doubled} ADDED outline px sit on nothing (doubled ring)')

    # and the ring must genuinely be one pixel: no added pixel may sit outside another
    for (x, y) in ADDED[name]:
        if all((x + dx, y + dy) in ADDED[name] or not (0 <= x + dx < 32 and 0 <= y + dy < 32)
               or not solid[y + dy][x + dx]
               for dx in (-1, 0, 1) for dy in (-1, 0, 1) if (dx, dy) != (0, 0)):
            bad.append(f'added outline px at {x},{y} is not against the silhouette')
            break

    # 6. palette: nothing but the artist's own colours, plus the one outline colour
    spal = {px2[:3] for px2 in src.getdata() if px2[3] > 0}
    opal = {px[x, y][:3] for y in range(32) for x in range(32) if px[x, y][3] > 0}
    invented = opal - spal - {OUTLINE}
    if invented:
        bad.append(f'{len(invented)} colours not in the source palette: {sorted(invented)[:4]}')

    # 7. it must not vanish on either in-game background
    for bg, label in (((0x3b, 0x34, 0x2c), 'panel'), ((0x8c, 0x3a, 0x33), 'active')):
        best = max(contrast(c, bg) for c in opal)
        if best < 3.0:
            bad.append(f'nothing on this icon reaches 3:1 against {label}: best {best:.2f}')

    print(f"{name:14s} {w}x{h} {'OK' if not bad else 'FAIL'}"
          + ('' if not bad else '\n                 - ' + '\n                 - '.join(bad)))
    if bad:
        fails.append(name)

print()
print('ALL PASS' if not fails else f'{len(fails)} FAILING: {fails}')
sys.exit(1 if fails else 0)
