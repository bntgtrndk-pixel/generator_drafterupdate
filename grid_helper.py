# -*- coding: utf-8 -*-
"""
Grid Helper
===========
Membuat salinan template (ukuran 1080x1080) dengan garis koordinat (grid),
agar mudah menentukan posisi teks. Buka 'template_grid.png', lihat angka
koordinatnya, lalu isi nilai 'box' di config.json: [x, y, lebar, tinggi].

Jalankan:
    python grid_helper.py
"""
import json
import os

from PIL import Image, ImageDraw, ImageFont

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STEP = 60  # jarak antar garis grid (piksel)


def main():
    with open(os.path.join(BASE_DIR, "config.json"), "r", encoding="utf-8") as f:
        config = json.load(f)

    w, h = config.get("output_size", [1080, 1080])
    img = Image.open(os.path.join(BASE_DIR, config["template"])).convert("RGB")
    if img.size != (w, h):
        img = img.resize((w, h), Image.LANCZOS)
    draw = ImageDraw.Draw(img)

    try:
        font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 16)
    except Exception:
        font = ImageFont.load_default()

    red = (255, 0, 0)
    for x in range(0, w, STEP):
        draw.line([(x, 0), (x, h)], fill=red, width=1)
        draw.text((x + 2, 2), str(x), fill=red, font=font)
    for y in range(0, h, STEP):
        draw.line([(0, y), (w, y)], fill=red, width=1)
        draw.text((2, y + 2), str(y), fill=red, font=font)

    out = os.path.join(BASE_DIR, "template_grid.png")
    img.save(out)
    print(f"Grid disimpan: {out}")
    print(f"Kanvas: {w} x {h} px. Garis setiap {STEP} px.")
    print("Buka file tersebut untuk membaca koordinat, lalu isi 'box' di config.json.")


if __name__ == "__main__":
    main()
