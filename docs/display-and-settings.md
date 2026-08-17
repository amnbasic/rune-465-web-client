# Display and the settings panel

How the client-side settings UI, the two display modes and the 3D render scale fit together.

There are **two** display modes, `Settings → Display → Layout`, persisted like any other
preference:

- **Fixed** — the cache-baseline 765x503 frame, CSS-scaled to fit the window. Desktop default.
- **Resizable** — the frame is sized to the window and pane 548's HUD anchors to its corners.
  Touch default. See **[mobile.md](mobile.md)**, which covers the layout half.

An earlier iteration ported the Java client's FIXED/RESIZABLE modes and a zoom menu, then removed
all of it; see "What used to be here". Resizable is back, but built on a different mechanism —
the engine's own dormant anchoring pass rather than per-frame re-stamping.

## Files

| File | Role |
|---|---|
| `src/client/ControlBar.ts` | Owns every client-side preference, persists them, renders the settings button + tabbed panel. |
| `src/client/ScreenMode.ts` | Owns presentation: canvas sizing, both CSS paths, safe-area measurement, the half-res scene scratch. |
| `src/client/MobileLayout.ts` | Owns the resizable HUD layout — the anchor table for pane 548. |
| `public/index.html` | `#game` (the fullscreen target and the overlay anchor), `#controlbar`, the `[data-layout]` / `[data-smooth]` rules, and all panel CSS. |
| `src/client/Client.ts` | Calls into all three; owns `wasdMode` / `showFpsCounter`; publishes `ScreenMode.gameFrame`. |
| `src/dash3d/Pix3D.ts` | `Pix3D.focal` — the scene-pass projection focal. |
| `src/graphics/PixMap.ts` | `updateImageDataRect` — dirty-rect-only pixel conversion. |

### Module-cycle rule

`ControlBar` and `ScreenMode` import **nothing from `Client`**. `Client` imports both, and hands work
back the other way through callbacks it registers at boot:

- `ControlBar.onWasdChange` → sets `Client.wasdMode`
- `ControlBar.onFpsChange` → sets `Client.showFpsCounter`
- `ScreenMode.onSurfaceChange` → `Client.redrawAllComponents()`
- `ScreenMode.onChange` → `ControlBar.render()` (so pills never show stale state)

`ScreenMode` also never reads client state directly. It no longer needs to: presentation is the same
on the title screen and in the world, so `tick()` takes no arguments.

## The settings panel

One `⚙ Settings` button, absolutely positioned **inside `#game`** rather than under it.

It hangs off the bottom-right corner and the panel opens *upward* over the canvas, so it is on
screen whatever the window height. The fit reserves `ScreenMode.BUTTON_STRIP` for it, so it is never
pushed off the bottom — which is why the placement no longer has to be decided at runtime.

The panel is rendered from the `ControlBar.controls` registry, never hardcoded. A control declares
its `tab` (Display / Camera / Hotkeys) and its `kind`:

- `toggle` — ON/OFF pill
- `choice` — a row of mutually exclusive options, selected one lit
- `keybind` — a keycap that rebinds on click
- `action` — a plain button

Adding a control is one `ControlBar.controls.push({...})`; a new `tab` string creates a new page.

The Display tab also owns the **Draw distance** choice (Near 15 / Normal 25 / Far 35 / Max 45),
which is `World.visibilityRadius` — the tile radius the scene builds around the player. The two
hardcoded far-plane culls that kept the old clients clipped at ~27 tiles live in
`World.testPoint` (the tile visibility map) and `SoftwareModelLit.method87` (the per-model bounding
sphere); both now read `World.farClip`, which `World.setVisibilityRadius` scales as `radius * 140`
(so Normal keeps the cache-baseline 3500). The visibility map buffers are preallocated for
`World.maxVisibilityRadius` (45), so changing the radius only writes scalars. This is landscape
only: players/NPCs appear no farther than the server broadcasts them, whichever preset is active.

### Roofs

`Display → Roofs` (default **ON**, also `::roofs`) is the one control that changes what the *scene*
draws rather than how it is presented. `gameDrawMain` picks a top level for `World.maxLevel`:

- **ON** — the cache behaviour. `Client.roofCheck` (or `roofCheck2` under the cinema camera) walks
  the tiles along the camera→player line and returns `3` (draw every level) unless one of them, or
  the player's own tile, carries the map's roof bit — in which case it clamps to
  `Client.minusedlevel` and the level above disappears. That bit is `settings & 0x4` in the map
  file, decoded into `ClientBuild.mapl` (`ClientBuild.ts:315`); it is well populated in this cache
  (m50_50 Lumbridge alone has 636 roof tiles on level 0), so the automatic removal has real data
  behind it.
- **OFF** — that clamp made unconditional: `level = Client.minusedlevel`, so nothing above the
  player's plane is ever drawn. Roofs never appear, and neither do upper storeys or bridges above
  you — that is inherent to the mechanism, not a bug. It applies under the cinema camera too, so a
  cutscene can't re-roof the world mid-setting.

Like the ground-item rows, it is two halves that must move together: `ControlBar.setRoofs` stores
the preference and repaints the panel, `Client.showRoofs` is what the draw reads. `Client.setRoofsMode`
is the pair — call that, not either half.

Preferences persist to `localStorage` under `rune465.settings.v2`, falling back once to the
superseded `rune465.controlbar.v1` so an existing install keeps its hotkeys. **A bad parse must
never break keyboard input** — everything unexpected falls back to defaults.

## Display: the two modes

### Fixed — fit the window

The engine renders the cache-baseline **765x503** frame — with the 512x334 viewport pane 548
authors it at — and the browser scales that frame to fit the window, preserving aspect
(`applyCssFit`).

It is a pure CSS scale of the backing store, so it costs the engine nothing, and
`ClientMouseListener` already divides by the canvas' bounding rect, so pointer coords follow for
free. `ScreenMode.BUTTON_STRIP` is subtracted from the available height to leave room for the
settings button — fitting to the full window height instead makes the page taller than the window,
and then the whole thing scrolls while you play.

### Resizable — one scale, both axes

The frame is the window divided by a single uniform scale (`applyCssFill`):

```
s = min(1, (winW - insetH) / 765, (winH - insetV) / 503)      w = winW / s      h = winH / s
```

Deriving both axes from one `s` is what keeps the present undistorted — the frame's aspect equals
the window's by construction, so there is no letterbox and no squash.

The two minimums are the **HUD's own footprint**, not sentiment about the cache baseline.
Vertically the right-hand column is minimap 156 + upper tabs 45 + sidebar 261 + lower tabs 37 from
y=4: exactly 503. Horizontally the bottom row is the chat-mode bar 496 plus the lower tab row 269:
exactly 765. Under either, the HUD would overlap itself — so the frame stops shrinking there and
`s` drops below 1 to make up the rest.

The `1` cap stops the frame ever being *smaller* than the window on a big desktop, and a
`MAX_FRAME_PIXELS` cap (1920x1080 worth) stops a 4K monitor asking the software rasterizer for four
times the pixels — past it the browser upscales instead, which costs the engine nothing.

**Safe-area insets come out of the window before that division**, and this is load-bearing. The HUD
needs 503 rows it is *allowed to draw on*; if 21pt at the bottom belong to the home indicator then
the frame must be taller than 503 for 503 of it to be usable. Fitting to the raw window instead
packs the right-hand column into exactly 503 rows and then pushes the bottom-anchored part of it up
by the inset — straight into the top-anchored minimap, which does not move. The frame itself is
still the whole window; only the HUD is held inside the safe box.

### Two gates, and why they are separate

`resizable` is the persisted preference. **`ScreenMode.gameFrame`** is written by `Client` every
frame and must also be true. `TitleScreen` draws its background by striding a hardcoded 765
(`TitleScreen.ts:469, 548, 556`), so a wider frame shears the login art into diagonal bands — the
title and login screens keep the fixed frame however the setting is left. `Client.stampMobileLayout`
passes `resizable && gameFrame` too, so the layout and the surface can never disagree.

The gate is `toplevelinterface === 548` specifically, **not** `Client.inGamePane()`: that also
admits 549, the welcome screen, which is a single fixed 765x503 pane and would sit in the corner of
an enlarged frame. So the surface grows at one natural moment — when the player clicks through to
the world.

### Presentation details

`applyCssFit` / `applyCssFill` memoise on their inputs, so the per-frame `tick()` only writes styles
on a real change instead of thrashing layout. The fill memo keys on the backing store as well as the
window, because the store settles a beat after the window does.

`ScreenMode` publishes two attributes on `<body>` for CSS to react to, rather than making layout
decisions itself:

- **`data-layout`** = `fit` | `fill` — which path actually ran (not the preference; those differ on
  the title screen). `fill` strips the page's centring and gutters and floats the DOM chrome inside
  the safe area, because there is no strip below the frame to park it in any more.
- **`data-smooth`** = `on` | `off` — `on` whenever the presentation is a **downscale**.
  `image-rendering: pixelated` is nearest-neighbour: right when blowing the frame up, destructive
  when shrinking it, because it does not average, it deletes. A phone presenting a 765-wide frame
  at 0.7 throws away roughly three rows in ten of every glyph in a 12px font.

### Resize settling

A rotation, or a dragged desktop window edge, emits a burst of intermediate sizes, and each distinct
one would reallocate the master `PixMap`. So the **backing store** only follows once a size has held
still for `RESIZE_SETTLE_MS` (150); the **CSS** follows immediately. The interim is a momentarily
stretched frame rather than a black one, and pointer mapping is unaffected either way.

### What used to be here

An earlier **RESIZABLE** mode grew the backing store to the window, re-stamped pane 548's child
geometry every frame to re-anchor the HUD around a full-window viewport, and drove a
constant-vertical-FOV `sceneFocal` so a wide window widened the view instead of fish-eyeing. There
were also `Fixed`, `Zoom 1.5x` and `Zoom 2x` presets alongside `Zoom to fit`.

The mode is back, but **none of this machinery is**. The difference is the mechanism: `applyLayout`
computed every child's position itself and had to classify each one as a pane-root delta or a
viewport delta by hand, which is where it went wrong. `MobileLayout` writes alignment codes instead
and lets the engine's own layout pass do the arithmetic, so a child is anchored against its real
parent automatically and the classification cannot be got wrong. Read
**[mobile.md](mobile.md)** before touching that.

The zoom presets are still gone for good — there is one uniform scale now, derived, with nothing to
choose. What was removed:

| Removed | What it did |
|---|---|
| `SCREEN_PRESETS`, `settings.screen` | the preset menu |
| `ScreenMode.mode` / `FIXED` / `RESIZABLE` / `requestMode` | mode state |
| `zoom` / `ZOOM_FIT` / `requestZoom` / `preferredW/H` / `SIZE_FIT` | zoom + requested size |
| `applyLayout` + `PARKED` / `OVERLAID` / `TOUCHED` / `base` / `restore` / `shift` / `park` / `centre` / `size` / `rect` / `reparent` | the hand-rolled pane-548 relayout — replaced by `MobileLayout`'s anchor table |
| `sceneFocal`, `viewportWidth/Height`, `minimapX` | derived viewport state — the viewport's size now comes off `com_63.renderWidth/Height`, which the layout pass maintains |
| `cursorOverHud` | wheel-zoom HUD exclusion. **Still missing, and now it matters**: `Client.followCamera` gates the wheel on `Client.viewportX/Y/W/H`, which in resizable mode is the whole frame — so the wheel is always camera zoom and `doScrollbar` never sees a notch. Same root cause as `MobileTouch.pointInViewport` (see mobile.md's follow-ups). |
| `canvasFillsWindow` + the `cb-overlay` placement | settings-button repositioning — now the `[data-layout='fill']` CSS rules |
| `pending` / `prevInGame` queueing | replaced by `ScreenMode.gameFrame` plus the resize settle |

### `Pix3D.focal` survives — it is load-bearing for half res

`Pix3D.focal` was introduced for the constant-vertical-FOV work, but it **cannot** go back to the
baked `<< 9` while the half-res render exists. Half res rasters into a half-size scratch buffer; if
the projection stayed at 512 the scene would be a **2x zoomed centre crop**, not the same view at
lower detail. So the scene bracket in `gameDrawMain` sets:

```
Pix3D.focal = Math.max(1, (512 / sceneScale) | 0);   // 512 or 256
```

and restores 512 straight after. It therefore only ever holds 512 or 256, and only for the duration
of the scene pass. The `<< 9` sites in `World.ts` and `SoftwareModelLit.ts` stay on `* Pix3D.focal`,
and the two texture mappers keep their `512/focal` step-term rescale, for the same reason.

> **Everything else must project at 512.** The interface/item-icon model paths
> (`SoftwareModelLit.objRender`, `method193` — called from the interface draw and `ObjType`) keep a
> literal `<< 9` on purpose. They render models at a *specified* scale, not through the camera; make
> them follow `focal` and every item icon draws scaled.
>
> `Client.getOverlayPos` (overhead names/chat, hitsplats, hint arrows) also keeps the literal
> `<< 9`. It projects into **frame** pixels, and the half-res scratch is upscaled by the same factor
> the focal was divided by — the two cancel, leaving an effective focal of 512.

## Frame-boundary discipline

`ScreenMode.tick()` runs at the top of `mainredraw`, before anything has drawn.

It lives in `mainredraw` and **not** `gameDraw` because the title and login screens never reach
`gameDraw`, and they are presented exactly the same way as the world. There is no longer any
state-dependent branch: the backing store is the cache baseline in every state, so nothing has to be
forced back on the way to the title screen and there is no queued surface change to apply at a frame
boundary.

## Performance

This is a software rasterizer: cost scales with **pixel count**. Because the frame is always the
765x503 baseline and only the CSS presentation grows, window size costs the engine nothing — the one
real lever left is the render scale.

- **3D detail: half res** (`ScreenMode.renderScale = 2`; the default is **full**) renders the scene
  at a quarter of the pixels and upscales. HUD and overlays stay full-res.
  - *Software:* rasters into a half-size scratch buffer (`bindSceneBuffer`) and nearest-neighbour
    upscales it (`blitSceneBuffer`). Picking coords auto-map through `Pix3D.minX/maxX`.
  - *GPU:* `sceneScale` stays 1 — the vertices handed to GL are full-res viewport-local pixels.
    `GlRenderer.scale` shrinks the **glcanvas backing store** instead and divides `gl.viewport` /
    `gl.scissor` to match, while the layer keeps *presenting* at the frame's CSS size. Nothing in
    the submission path knows about it.
  - `GlRenderer.resize` must **never** write the CSS size — `applyCss` owns presentation. Writing it
    there clobbered the fit the moment the scale changed, and since `applyCss` memoises on the
    window size (unchanged), nothing restored it. `setRenderScale` invalidates that memo and
    re-stamps the CSS itself.
- **`PixMap.updateImageDataRect`.** `draw2` used to convert the *entire* frame buffer per call — a
  cost scaling with surface size, not rect size, which mattered when the backing store could grow.
  It now converts only the dirty rect.

The real fix for large viewports is the GPU renderer (`GlRenderer.ts`, "face soup" WebGL with
textures), now ported. It slots into the same `sceneScale` bracket in `gameDrawMain`, hooks
`Pix3D.gouraudTriangle` / `flatTriangle` / both texture mappers, and needs the `GL_TRANSPARENT`
alpha sentinel in `PixMap` plus the `<glcanvas>` layer under the 2D canvas.

**Alpha rule (both backends).** `Pix3D.trans` applies to `gouraudTriangle` / `flatTriangle` only.
The textured mappers never read it — a textured face is opaque, and its see-through parts come from
the texture's colour key (texel `0` on a non-`isOpaque` texture, which the shader `discard`s and the
software span walk skips). The GPU path has to opt out of `trans` explicitly in
`Pix3D.glTexturedFace`; it once passed face alpha through, which drew tree canopies translucent, and
with painter's order and no depth buffer the overlapping leaf quads blended into each other so every
triangle outline showed through the tree. Software had the mirror-image bug — a `trans > 10` bail to
the average-colour fallback — which flat-filled the same faces as solid triangles.

**U clamps, V wraps.** The two texture axes are not symmetric. The software mapper packs
`(u << 18) + v` and indexes `texels[(w & 0x3f80) + (w >>> 25)]`, so V's bits 7..13 pick the row and
**wrap** mod 128, while U is clamped to `[0, 16256]` at both span endpoints and its column
**saturates** at 127. The GPU shader has to do the same — `fract()` on U wrapped it, and since a
triangle edge puts U a hair past 1.0, every textured face got outlined with a one-pixel line of the
texture's opposite edge. In a tree canopy that reads as the whole triangle mesh drawn in outline.
`16256/16384 = 0.9921875` is the clamp, and it lands exactly on column 127 of the atlas slot.

## Build

```
bun x tsc -p ./ --noEmit
bun run build:dev
cp out/client.js public/client/client.js        # never hand-edit the bundle
```
