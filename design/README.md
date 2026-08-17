# 465 UI art pass

Three things: the fourteen tab icons normalised, three left-edge control glyphs to replace
the inline SVGs, and a mobile skin for the five surfaces the HUD draws over.

Everything is PNG-32 on transparency. Filenames and pixel dimensions match the dumper's
output exactly, so the converter can point at these folders instead of `_src/`.

```
icons/    14 x 32x32   normalised tab icons
glyphs/    3 x 32x32   ui_chat, ui_settings, ui_fullscreen
skin/      9 surfaces  tab rows, chat bar, tab plates (+ idle faces) + skin.json
review/    4 renders   contact sheets on both grounds, skin before/after, mobile mockup
tools/     5 scripts   how each file was made, and the checks it had to pass
```

## icons/

Normalisation, not a redesign. Subject, silhouette, colours and pixel-art style are the
artist's; what changed is size, placement and the outline.

- 32x32 canvas, artwork centred, 22-24px on its longest side
- one closed 1px `#1a1712` outline around each silhouette
- alpha is 0 or 255 everywhere, no anti-aliased edges
- no colour appears that is not in that icon's own source palette, plus the outline tone

Two decisions worth flagging.

**The 22-24 range rather than a flat 24.** At a flat 24 the rucksack and the door carried
half again the ink of the harp and the wrench, so the row read as two sizes. Ink is
measured, the median is taken, and anything more than 15% over it comes down a pixel (23)
or two (22). Thin icons keep the full 24. Six ended up at 23; the rest are 24.

**The rim is recoloured, not stripped.** The first pass removed the authored dark rim and
drew a fresh ring on what was left. That is destructive and it showed: the cache's rim is
1px along the top-left and 2-3px along the bottom-right, so a shallow strip left dark tabs
poking out of every circle and a deep one walked into the emotes figure's hair and the
skills chart's axis and came back with a headless dancer. What ships instead recolours
every boundary pixel that is already dark and adds a ring pixel only where the boundary is
bare artwork. Nothing is removed, the line is 1px and closed everywhere, and the drop
shadow the cache draws on the lower right of all fourteen survives untouched.

`tools/verify.py` checks all of the above per file, plus that nothing on an icon falls
under 3:1 contrast against either `#3b342c` or `#8c3a33`. All fourteen pass.

## glyphs/

Replacements for `ICON_CHAT` / `ICON_FULLSCREEN` and the gear in `MobileTouch.ts`. Same
32x32 canvas, same 24px artwork box, same outline rule as the icons -- `glyphs.py` imports
`unify_rim` from `normalise.py` rather than reimplementing it, so they cannot drift apart.

They are flat-on and three-tone rather than full-colour objects in three-quarter
perspective. A control affordance drawn like an inventory sprite reads as clutter, and the
existing SVGs were right to be one flat colour so they stay legible on both the stone panel
and the red active cell. The three tones are `HudSkin.TEXT`, the most common pixel in
`chatbox_parchment.png`, and the most common pixel in `trim_top.png`.

The three are within 5 ink pixels of each other, which took punching two text lines out of
the speech balloon and taking the bracket arms from 3px to 4px.

## skin/

The five surfaces, at their authored sizes: two tab-row backdrops, the chat bar, and the
three tab plates.

Every colour is a `HudSkin.ts` token, and `skin.py` holds the only copy of them outside
that file. `HudSkin` opens by saying every drift this HUD has suffered was a constant
living next to its draw site; a PNG cannot read a custom property, so hand-picked art would
have become a sixth owner of the palette. Change `HudSkin`, rerun `skin.py`, the art
follows.

The tab plates keep their filenames and stay red, since that dark red is where the selected
-tab colour comes from. `*_idle.png` is new: the cache has no idle plate because the stone
frame showed through, and a mobile row needs a visible cell in both states or the untapped
tabs read as holes.

Panels are flat with a lit 2px lip, a shadowed 2px foot and a 1px hairline one shade
lighter than the fill. A ramp across the full height was the first attempt and it banded --
on a 496x50 bar four steps are three visible stripes.

## Not done

- The scrollbar six-piece. Say the word and it is the same afternoon's work.
- `minimap_surround`, `compass`, `sidepanel_backing`, the nine `trim_*` pieces.
- The mockup is a layout sketch, not a screenshot. It places the left-edge stack at the
  44px cell and 52px pitch `index.html` specifies, but nothing here has been run in the
  client.
