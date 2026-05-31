# Loker Drafter - Generator Poster Otomatis

Project untuk membuat poster lowongan kerja secara otomatis dari sebuah template
desain, cukup dengan mengisi 5 data: posisi, lokasi, perusahaan, deskripsi, kontak.

## Status: Fase 1 (Generator Poster + Web Editor)

```
loker-drafter/
├── 20260114_162748.png   # template desain (kosong)
├── contoh-jadi.jpg       # contoh hasil jadi (acuan posisi teks)
├── coolvetica rg.otf     # font judul/posisi/lokasi/perusahaan
├── Helvetica.ttf         # font deskripsi & kontak
├── generate.py           # program utama: data -> poster
├── grid_helper.py        # buat template + garis koordinat (bantu atur posisi)
├── config.json           # SEMUA pengaturan posisi/font/warna/ukuran teks
├── lokers.json           # contoh data loker
├── app.py                # web editor (server lokal Flask)
├── start-editor.bat      # klik dua kali untuk menjalankan web editor
├── web/                  # tampilan web editor (HTML/CSS/JS)
├── requirements.txt
└── output/               # hasil poster (otomatis dibuat)
```

## Web Editor (cara termudah)

Klik dua kali `start-editor.bat`, lalu buka browser:

- Di laptop yang sama: `http://localhost:5000`
- Di HP (satu jaringan WiFi): `http://<IP-laptop>:5000`
  (cek IP laptop dengan perintah `ipconfig`, cari IPv4 Address)

Di web editor kamu bisa:
- Isi 5 data loker dan lihat preview real-time (sama persis dengan hasil akhir)
- Tab "Atur Teks": geser kotak teks dengan jari/mouse, ubah ukuran area,
  ganti ukuran font, warna, perataan, dan kapitalisasi
- "Simpan Layout" untuk mengunci posisi permanen ke `config.json`
- "Generate PNG" untuk menyimpan poster jadi ke folder `output/`

> Catatan keamanan: server berjalan tanpa login dan terbuka ke jaringan lokal
> (agar bisa diakses dari HP). Pakai hanya di WiFi rumah/pribadi, jangan di
> jaringan publik. Untuk mematikan, tutup jendela server / tekan Ctrl+C.


## Cara pakai

1. Install dependensi (sekali saja):
   ```
   pip install -r requirements.txt
   ```

2. (Opsional, untuk mengatur posisi) Buat template ber-grid:
   ```
   python grid_helper.py
   ```
   Buka `template_grid.png` berdampingan dengan `contoh-jadi.jpg`, baca koordinat
   tiap teks, lalu isi nilai `box` di `config.json`.

3. Isi data loker di `lokers.json`, lalu generate:
   ```
   python generate.py
   ```
   Hasil ada di folder `output/`.

## Mengatur posisi teks (config.json)

Setiap field punya `box` = `[x, y, lebar, tinggi]` dalam piksel (kanvas 1080x1080).
Teks otomatis di-center vertikal di dalam box-nya, otomatis turun baris bila
kepanjangan, dan ukuran font otomatis mengecil agar muat.

Opsi per field:
| Opsi | Arti |
|---|---|
| `box` | `[x, y, lebar, tinggi]` posisi & area teks |
| `font` | nama file font |
| `max_font` / `min_font` | rentang ukuran font (otomatis pilih yang muat) |
| `color` | warna teks (hex) |
| `align` | horizontal: `left` / `center` / `right` |
| `valign` | vertikal: `top` / `middle` / `bottom` |
| `case` | `upper` / `lower` / `title` / `none` |
| `prefix` | teks tambahan di depan (mis. `"Lokasi: "`) |
| `line_spacing` | jarak antar baris |

Aturan font/kapitalisasi saat ini:
| Field | Font | Kapitalisasi |
|---|---|---|
| Posisi | Coolvetica RG | UPPERCASE |
| Lokasi | Coolvetica RG | Title Case |
| Perusahaan | Coolvetica RG | Title Case |
| Deskripsi | Helvetica | Title Case |
| Kontak | Helvetica | lowercase |

> Angka posisi horizontal saat ini masih perkiraan. Setelah dicocokkan dengan
> contoh, nilainya dikunci permanen (template tidak berubah).

## Roadmap

- [x] Fase 1: Generator poster dari template + 5 field
- [ ] Fase 2: Bot Telegram untuk input & konfirmasi loker
- [ ] Fase 3: Sumber data loker (semi-otomatis dulu)
- [ ] Fase 4: Auto-post Instagram via Graph API
