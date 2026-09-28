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

## Licence status — read before redistributing

The face is a CJK extension of **unscii**, the bitmap font family by Viznut.
Two facts matter here:

- The upstream `viznut/unscii` repository declares **no licence** in its GitHub
  metadata, and this file's own `name` table carries **no Copyright, License or
  License URL record**.
- This particular `unsciiCJKV18` build is a derivative with CJK coverage; a search
  for its origin returns no upstream project or stated terms.

In other words: **the redistribution terms are not documented anywhere we could
find.** unscii is widely treated as public domain by its users, and this package
follows that reading, but that is a reading, not a licence grant.

If you are the rights holder and want this file removed, open an issue on
<https://github.com/lildanger/dsh-skin-win2000/issues> and it will be dropped from
the package — the skin still works, it just falls back to whatever the machine has.

## Removing or replacing it

- **Remove:** delete this directory and the `@font-face` block in `client.js`, then
  also delete the pixel-font rule that follows it. The skin then renders in the
  user's own configured font.
- **Replace:** drop another face in here under the same file name and change the
  `font-family` in the `@font-face` block and in the pixel-font rule to match.
