#!/usr/bin/env python3
"""
Build 512x512 Play Store app icon from assets/images/logo.png (transparent background).
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

from logo_utils import load_logo_transparent

OUT = Path(__file__).resolve().parent / "app-icon-512.png"
SIZE = 512
# Inset from 512² edges (0 = logo uses full square; scale fits inside without cropping)
PADDING_RATIO = 0.0


def fit_center(canvas: Image.Image, im: Image.Image) -> None:
    cw, ch = canvas.size
    iw, ih = im.size
    max_w = int(cw * (1 - 2 * PADDING_RATIO))
    max_h = int(ch * (1 - 2 * PADDING_RATIO))
    # Allow upscaling so small source PNGs still fill the 512×512 export
    scale = min(max_w / iw, max_h / ih)
    nw, nh = max(1, int(iw * scale)), max(1, int(ih * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (cw - nw) // 2
    oy = (ch - nh) // 2
    canvas.paste(im, (ox, oy), im)


def main() -> int:
    try:
        logo = load_logo_transparent()
    except FileNotFoundError as e:
        print(f"Missing logo: {e}", file=sys.stderr)
        return 1

    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    fit_center(canvas, logo)
    canvas.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
