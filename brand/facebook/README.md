# Facebook page images

Profile picture and cover photo for https://www.facebook.com/RecordSeek/ (made 2026-10-30).

| File | Use | Size |
| --- | --- | --- |
| `recordseek-facebook-profile-2048.png` | Profile picture (full-bleed navy, survives the circular crop) | 2048×2048 |
| `recordseek-facebook-profile-circle-on-white-2048.png` | Alternate profile picture, navy circle on white like the extension icon | 2048×2048 |
| `recordseek-facebook-cover-1640x924.jpg` / `.png` | Cover photo. Desktop shows the centre 1640×624 band, phones show the whole 16:9 image, so the copy sits inside that band | 1640×924 |

`src/` holds the sources: `recordseek-mark-color.svg` (the colour mark rebuilt as a vector from the site's white SVG: navy `#003c7a`, teal `#18bc9c`), `recordseek-profile-square.svg`, the three HTML pages and the hero photo. Fonts (Manrope, DM Sans) load from Google Fonts at render time.

Re-render after editing a page:

```sh
cd brand/facebook/src
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --no-first-run \
  --hide-scrollbars --force-device-scale-factor=1 --virtual-time-budget=10000 \
  --user-data-dir=/tmp/rs-chrome --window-size=1640,924 --screenshot=../cover.png "file://$PWD/cover.html"
```

Use `--window-size=2048,2048` for `profile.html` and `profile-circle.html`. Convert the cover screenshot to JPEG at quality 92 for upload.
