# Bundled font

`unsciiCJKV18.woff2` — the bitmap face this skin renders text in.

## Why it is bundled

The skin originally loaded the face from the machine's own font directory through
a host route. On any other machine that route found nothing, the browser fell back
to a system font, and the skin no longer looked the way it does on the author's
screen. Shipping the file inside the package is what makes every installation
render identically: the `@font-face` in `client.js` names no `local()` source first,
so the bundled copy is what everyone gets.

The host half (`index.js`) serves the file from this directory at
`/api/dsh-skin-win2000/fonts/unsciiCJKV18.woff2`, which is the only URL the
stylesheet requests.

## Format and size

WOFF2, 1.42 MB (1,485,532 bytes) — down from the 6.37 MB OTF it was converted from
with `fontTools.ttLib.woff2` (Brotli, lossless). Verified identical before the
swap: 64,589 glyphs both sides, 65,824 mapped characters both sides, and seven
sampled outlines (Latin, CJK, kana, box drawing, emoji) matched point for point.

Served with `cache-control: public, max-age=604800, immutable`, so a browser
downloads it once per week at most, and `font-display: swap` keeps text visible
while it arrives.

The `.otf` source has been **deleted from the working tree**; the WOFF2 is the only
copy that ships. It can be regenerated if ever needed — the unconverted face is
still installed on the author's machine at
`%LOCALAPPDATA%\Microsoft\Windows\Fonts\unsciiCJKV18.otf` (and in `C:\Windows\Fonts`),
and the upstream face `unscii-16-full.woff` (2.36 MB) is kept outside the repository.
Deleting the OTF is why this directory went from 7.79 MB to 1.44 MB.

## Licence — GPL, because of Unifont

The face is a CJK extension of **`unscii-16-full`**, the Unifont-merged variant of
Viznut's bitmap font family. That variant is **not** public domain; Viznut's page
says so directly:

> "unscii-16-full" falls under GPL because of how Unifont is licensed; **the other
> variants are in the Public Domain.**
> — <http://viznut.fi/unscii/>

The derivation is recorded in the font's own `name` table:

```
Family    unsciiCJKV18
UniqueID  unsciiCJKV18; unscii-16-full, CJK width 72 units
```

and the character sets agree: all 64,315 mapped characters of `unscii-16-full` are
present here, plus 1,509 of its own.

So this bundled font is **GPL**. `COPYING` in this directory carries the licence
text. Anyone redistributing it should keep that file alongside and note that the
CJK layer is a modification of `unscii-16-full`.

**The skin itself stays MIT.** The font is data the stylesheet references by URL,
not code linked into the plugin.

## Removing or replacing it

- **Remove:** delete this directory's font file and the `@font-face` block plus the
  pixel-font rule in `client.js`. The skin then renders in the user's own font.
- **Replace:** drop another face in here, change the file name in the `@font-face`
  URL, and update the `font-family` in both that block and the pixel-font rule.
