# Bundled font

`unsciiCJKV18.otf` — the bitmap face this skin renders text in.

## Why it is bundled

The skin originally loaded the face from the machine's own font directory through
a host route. On any other machine that route found nothing, the browser fell back
to a system font, and the skin no longer looked the way it does on the author's
screen. Shipping the file inside the package is what makes every installation
render identically: the `@font-face` in `client.js` names no `local()` source, so
the machine's own copy can never take precedence.

The host half (`index.js`) serves the file from this directory at
`/api/dsh-skin-win2000/fonts/unsciiCJKV18.otf`, which is the only URL the
stylesheet requests.

## Size

6.37 MB (6,681,680 bytes). It is served with `cache-control: public, max-age=604800,
immutable`, so a browser downloads it once per week at most, and `font-display: swap`
keeps text visible while it arrives.

## Licence

The face is a CJK extension of **unscii**, the bitmap font family by Viznut.
unscii is public domain, and Viznut's own page states it plainly:

> "unscii-16-full" falls under GPL because of how Unifont is licensed; **the other
> variants are in the Public Domain.** Unscii was created by Viznut.
> — <http://viznut.fi/unscii/>

A public-domain work may be used, modified and redistributed without permission, so
this package redistributes the face on that basis. The Latin, symbol and box-drawing
glyphs come from that public-domain family; the CJK coverage is the extension layer
added on top of it.

One caveat worth recording, because it is the only loose end: the download list on
Viznut's page covers `unscii-8`, `unscii-16` and their style variants, and publishes
no `unsciiCJK` build itself — the CJK layer was added by someone else, and that
layer's own terms are not stated anywhere we could find. It carries no Copyright,
License or License URL record in its `name` table either. If you are the author of
that layer and want it handled differently, open an issue on
<https://github.com/lildanger/dsh-skin-win2000/issues> and it will be dropped from
the package — the skin still works, it just falls back to whatever the machine has.

## Removing or replacing it

- **Remove:** delete this directory and the `@font-face` block in `client.js`, then
  also delete the pixel-font rule that follows it. The skin then renders in the
  user's own configured font.
- **Replace:** drop another face in here under the same file name and change the
  `font-family` in the `@font-face` block and in the pixel-font rule to match.
