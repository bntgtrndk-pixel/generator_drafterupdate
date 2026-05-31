# Setup AI Parser (OpenRouter) + Deploy Netlify

Fitur "Isi Otomatis" memakai AI (OpenRouter) untuk membaca teks loker apa pun
dan mengisi 5 kolom. Kalau AI gagal/kuota habis, otomatis jatuh ke parser dasar
(rule-based), jadi tetap jalan.

API key disimpan AMAN sebagai environment variable di Netlify (TIDAK ada di kode
browser), lewat Netlify Function `netlify/functions/parse.mjs`.

> PENTING: karena memakai Function, deploy TIDAK lewat "Netlify Drop" (drag zip),
> melainkan dengan menghubungkan repo GitHub ke Netlify. Sekali set, update
> berikutnya cukup `git push`.

---

## 1. Dapatkan API key OpenRouter (gratis)
1. Buka https://openrouter.ai → Sign in (boleh pakai Google).
2. Klik foto profil → **Keys** → **Create Key**.
3. Salin key-nya (format diawali `sk-or-...`). Simpan, jangan dibagikan.

## 2. Pilih model (sudah ada default)
- Default di kode: `deepseek/deepseek-chat-v3-0324:free` (gratis, akurat untuk
  ekstraksi teks).
- Mau ganti? Set env `OPENROUTER_MODEL`. Contoh alternatif gratis:
  - `meta-llama/llama-3.3-70b-instruct:free`
  - `google/gemini-2.0-flash-exp:free`
  (Daftar model `:free` bisa berubah; cek katalog di openrouter.ai/models.)

## 3. Push project ke GitHub (kalau ada perubahan baru)
Dari folder project:
```
git add .
git commit -m "Tambah AI parser (OpenRouter via Netlify Function)"
git push
```

## 4. Hubungkan repo ke Netlify
1. Buka https://app.netlify.com → **Add new site** → **Import an existing project**.
2. Pilih **GitHub**, lalu pilih repo `generator_drafterupdate`.
   (Kalau repo private & tidak muncul: beri akses Netlify ke repo itu.)
3. Netlify membaca `netlify.toml` otomatis:
   - Publish directory: `web-static`
   - Functions directory: `netlify/functions`
   Biarkan apa adanya, klik **Deploy**.

## 5. Isi API key di Netlify (WAJIB, sekali saja)
1. Setelah situs dibuat: **Site configuration** → **Environment variables**.
2. **Add a variable**:
   - Key: `OPENROUTER_API_KEY`  → Value: (key dari langkah 1)
   - (opsional) Key: `OPENROUTER_MODEL` → Value: model pilihan
3. **Trigger deploy** (Deploys → Trigger deploy → Deploy site) agar key terbaca.

## 6. Coba
- Buka URL Netlify-mu, tempel teks loker, klik **✨ Isi Otomatis**.
- Status akan menulis "via AI" bila AI dipakai, atau "mode dasar" bila fallback.

---

## Update ke depannya
Cukup edit file → `git add . && git commit -m "..." && git push`.
Netlify otomatis build & deploy ulang.

## Catatan keamanan
- Key TIDAK pernah dikirim ke browser; hanya dipakai di Function (server Netlify).
- Jangan menaruh key di `config.js` atau file mana pun yang ada di `web-static/`.
- `secrets.json` & file rahasia lain sudah diabaikan lewat `.gitignore`.
