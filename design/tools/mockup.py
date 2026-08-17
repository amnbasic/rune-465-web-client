"""
Two review renders for the mobile skin.

`_skin-before-after.png` is the honest one: each surface at the size it is authored,
cache art above, replacement below, so the change can be judged rather than admired.

`_mobile-mockup.png` puts the whole thing together at a phone's landscape aspect. It is
NOT a repaint of frame-548 -- the fixed frame is a 765x503 desktop layout with a stone
border the mobile skin does not draw at all, so patching it would flatter the work by
showing the new surfaces in the old furniture. The mockup lays them out where the client
actually puts them: the left-edge stack at the 44px cell and 52px pitch index.html
specifies, the tab rows and plates on the right column, the chat bar along the bottom.
"""
from PIL import Image, ImageDraw, ImageFont
import os, glob

SRC = '/mnt/user-data/uploads/rune-465-web-client/design/_src/ui-frame'
SKIN = '/home/claude/work/out/skin'
ICONS = '/home/claude/work/out/icons'
GLYPHS = '/home/claude/work/out/glyphs'
DELIV = '/home/claude/work/deliver'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'

SURFACE = (0x3b, 0x34, 0x2c)
SURFACE_LOW = (0x2a, 0x25, 0x1f)
EDGE = (0x56, 0x4c, 0x3c)
TEXT = (0xe6, 0xdc, 0xc6)

UPPER = ['combat', 'skills', 'quests', 'inventory', 'equipment', 'prayer', 'magic']
LOWER = ['clanchat', 'friends', 'ignore', 'logout', 'settings', 'emotes', 'music']


def before_after():
    f = ImageFont.truetype(FONT, 12)
    fh = ImageFont.truetype(FONT, 14)
    rows = ['tabrow_upper_backdrop', 'tabrow_lower_backdrop', 'chatbar_backdrop',
            'tabplate_wide', 'tabplate_narrow', 'tabplate_inventory']
    Z = 2
    pad, gap, label_w = 20, 26, 200
    heights = [Image.open(f'{SRC}/{n}.png').height * Z * 2 + 14 + gap for n in rows]
    W = label_w + max(Image.open(f'{SRC}/{n}.png').width for n in rows) * Z + pad * 2
    H = 64 + sum(heights)
    im = Image.new('RGB', (W, H), (24, 21, 18))
    d = ImageDraw.Draw(im)
    d.text((pad, 22), 'mobile skin - cache art (top) vs replacement (bottom)',
           font=fh, fill=TEXT)

    y = 64
    for n in rows:
        old = Image.open(f'{SRC}/{n}.png').convert('RGBA')
        new = Image.open(f'{SKIN}/{n}.png').convert('RGBA')
        w, h = old.size
        d.text((pad, y + 4), n, font=f, fill=TEXT)
        d.text((pad, y + 20), f'{w}x{h}', font=f, fill=EDGE)
        for j, art in enumerate((old, new)):
            tile = Image.new('RGB', (w * Z, h * Z), SURFACE_LOW)
            tile.paste(art.resize((w * Z, h * Z), Image.NEAREST),
                       (0, 0), art.resize((w * Z, h * Z), Image.NEAREST))
            im.paste(tile, (label_w, y + j * (h * Z + 14)))
        y += h * Z * 2 + 14 + gap

    im.save(f'{DELIV}/_skin-before-after.png')


def cell(im, box, fill, edge, r=8):
    """A rounded cell drawn the way HudSkin draws one: flat fill, one lighter hairline."""
    d = ImageDraw.Draw(im)
    d.rounded_rectangle(box, radius=r, fill=fill, outline=edge, width=1)


def mockup():
    W, H = 880, 400
    f = ImageFont.truetype(FONT, 11)
    fh = ImageFont.truetype(FONT, 14)
    im = Image.new('RGB', (W, H), (0x12, 0x10, 0x0e))
    d = ImageDraw.Draw(im)

    # world: a flat stand-in, since the scene is engine-drawn and no sprite exists for it
    d.rectangle([0, 0, W, H], fill=(0x1d, 0x22, 0x18))
    d.text((16, 14), 'game world (engine-drawn)', font=f, fill=(0x3e, 0x4a, 0x36))

    # ---- right column: two tab rows with the normalised icons on the new plates -------
    col_x = W - 300
    plate = Image.open(f'{SKIN}/tabplate_wide.png').convert('RGBA')
    idle = Image.open(f'{SKIN}/tabplate_wide_idle.png').convert('RGBA')
    pw, ph = plate.size

    for row_i, (names, active) in enumerate(((UPPER, 3), (LOWER, -1))):
        row = Image.open(f'{SKIN}/tabrow_upper_backdrop.png').convert('RGBA')
        rw = pw * len(names) + 8
        row = row.resize((rw, row.height), Image.NEAREST)
        ry = 20 + row_i * (row.height + 8)
        im.paste(row, (col_x, ry), row)
        for i, n in enumerate(names):
            art = plate if i == active else idle
            px_ = col_x + 4 + i * pw
            py_ = ry + (row.height - ph) // 2
            im.paste(art, (px_, py_), art)
            ic = Image.open(f'{ICONS}/{n}.png').convert('RGBA')
            im.paste(ic, (px_ + (pw - 32) // 2, py_ + (ph - 32) // 2), ic)

    # the panel the tabs open onto
    panel_y = 20 + 2 * (Image.open(f'{SKIN}/tabrow_upper_backdrop.png').height + 8)
    cell(im, [col_x, panel_y, col_x + pw * 7 + 8, H - 76], SURFACE, EDGE, r=12)
    d.text((col_x + 14, panel_y + 12), 'inventory / panel content', font=f, fill=EDGE)

    # ---- chat bar along the bottom ----------------------------------------------------
    bar = Image.open(f'{SKIN}/chatbar_backdrop.png').convert('RGBA')
    bar = bar.resize((col_x - 24, bar.height), Image.NEAREST)
    by = H - bar.height - 12
    im.paste(bar, (12, by), bar)
    for i, label in enumerate(('All', 'Game', 'Public', 'Private', 'Clan', 'Trade')):
        cw = (bar.width - 16) // 6
        cx = 12 + 8 + i * cw
        cell(im, [cx, by + 9, cx + cw - 6, by + bar.height - 9],
             (0x5c, 0x51, 0x42) if i else (0x8c, 0x3a, 0x33), EDGE, r=6)
        d.text((cx + (cw - 6) / 2 - d.textlength(label, font=f) / 2, by + 18),
               label, font=f, fill=TEXT)

    # ---- left-edge stack: 44px cells on a 52px pitch, exactly as index.html sets it ----
    sx, step, size = 8, 52, 44
    # bottom slot first. index.html: "[ chat ] #mobile-bar, growing upward / [ gear ]
    # #controlbar" -- the gear takes the bottom slot so neither element has to know how
    # many buttons the other has. Chat is drawn lit, as the toggle whose panel is up.
    stack = [('ui_settings', False), ('ui_fullscreen', False), ('ui_chat', True)]
    for i, (g, lit) in enumerate(stack):
        gy = by - 14 - (i + 1) * step
        cell(im, [sx, gy, sx + size, gy + size],
             (0x8c, 0x3a, 0x33) if lit else (0x5c, 0x51, 0x42), EDGE, r=8)
        art = Image.open(f'{GLYPHS}/{g}.png').convert('RGBA')
        im.paste(art, (sx + (size - 32) // 2, gy + (size - 32) // 2), art)

    d.text((16, by - 20), 'mobile skin mockup - 44px cells, 52px pitch, HudSkin tokens',
           font=f, fill=(0x3e, 0x4a, 0x36))
    im.save(f'{DELIV}/_mobile-mockup.png')


if __name__ == '__main__':
    os.makedirs(DELIV, exist_ok=True)
    before_after()
    mockup()
    print('mockups written')
