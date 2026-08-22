# Mobile, and the resizable HUD

How the client runs full-screen on a phone: the iOS home-screen shell, the touch gestures, and the
re-anchored pane-548 layout that makes the 2006 HUD fit a landscape screen.

The presentation half — how the frame is sized and scaled — is in
**[display-and-settings.md](display-and-settings.md)**. This file is about the layout half and the
platform.

## Files

| File                           | Role                                                                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/client/MobileLayout.ts`   | The anchor table for pane 548, the collapsible-HUD state, the HUD hit test, and the tables saying which component is a tab plate, a tab icon or a scrollbar piece. |
| `src/client/HudSkin.ts`        | **The visual language**: every colour, radius and alpha, the drawn primitives, the icon pipeline, the nine-slice blitter, and `publishCss`.                        |
| `src/client/HudStrip.ts`       | The side tab strip's geometry — the one cluster whose SIZE is computed from the frame. Imported by the verifier, which is why it is a module.                      |
| `src/client/HudArtData.ts`     | Generated. The hand-authored icons, control glyphs and surfaces, baked in.                                                                                         |
| `src/client/ChatFilter.ts`     | The chat tabs, as a filtered view of the message ring.                                                                                                             |
| `src/client/MobileTouch.ts`    | Touch gestures, the left-edge button stack, wake lock, the install nudge, the portrait hint.                                                                       |
| `src/client/MobileKeyboard.ts` | The hidden `<input>` that makes iOS raise a soft keyboard for a canvas.                                                                                            |
| `src/client/ScreenMode.ts`     | Frame sizing, safe-area measurement, the `[data-layout]` / `[data-smooth]` attributes.                                                                             |
| `public/index.html`            | Viewport meta, Apple meta tags, manifest link, safe-area padding, the fill-mode CSS.                                                                               |
| `design/`                      | The art source: icons, glyphs, skin surfaces, and the scripts that made them.                                                                                      |
| `tools/import-art.ts`          | Bakes `design/` into `HudArtData.ts`, and refuses art that misses the contract.                                                                                    |
| `tools/preview-hud.ts`         | Renders the drawn HUD to a PNG with no browser, cache or login.                                                                                                    |

---

## The mechanism: an anchoring engine that was already here

`IfType` carries four alignment fields — `xAlignment`, `yAlignment`, `widthAlignment`,
`heightAlignment` — and `Client.computeComponentPosition` / `computeComponentSize`
(`Client.ts:13392-13489`) implement a complete relative-anchoring layout pass over them: anchor
right, anchor bottom, centre, fill, proportional. `Client.computeInterfaceLayout` runs that pass
over the whole pane against `GameShell.sWid`/`sHei` on every frame, and nested children are laid out
against their own **parent's resolved box** (`Client.ts:13348-13349`).

**None of it has ever done anything.** The 465 cache has no bytes for those fields — they were a
rev-500 addition — and both decoders hard-zero all four (`IfType.decode3` at `:467-473`,
`IfType.decode` at `:653-656`). There is a comment at the first of those about the four phantom
bytes that desynced the packet when an earlier port tried to read them. The layout engine came over
with the rest of the engine and has been sitting dormant for want of data.

So the resizable HUD is **not a relayout**. It is ~25 property writes handing the engine the data
the cache never had. `MobileLayout.apply()` writes them; the engine does the arithmetic.

### Why that matters more than it sounds

The previous attempt (`ScreenMode.applyLayout`, since removed) re-stamped `x`/`y` on 548's children
every frame and had to classify each child as a _pane-root delta_ or a _viewport delta_ by hand.
That classification is what went wrong.

Here it cannot: a child of `com_82` is anchored against `com_82`, a child of `com_62` against
`com_62`, a pane-root child against the frame — decided by the engine from the tree it already
walks. Which is also why the other ~75 children of 548 need no treatment at all. They ride their
parents for free.

### The insets are derived, with six exceptions

A right anchor is `765 - x - width`; a bottom anchor is `503 - y - height`, off a dump of 548 from
the 465 cache (`server/tools/dump-interface.ts 548`). 765x503 is the frame the cache authors 548
for, so **at 765x503 every derived anchor resolves to exactly the coordinate the cache gave it**.

Six entries are placed against the resizable layout instead of converted from the fixed one, and
they are called out in the table:

| com              | what                                                    | why not derived                                                                                                                                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `62`, `63`, `71` | viewport container, the ct-1337 scene, the overlay host | they fill the frame; there is no inset to derive                                                                                                                                                                                                                                                   |
| `64`             | the modal slot (banks, shops, dialogues)                | keeps its authored 512x334, so left-anchoring would strand it in the corner of a wide frame. Centred horizontally, pinned near the top so the chatbox — drawn later, therefore on top — does not cut across it                                                                                     |
| `65`             | the multiway-combat indicator                           | was 40px in from the _viewport's_ right edge. The viewport is the frame now, so re-deriving that inset would put it under the tab row. Bottom-left, which the chat cluster vacated when it moved to the top                                                                                        |
| `66`–`70`        | the five chat lines drawn over the scene                | same trap, and they follow the chatbox: top-left, on the cache's own 13px pitch, stopping 190px short of the right edge so a long line is not sliced by the minimap. They may sit on the chat cluster — the two are never both up, because closing the chatbox hides `com_0` and `com_73` together |

**The trap is worth restating**, because it is the one that bites: `com_62` is now the whole frame,
so its children anchor against the frame. Re-deriving their cache insets against the old 512x334
box is arithmetically faithful and puts them all underneath the HUD.

### The reparent — every HUD piece hangs off `com_71`, for two separate reasons

**Draw order.** Order inside a layer is array-index order, so the pane's own children _below index
62_ are painted over by the now-frame-sized scene — while staying clickable, because hit-testing
walks the same array independently of what painted last. That is the chat-mode bar and both tab
rows: invisible, and still switching your sidebar tab when you tap the world.

**The dirty slot.** This one is subtler and cost a round of on-device testing. Painting is gated on
`Client.componentRedraw[drawSlot]` (`Client.ts:11036`) — layout and hit-testing run every frame, but
pixels only go down when that slot is dirty. A pane-root child claims its **own** slot, so it
repaints only when its content changes. Harmless while the scene lived in a 512x334 hole; fatal once
the scene covers the whole frame and marks itself dirty every frame, because it then repaints over
the sidebar and chatbox continuously and they never repaint back. On a phone they were simply
absent — right layout, no pixels.

A child of `com_71` is inside the viewport's subtree, so `drawSlotArg` is not `-1` and it inherits
`com_62`'s always-dirty slot, repainting in step with the scene that overpaints it. Sub-interfaces
follow: `drawInterface` is handed the parent's `drawSlot` (`:11031`), so the chatbox's widget 137 and
whatever tab is open in the sidebar come along.

The minimap (`com_72`) is deliberately **not** reparented — `clientCode 1338` draws in its own branch
above the redraw gate, so it repaints regardless and already worked.

Everything else rides along free: draw (`Client.ts:10964`), hit-test (`:12112`) and layout
(`:13351`) all recurse on `parentId` over the very same components array, so clicks and layout follow
the reparent with no extra work.

The dirty-rect optimisation is gone in this mode — but that is a consequence of a full-frame scene,
not of the reparent, and it was already paid.

The nine frame-trim layers (`44, 46, 48, 50, 52, 54, 56, 58, 60`) are hidden rather than moved — a
resizable frame has no stone border to draw. `hide` removes a component from **both** the draw pass
and hit-testing, which is the point: an overpainted strip stays clickable.

### Re-asserted every frame, deliberately

`apply()` runs once per frame from `gameDraw()` (and at the three pane-switch packet sites, so the
first layout after a switch is not computed unanchored). There is no sentinel, and there should not
be one:

- `IfType.unloadInterface` drops 548's array on the way back to the title screen; it is decoded
  fresh on the way in, which re-zeroes the alignment fields.
- cs2 `if_setposition` / `if_setsize` / `if_sethide` (opcodes 1000/1001/1003) each zero _part_ of
  what we write, as does inbound packet 244.

A sentinel checking one component would miss all of those. It is ~25 idempotent property writes on
objects already in memory.

Cache geometry is snapshotted per **object identity**, not per child index, so a re-decode gets a
fresh snapshot rather than restoring into components that no longer exist. Turning the mode off
restores every touched component bit-for-bit — that is the desktop-safety guarantee, and it is
verified (below).

### The server does not fight it

`if_setposition` is used only on sub-interfaces (`data/scripts/chat/scripts/chat.rs2` —
`make3_dialog`, `multiobj4`), never on 548's roots. `interface_548:com_0/10/27/71` appear in
`interface-widgets.pack` only as auto-generated names; no content references them. If that ever
changes, the re-assert wins, because it runs after packet processing.

---

## The collapsible HUD

The anchor table says _where_ each HUD cluster goes. `MobileLayout.applyHudState` says whether it is
on screen and how solid it is drawn — mutable state, deliberately kept out of the table so
`verify-mobile-anchors.ts` still has a static set of numbers to check against the cache.

### Translucency and the GPU renderer — the alpha tag

**This is the part to read before touching any of it.** A see-through HUD is not the same problem
under the two renderers, and getting it wrong looks like the feature simply not working.

Blending means compositing against whatever is already in the frame buffer. Under the **software**
renderer that is right: the scene really is in the buffer. Under the **GPU** renderer it is not —
the scene is on `#glcanvas` _underneath_ the 2D frame, which keeps a hole where the scene shows
through, and the hole's pixels read as **black**. So a blended HUD panel composites against black
and comes out dark and _opaque_: flat charcoal rectangles, no world behind them, which is exactly
what it looked like. Worse, `PixMap` used to detect the hole with `pixel === GL_TRANSPARENT`, an
exact match — so a hole pixel touched by any blend stopped being a hole at all.

The fix is to stop blending in that mode and hand the compositing to the browser, which _does_ have
both layers. The top byte of a frame pixel is now an alpha tag:

| Tag      | Meaning                                                           |
| -------- | ----------------------------------------------------------------- |
| `0`      | opaque — every ordinary pixel the engine draws                    |
| `1`      | fully transparent — the GL scene hole (`PixMap.GL_TRANSPARENT`)   |
| `2..255` | that alpha, verbatim — a translucent HUD panel over the GPU scene |

`PixMap`'s two conversion loops turn the tag into real canvas alpha; `SoftwarePix32.alphaScale` is
`tranScale`'s sibling that writes `rgb | tag` instead of blending; `Pix2D.fillCircleBlend` does both
for the tab discs. Which one runs is `Client.glSceneActive`, published once per frame by
`gameDrawMain` from the same expression that decides whether to punch the hole, so the two can never
disagree.

Two things that make this safe rather than clever:

- **Every blender masks the top byte out already.** `tranScale`, `tranSprite`, `fillRectTrans` and
  the rest work on `0xff00ff` / `0xff00` lanes, so a tagged pixel underneath them blends correctly
  and the result comes out tag 0, i.e. opaque. That is what makes text and item icons drawn _over_ a
  translucent panel land solid with no special case.
- **Canvas `ImageData` is non-premultiplied**, so writing unblended colour plus an alpha is exactly
  what it wants; the browser premultiplies when it composites.

The result is also strictly better than the software path, because the panel ends up composited over
the _real_ scene rather than over a copy of it.

### See-through panels are one property, not a draw path

A v3 `GRAPHIC` with a non-zero `trans` already routes to `transScalePlotSprite`
(`Client.ts:11248`) — real per-pixel alpha the engine has always had and the 465 cache never uses.
So `MobileLayout.panelTrans` is written to the **backgrounds only** and everything drawn on top of
them (tab icons, item icons, chat text) stays opaque. That is what reads as an OSRS-mobile HUD
rather than a faded screenshot. Higher is more transparent; the blit is handed `256 - trans`.

A tab row is **two** layers of stone, and both have to go or the row still reads as a box:

| Cluster               | Backdrop | Per-item plates | Left opaque             |
| --------------------- | -------- | --------------- | ----------------------- |
| chat-mode bar `com_0` | `com_1`  | —               | the four labels         |
| lower tabs `com_10`   | `com_11` | `com_13`–`19`   | icons `com_20`–`26`     |
| upper tabs `com_27`   | `com_28` | `com_30`–`36`   | icons `com_37`–`43`     |
| chatbox `com_73`      | `com_74` | —               | widget 137's text       |
| sidebar `com_82`      | `com_83` | —               | whichever panel is open |

Chat text is authored **black** for a parchment background, so the alpha level is a setting rather
than a constant: `Solid` (0) / `See-through` (84) / `Ghost` (140). See-through is the default on
**every** device, not only touch — it does nothing outside the resizable layout, so defaulting
desktop to `Solid` only meant that switching to resizable got you the see-through HUD's arrangement
drawn in solid slabs with no hint that one setting away was the look it was designed for.

**The alpha setting does NOT control whether the containers are drawn** — that is
`MobileLayout.cropped()`, which is simply "is the resizable layout on". It was tied to the alpha at
first, on the reasonable-sounding grounds that nobody wants see-through panels inside opaque stone
rectangles. That was backwards: it made `Solid` silently also mean "put the cache's stone frames
back", so a player on Solid got the old rectangles with nothing to explain why, and one setting was
quietly driving two unrelated things. `panelTrans` now only decides how see-through the containers
are (0 = solid ones); `Layout: Fixed` is the way to get the cache art as authored.

### One container per cluster

The HUD has three groups of pieces that read as a single thing, and giving each _backdrop_ its own
box was not enough — the two tab rows are 269 and 249 wide, so their boxes had mismatched edges, and
the chatbox kept the light parchment sprite above the mode bar's dark strip, which is two different
looks stacked. `MobileLayout.CONTAINERS` maps the backdrop that DRAWS a box to the clusters it must
span:

| Drawn on | Spans                                          | Absorbed (draws nothing) |
| -------- | ---------------------------------------------- | ------------------------ |
| `com_1`  | `com_0` + `com_73` — chat-mode bar and chatbox | `com_74`                 |
| `com_83` | `com_82` — the side panel                      | —                        |
| —        | the two tab columns: no slab, see below        | `com_11`, `com_28`       |

**Which backdrop draws it is not a free choice.** Order inside `com_71` is array-index order, so the
box has to be drawn by the piece that paints _first_ or it lands on top of content already there:
the chat group draws on `com_1` (index 1, ahead of the chatbox at 73). A hidden cluster drops out of
the union, so collapsing the chatbox takes the mode bar's half of the box with it.

**The tab strip left this table.** `com_11` used to span `com_10` + `com_27`, which was right while
the cells were butted edge to edge — one slab, no seams. It became wrong the moment the cells were
spaced: the gaps would have shown slab rather than world, putting the lattice back as a negative.
The panel keeps its slab and is drawn by `com_83`, its own backing, rather than by a tab row's — the
row is what the one-column setting hides, and a slab hosted there would vanish with it.

**And the box has to escape its own component's clip.** `drawLayer` sets the clip to the PARENT's
box before drawing its children, so a container spanning a whole cluster but drawn by a backdrop
inside one of them gets cut to that one. The tab container, drawn by `com_11` inside the 37-tall
lower row, was clipped to those 37 rows — the bottom row had a bar and the top row appeared to have
none. `drawHudContainer` widens the clip, draws, and puts back exactly what was there; restoring is
not optional, because the caller is part-way through a layer's children and every sibling after it
relies on that clip still being the parent's.

Two things follow from making the chatbox dark:

- `com_73` is moved **flush left** with the mode bar (x 17 → 0). They share a container and a 17px
  step in it was the most obvious thing out of alignment.
- **Chat text has to be recoloured.** Widget 137's text is authored `colour=0x000000` for the
  parchment, so it would be invisible. The TEXT branch remaps _only_ pure black on components whose
  interface id is 137 — a line cs2 has coloured for a private or clan message is left exactly as it
  set it. That is why it is a colour test and not a blanket override.

The four chat-mode labels are also given even cells (0/124/248/372 across the 496 bar, replacing the
cache's ragged 2/127/269/411). Each is _already_ `hAlign` centre inside its own layer, so equal
widths is all the centring takes; `com_9` is the one exception, right-aligned by the cache, and is
set to match.

### `HudSkin` owns the look — every colour, radius and alpha

**`src/client/HudSkin.ts` is the only place a HUD colour is allowed to live.** It imports `Pix2D`,
`Pix32`, `PixMap` and the baked art, and nothing else — the same module-cycle discipline
`ControlBar` and `ScreenMode` follow — so the draw path, the layout and the stylesheet can all
depend on it.

That rule exists because the palette had four owners and they drifted: the DOM buttons carried an
`rgba()` copy of a fill the canvas had moved off, a _duplicate_ CSS selector later in
`index.html` silently won on source order and kept the settings gear on a rim the drawn HUD had
dropped, and "selected" was three different colours. `HudSkin.publishCss` now writes the tokens
onto `<body>` as `--hud-*` custom properties, so the stylesheet reads the same numbers the canvas
paints with, and `design/tools/skin.py` reads them out of this file too.

The palette has been through three revisions and the middle one is worth recording, because it was
a correct fix aimed at the wrong target:

|               | cache-ish first pass         | over-correction             | now                          |
| ------------- | ---------------------------- | --------------------------- | ---------------------------- |
| panel fill    | `0x3a332b` → `0x211d18`      | `0x201d19` → `0x141210`     | `0x3b342c` → `0x2a251f`      |
| edge          | `0x6b5f4a`, 2px, **lighter** | `0x0d0b09`, 1px, **darker** | `0x564c3c`, 1px, **lighter** |
| cell          | `0x4a4136`                   | `0x282420`                  | `0x5c5142`                   |
| active        | `0x6a5a41` gold              | `0x6a5a41` gold             | `0x8c3a33` **red**           |
| radius        | 20                           | 12                          | 12                           |
| default alpha | 70 (~73%)                    | 84 (~67%)                   | 84 (~67%)                    |

A 2px rim _lighter and more opaque than its fill_ draws a bright box around every cluster, and that
was the original complaint. Inverting it to a dark hairline fixed the box and produced something
that is not what OSRS looks like; the answer was a **one-pixel** lighter hairline, which reads as a
lit edge rather than as a border. The red is not a taste either — it is the colour of the cache's
own tab plates (`tabplate_wide` in `server/data/dump/ui-frame/`), so the selected stone matches art
RuneScape has always drawn.

**Anything drawn ON a surface is drawn a step more opaque** (`A_LAYER` = 26, `A_LIT` = 64), and
that is mechanical rather than cosmetic: under the GPU renderer a translucent HUD pixel is
_tagged_, not blended, so a cell at the panel's own alpha does not composite over the panel — it
replaces it, and comes out at exactly the weight of the surface it is meant to be sitting on.
`HudSkin` enforces it by construction; no call site passes a raw alpha.

### The tab strip: floating cells, on the hotkey column's rhythm

Fourteen cells on a 37px pitch, each with an edge and a gutter, tile into a **lattice** — the eye
reads the seams before the icons. Dropping the edge does not fix it, because the gutter still draws
a grid in the slab behind. The first answer was to draw no idle cell at all, leaving bare icons on
the slab with one red square for the open tab.

What replaced it is the hotkey column's geometry, because that is the surface that turned out to
read well: **a rounded cell per tab, with air between the cells and world showing through the gaps**
— which needs the slab gone, not just the seams. The cell, the gap and the 8px inset off the glass
are the hotkey column's, in CSS pixels, so the two clusters match _physically_ rather than matching
as numbers in a table and diverging on any device that is not presented 1:1.

**But the cell is computed, not authored, and ALL THREE clusters share it** — the tab strip, the
hotkey column, and the DOM chat/cog buttons. See `src/client/HudStrip.ts`, which owns it and
imports nothing.

They were three separate numbers once: 44 for the DOM buttons in CSS, 44 for the hotkeys, and
whatever fit for the strip. On a desktop all three agreed, so the split was invisible; on a phone
it read as three differently-sized grids facing each other across one screen. Now one function
picks the largest cell that satisfies every constraint, and the binding one wins for everybody:

|                                   | frame       | cell   |
| --------------------------------- | ----------- | ------ |
| desktop, and the 765x503 baseline | tall enough | **44** |
| a landscape phone at HUD size Fit | ~962x444    | **33** |
| a landscape phone, largest HUD    | ~932x430    | **31** |

The constraints, smallest wins:

- **The minimap, over the tab strip.** Seven cells, six gaps and the bottom inset have to fit
  between the map's bottom edge and the bottom of the frame. `com_72` is 190x156 top-right and is
  drawn **after** `com_71`, so a stone that grows up into it is painted over and cannot be tapped
  — this is the constraint whose absence hid the Combat tab under the map. Binding on every phone:
  at 44 the column is 332 tall, and `332 + 156 + 8 = 496` against ~430.
- **The chat cluster, over the hotkey column.** Five cells, four gaps and the 52 it stands off the
  bottom have to fit below the chat. Rarely binding — five is not seven — but it is what stops the
  top slot being drawn across the chatbox.

**44 is not reachable on a phone and no setting changes that.** The arithmetic is
`7 x 44 + 6 x 4 + 8 + map <= frameH`, which needs a map no taller than 90px on a 430pt screen. The
HUD-size dial does not help either: it scales the whole frame, so a taller frame arrives with a
smaller presentation scale and the stone's size **on glass** barely moves. The only lever that
would is fewer rows — reflowing 13 tabs into three or four columns — which is a different
arrangement, not a tuning.

The floor is 28, and it used to be 36 on the reasoning that no frame should get smaller stones
than it already had. That was wrong, and worth keeping written down: a floor **above** what the
frame can hold does not keep stones usable, it pushes the top one under the minimap where it is
painted over and untappable. A tab you can see and press at 31 beats a tab at 36 that is not there.

`HudSkin.publishCss` writes the cell to `--hud-cell-size` in CSS pixels, which is how the DOM
buttons follow. It is the only non-colour token there, and it is republished only when the number
changes — `syncHotkeyBar` runs three times a frame and writing a custom property onto `<body>`
invalidates style for the whole document.

The constraint that is deliberately _not_ checked is the chatbox. A wider strip pushes the panel
left, and on a short frame the panel comes down beside the chat cluster instead of below it — but
the minimap rule makes that unreachable. The panel only reaches the chat's rows below ~399 frame
px of height, and by then the cell is already at its floor, whose 76px footprint clears a 496-wide
chat at any frame ≥762 wide. Narrower than that and `496 + 190 + 76 = 762` says no cell size helps;
the verifier exempts that one pair below that one width, and nothing else.

The two columns share a **baseline**, not a top: six cells and seven cells both end 8px off the
bottom of the frame, so the short column is missing its _top_ cell and the row nearest the thumb
lines up across both.

The glyphs stay 24px whatever the cell does. The hand-authored icons in `HudArtData` are drawn to
that box and `tools/import-art.ts` verifies them against it at build time, so a cell-proportional
icon target would silently mismatch every one of them.

Which tab is lit comes from the com→panel mapping `tapTab` / `noteTabShown` learn by watching, not
from an index — there are 14 panels for 13 tabs. A tab never yet tapped draws unlit, which is the
safe way to be wrong.

### The scrollbar — and a wrong assumption worth remembering

**`drawScrollbar` never runs for the chatbox, or for any IF3 interface.** It and `doScrollbar` are
gated on `!child.v3`, and every component of pane 548 and of widget 137 is IF3. A slim replacement
was written there first and restyled nothing anyone could see.

The real IF3 scrollbar is built at runtime by the cache's own clientscripts — 30 calls 31, which
`cc_create`s **six GRAPHIC subcomponents** into the host layer: a track (sprite 792), a grip (790),
two 16x5 grip caps (789/791) and two arrows (773/788). The same pair builds every scrollbar in the
game, so it is caught **by sprite id** (`MobileLayout.scrollPart`) rather than by component — there
is no component in the cache to match, and the host is whichever layer wanted a bar.
`Client.drawScrollPart` then draws a slim track, a slim grip, a 4px chevron per arrow, and nothing
at all for the caps, which are the only two of the six carrying no op.

Two traps live here:

- **A `cc_create`d subcomponent inherits its host's `parentId`** (`ScriptRunner.ts:424`), so any art
  rule keyed on `parentId` alone fires on every subcomponent of that host. Key on the sprite, or on
  `(parentId, subId)`.
- `hide` is forbidden on the track, the grip and both arrows: they carry the drag hooks and the
  scroll ops. Replacing the art keeps every one of them.

### Previewing without a browser

`bun tools/preview-hud.ts [--icons raw.json] [--trans N] [--crop x,y,w,h] [--zoom N]` renders the
HUD's drawn surfaces to a PNG by **calling `HudSkin` itself** — panels, chips, stones, bars, the
minimap ring and the icon pipeline are the exact functions the client runs, over a synthetic scene
with grass, a bright path and water so a translucent panel has something to be translucent over.

An earlier version parsed the constants out of `Client.ts` with a regex and was one refactor away
from previewing a HUD nobody ships; importing the module instead is why it cannot drift. Pass
`--icons` a file from `bun tools/dump-sprites.ts --raw <file> 168 898-910` (server repo) and it
draws the **real cache art** through the real fitter, which is the only way to judge a resampling
filter without launching the client.

It cannot show text (no fonts outside the browser) or the GPU alpha-tag path; geometry, palette and
weight are what it is for.

### Cropping: what is faded, what is deleted, what is replaced

Fading a rectangle leaves a rectangle. So above `Solid` the three treatments differ:

- **Faded** (`trans = panelTrans`): `com_74` and `com_83`, the two backings that sit under text and
  item icons and are still wanted as a surface to read against.
- **Deleted** (`hide`): `com_1`, `com_11`, `com_28` — the flat strips behind a whole cluster, which
  are the actual boxes. All three are plain GRAPHICs carrying **no op**, verified, so `hide` costs
  only the pixels; no hook and no hit target goes with them.
- **Replaced**: the fourteen tab plates. These **cannot** be hidden — every one carries its tab's op
  hook (`com_30` has `Combat Options`, and so on down both rows), and `hide` removes a component
  from hit-testing as well as from the draw, so hiding them would take the buttons away with the
  art. Instead the draw resolves them to no image at all and `Client.drawTabCell` draws a rounded
  cell in the plate's rect, inset 2px so neighbouring cells cannot touch. The 32x36 icon overflows
  that inset slightly, which is the intended read — an icon ON a badge, not an icon IN a box.

The cropped look is **not** tied to the alpha level, and tying them was a bug worth remembering:
it made `Solid` silently also mean "put the cache's stone frames back". `Layout: Fixed` is the way
to get the cache art exactly as authored; `panelTrans` only decides how see-through the containers
are, with 0 giving solid ones.

### The layout, and the one change that pays for everything

Modelled on OSRS mobile's arrangement rather than the cache's:

```
 chat cluster (496x146)                              minimap (172x156)
 mode bar on top, box under it                             top-right
 TOP-LEFT

                                        side panel  |  tab strip
                                          190x261   |   68x259
                                                BOTTOM-RIGHT
```

**The tab strip is the load-bearing part.** The cache lays the fourteen side tabs out as two ROWS
of seven (269 and 249 wide), which is what forced the right-hand column to be 82px taller than the
panel it stacked under. As two COLUMNS of seven they stand _beside_ the panel instead — 68x259
against 190x261, shoulder to shoulder on one baseline — and the column stops growing downward.

That is worth 82 rows of frame height, so `FIT_H` (the height at which an open panel stops touching
the minimap) drops from **499 to 420**: minimap 156 + panel 261. On a phone that is scale 0.886
instead of 0.745 — **a HUD ~19% larger for the same no-overlap guarantee.** Moving the chat cluster
to the top-left pays a second time on the other axis: nothing shares a row any more, so `MIN_W`
drops from 765 to 680 (chat 496 beside minimap 172).

Two things the verifier caught the moment the pieces moved, both now fixed: the multiway icon at
top-left collided with the chat that had just arrived there (it is bottom-left now, the corner chat
vacated), and the 259-tall strip reaches the minimap below `FIT_H` exactly as the panel does, so the
exemption covers the whole right cluster rather than just `com_82`.

Every cell in the strip is `edge: true`. They are nested inside the columns, so the safe-area padding
that belongs on a frame-anchored cluster would be added _again_ per cell and shove each icon out of
its own container.

### The floating panel, and why it is what makes the HUD readable

**The single most load-bearing decision in this layout.** The cache stacks the right-hand column
minimap / upper tabs / **panel** / lower tabs, so it is 503 tall whether or not anything is open.
`ScreenMode` divides the window by that number, so on a phone the frame came out at 1152x531 inside
an 852x393 viewport and _every_ glyph, item icon, scrollbar and menu row was drawn at ~74% of a CSS
pixel. Nothing was scaling the HUD down; the frame being oversized **was** the shrink.

So the two tab rows are stacked together at the bottom (`com_10` at y=0, `com_27` directly on it at
y=37) and the panel **floats above them** at y=82, over the world. The buttons never move; the panel
appears and goes away. The permanent column is then minimap + tab rows, and the binding constraints
become:

```
panel 261 + tab rows 82   = 343    the panel must not run off the top when open
modal slot 334 at y=4     = 338    a bank or shop must not be clipped
                MIN_H     = 350    both, with a little air
```

At 852x393 with a 59pt notch inset and a 21pt home indicator that gives
`s = min(1, 793/765, 372/350) = 1` — the frame is the window, and the HUD draws at **1:1 instead of
74%, about 1.35x bigger on glass**. Width binds now, not height, and 765 is genuinely real: along the
bottom the chat-mode bar is 496 on the left and the lower tab row 269 on the right, meeting exactly.

The price: on a short frame an **open** panel reaches up into the minimap. That is a **dial, not a
bug** — `ScreenMode.minHeight`, exposed as `Display → HUD size`:

| Preset            | minHeight | On a 393-tall phone | Panel/minimap overlap |
| ----------------- | --------- | ------------------- | --------------------- |
| Large             | 350       | scale 1.00          | ~106 rows             |
| Medium            | 430       | scale 0.91          | ~69 rows              |
| **Fit (default)** | 499       | scale 0.79          | none                  |

Fit is the default: two HUD pieces fighting over the same rows is worse than the HUD being a fifth
smaller, and the other two are there for anyone who would rather have the size.

499 is not a taste: it is minimap 156 + panel 261 + tab rows 82, the exact height at which the
panel's top meets the minimap's bottom. Overlap is `499 - frameH` rows, linear in between, and there
is no arrangement that avoids it at 393 — 156 + 261 is 417 against a 393-tall frame.

**Moving the panel does not help.** Sitting it beside the tab block clears the minimap on the x axis
and then lands on the chat-mode bar and two of the over-scene chat lines: three overlaps instead of
one. The anchor verifier caught that immediately, which is what it is for. The panel belongs in the
column; how much it covers is a question for the frame height.

`verify-mobile-anchors.ts` exempts the panel/minimap pair, the same way it already exempts the
chatbox against the over-scene chat lines.

At 765x503 the arrangement is still exactly contiguous — minimap 4..160, panel 160..421, upper tabs
421..466, lower tabs 466..503 — just in the other order, which is why the baseline check still
passes with only those two entries listed as intended changes.

### The sidebar toggles from its own tab row

No new button, and no new input handling. Every route to a side tab — a tap on the icon via the
minimenu's `doAction`, and the number-key hotkeys via `Client.openTab` — funnels through
`Client.ifButtonX`, so one call there catches them all:

```
tap the tab that is already showing  -> collapse com_82
tap any other tab                    -> switch, and open
```

Two things about it are load-bearing. It runs **before** the op hook, because `MobileLayout.tapTab`
compares the tab being asked for against the one currently showing and the hook is what switches
it. And "currently showing" is read off the `hide` flags of the panels `548:86..99` rather than a
varp — the cache's cs2 owns that switch and those flags are what it writes, so the read cannot
disagree with what is on screen.

**The panel index is NOT the tab index**, and assuming it was is a bug worth not repeating. There
are **14 panels for 13 tabs**: panel 7 belongs to `com_13`, a tab plate with no hook and no sprite —
the Clan Chat slot this build has no tab for. So the seven upper tabs line up 0–6 and every lower
tab is off by one; Friends is tab 7 but panel 8. Comparing the two answered "already showing" for
the _wrong_ tab, so tapping a lower-row tab collapsed the sidebar instead of switching to it — which
from outside read as the lower row not responding to taps at all.

The mapping is therefore **observed, not assumed**: `tapTab` records the component, the hook runs,
and `noteTabShown` remembers which panel actually came up. Both sides of the comparison are then
panel indices. A tab never tapped before simply opens, which is the right answer anyway, and a
different cache self-calibrates instead of needing the off-by-one hardcoded.

`hide` removes a component from the draw pass **and** from hit-testing, which is the point: an
invisible panel that still ate taps would be worse than no toggle. The tab rows themselves are
never hidden — they are the buttons.

The rows no longer move when the panel collapses — they are permanently stacked at the bottom (see
the floating-panel note above), so there is nothing to slide.

### The chatbox toggles from the button bar

The one cluster with nothing on screen that could collapse it, so it gets a `Chat` button, bottom
left under the chat-mode bar it toggles. Two knock-on effects, both handled:

- the five over-scene chat lines (`com_66`–`70`) are lifted 50px in the table to clear the
  chat-mode bar; with the bar hidden that clearance is given back.
- raising the keyboard forces the chatbox **open** (`MobileKeyboard.onOpen`). The overlay lines
  carry what arrives, never the line being composed, so typing with chat collapsed is typing blind.

### The minimap is a circle now, and was not before

The stone surround is one sprite blit (`Client.mapback`) and nothing depends on it: the map circle
and the compass are drawn through masks derived from it **once at boot** (`loadMapback`), not read
off it per frame. So `minimalMap` skips the blit and traces a ring instead.

**But the shape it was tracing was never a circle.** `loadMapback` derives the map mask by scanning
the transparent pixels of the _stone sprite_ — rows 5..155 within cols 25..171 — and then forces
the top-left 35x35 opaque so the compass corner is punched out of it. With the surround drawn over
it that is invisible and correct; with the surround gone it IS the shape, flat bottom edge, bitten
corner and all, and the ring reproduced it faithfully. Nothing was drawing badly: it was drawing
the wrong shape correctly.

`HudSkin.circleMask` now supplies a true circle (r=73 centred at 73,75 — the point `minimapDraw`
already paints the white self-dot at) and `Client.activeMapMask` hands it to all three consumers.
That last part is the reason it is one mask and not three: **`minimapDraw` fills through it,
`drawMinimapRing` traces it, and `minimapLoop` measures clicks against it**, so a circle here is a
circle everywhere with no second geometry to keep in sync. Every dot, hint arrow and destination
flag is clipped by it too, free — `scanlinePlotSprite` masks against the live clip rect.

The compass no longer bites a hole in it, and it does not need to: at r=73 the circle's top-left
arc never reaches the compass's 33x33 corner.

Two things the ring itself got wrong, both fixed:

- **Its ends were open.** The step-fill that closes the outline between rows only runs _between_
  two traced rows, so the first row had nothing above it to join to and the last nothing below —
  and on a circle those are the fastest-changing rows, leaving a gap tens of pixels wide at the top
  and bottom. Both caps are drawn explicitly now.
- **It drew outside the mask**, and the layout welds the map to the frame's right edge, so its
  3-o'clock arc was sliced off by the screen. It draws inward, bounded by the shape itself.

Fixed layout keeps the cache art and the cache mask whatever the setting says: the frame-trim
sprites are authored to butt up against that irregular edge.

### The HUD hit test, and the two bugs it fixes

`MobileLayout.pointOverHud` walks the anchored cluster rects; `Client.pointOverScene` is
"in the viewport **and** not over the HUD". It replaces a bare `Client.viewportX/Y/W/H` test at two
call sites that had the same root cause and looked unrelated:

- `Client.followCamera` — the wheel always zoomed the camera and no scrollbar ever saw a notch.
- `MobileTouch.pointInViewport` — every drag was a camera turn, so no panel could be scroll-dragged.

In the fixed layout the viewport rect answers this on its own, because the cache puts the scene in a
512x334 hole and everything else is HUD by construction. In the resizable layout the scene _is_ the
frame, so the rect says "world" for every pixel including the ones under the bank.

Two details worth keeping: hidden clusters do not match, so a collapsed panel really does hand its
ground back to the world; and `com_64` (the modal slot) only counts when something is loaded into
it, which `Client.stampMobileLayout` publishes as `MobileLayout.modalOpen` — it is a 512x334 layer
parked over the middle of the frame at all times, and counting it unconditionally would turn a large
rectangle of world into dead space.

**There is a third call site and it is the one that bites.** `gameDrawMain` builds the scene's own
menu entries — "Walk here" plus whatever the pick pass found — gated on the pointer being inside the
viewport rect (`Client.ts:3864`). **The 465 cache sets `noClickThrough` on nothing**: the byte does
not exist in if3 (`IfType.decode3`), so no HUD component blocks a click on its own. The fixed layout
never needed one, because the scene sat in a 512x334 hole and a tap on the sidebar was simply
outside it. Resizable made the viewport the whole frame, and the consequences were:

- a tap meant for the inventory, a tab or an open interface **walked the player**, because the
  left-click default is the last entry added and "Walk here" was always there;
- a tap on the **minimap** did both things at once — flagged a minimap destination _and_ walked to
  the world tile behind it, which reads as the minimap being ignored.

Subtracting the HUD there fixes both. Any future "why did my tap fall through to the world" is the
same question: is that rect in `CLUSTERS`?

Cluster `renderX`/`renderY` are treated as absolute frame coordinates. That is only true because the
table pins `com_62`, `com_71` and `com_63` to (0,0) at frame size; a cluster re-hung under anything
offset would need its parent's origin added.

---

## The right-click menu at touch size

The cache's row pitch is 15 **frame** pixels, and a frame pixel is not a fixed amount of glass: the
resizable layout runs a frame _bigger_ than the window (about 1152x531 inside an 852x393 viewport),
so the cache row lands at roughly 11pt against a 44pt touch guideline.

`Client.menuRowPitch` therefore treats the `Menu rows` setting as a target in **CSS** pixels and
divides by the live presentation scale, which holds a row at a constant physical height whatever the
frame is doing. 15 is the floor and the `Cache (15)` preset short-circuits, so desktop is bit-for-bit
unchanged.

The pitch was hardcoded at five sites that had to move together, and they are now all
`Client.menuRowTop(i)` plus a derived offset:

| Site                  | Was                                  | Now                                            |
| --------------------- | ------------------------------------ | ---------------------------------------------- |
| pick (`mouseLoop`)    | `menuY + k * 15 + 31`, band `-13/+3` | `menuRowTop(i)`, band `[top, top + pitch + 1]` |
| touch-assist          | same, centre `-5`                    | `menuRowTop(i) + (pitch >> 1)`                 |
| draw (`drawMinimenu`) | same, baseline `+31`                 | `menuRowTop(i) + pitch - 2`                    |
| clamp (`openMenu`)    | `n * 15 + 21`                        | `n * pitch + 21`                               |
| sizing (`openMenu`)   | `n * 15 + 22`                        | `n * pitch + 22`                               |

`menuRowSize` is **latched by `openMenu`** rather than recomputed per use: `menuRowPitch()` reads the
live scale, and a frame resize between the pick pass and the draw pass would otherwise have the two
disagree about where row 3 is.

The font does not grow with the row — the 465 cache has nothing bigger than `b12` to grow it into —
so the text sits in a taller row rather than scaling.

---

## Verifying a change to the anchor table

The table is the part most likely to be got wrong, and it is checkable without a phone.

**Arithmetic + overlap, offline** — `bun tools/verify-mobile-anchors.ts`. It parses the shipped
`ANCHORS` out of `MobileLayout.ts` (so it cannot drift from the real table), runs the engine's own
`computeComponentSize` / `computeComponentPosition` over the cache rects from `dump-interface.ts
548`, and asserts (a) every non-exempt anchor is identical to the cache at 765x503 and (b) no two
HUD pieces overlap at any frame size, with and without safe-area insets. Both checks earned their
keep: they caught the `com_65`/`com_66-70` parent-box trap and the chat lines running under the
sidebar. **Run it after any edit to the table.**

It parses the table out of the source, so a computed value would be invisible to it — which is the
reason the tab strip's geometry is a module it can `import` and call. Getting that wrong is the
worst failure available to a verifier: it would go on checking numbers the client had stopped
using, and go on reporting OK. `MobileLayout` itself cannot be imported by a tool at all, because
it reaches `IfType`, which touches `window` at module scope; `HudStrip` imports only `HotkeyBar`.

**End-to-end, in a browser, without logging in.** The bundle is an ES module and the interface index
loads at the title screen, so the real code can be driven from the console:

```js
const { Client } = await import('/client/client.js');
const IfType = globalThis.__if; // dev handle, set in IfType.openInterface
IfType.openInterface(548);
Client.state = 30; // ClientMainState.GAME
Client.toplevelinterface = 548; // together these are what mainredraw computes
await new Promise(r => setTimeout(r, 2500));
IfType.list[548][63].renderWidth; // the scene should be the whole frame
```

Restore `Client.state` / `Client.toplevelinterface` afterwards and the surface snaps back.

Note the storage origin: settings live in `localStorage` under `rune465.settings.v2`, and
`http://127.0.0.1:8080` is a **different** origin from `http://localhost:8080`. Test on one and
your own client settings on the other are untouched.

---

## The platform: getting a chromeless landscape screen

**There is no Fullscreen API on iPhone Safari.** `MobileTouch.canFullscreen()` feature-detects
`requestFullscreen` and offers the button wherever it resolves (Android Chrome, iPad); where it does
not, Add to Home Screen is the only route, and that is what the install overlay explains.

The install nudge fires on first run under a capability test, not a UA sniff: _not already
standalone_ **and** _no Fullscreen API_ means Add to Home Screen is the only thing left. It is not
polish — iOS has no install prompt and Safari shows no banner, so the chromeless surface, the wake
lock and settings that survive ITP's 7-day storage eviction are all gated behind a four-tap Share
flow the player has no reason to guess at.

Things that are easy to get wrong here:

- **`initial-scale` must be 1.** It was `0.7`, which contradicts `width=device-width` — WebKit
  resolves that by expanding the layout viewport by 1/0.7, rendering the whole page ~43% zoomed out.
  That is why every DOM button measured ~22pt instead of ~32.
- **`viewport-fit=cover` is load-bearing**, not cosmetic: without it every `env(safe-area-inset-*)`
  resolves to `0px`.
- **In landscape the insets are on the SIDES**, 44–62pt on the notch side, plus 21pt at the bottom
  for the home indicator. Top is ~0. The CSS previously set only top/bottom.
- **Both landscape orientations are allowed**, so the notch can be on either side. The insets are
  measured, not assumed, so the layout follows.
- **The side inset is a dial, not a fact — `Edge margin` (Full / Half / None).** iOS reports a
  horizontal inset on a notched phone in landscape and this client honoured all of it, which on a
  Pro Max holds ~60pt back on **each** side: a visible band of dead screen between the HUD and the
  glass on both edges. Whether that band is really unusable depends on something no API answers —
  which side the cutout is on — and both insets come back non-zero. Guessing wrong does not cost a
  margin, it puts the minimap under the notch, so the user picks, and can see the answer on their
  own screen in one tap. The **bottom** inset is never scaled: that one is the home indicator, and
  an upward flick there sends iOS home instead of pressing the button under your thumb.
  `::insets` prints the frame, the scale, the cell and both inset sets, measured on the device.
- **The canvas and the DOM overlays measure from different origins**, and this one is invisible on
  a desktop, which is why it survived to a phone. In fill mode the frame spans the whole window,
  under the notch included, so frame `x=0` is the physical edge of the glass; the DOM stack is at
  `calc(env(safe-area-inset-left, 0px) + 8px)` and starts from the edge of the SAFE box. Anything
  drawn on the canvas that is meant to sit beside a DOM button — the hotkey column is the only
  thing that does — has to take the same inset, or the 59pt notch side slides one on top of the
  other. `MobileLayout` gets this right for free because `apply()` pads every anchor; `HotkeyBar`
  is outside that pass and takes `HotkeyBar.inset` instead, pushed in beside `scale`.
- **`user-scalable=no` is not the defence** — Safari has ignored it in tabs since iOS 10.
  `touch-action: pan-y` on `<html>` plus `preventDefault` on `gesturestart`/`gesturechange` is what
  actually stops the browser pinch-zooming the page instead of the camera. (`touch-action:
manipulation`, which was there, still permits pinch.)
- **Orientation cannot be locked.** `screen.orientation.lock()` does not exist on iOS in any mode
  and the manifest's `orientation` member is ignored there. Portrait gets a dismissible hint, not a
  block — it is a bad shape, not a broken one, since the sizing formula produces a correct if very
  tall frame.
- **Wake lock is feature-detected, never version-compared**, and re-acquired on `visibilitychange`
  because the lock is dropped whenever the page is hidden.
- **The soft keyboard must not scroll the page.** iOS scrolls whatever it must to bring the
  _focused_ element above the keyboard, and `MobileKeyboard`'s hidden `<input>` used to be
  `position:absolute; bottom:0` — the one place guaranteed to be underneath it, so every focus
  shoved the whole game up by the keyboard's height. Nothing about the client was moving; the
  browser was scrolling the document out from under it. It is now `position:fixed; top:0`, which is
  already visible when the keyboard opens so there is nothing to scroll, plus `focus({preventScroll})`
  and a `pinScroll` that re-asserts `scrollTo(0,0)` over the next few frames for the builds that
  scroll anyway.

### Where the DOM chrome sits

**One column of 44px icon buttons down the left edge**, gear at the bottom:

```
 [ 💬 ]   #mobile-bar — chat toggle, lit while the chatbox is up
 [ ⛶  ]   Fullscreen / Add to Home, only where there is chrome to escape
 [ ⚙  ]   #controlbar
 ~~~~~    the multiway icon, frame (15,15) from this corner
```

There is **no Keyboard button at all**: tapping a text field raises it.

They were split into two far-apart corners before — Chat bottom-left, gear top-right, each next to
the thing it affects — and **both of those corners have since been taken**. Chat moved to the
top-left, so the gear that was parked there ended up drawn on top of the chatbox; and `#mobile-bar`
was still pinned `146px * var(--frame-scale)` off the _bottom_, an offset derived from a chat
cluster that is no longer at the bottom, which left it floating in the middle of the world with
nothing under it. The left edge between the chat cluster and the multiway icon is the one strip of
frame no HUD piece claims, and a single column of matching icons is what the reference layout puts
there.

The two elements are positioned **independently rather than nested**, because `#controlbar` lives
inside `#game` (its settings panel anchors off the frame) and `#mobile-bar` is appended after it.
The gear takes the bottom slot so neither has to know how many buttons the other has:
`--hud-stack-y` is the bottom of the column, `--hud-stack-step` is one slot, and `#mobile-bar`
starts one step up and grows away from it with `flex-direction: column-reverse` — so its first
child, the chat toggle, is the one nearest the gear.

Two things worth not re-learning:

- **An inline style beats the stylesheet, and the same button is styled differently in the two
  layouts.** The bar carried `padding:6px` inline; the fill rule sets `padding:0` and lost, which
  put the stack's buttons exactly 6px to the right of the gear they line up with. Anything the two
  layouts disagree about — padding, direction, fill — has to be CSS. That is also why the lit state
  is a **class** (`hud-on`) rather than an inline background.
- **A duplicate selector further down the file wins on source order.** `body[data-layout='fill']
#controlbar .cb-open` was written twice; the later copy kept the gear on the old 2px bright rim
  after the stack had dropped it.

The icons are **inline SVG stroked in `currentColor`**, not emoji: emoji render as full-colour
stickers where they exist and as tofu where they do not. An icon cannot say what the tap will _do_
the way "Hide chat" did, so the chat button says what is _on screen_ instead — lit when the chatbox
is up, the same convention as the selected tab cell — and keeps the words as `title`/`aria-label`.

The windowed (fitted) layout keeps the flat panel styling and a row under the frame, where the bar
sits on the page rather than on the world.

The settings panel goes `position:fixed` and centres on the **window** in fill mode, opening
downward from the top of the window: anchored to a corner, a 400px panel runs off the edge on any
phone held upright. On a coarse pointer it is additionally pinned to the viewport with `max-height`
cut to the window minus the safe-area insets. The body of the panel (`.cb-body`) is what scrolls —
header and tabs stay put — because `body` has `overflow:hidden` and an absolutely-positioned panel
does not contribute to document height. Without that, a panel taller than the window had no
scrollbar and no page to scroll, so its upper rows were simply unreachable.

**`::layout` in the chatbox toggles fixed/resizable**, and it exists because that was not a
hypothetical: in the fixed layout the gear sits near the bottom, the panel opened upward off the top
of the screen, and the one row that switches back to resizable was the one you could not reach.
`ControlBar.setResizable` is the same call the panel's own control makes, in the same order, so the
two routes cannot leave the stored preference and the live surface disagreeing.

`proxy.ts` serves anything dropped in `public/`, so the manifest and icons needed no new routes. It
now sends `no-cache` + an ETag for static assets instead of a blanket `no-store` — the 1.7 MB bundle
was re-downloaded on every launch. Deliberately **not** a long `immutable`: a standalone home-screen
app has no reload button and no URL bar, so a bad bundle pinned as immutable would be unrecoverable
short of reinstalling. Validated caching gets the same saving and cannot get stuck.

---

## Touch input

The design rule, unchanged: **nothing here reimplements game input.** A gesture is translated into
the mouse or wheel event that already means that thing and dispatched at the canvas — one
implementation of each behaviour, not two. Drag → middle-button drag (camera). Long press →
right press (menu). Pinch → wheel. Drag outside the viewport → wheel notches (scrollbars).

Three bugs fixed in this pass, all worth knowing because they present far from their cause:

1. **`endDrag` must always send the matching `mouseup`.** `onTouchMove` sends the middle-button
   `mousedown` before it knows whether the drag is a camera turn or an interface scroll, so a scroll
   drag presses the middle button too. Returning early for those left
   `ClientMouseListener.middleDown` latched true for the rest of the session — and every later
   `mouseleave` writes `nextMouseX/Y = -1`, which `followCamera` reads as a yaw delta of well over a
   thousand units. Symptom: the camera tears off on some _later_ tap, long after the scroll.
2. **A 2→1 finger lift fires no fresh `touchstart`.** `startX/startY` still held the anchor from
   before the pinch, so the next drag blew past `DRAG_SLOP` immediately and opened a camera drag
   anchored wherever you last tapped. Symptom: the camera snaps to a fixed place after every zoom.
3. **A third finger matched neither branch**, leaving `pinching` latched with a stale distance;
   dropping back to two emitted a burst of zoom notches for travel that never happened.

Also: the pinch now points the mouse at the pinch centre before dispatching the wheel, because
`followCamera` only claims a notch when the tracked position is over the scene — otherwise pinching
after touching the inventory scrolled the inventory.

### Scroll-drag, and where a drag's meaning comes from

Where the finger _starts_ decides what the drag means: over the scene it is a camera turn, over a
HUD panel it is a scroll. That test is `Client.pointOverScene` (above) — it used to be the bare
viewport rect, which said "world" everywhere and made every drag a camera turn.

Scrolling itself reuses the wheel, so there is no per-interface work: for IF1 components
`Client.doScrollbar` scrolls whatever the pointer is over, and for IF3 the `onscrollwheel` hook
fires on the component under the pointer (`Client.ts:11999`, gated on the same
mouse-inside-this-box test). The interface pass runs earlier in the tick than `followCamera`, so
scrollbars get first refusal on a notch and the camera takes what is left.

Drag **up** scrolls **down** — direct manipulation, the opposite sign to a mouse wheel. And the
scroll branch dispatches no further `mousemove`s, so the tracked position stays where the finger
landed, which is what keeps the notches going to the panel it started on.

### Tap a text field to type

What RuneScape's own mobile client does, and the **only** route in — there is no Keyboard button.
`Client.wantsTextInput` owns the list of regions, because there are exactly two:

- **in game**, the chatbox and its mode bar. The chatbox is where the entered line is drawn and
  where the `Enter amount` / `Enter name` dialogs open, so it covers every in-game prompt; the mode
  bar is in purely as a bigger target directly under it.
- **on the login screen**, the username/password band. `TitleScreen`'s own handler selects a field
  on `y` alone (246–261 user, 261–276 pass), so the band here is that pair widened a little —
  tapping slightly off still raises the keyboard and whichever field was selected takes the typing.
  Gated on `loginscreen === 2`, the form specifically, not the title menu behind it.

It is deliberately not prevented, so the synthetic click still goes through and tapping a name in
the chat — or choosing which login field you meant — keeps working. It has to happen in the
`touchend` handler rather than off the synthetic click, because iOS only honours `focus()` inside a
real user gesture and a dispatched click is not one.

**And the tap that opens it will close it again unless you stop it.** `GameShell` gives the canvas
`tabIndex = -1` (`GameShell.ts:90`), which makes it _click-focusable_ — verified: focusing the
canvas moves `document.activeElement` away from the input. So the compatibility mousedown that
follows every tap takes focus off the hidden input a few milliseconds after we asked for it, and
iOS dismisses the keyboard in the same breath it raised it. That is the "keyboard flashes and
vanishes" symptom.

The old Keyboard button never hit this because its own `pointerdown` handler called
`preventDefault()` for precisely this reason — the comment saying so is still the best description
of the bug. Tapping the chatbox has no button to hang that on, so `MobileKeyboard.open` arms a
600ms **focus hold** and two things read it:

1. `MobileTouch.swallowSynthetic` calls `preventDefault()` on a trusted `mousedown` during the
   hold — and **only** `preventDefault`, never `stopPropagation`, so the focus transfer is
   suppressed while the client still receives the click.
2. the input's own `blur` handler re-focuses, up to `HOLD_ATTEMPTS` times, for the WebKit builds
   that assign focus somewhere other than mousedown.

`preventDefault` on mousedown suppressing a focus transfer is verified in this client's own page.
The hold is bounded by time _and_ by attempts so it can never become a loop, and
`MobileKeyboard.close()` drops it before blurring — otherwise a deliberate dismissal would put the
keyboard straight back up.

---

## The icons, and the art pipeline

The cache's fourteen side-tab icons share a 32x36 canvas and agree about nothing else: measured
with `bun tools/dump-sprites.ts --bbox 168 898-910`, their opaque content runs from **19x28 to
31x30 — a 2.3x spread in area — and every one sits at its own offset**, so their centres disagree
too. Combat is a small mark beside a rucksack that nearly fills its cell. That, not the cells
around them, is most of why the strip looked like fourteen unrelated pictures.

Two mechanisms deal with it, and the second replaced the first:

1. **Fitting the cache art** (`HudSkin.fitIcon`). Each sprite is resampled ONCE, with an area
   filter, into a small ARGB buffer that is blitted 1:1 forever after. It has to be an area filter:
   `transScalePlotSprite` is nearest-neighbour, so reducing 31 pixels to 24 does not average, it
   _deletes_ seven rows and seven columns, and on detailed 20-year-old art that reads as damage.
   Everything is fitted to 24px, up as well as down, with a **one-pixel rule** — art already within
   a pixel of the target keeps its own pixels, because correcting 23 to 24 costs sharpness across
   the whole image to gain nothing visible.
2. **Hand-authored replacements** (`design/icons`, baked into `HudArtData`). Authored to the 24px
   box with binary alpha, so they are **never resampled** — only centred. `MobileLayout.tabIconName`
   maps each icon component to its art; a name with no art falls back to the fitted cache sprite,
   which is what makes the set safe to ship half-finished.

`tools/import-art.ts` bakes both the icons and the control glyphs, in two forms because there are
two consumers: icons are decoded to palette-plus-index (the client needs no PNG decoder), glyphs
keep their original PNG bytes for DOM `data:` URIs (the browser is already a decoder). It
**verifies rather than trusts** — 32x32, binary alpha, artwork inside 24px, palette under 256 —
and refuses to write if any of that fails, because each is something the drawing code depends on.

### Authored surfaces are nine-sliced, and the panels deliberately are not

`design/skin` holds the same surfaces as bitmaps. `HudSkin.surface9` blits them at any size —
corners verbatim, edges and middle stretched — because the HUD's containers resize with the frame
and a fixed bitmap of a 496x50 bar can back exactly one of them. The bake stores only the 29x29 a
nine-slice actually reads from, about 1KB per surface instead of 33KB.

The **cells** use it: chips, stack buttons and the open tab's stone are the authored plate, which
is crisper at the edge than the drawn version and carries the same tokens.

The **panels do not**, and that is measured rather than principled. `chatbar_backdrop.png` is flat;
`HudSkin.panel` ramps `SURFACE` to `SURFACE_LOW` down its height, and that ramp is most of the
separation between a panel and the cells sitting on it. Blitted flat, the chips came within a few
levels of their own background — the exact problem that set `CELL` two shades lighter in the first
place. The artist's note that a full-height ramp bands is true of an indexed PNG with four colours
and not of `fillRoundedBlend`, which lerps per scanline. The bitmap cannot carry the gradient, and
the gradient is worth more than the authored lip.

## The chat tabs

`All / Game / Public / Private / Trade`, drawn over the chat-mode bar, filtering the chatbox.

**The filter is an index remap, not a second chatbox.** The cache's chatbox does not own the
history — it asks for it, line by line, through six cs2 opcodes this client implements (`5003`
text, `5004` type, `5010`-`5012` sender, `5017` length), all reading the 100-entry ring
`Client.addChat` maintains. So `ChatFilter` reports a shorter count and maps line `i` to the `i`-th
line that passes; widget 137's hundred scrollback components, their per-line click hooks, their
colouring and their scrollbar all keep working on a shorter list. A filtered-out line resolves past
the `< 100` guard those opcodes already have. **`All` is a true pass-through** — identical
behaviour to having no filter at all.

Switching a tab raises `Client.chatTransmitNum`, which is the same signal `addChat` raises when a
line arrives, so the cache's own `onchattransmit` hook rebuilds the box.

**The chips are five, not OSRS's seven, because this server has no Channel or Clan traffic** —
checked against `server/src/engine/net/handler/`, which implements public chat, private messages,
the friend and ignore lists and the chat-mode settings, and nothing else. Trade is kept for a
planned feature. Their type mappings are recorded in `ChatFilter` anyway, including two that are
not what they look like: **9 is the friends-chat channel and 20 is its quickchat**, neither of them
ordinary public chat, and **10-16 are social requests, not clan chat**.

The four cache mode cells (`548:2/4/6/8`) are **parked under the chips they belong to** rather than
hidden, because the op is on the LAYER and `hide` would take the setting with the art: tapping a
chip's name switches tab, tapping the state under it cycles On/Friends/Off through the cache's own
hook. Report is parked at zero size — this client refuses to send an abuse report at all (no server
handler, and the rev-500 body poisons the stream), so it was a button that could not work.

## The action hotkeys

Five cells along the bottom-left, left of the DOM button stack and clear of the multiway icon.

**They bind actions, not tabs, and that is the whole reason they exist here.** 2.0's hotkeys mostly
open side panels, because on OSRS mobile the stones collapse and a panel is two taps away. Every
tab is permanently on screen in this layout and bound to the number row besides, so a slot that
opened one would be a second button for something already one tap away. Each slot below does
something the strip cannot.

| Slot    | What it does                               | How                                              |
| ------- | ------------------------------------------ | ------------------------------------------------ |
| `RUN`   | toggles run                                | fires `options_tab:com_0`                        |
| `DROP`  | a tap on an inventory item drops it        | promotes the `Drop` verb to the left click       |
| `USE`   | tap one item then another to combine       | promotes `Use`, except while an item is selected |
| `SHIFT` | shift-click promotes Drop and bulk options | `ControlBar.settings.shiftClick`                 |
| `ITEMS` | ground item labels                         | `ControlBar.settings.groundItems`                |

**The run button was found, not guessed.** Interface 261 child 0 is a 40x40 `actionType 4` button
whose cs1 script reads **varp 173** — the run mode — and the server implements
`[if_button,options_tab:com_0]` as `p_run(2)`. `Client.fireIf1Button` is `doAction`'s case 36
lifted out: send `IF_BUTTON` with the packed id, then flip the varp the component reads, which is
the client predicting the toggle rather than waiting a tick to be told. It works with the Options
tab closed because **every side interface is loaded at login** — `~initalltabs` calls `if_settab`
for all of them — so the component exists whether or not you can see it.

**`DROP` and `USE` are one mechanism**, `Client.clickModeOption`: scan the menu for an entry whose
verb matches the armed one and run that instead of the default. It is shift-click without the
shift, sharing the scan so the two cannot disagree about what a bulk option is, and it is checked
first so holding shift while a mode is on cannot fight it. `USE` deliberately stands down while an
item is already selected — at that moment the default entry IS "use the held item on this one", and
promoting `Use` again would re-select the second item and never combine anything.

**The slots are registered by `Client`, not defined in `HotkeyBar`.** A slot is a label, an `on()`
and a `fire()`, and all three need client state; the module owns the geometry, the hit test and the
order, and imports nothing but `HudSkin`. Its rect is also added to `pointOverHud` by hand, because
it is drawn pixels with no component behind it — without that, a tap on a hotkey would fire the
hotkey _and_ walk you to the tile behind it.

**No art yet.** The labels are three to five characters in `p11`. Drawing a boot or a bin at 24px
by hand would look worse than the words; when glyphs exist they drop into `design/glyphs` and the
slot spec grows a name, exactly like the control glyphs did.

## Known follow-ups

- **`design/skin`'s tab-row backdrops and the alternative plate sizes are baked but unused.**
  `tabplate_wide`/`_idle` serve every cell; `tabplate_narrow`, `tabplate_inventory` and the two
  `tabrow_*` backdrops are for the cache's geometry, which this layout no longer uses.
- **The scrollbar, minimap surround, compass and side-panel backing have no authored art yet** —
  all four are drawn procedurally.
- **Touch targets are still cache-sized.** A sidebar tab is ~23x29pt and an inventory slot ~25pt
  against a 44pt guideline. The layout system can move art but not enlarge it — however,
  **hit-testing follows `renderWidth`/`renderHeight`**, so inflated hit rects independent of the
  sprite are mechanically available. That is how OSRS solved it. The right-click menu is done (see
  above); the tab icons and inventory slots are not.
- **`Client.touchInput` over-detects.** `MobileTouch.init` sets it whenever
  `'ontouchstart' in window || maxTouchPoints > 0`, true on any touchscreen Windows laptop, where it
  degrades _mouse_ menu behaviour. Should gate on `(pointer: coarse)`.
- **`MobileKeyboard.injectCode` leaks a held key** — it never injects the bitwise-NOT release, so
  `keyHeld[84]`/`[85]` stick true after the first mobile Enter/Backspace. Harmless until someone
  rebinds a hotkey to Enter.
- **The line numbers quoted in this file have drifted**, and will again. As of this pass the redraw
  gate is `Client.ts:11215` (this file says 11036 above), the hit-test walk `12062`, the layout pass
  `13872-13969`, `transScalePlotSprite` `11467` and the sub-interface hand-off `11210`. Treat every
  `Client.ts:NNNN` in this document as approximate and grep for the symbol instead.
- ~~Chat text stays black.~~ **Done, and the fix had to widen twice.** Black default text was
  remapped to white first; that missed the dark blue cs2 sets for public chat, which is not black
  so a black-only test never saw it. Lifting the component's colour then missed the blue INSIDE
  the line, because a chat line is one component with two colours and only inline `<col=>` markup
  can do that. And keying any of it on widget 137 missed every dialogue — NPC speech, "Click here
  to continue", Enter amount, make-X — because those are separate interfaces opened INTO the
  chatbox, each with its own parchment-era colours. The rule that finally holds is positional:
  `MobileLayout.overChatPanel` asks whether the text lands on the dark panel, and
  `HudSkin.readable` lifts anything below a luminance threshold toward white, hue preserved. It
  catches the next dialogue for free.
- **The alpha tag is write-only.** Nothing reads it back, which is fine today because every blender
  masks the top byte out. A future op that wanted to blend _into_ a translucent panel and keep it
  translucent would need `tranScale` and friends to carry the tag through rather than drop it.
- **The lower tab row sits on the home-indicator strip.** The safe-area inset lifts it clear, but
  only by exactly the inset; iOS can still claim the first touch there for its own edge gesture.
  Worth extra bottom margin if taps near the very bottom feel unreliable.
- **No `visibilitychange` reconnect.** iOS suspends a backgrounded web app and the socket dies; the
  client has a reconnect path but nothing triggers it, so taking a call mid-fight returns you to a
  silently stalled client. This is the most PK-relevant item on the list.
- **Audio unlock is dated.** `src/3rdparty/audio.js` removes its gesture listeners after the first
  one and never calls `audioContext.resume()` inside the handler, which is what modern iOS requires.
- **Full-frame present costs the dirty-rect optimisation** — unavoidable once the scene is
  full-frame. `renderScale = 2` is the lever; a sustained on-device FPS/thermal run has not been done.
