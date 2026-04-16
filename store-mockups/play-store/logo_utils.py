"""Shared: load app logo and remove outer white background (edge flood-fill)."""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
LOGO_PATH = ROOT / "assets" / "images" / "logo.png"


def remove_outer_white_rgba(im: Image.Image, tolerance: int = 38) -> Image.Image:
    """Set alpha=0 for white regions reachable from any image edge."""
    im = im.convert("RGBA")
    w, h = im.size
    src = im.load()
    pixels = [list(src[x, y]) for y in range(h) for x in range(w)]

    def idx(x: int, y: int) -> int:
        return y * w + x

    def is_bg(i: int) -> bool:
        r, g, b, _ = pixels[i]
        return r >= 255 - tolerance and g >= 255 - tolerance and b >= 255 - tolerance

    seen = [False] * (w * h)
    q: deque[int] = deque()

    for y in range(h):
        for x in (0, w - 1):
            i = idx(x, y)
            if is_bg(i) and not seen[i]:
                seen[i] = True
                q.append(i)
    for x in range(w):
        for y in (0, h - 1):
            i = idx(x, y)
            if is_bg(i) and not seen[i]:
                seen[i] = True
                q.append(i)

    while q:
        i = q.popleft()
        x = i % w
        y = i // w
        for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                j = idx(nx, ny)
                if not seen[j] and is_bg(j):
                    seen[j] = True
                    q.append(j)

    for i, mark in enumerate(seen):
        if mark:
            r, g, b, _ = pixels[i]
            pixels[i] = [r, g, b, 0]

    out = Image.new("RGBA", (w, h))
    out.putdata([tuple(p) for p in pixels])
    return out


def load_logo_transparent() -> Image.Image:
    if not LOGO_PATH.is_file():
        raise FileNotFoundError(LOGO_PATH)
    return remove_outer_white_rgba(Image.open(LOGO_PATH).convert("RGBA"))
