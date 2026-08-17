"""
Normalisation pass for the 465-cache tab icons.

Not a redraw. Every step is measurement-driven and palette-preserving: the only colour
this script introduces anywhere is the outline colour.

Pipeline order matters and is the whole trick:

  scale the art WITH its existing rim  ->  unify the rim in place

Stripping first and scaling after was the obvious order and it was wrong. On the two
figure icons the limbs are a 1px core between two rim pixels; removing the rim before a
0.75x downscale leaves nothing for the resampler to hold on to and the arms evaporate.
Scaling the full silhouette keeps the mass, and because the strip takes exactly 1px back
off and the new outline puts exactly 1px on, the silhouette ends the size it started.
"""
from PIL import Image
from collections import deque
import glob, os, json

SRC = '/mnt/user-data/uploads/rune-465-web-client/design/_src/tab-icons'
OUT = '/home/claude/work/out/icons'
OUTLINE = (0x1a, 0x17, 0x12, 255)

# The cache's own rim sits at max-channel 1..29. 64 is comfortably above that and
# comfortably below the darkest *art* tone in the set, so it separates rim from art
# without a per-icon fudge factor.
RIM_LUMA = 64
# An enclosed gap this much covered in the source stays a gap in the output. Without it
# the wrench's jaw ring silts up during the downscale.
HOLE_KEEP = 0.34


def flood_exterior(solid, W, H):
    """4-connected flood from the canvas edge. Gaps enclosed by art are NOT exterior."""
    ext = [[False] * W for _ in range(H)]
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if not solid[y][x] and not ext[y][x]:
                ext[y][x] = True; q.append((x, y))
    for y in range(H):
        for x in (0, W - 1):
            if not solid[y][x] and not ext[y][x]:
                ext[y][x] = True; q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H and not solid[ny][nx] and not ext[ny][nx]:
                ext[ny][nx] = True; q.append((nx, ny))
    return ext


def solid_of(im):
    W, H = im.size; px = im.load()
    return [[px[x, y][3] > 0 for x in range(W)] for y in range(H)]


def resample(im, tw, th):
    """Downscale by majority vote over each output pixel's source footprint.

    Box-averaging was the first attempt and it is wrong for this art. At the ratios
    involved here -- the harp is 26px tall going to 24, a scale of 0.92 -- a 1px string
    lands astride two output pixels, averages to roughly half its own colour in each, and
    comes out as a dashed line with speckle either side. Averaging invents intermediate
    tones and then something has to guess them back onto the palette.

    Majority vote never invents a colour: each output pixel is whichever source colour
    actually covers most of it, so a string that dominates its row stays a solid string
    and the palette is preserved by construction rather than by a repair step afterwards.
    """
    W, H = im.size
    solid = solid_of(im)
    ext = flood_exterior(solid, W, H)
    px = im.load()

    # Gaps enclosed by art are tracked separately: they are the wrench's jaw ring and the
    # harp's string gaps, and a vote alone would let the surrounding art close them.
    G = 8
    big = im.resize((W * G, H * G), Image.NEAREST).load()
    holeflag = [[(not solid[y][x] and not ext[y][x]) for x in range(W)] for y in range(H)]

    out = Image.new('RGBA', (tw, th), (0, 0, 0, 0))
    op = out.load()
    for oy in range(th):
        y0 = (oy * H * G) // th
        y1 = max(y0 + 1, ((oy + 1) * H * G) // th)
        for ox in range(tw):
            x0 = (ox * W * G) // tw
            x1 = max(x0 + 1, ((ox + 1) * W * G) // tw)
            tally = {}
            hole = 0
            total = 0
            for gy in range(y0, y1):
                for gx in range(x0, x1):
                    total += 1
                    if holeflag[gy // G][gx // G]:
                        hole += 1
                    c = big[gx, gy]
                    key = None if c[3] == 0 else c[:3]
                    tally[key] = tally.get(key, 0) + 1
            if total and hole / total >= HOLE_KEEP:
                continue
            win = max(tally.items(), key=lambda kv: kv[1])[0]
            if win is None:
                continue
            op[ox, oy] = win + (255,)
    return out


def unify_rim(im):
    """Make the boundary a single consistent 1px #1a1712 line, without redrawing anything.

    The first version of this stripped the authored rim off and drew a fresh ring around
    what was left. That is destructive and it showed: the emotes figure's hair and the
    skills chart's axis are dark, are artwork, and touch the boundary, so the strip walked
    straight into them and the dancer came out headless.

    Nothing is removed here. Two passes:
      - every boundary pixel that is ALREADY dark is recoloured to the outline colour,
        which is what "make it consistent" means and what stops the line doubling
      - every boundary pixel that is bare artwork gets one new outline pixel outside it,
        which is what "finish it" means

    Between them every pixel on the silhouette's edge ends up dark exactly once, and the
    art's own interior shading, including the drop shadow the cache draws on the lower
    right of all fourteen, is left exactly as the artist made it.
    """
    W, H = im.size
    src = im.load()
    out = Image.new('RGBA', (W + 2, H + 2), (0, 0, 0, 0))
    out.paste(im, (1, 1))
    W, H = out.size
    px = out.load()

    solid = solid_of(out)
    ext = flood_exterior(solid, W, H)
    touching = lambda x, y: any(
        0 <= x + dx < W and 0 <= y + dy < H and ext[y + dy][x + dx]
        for dx in (-1, 0, 1) for dy in (-1, 0, 1))

    recolour, ring = [], []  # kept apart so the verifier can tell what was ADDED
    for y in range(H):
        for x in range(W):
            if solid[y][x]:
                if touching(x, y) and max(px[x, y][:3]) <= RIM_LUMA:
                    recolour.append((x, y))
            elif ext[y][x]:
                # a ring pixel is owed only where the edge underneath is bare artwork
                if any(0 <= x + dx < W and 0 <= y + dy < H and solid[y + dy][x + dx]
                       and max(px[x + dx, y + dy][:3]) > RIM_LUMA
                       for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                    ring.append((x, y))
    for x, y in recolour + ring:
        px[x, y] = OUTLINE

    crop = out.getbbox()
    added = {(x - crop[0], y - crop[1]) for x, y in ring}
    return out.crop(crop), added


def components(im):
    """Number of 8-connected opaque blobs. A rim strip that raises this cut the art."""
    W, H = im.size
    solid = solid_of(im)
    seen = [[False] * W for _ in range(H)]
    n = 0
    for y in range(H):
        for x in range(W):
            if not solid[y][x] or seen[y][x]:
                continue
            n += 1
            q = deque([(x, y)]); seen[y][x] = True
            while q:
                a, b = q.popleft()
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = a + dx, b + dy
                        if 0 <= nx < W and 0 <= ny < H and solid[ny][nx] and not seen[ny][nx]:
                            seen[ny][nx] = True; q.append((nx, ny))
    return n


def _pass(cut, scale_to):
    cw, ch = cut.size
    s = scale_to / max(cw, ch)
    tw, th = max(1, round(cw * s)), max(1, round(ch * s))
    if max(tw, th) != scale_to:
        if cw >= ch: tw = scale_to
        else: th = scale_to
    scaled = resample(cut, tw, th)

    bb = scaled.getbbox()
    if bb is None:
        return None
    return unify_rim(scaled.crop(bb))


def build(path, long_dim):
    """Solve for the scale that lands the FINISHED silhouette on exactly long_dim.

    The strip and the ring do not always cancel: where the cache art had no rim on one
    side, nothing comes off there but a ring pixel still goes on, so the result grows.
    Rather than model that per icon, scale, measure, and step down until it lands.
    """
    im = Image.open(path).convert('RGBA')
    cut = im.crop(im.getbbox())

    # The strip and the ring rarely cancel exactly, so search both directions for the
    # scale that lands the finished silhouette ON long_dim rather than merely under it.
    best = None
    for scale_to in range(long_dim + 3, long_dim - 3, -1):
        cand = _pass(cut, scale_to)
        if cand is None:
            continue
        got = max(cand[0].size)
        if got == long_dim:
            best = cand
            break
        if got < long_dim and (best is None or got > max(best[0].size)):
            best = cand
    if best is None:
        raise RuntimeError(f'{path}: nothing survived the resample')
    final, added = best

    ox, oy = (32 - final.width) // 2, (32 - final.height) // 2
    canvas = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    canvas.paste(final, (ox, oy))
    ink = sum(1 for p in list(canvas.getdata()) if p[3] > 0)
    return canvas, final.size, ink, sorted([x + ox, y + oy] for x, y in added)


def main():
    os.makedirs(OUT, exist_ok=True)
    files = [f for f in sorted(glob.glob(SRC + '/*.png'))
             if not os.path.basename(f).startswith('_')]

    # Pass 1: everything at 24, to measure how much ink each icon actually puts on screen.
    probe = {f: build(f, 24)[2] for f in files}
    inks = sorted(probe.values())
    median = inks[len(inks) // 2]

    # Pass 2: chunky icons come down to 23 or 22 so they stop out-weighing the thin ones.
    # Thin icons keep the full 24. Nothing goes below 22.
    report = []
    for f in files:
        ink = probe[f]
        long_dim = 24
        if ink > median * 1.15: long_dim = 23
        if ink > median * 1.32: long_dim = 22
        canvas, size, final_ink, added = build(f, long_dim)
        name = os.path.basename(f)
        canvas.save(os.path.join(OUT, name))
        report.append({'name': name, 'long': long_dim, 'art': list(size),
                       'ink24': ink, 'ink': final_ink, 'added_outline_px': added})
        print(f"{name:14s} long={long_dim}  art={size[0]}x{size[1]}  ink {ink} -> {final_ink}")
    print(f"\nmedian ink at 24: {median}")
    json.dump(report, open('/home/claude/work/out/report.json', 'w'), indent=1)


if __name__ == '__main__':
    main()
