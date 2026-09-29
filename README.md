# Happy Birthday, Mrs. Marfoa 💜

A birthday site for Ama Marfoa Ankomah, **fully static, with no backend**. Everything (pages, photos, music) is in `public/`.

**Welcome → a flip-through storybook (Elton's note) → blow out the candles → the party**
(fireworks, balloons you can pop, and her photos in a beating heart, a 3D carousel, film strips, drifting polaroids and a gallery).
Music: *Happy Birthday* once, then Canon in D, Für Elise and an original, *Marfoa's Waltz*, on loop.

## Open it

Double-click `public/index.html`. No server needed.

## Deploy (Netlify)

Import this repo in Netlify (`netlify.toml` publishes `public/`), or drag the `public/` folder onto
[app.netlify.com/drop](https://app.netlify.com/drop).

## Add or change photos / music

1. Put files in `public/media/photos/` or `public/media/music/`. They show and play in name order, so prefix them `01-`, `02-`, ...
2. Run `npm run media` to regenerate `public/media.js`, the list the site reads.

The first photo is the one on the book's first page. The first song plays once, then the rest loop.

## Files

- `public/index.html` all scenes · `styles.css` base look · `animations.css` motion
- `public/app.js` scenes, storybook, cake, photo showcases, lightbox, music playlist
- `public/fx.js` sparkle trail, tap bursts, floaters, fireworks, balloons, tilt, magnetic buttons
- `public/media.js` generated media list · `public/media/` photos and music
- `scripts/build-media.mjs` regenerates `media.js` · `scripts/make-music.py` renders the music-box tracks
