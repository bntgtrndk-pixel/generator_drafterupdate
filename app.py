# -*- coding: utf-8 -*-
"""
Web Editor - Loker Drafter
==========================
Server lokal (Flask) untuk preview & atur posisi/teks/ukuran/warna poster
secara visual, di HP maupun desktop. Preview memakai engine render yang sama
dengan generate.py, jadi yang tampil di web = hasil akhir.

Jalankan:
    python app.py
Lalu buka di browser:
    http://localhost:5000           (desktop)
    http://<IP-komputer>:5000       (HP, satu jaringan WiFi)
"""
import io
import json
import os

from flask import Flask, jsonify, request, send_file, send_from_directory, abort

import generate

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=None)

# Di cloud (publik), kunci editor agar layout tidak bisa diubah orang lain.
# Set env EDITOR_LOCKED=0 untuk mengizinkan simpan (mis. saat atur layout lokal).
EDITOR_LOCKED = os.environ.get("EDITOR_LOCKED", "1") != "0"



@app.after_request
def no_cache(resp):
    """Cegah browser menyimpan versi lama file editor."""
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp



# ---------- util ----------
def read_json(name):
    with open(os.path.join(BASE_DIR, name), "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(name, data):
    with open(os.path.join(BASE_DIR, name), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ---------- halaman ----------
@app.route("/")
def index():
    return send_from_directory(os.path.join(BASE_DIR, "web"), "index.html")


@app.route("/web/<path:fname>")
def web_assets(fname):
    return send_from_directory(os.path.join(BASE_DIR, "web"), fname)


# ---------- API ----------
@app.route("/api/config", methods=["GET"])
def get_config():
    return jsonify(read_json("config.json"))


@app.route("/api/lokers", methods=["GET"])
def get_lokers():
    try:
        return jsonify(read_json("lokers.json"))
    except Exception:
        return jsonify([])


@app.route("/api/status", methods=["GET"])
def status():
    """Info untuk frontend: apakah editor terkunci (mode publik)."""
    return jsonify({"editor_locked": EDITOR_LOCKED})


@app.route("/api/save-config", methods=["POST"])
def save_config():
    if EDITOR_LOCKED:
        return jsonify({"ok": False, "error": "Editor terkunci (mode publik). Atur layout lewat versi lokal."}), 403
    cfg = request.get_json(force=True)
    if not cfg or "fields" not in cfg:
        return jsonify({"ok": False, "error": "config tidak valid"}), 400
    write_json("config.json", cfg)
    return jsonify({"ok": True})


@app.route("/api/save-lokers", methods=["POST"])
def save_lokers():
    if EDITOR_LOCKED:
        return jsonify({"ok": False, "error": "Editor terkunci (mode publik)."}), 403
    data = request.get_json(force=True)
    write_json("lokers.json", data)
    return jsonify({"ok": True})



@app.route("/api/preview", methods=["POST"])
def preview():
    """Terima {config, data}, kembalikan PNG hasil render."""
    body = request.get_json(force=True)
    config = body.get("config") or read_json("config.json")
    data = body.get("data") or {}
    try:
        img = generate.render_poster(data, config)
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return send_file(buf, mimetype="image/png")


@app.route("/api/generate", methods=["POST"])
def generate_final():
    """Simpan poster ke folder output/ memakai config & data terkini."""
    body = request.get_json(force=True)
    config = body.get("config") or read_json("config.json")
    data = body.get("data") or {}
    try:
        out = generate.generate_one(data, config)
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500
    return jsonify({"ok": True, "path": out, "file": os.path.basename(out)})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print("=" * 56)
    print(" Loker Drafter - Web Editor")
    print(f" Lokal   : http://localhost:{port}")
    print(f" HP/WiFi : http://<IP-komputer>:{port}")
    print(f" Editor  : {'TERKUNCI (publik)' if EDITOR_LOCKED else 'BISA EDIT (lokal)'}")
    print("=" * 56)
    app.run(host="0.0.0.0", port=port, debug=False)


