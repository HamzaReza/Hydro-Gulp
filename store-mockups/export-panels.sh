#!/usr/bin/env bash
# Regenerate export/*.png from index.html + screenshots/*.png headlessly.
# Screenshots each .canvas-phone / .canvas-t7 / .canvas-t10 block at its
# exact export size via headless Chrome. Run after replacing any file in
# screenshots/ — no manual Chrome capture needed.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
HARNESS="$DIR/.export-harness.html"
OUT="$DIR/export"
mkdir -p "$OUT"

# Harness = index.html + a script that isolates panel N (from ?panel=N)
# at the top-left of an unpadded body so a window-sized shot equals the panel.
sed 's|</body>|<script>\
  const n = Number(new URLSearchParams(location.search).get("panel"));\
  const panels = document.querySelectorAll("body > .canvas-phone, body > .canvas-t7, body > .canvas-t10");\
  const keep = panels[n];\
  document.body.style.margin = "0";\
  document.body.style.overflow = "hidden";\
  [...document.body.children].forEach((el) => (el.style.display = "none"));\
  keep.style.display = "";\
  keep.style.margin = "0";\
  document.body.prepend(keep);\
</script></body>|' "$DIR/index.html" > "$HARNESS"

NAMES=(01-today 02-history 03-analytics 04-ai-insights 06-reminders 07-profile 08-presets 09-freeze 10-companion 11-reminder 12-tile 13-widget)

shoot() { # panelIndex outFile size
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --window-size="$3" \
    --virtual-time-budget=8000 --screenshot="$2" \
    "file://$HARNESS?panel=$1" >/dev/null 2>&1
}

for i in "${!NAMES[@]}"; do
  shoot "$i"           "$OUT/phone-${NAMES[$i]}.png"    1024,1024
  shoot "$((i + 12))"  "$OUT/tablet7-${NAMES[$i]}.png"  1024,1024
  shoot "$((i + 24))"  "$OUT/tablet10-${NAMES[$i]}.png" 2048,2048
  echo "exported ${NAMES[$i]}"
done

rm -f "$HARNESS"
ls -la "$OUT"
