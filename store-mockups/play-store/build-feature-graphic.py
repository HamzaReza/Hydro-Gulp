#!/usr/bin/env python3
"""
1024×500 Play Store feature graphic: LightTheme gradient, real logo, brand typography.
Matches constants/theme.ts (LightTheme gradient + text colors).
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

from logo_utils import load_logo_transparent

OUT = Path(__file__).resolve().parent / "feature-graphic-1024x500.png"
W, H = 1024, 500

# LightTheme from constants/theme.ts
C_BG_START = (247, 248, 240)  # gradientStart #F7F8F0
C_BG_END = (214, 238, 255)  # gradientEnd #D6EEFF
C_TEXT = (53, 88, 114)  # text #355872
C_SECONDARY = (122, 170, 206)  # textSecondary / accent #7AAACE
C_LIGHT_BLUE = (154, 213, 255)  # accentLight #9CD5FF
C_CARD = (255, 255, 255)
C_CARD_BORDER = (53, 88, 114, 36)  # cardBorder-ish


def _lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def _lerp_rgb(
    c1: tuple[int, int, int], c2: tuple[int, int, int], t: float
) -> tuple[int, int, int]:
    return (_lerp(c1[0], c2[0], t), _lerp(c1[1], c2[1], t), _lerp(c1[2], c2[2], t))


def diagonal_gradient_rgb() -> Image.Image:
    """Soft diagonal wash (top-left warm off-white → bottom-right cool blue)."""
    base = Image.new("RGB", (W, H))
    px = base.load()
    denom = W + H
    for y in range(H):
        for x in range(W):
            t = (x + y) / denom
            px[x, y] = _lerp_rgb(C_BG_START, C_BG_END, t)
    return base


def add_soft_blobs(rgb: Image.Image) -> Image.Image:
    """Semi-transparent brand-colored orbs (like app blur cards)."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # Large soft circles
    for cx, cy, r, fill in [
        (920, 90, 160, (*C_LIGHT_BLUE, 45)),
        (860, 420, 120, (*C_SECONDARY, 38)),
        (140, 380, 100, (*C_LIGHT_BLUE, 55)),
        (980, 280, 90, (214, 238, 255, 40)),
    ]:
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=fill)
    layer = layer.filter(ImageFilter.GaussianBlur(radius=28))
    rgb_rgba = rgb.convert("RGBA")
    return Image.alpha_composite(rgb_rgba, layer).convert("RGB")


def _try_font(size: int, bold: bool) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = []
    if bold:
        candidates += [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/Library/Fonts/Arial Bold.ttf",
        ]
    else:
        candidates += [
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/Library/Fonts/Arial.ttf",
        ]
    candidates += [
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in candidates:
        p = Path(path)
        if p.is_file():
            try:
                return ImageFont.truetype(str(p), size)
            except OSError:
                continue
    return ImageFont.load_default()


def main() -> int:
    try:
        logo = load_logo_transparent()
    except FileNotFoundError as e:
        print(f"Missing logo: {e}", file=sys.stderr)
        return 1

    canvas = add_soft_blobs(diagonal_gradient_rgb()).convert("RGBA")

    # Frosted card panel for text (matches app card feel)
    card_margin = 48
    card_x0 = 400
    card_w = W - card_x0 - card_margin
    card_h = 340
    card_y0 = (H - card_h) // 2
    card_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cd = ImageDraw.Draw(card_layer)
    cd.rounded_rectangle(
        (card_x0, card_y0, card_x0 + card_w, card_y0 + card_h),
        radius=28,
        fill=(*C_CARD, 200),
        outline=C_CARD_BORDER,
        width=2,
    )
    canvas = Image.alpha_composite(canvas, card_layer)

    # Logo: large, left side, vertically centered (dominant hero mark)
    max_logo_h = int(H * 0.82)
    lw, lh = logo.size
    scale = max_logo_h / lh
    nw, nh = int(lw * scale), int(lh * scale)
    logo_r = logo.resize((nw, nh), Image.Resampling.LANCZOS)
    lx = 36 + (360 - nw) // 2
    ly = (H - nh) // 2
    canvas.paste(logo_r, (lx, ly), logo_r)

    draw = ImageDraw.Draw(canvas)
    font_title_h = _try_font(56, True)
    font_title_g = _try_font(56, True)
    font_sub = _try_font(24, False)
    font_body = _try_font(18, False)

    tx = card_x0 + 36
    ty = card_y0 + 52

    # Title: "Hydro" + ": " + "Gulp"
    draw.text((tx, ty), "Hydro", fill=C_TEXT, font=font_title_h)
    w_hydro = draw.textlength("Hydro", font=font_title_h)
    draw.text((tx + w_hydro, ty), ":", fill=C_SECONDARY, font=font_title_h)
    w_colon = draw.textlength(":", font=font_title_h)
    draw.text((tx + w_hydro + w_colon, ty), " ", fill=C_TEXT, font=font_title_h)
    w_space = draw.textlength(" ", font=font_title_h)
    draw.text((tx + w_hydro + w_colon + w_space, ty), "Gulp", fill=C_SECONDARY, font=font_title_g)

    bar_y = ty + 58
    draw.rounded_rectangle(
        (tx, bar_y, tx + min(220, card_w - 72), bar_y + 5),
        radius=3,
        fill=C_SECONDARY,
    )

    ty2 = ty + 78
    draw.text(
        (tx, ty2),
        "Track every sip. Hit your daily goal.",
        fill=C_TEXT,
        font=font_sub,
    )
    ty3 = ty2 + 40
    body = (
        "Smart reminders, history, and AI insights - hydration that fits your day, "
        "in the calm palette you already love."
    )
    # Wrap roughly to card width
    max_tw = card_w - 72
    lines = _wrap_text(draw, body, font_body, max_tw)
    line_y = ty3
    for line in lines:
        draw.text((tx, line_y), line, fill=C_SECONDARY, font=font_body)
        line_y += 26

    out = canvas.convert("RGB")
    out.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")
    return 0


def _wrap_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    max_width: float,
) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur: list[str] = []
    for w in words:
        test = " ".join(cur + [w])
        if draw.textlength(test, font=font) <= max_width:
            cur.append(w)
        else:
            if cur:
                lines.append(" ".join(cur))
            cur = [w]
    if cur:
        lines.append(" ".join(cur))
    return lines if lines else [text]


if __name__ == "__main__":
    raise SystemExit(main())
