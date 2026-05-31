# Loker Drafter - Versi Online (Static)

Versi ini render poster langsung di browser (HP/laptop), tanpa server Python.
Jadi bisa di-host gratis di Netlify dan diakses dari mana saja (termasuk data
seluler), tanpa laptop perlu nyala.

## Isi folder
```
web-static/
├── index.html       # halaman utama
├── style.css        # tampilan
├── app.js           # mesin render (Canvas, meniru versi Pillow)
├── config.js        # LAYOUT TERKUNCI (posisi/ukuran/font tiap teks)
├── template.png     # template desain
├── coolvetica.otf   # font judul/posisi/lokasi/perusahaan
└── helvetica.ttf    # font deskripsi & kontak
```

## Cara deploy ke Netlify Drop (paling gampang, gratis)

1. Buka https://app.netlify.com/drop
2. Drag SELURUH folder `web-static` (atau file `web-static.zip`) ke area "Drag and drop".
   - Penting: yang di-drop adalah ISI folder (index.html harus berada di root).
   - Kalau pakai zip: pastikan index.html ada di root zip, bukan di dalam subfolder.
3. Tunggu beberapa detik, Netlify kasih URL publik (mis. https://nama-acak.netlify.app).
4. Buka URL itu di HP/laptop mana saja. Selesai — online 24 jam.

> Tip: buat akun Netlify gratis kalau ingin URL tetap & bisa ganti nama situs.
> Tanpa akun pun tetap dapat URL, tapi sifatnya sementara.

## Cara pakai
- Isi 5 data loker, poster ter-update otomatis.
- Klik "Unduh PNG" untuk simpan gambar 1080x1080, lalu posting ke Instagram.

## Catatan
- Layout (posisi/ukuran teks) sama dengan versi terkunci. Karena mesin render
  beda (Canvas vs Pillow), bisa ada beda tipis; kalau ada yang meleset, kabari
  untuk disesuaikan di `config.js`.
- Untuk mengubah layout: edit angka di `config.js`, lalu deploy ulang.
