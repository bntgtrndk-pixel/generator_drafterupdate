// Netlify Function: AI parser loker via OpenRouter
// =================================================
// Menerima { text } dari browser, memanggil OpenRouter, mengembalikan 5 field.
// API key DIBACA dari environment variable (RAHASIA, tidak ada di kode browser):
//   OPENROUTER_API_KEY  -> wajib
//   OPENROUTER_MODEL    -> opsional, default model free yang kuat
//
// Set di Netlify: Site settings > Environment variables.

const DEFAULT_MODEL = "deepseek/deepseek-chat-v3-0324:free";

const SYSTEM_PROMPT = `Anda adalah pengekstrak data lowongan kerja. Dari teks lowongan yang diberikan, keluarkan HANYA objek JSON valid (tanpa penjelasan, tanpa markdown) dengan kunci persis berikut:
{"posisi": "", "lokasi": "", "perusahaan": "", "kontak": "", "deskripsi": ""}

Aturan:
- "posisi": nama posisi/jabatan yang dicari (contoh: "Engineering Drafter").
- "lokasi": kota/lokasi penempatan saja (contoh: "Jakarta"). Kosongkan jika tidak ada.
- "perusahaan": nama perusahaan lengkap dengan PT/CV bila ada (contoh: "PT Fuji SMBE Indonesia").
- "kontak": SATU email tujuan lamaran; jika tidak ada email, ambil nomor WhatsApp. Hanya alamat/nomornya saja.
- "deskripsi": SELALU isi dengan ajakan singkat saja, default "Send your CV to:". JANGAN menaruh daftar requirement panjang di sini.
- Jika sebuah field tidak ditemukan, isi dengan string kosong.
- Keluarkan JSON satu baris, tanpa teks lain.`;

export default async (req) => {
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return json({ ok: false, error: "OPENROUTER_API_KEY belum diset di Netlify." }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Body bukan JSON valid." }, 400);
  }
  const text = (body && body.text ? String(body.text) : "").trim();
  if (!text) {
    return json({ ok: false, error: "Teks kosong." }, 400);
  }

  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  try {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 400,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return json({ ok: false, error: `OpenRouter HTTP ${resp.status}: ${errText.slice(0, 300)}` }, 502);
    }

    const dataResp = await resp.json();
    const content = dataResp?.choices?.[0]?.message?.content || "";
    const parsed = extractJson(content);
    if (!parsed) {
      return json({ ok: false, error: "AI tidak mengembalikan JSON yang bisa dibaca." }, 502);
    }

    const fields = {
      posisi: str(parsed.posisi),
      lokasi: str(parsed.lokasi),
      perusahaan: str(parsed.perusahaan),
      kontak: str(parsed.kontak),
      deskripsi: str(parsed.deskripsi) || "Send your CV to:",
    };
    return json({ ok: true, fields, model });
  } catch (e) {
    return json({ ok: false, error: "Gagal memanggil AI: " + (e?.message || e) }, 502);
  }
};

// --- util ---
function str(v) {
  return v == null ? "" : String(v).trim();
}

function extractJson(content) {
  // Coba parse langsung; jika ada teks lain, ambil blok {...} pertama.
  try {
    return JSON.parse(content);
  } catch {}
  const m = content.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch {}
  }
  return null;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
