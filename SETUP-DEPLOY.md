# Deploy Loker Drafter ke Cloud (online 24 jam)

Tujuan: web editor + generator jalan di server cloud, bisa diakses dari mana
saja (termasuk data seluler) tanpa laptop perlu nyala. Ini juga jadi "rumah"
untuk fitur Telegram & auto-post Instagram nanti.

Platform yang dipakai: **Render.com** (punya paket gratis, mendukung Python).

> Catatan paket gratis Render: layanan "tidur" setelah ~15 menit tidak ada
> kunjungan, lalu butuh ~30-50 detik untuk bangun saat dibuka lagi. Untuk
> pemakaian pribadi ini wajar. Kalau mau selalu siaga, bisa upgrade nanti.

## File yang sudah disiapkan (tidak perlu diubah)
- `app.py`        : server (sudah baca PORT dari env, editor terkunci di publik)
- `requirements.txt` : daftar dependensi (termasuk gunicorn)
- `Procfile`      : perintah start (gunicorn)
- `render.yaml`   : konfigurasi otomatis untuk Render
- `runtime.txt`   : versi Python
- `.gitignore`    : mencegah file rahasia/sementara ikut terunggah

## Mode editor di cloud
- Default `EDITOR_LOCKED=1` (terkunci): pengunjung hanya bisa isi data,
  preview, dan generate/unduh. Tidak bisa mengubah posisi layout.
- Untuk mengatur layout: pakai versi LOKAL di laptop (klik `start-editor.bat`).
  Setelah layout pas, commit perubahan `config.json` lalu deploy ulang.

---

## Langkah deploy (lewat GitHub + Render)

### 1. Siapkan akun (gratis)
- Akun GitHub: https://github.com/signup
- Akun Render: https://render.com (daftar pakai GitHub biar gampang)

### 2. Upload project ke GitHub
Dari folder project (`E:\loker-drafter`), jalankan di terminal:
```
git init
git add .
git commit -m "Loker Drafter - generator poster"
git branch -M main
git remote add origin https://github.com/USERNAME/loker-drafter.git
git push -u origin main
```
(Ganti `USERNAME` dengan username GitHub-mu. Buat dulu repo kosong bernama
`loker-drafter` di github.com, lalu salin URL-nya.)

### 3. Deploy di Render
1. Buka https://dashboard.render.com → **New** → **Web Service**.
2. Pilih repo `loker-drafter` yang barusan di-push.
3. Render otomatis membaca `render.yaml`. Pastikan:
   - Runtime: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
   - Plan: Free
4. Klik **Create Web Service**. Tunggu build selesai (beberapa menit).
5. Render kasih URL publik, mis. `https://loker-drafter.onrender.com`.
   Buka di HP/laptop mana saja. Selesai.

### 4. Update ke depannya
Setiap ada perubahan (mis. layout di `config.json`), cukup:
```
git add .
git commit -m "update layout"
git push
```
Render otomatis deploy ulang.

---

## Alternatif tanpa GitHub
Render juga bisa deploy dari "Public Git repository" atau upload manual,
tapi paling mulus tetap lewat GitHub. Kalau belum punya GitHub, bilang saja,
nanti dibantu langkah demi langkah.
