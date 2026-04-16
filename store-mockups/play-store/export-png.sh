#!/usr/bin/env bash
# App icon + feature graphic from assets/images/logo.png (see build-*.py).
# Requires: python3 + Pillow
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
python3 "$DIR/build-app-icon.py"
python3 "$DIR/build-feature-graphic.py"
ls -la "$DIR"/*.png
