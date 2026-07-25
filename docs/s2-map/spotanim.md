# S2 map: `spotanim` (graphic / SpotType) — LC500 → 465 cache

Goal: make the Lost City 500 web-client fetch + decode **spotanim** (graphic) configs from the
465 cache that `js5-update-server.ts` serves, instead of from its native Lost City
split-per-type archive.

All findings below are **probe-verified against the live server** (127.0.0.1:43594,
JS5 handshake v464) and traced to file:line in all three sources. No guesses.

---

## (a) 465 cache addressing for spotanim — as the server actually serves it

| property | value | evidence |
|---|---|---|
| index (idx) | **2** (the config archive) | ref-table `255:2` served, probe OK |
| group | **13** | 464 fetch path (below) + live decode |
| file | **spotanim id**, flat — one file per spotanim (file id == spotanim id) | live decode below |
| files in group 13 | **1181** | probe: `group 13 -> 1181 children` |
| remapped? | **No.** `CONFIG_GROUP_REMAP` only remaps client-group 9←cache 6 (loc) and 7←9 (npc). Group 13 is identity / served raw. | `server/src/server/update/js5-update-server.ts:195-198` |
| master index | lists **16 archives (0-15) only** — there is **no** archive 16-26 served | probe: `master len=128 → 16 archives` |

Live idx2 group map (probe, `protocol=6 flags=0 archiveCount=24`):

```
group 6  -> 26208   (loc)
group 9  -> 26208   (npc, post-remap metadata)
group 10 -> 11736   (obj)
group 12 -> 6953    (seq)
group 13 -> 1181    (spotanim)   <-- target
group 16 -> 1053    (varp)
2:13 container = gzip → 20651 B decompressed (all 1181 files, strip-packed, stripes=1)
```

**Cross-check from the 464 Java client's own fetch path** (this is the client the server was
built to feed, so its addressing == the cache's real layout):

- `SceneBuilder.method593(magic, spotId)` → `Class1.aClass19_80.method746(13, key, spotId)`
  — `client/src/SceneBuilder.java:42`
- `Class1.aClass19_80` is the **config archive** (idx2): set by
  `TileModel.method645(_, config, models)` — `client/src/TileModel.java:246-249` — whose `config`
  arg is `Class4_Sub1.aClass19_Sub1_1863`, the single config archive also fed to the loc / npc /
  idk / seq decoders — `client/src/Class4_Sub14.java:270`.
- `Class19.method746(arg0=group, arg1=key, arg2=file)` → `method758(null, group, false, file)`
  — `client/src/Class19.java:399-404` (compare `method740`:`method746(group, key, 0)` vs
  `method746(0, key, file)` fixes the arg order).
- ⇒ group **13**, file **spotId**, no `id>>8` / `id&0xff` split. Flat one-file-per-spotanim.

**Live decode confirmation** (unpacked group 2:13, split by the strip trailer into 1181 files):

```
spotanim #0 : 01 0bc7  02 0055  00                      → {model 3015, anim 85}
spotanim #1 : 01 448d  02 0056  00                      → {model 17549, anim 86}
spotanim #9 : 01 0c40  28 0039  32 0021  29 003d  33 0021  00
              → {model 3136, recol_s[0]=57 recol_d[0]=33, recol_s[1]=61 recol_d[1]=33}
```

Files are sequential (file N == spotanim N). Every entry starts with opcode `1` (model). The
recolour opcodes are **per-index** (`0x28`=40 → src[0], `0x32`=50 → dst[0], `0x29`=41 → src[1],
`0x33`=51 → dst[1]) with a bare `u16` each — **not** a count+pairs block. This is decisive for
section (d).

Opcode histogram across all 1181 served spotanims (464-semantics length walker):

```
1:1181  2:1100  4:79  5:75  6:16  7:401  8:247
40:390 41:239 42:194 43:108 44:63 45:22        (recol source, indices 0..5)
50:390 51:239 52:194 53:108 54:63 55:22        (recol dest,   indices 0..5)
```

Only opcodes `{1,2,4,5,6,7,8, 40-45, 50-55}` occur. **No** opcode 9, **no** opcode 41-as-retex,
**no** retexture, **no** count-prefixed recolour anywhere. Max 6 recolour slots (matches the
464 decoder's `new short[6]` arrays).

---

## (b) How LC500 fetches spotanim now (the Lost City split-per-type layout)

- `SpotType.configClient` is set by `SpotType.init(models, config)`
  — `web-client/src/config/SpotType.ts:41-44`.
- Caller passes **archive 21**: `SpotType.init(models, configSpot)` where
  `configSpot = Client.configSpot = this.openJs5(21, …)`
  — `Client.ts:1005` (open), `Client.ts:1171` (bind local), `Client.ts:1207` (call).
- Lookup `SpotType.list` — `SpotType.ts:60`:
  ```ts
  const data = SpotType.configClient.getFile(SpotType.getGroupId(id), SpotType.getFileId(id));
  ```
  - `getGroupId(id) = id & 0xff`  — `SpotType.ts:46-48`
  - `getFileId(id)  = id >>> 8`   — `SpotType.ts:50-52`

- **Gotcha (parameter order):** `Js5.getFile` is declared `getFile(file, group)` and does
  `return this.fetchFile(null, group, file)` — `web-client/src/js5/Js5.ts:192, 223`. So the
  **first** positional arg is the *file* and the **second** is the *group*. Passing
  `getFile(getGroupId(id)=id&0xff, getFileId(id)=id>>8)` therefore means
  **file = `id & 0xff`, group = `id >>> 8`** in **archive 21** — the OSRS split-per-256 layout.
  (The helper names read backwards vs. what they feed.)

- **Net effect against this server: broken.** Archive 21 is **not in the master index**
  (only 0-15 exist), so the `Js5Loader` for archive 21 never gets a ref-table, `getFile`
  returns `null`, and **every** `SpotType` decodes to the empty default (`model=0`). Spotanims
  are silently absent today.

- No `numDefinitions` / count field on `SpotType` (unlike `ObjType`); lookups are on-demand via
  the `recentUse` LRU. So only the archive source + addressing + decoder need to change.

---

## (c) s2Redirect — concrete edit to read idx2 / group 13 / file=spotId

Three coordinated edits.

**1. clientConfig source** — `web-client/src/client/Client.ts:1207`
(`configs` == `Client.configs` == `openJs5(2)` == idx2, already bound locally at `Client.ts:1159`
and full-downloaded at `Client.ts:1176`; `models` bound at `Client.ts:1160`):

```ts
// FROM
SpotType.init(models, configSpot);
// TO
SpotType.init(models, configs);
```

**2. getGroupId / getFileId** — `web-client/src/config/SpotType.ts:46-52`.
Because `Js5.getFile(file, group)` takes **(file, group)** and `list()` calls
`getFile(getGroupId(id), getFileId(id))`, the helper feeding the *first* arg must return the
**file** (the spotanim id) and the one feeding the *second* arg must return the **group** (13):

```ts
static getGroupId(id: number): number {
    return id;   // FILE within config group 13 (flat, one file per spotanim)
}

static getFileId(_id: number): number {
    return 13;   // idx2 config GROUP for spotanims
}
```

> Do **not** intuit-swap these. `getFile`'s positional order is `(file, group)`, so
> `getGroupId` → file and `getFileId` → group. The net `fetchFile(null, 13, id)` is what
> matches the 464 client's `method746(13, key, spotId)`. (Same inversion documented in `obj.md`.)

**3. decoder recolour format** — see (d); required, not optional.

---

## (d) s3FormatDelta — 464 Java decode vs LC500 decode

Sources:
- **464 Java:** `SpotAnimType.method365(flag, StreamBuffer, opcode)` (payload) +
  `method369` (driver loop `while get()!=0`) — `client/src/SpotAnimType.java:234-281`.
- **LC500:** `SpotType.decodeInner(code, buf)` — `web-client/src/config/SpotType.ts:84-118`.

### Shared scalar opcodes — identical field + payload (verified via constructor defaults + `getTempModel2`/`method371`)

| opcode | 464 field (default) | LC500 field (default) | payload | match |
|---|---|---|---|---|
| 1 | `anInt2930` model | `model` (0) | u16 | ✓ |
| 2 | `anInt2909` anim (-1) | `anim` (-1) | u16 | ✓ |
| 4 | `anInt2901` resizeh (128) | `resizeh` (128) | u16 | ✓ |
| 5 | `anInt2898` resizev (128) | `resizev` (128) | u16 | ✓ |
| 6 | `anInt2913` angle (0) | `angle` (0) | u16 | ✓ |
| 7 | `anInt2912` ambient | `ambient` (0) | u8 | ✓ |
| 8 | `anInt2926` contrast | `contrast` (0) | u8 | ✓ |

(464 `method371`: `light(64+ambient, 850+contrast, …)`, `resize(resizeh, resizev, resizeh)`,
rotate 90/180/270 → these match LC500 `getTempModel2` line-for-line at `SpotType.ts:141,152-165`.)

### DIVERGENT — the recolour encoding (this is the real delta)

| | 464 Java (== the served 465 bytes) | LC500 current |
|---|---|---|
| recol source | opcodes **40-45**, one bare `u16` each → `recol_s[op-40]` | opcode **40** = `[count u8][count×(src u16,dst u16)]` |
| recol dest | opcodes **50-55**, one bare `u16` each → `recol_d[op-50]` | (folded into opcode 40 pairs) |
| retexture | **absent** | opcode **41** = `[count u8][count×pairs]` |
| count byte | **none** | present on 40 and 41 |
| array size | `short[6]` (`SpotAnimType.java:230-231`) | dynamic |

- 464 payload driver: `SpotAnimType.method365` — `client/src/SpotAnimType.java:246-253`.
  De-obfuscated (`x^0xffffffff == ~x`): `40 ≤ op ≤ 49` → `aShortArray2910[op-40] = g2()` (src);
  `50 ≤ op ≤ 59` → `aShortArray2925[op-50] = g2()` (dst). No count. Applied in `method371`
  (`client/src/SpotAnimType.java:293-297`) as `recolour(src[i], dst[i])` over 6 slots.
- LC500 count+pairs: `SpotType.ts:101-116`.

**Failure if left unfixed:** feed spotanim #9 (`01 0c40 28 0039 32 0021 29 003d 33 0021 00`) to the
current LC500 decoder → op1 model=3136 OK, then op40 reads `count = 0x00` (the high byte of src
`0x0039`) → 0 pairs, then the stream desyncs onto bytes `39 00 21 …` which LC500 treats as unknown
opcodes 57/50/33 (no branch → no read) until it lands on a `0x00` and stops. Result: **model
survives, all recolours are silently dropped, spotanim renders in the wrong colours.** Not a crash
(each file is decoded in isolation), but visually wrong. Also note op **41** is *retexture* in
LC500 but is *recol source index 1* in the 465 cache — a direct semantic collision, exercised by
239 of the 1181 served spotanims.

### Fix — replace `SpotType.ts:101-117` with the 464 per-index form

```ts
} else if (code >= 40 && code <= 45) {
    if (this.recol_s === null) { this.recol_s = new Int16Array(6); this.recol_d = new Int16Array(6); }
    this.recol_s[code - 40] = buf.g2();
} else if (code >= 50 && code <= 55) {
    if (this.recol_d === null) { this.recol_s = new Int16Array(6); this.recol_d = new Int16Array(6); }
    this.recol_d[code - 50] = buf.g2();
}
```

`getTempModel2` needs **no** change: its `for (i < recol_s.length) recolour(recol_s[i], recol_d[i])`
loop (`SpotType.ts:129-133`) already matches 464 `method371` (unused slots are (0,0) → no-op
recolour, exactly as 464). Opcode **9** (hillskew, `SpotType.ts:99-100`) and opcode **41**
(retexture) are dead for this cache — the 464 era has neither and the histogram confirms zero
occurrences — so they can be left in place harmlessly *once op41 is reclaimed by the `40-45`
branch above* (the `40-45` / `50-55` branches must precede any surviving `code === 41` check, or
just delete the old `41` retex branch). The retex fields (`retex_s/retex_d`) then stay `null`,
which `getTempModel2` already guards.

### Verdict

`s3FormatDelta`: **one divergent group** — the recolour/retexture encoding (464 per-index 40-45 /
50-55 vs LC500 count-prefixed 40 + retex 41). All 7 scalar opcodes are byte-identical. The decoder
edit above is **required** alongside the section-(c) addressing redirect for correct rendering.

---

## Repro

```
cd web-client
bun run tools/js5-probe.ts 464     # handshake + 255:255 master + 255:2 ref table
# scratch scripts used for this doc (in the session scratchpad):
#   js5-probe2.ts  -> decode idx2 ref-table (group childCounts), fetch 2:13 container
#   js5-probe3.ts  -> unpack group 13 into 1181 files, opcode histogram, dump recol entry
#   master probe   -> bun -e inline: 255:255 → 16 archives (0-15); archive 21 absent
```
