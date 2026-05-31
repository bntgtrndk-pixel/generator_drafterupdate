# -*- coding: utf-8 -*-
"""
Modul Posting Instagram - Jalur A (Graph API resmi Meta)
========================================================
Alur posting (sesuai aturan resmi Instagram):
  1. Gambar di-upload ke hosting publik (imgbb) -> dapat URL publik.
     (Graph API tidak menerima file langsung, butuh URL yang bisa diakses Meta.)
  2. Buat "media container" di Graph API (kirim image_url + caption).
  3. Publish container tersebut ke feed Instagram.

Kredensial dibaca dari secrets.json (lihat secrets.example.json & SETUP-INSTAGRAM.md).
File secrets.json TIDAK ikut ke kode/Git (lihat .gitignore).
"""
import base64
import json
import os

import requests

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GRAPH = "https://graph.facebook.com/v21.0"
SECRETS_PATH = os.path.join(BASE_DIR, "secrets.json")


def load_secrets():
    if not os.path.exists(SECRETS_PATH):
        return None
    try:
        with open(SECRETS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def missing_keys(secrets=None):
    """Kembalikan daftar kredensial yang belum diisi."""
    s = secrets or load_secrets() or {}
    needed = ["ig_user_id", "ig_access_token", "imgbb_api_key"]
    return [k for k in needed if not str(s.get(k, "")).strip()]


def is_configured():
    return load_secrets() is not None and not missing_keys()


def upload_to_imgbb(image_path, api_key):
    """Upload gambar ke imgbb, kembalikan URL publik."""
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    resp = requests.post(
        "https://api.imgbb.com/1/upload",
        data={"key": api_key, "image": b64},
        timeout=90,
    )
    resp.raise_for_status()
    data = resp.json()
    if not data.get("success"):
        raise RuntimeError(f"imgbb gagal: {data}")
    return data["data"]["url"]


def _graph_post(url, payload, step):
    try:
        r = requests.post(url, data=payload, timeout=90)
    except Exception as e:
        return None, {"ok": False, "step": step, "error": f"koneksi gagal: {e}"}
    try:
        j = r.json()
    except Exception:
        return None, {"ok": False, "step": step, "error": f"respons tak terbaca (HTTP {r.status_code})"}
    if "id" not in j:
        # Graph API biasanya mengembalikan {"error": {...}}
        err = j.get("error", j)
        return None, {"ok": False, "step": step, "error": err}
    return j["id"], None


def post_image(image_path, caption, secrets=None):
    """Posting satu gambar ke Instagram. Mengembalikan dict hasil.
    Sukses: {"ok": True, "post_id": ..., "image_url": ...}
    Gagal : {"ok": False, "step": ..., "error": ...}
    """
    secrets = secrets or load_secrets()
    if not secrets:
        return {"ok": False, "step": "config",
                "error": "secrets.json belum ada. Salin dari secrets.example.json lalu isi."}
    miss = missing_keys(secrets)
    if miss:
        return {"ok": False, "step": "config",
                "error": "Kredensial belum lengkap: " + ", ".join(miss)}

    ig_user = str(secrets["ig_user_id"]).strip()
    token = str(secrets["ig_access_token"]).strip()
    imgbb = str(secrets["imgbb_api_key"]).strip()

    # 1) upload -> URL publik
    try:
        image_url = upload_to_imgbb(image_path, imgbb)
    except Exception as e:
        return {"ok": False, "step": "upload", "error": str(e)}

    # 2) buat media container
    creation_id, err = _graph_post(
        f"{GRAPH}/{ig_user}/media",
        {"image_url": image_url, "caption": caption or "", "access_token": token},
        "container",
    )
    if err:
        err["image_url"] = image_url
        return err

    # 3) publish
    post_id, err = _graph_post(
        f"{GRAPH}/{ig_user}/media_publish",
        {"creation_id": creation_id, "access_token": token},
        "publish",
    )
    if err:
        err["image_url"] = image_url
        return err

    return {"ok": True, "post_id": post_id, "image_url": image_url}


def check_token(secrets=None):
    """Cek validitas token & ambil username akun IG (untuk tombol 'Tes Koneksi')."""
    secrets = secrets or load_secrets()
    if not secrets or missing_keys(secrets):
        return {"ok": False, "error": "Kredensial belum lengkap."}
    ig_user = str(secrets["ig_user_id"]).strip()
    token = str(secrets["ig_access_token"]).strip()
    try:
        r = requests.get(
            f"{GRAPH}/{ig_user}",
            params={"fields": "username,name", "access_token": token},
            timeout=30,
        )
        j = r.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}
    if "username" in j:
        return {"ok": True, "username": j["username"], "name": j.get("name", "")}
    return {"ok": False, "error": j.get("error", j)}
