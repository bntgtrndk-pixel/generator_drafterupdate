# -*- coding: utf-8 -*-
"""
Generator Poster Lowongan Kerja - Fase 1
========================================
Menempelkan 5 field teks ke atas template desain, lalu menyimpan hasilnya
sebagai gambar siap-posting Instagram (1080x1080).

Cara pakai:
    python generate.py                 # generate semua loker dari lokers.json
    python generate.py --data x.json   # pakai file data lain

Semua posisi/ukuran/warna teks diatur di config.json (tidak perlu ubah kode).
Jalankan 'python grid_helper.py' untuk membuat template dengan grid koordinat,
agar mudah menentukan posisi setiap teks.
"""
import argparse
import json
import os
import re

from PIL import Image, ImageDraw, ImageFont

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def load_config():
    with open(os.path.join(BASE_DIR, "config.json"), "r", encoding="utf-8") as f:
        return json.load(f)


def resolve_path(path):
    """Path relatif dianggap relatif terhadap folder project."""
    if os.path.isabs(path):
        return path
    return os.path.join(BASE_DIR, path)


def load_font(path, size):
    """Muat font dari path, dengan fallback agar program tidak crash."""
    for candidate in (resolve_path(path), "C:/Windows/Fonts/arial.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(candidate, size)
        except Exception:
            continue
    return ImageFont.load_default()


def apply_case(text, mode):
    """Ubah kapitalisasi teks sesuai mode: upper / lower / title / none."""
    if mode == "upper":
        return text.upper()
    if mode == "lower":
        return text.lower()
    if mode == "title":
        # Kapitalkan huruf pertama tiap kata, sisanya biarkan apa adanya.
        # Jadi "PT Maju" tetap "PT Maju", "maju bersama" -> "Maju Bersama".
        return " ".join(w[:1].upper() + w[1:] if w else w for w in text.split(" "))
    return text


def wrap_text(draw, text, font, max_width):
    """Pecah teks menjadi beberapa baris agar muat di lebar tertentu."""
    lines = []
    for paragraph in text.split("\n"):
        words = paragraph.split()
        if not words:
            lines.append("")
            continue
        current = ""
        for word in words:
            test = (current + " " + word).strip()
            if draw.textlength(test, font=font) <= max_width or not current:
                current = test
            else:
                lines.append(current)
                current = word
        if current:
            lines.append(current)
    return lines


def fit_text(draw, text, font_path, box_w, box_h, max_font, min_font, line_spacing):
    """Kecilkan ukuran font bertahap sampai teks muat di dalam box (w x h)."""
    size = max_font
    while size >= min_font:
        font = load_font(font_path, size)
        lines = wrap_text(draw, text, font, box_w)
        ascent, descent = font.getmetrics()
        line_h = (ascent + descent) * line_spacing
        if line_h * len(lines) <= box_h:
            return font, lines, line_h
        size -= 2
    font = load_font(font_path, min_font)
    lines = wrap_text(draw, text, font, box_w)
    ascent, descent = font.getmetrics()
    line_h = (ascent + descent) * line_spacing
    return font, lines, line_h


def fit_fixed(draw, text, font_path, box_w, font_size, min_font, line_spacing):
    """Ukuran TETAP: render pada font_size apa adanya, tidak pernah membesar
    walau teks pendek. Hanya mengecil bila ada baris yang lebih lebar dari box
    (mis. email/URL panjang yang tidak bisa dipecah), turun maksimal ke min_font."""
    size = font_size
    while size > min_font:
        font = load_font(font_path, size)
        lines = wrap_text(draw, text, font, box_w)
        widest = max((draw.textlength(l, font=font) for l in lines), default=0)
        if widest <= box_w:
            break
        size -= 2
    size = max(size, min_font)
    font = load_font(font_path, size)
    lines = wrap_text(draw, text, font, box_w)
    ascent, descent = font.getmetrics()
    line_h = (ascent + descent) * line_spacing
    return font, lines, line_h


def draw_field(draw, text, cfg, default_font):

    """Gambar satu field teks di atas kanvas sesuai konfigurasi."""
    if not text:
        return
    text = apply_case(text, cfg.get("case", "none"))
    if cfg.get("prefix"):
        text = cfg["prefix"] + text

    x, y, w, h = cfg["box"]
    font_path = cfg.get("font", default_font)
    line_spacing = cfg.get("line_spacing", 1.1)
    max_font = cfg.get("max_font", 80)
    min_font = cfg.get("min_font", 24)

    # fit_mode:
    #   "fixed"  -> ukuran tetap = max_font, hanya mengecil bila terlalu lebar.
    #               (teks pendek TIDAK membesar) -- cocok untuk judul/posisi/dll.
    #   "shrink" -> ukuran menyesuaikan tinggi & lebar box -- cocok untuk deskripsi panjang.
    if cfg.get("fit_mode", "fixed") == "shrink":
        font, lines, line_h = fit_text(
            draw, text, font_path, w, h, max_font, min_font, line_spacing,
        )
    else:
        font, lines, line_h = fit_fixed(
            draw, text, font_path, w, max_font, min_font, line_spacing,
        )


    total_h = line_h * len(lines)
    # Vertikal: default center (sesuai permintaan).
    valign = cfg.get("valign", "middle")
    if valign == "middle":
        cur_y = y + (h - total_h) / 2
    elif valign == "bottom":
        cur_y = y + (h - total_h)
    else:
        cur_y = y

    align = cfg.get("align", "center")
    color = cfg.get("color", "#000000")
    stroke_w = cfg.get("stroke_width", 0)
    stroke_fill = cfg.get("stroke_color", "#000000")

    for line in lines:
        line_w = draw.textlength(line, font=font)
        if align == "center":
            cur_x = x + (w - line_w) / 2
        elif align == "right":
            cur_x = x + (w - line_w)
        else:
            cur_x = x
        draw.text((cur_x, cur_y), line, font=font, fill=color,
                  stroke_width=stroke_w, stroke_fill=stroke_fill)
        cur_y += line_h


def slugify(text):
    text = re.sub(r"[^\w\s-]", "", str(text)).strip().lower()
    return re.sub(r"\s+", "-", text) or "loker"


def render_poster(data, config):
    """Render satu poster dan kembalikan objek PIL Image (RGB)."""
    canvas_w, canvas_h = config.get("output_size", [1080, 1080])
    img = Image.open(resolve_path(config["template"])).convert("RGBA")
    # Samakan ukuran template dengan kanvas output agar koordinat 1:1.
    if img.size != (canvas_w, canvas_h):
        img = img.resize((canvas_w, canvas_h), Image.LANCZOS)

    draw = ImageDraw.Draw(img)
    default_font = config.get("default_font", "Helvetica.ttf")

    for key, cfg in config["fields"].items():
        draw_field(draw, str(data.get(key, "")), cfg, default_font)

    return img.convert("RGB")


def generate_one(data, config):
    img = render_poster(data, config)
    out_dir = resolve_path(config.get("output_dir", "output"))
    os.makedirs(out_dir, exist_ok=True)
    name = slugify(data.get("posisi", "loker")) + "_" + slugify(data.get("perusahaan", ""))
    out_path = os.path.join(out_dir, name[:80] + ".png")
    img.save(out_path, quality=95)
    return out_path



def main():
    parser = argparse.ArgumentParser(description="Generator poster lowongan kerja")
    parser.add_argument("--data", default="lokers.json", help="File JSON berisi data loker")
    args = parser.parse_args()

    config = load_config()
    with open(resolve_path(args.data), "r", encoding="utf-8") as f:
        items = json.load(f)
    if isinstance(items, dict):
        items = [items]

    print(f"Membuat {len(items)} poster...")
    for item in items:
        out = generate_one(item, config)
        print("  OK ->", out)
    print("Selesai. Cek folder 'output'.")


if __name__ == "__main__":
    main()
