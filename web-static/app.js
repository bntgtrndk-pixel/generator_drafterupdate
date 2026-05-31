// Loker Drafter - Versi Statis (render di browser pakai Canvas)
// =============================================================
// Meniru logika render Pillow (generate.py): fit_fixed / shrink, wrap teks,
// kapitalisasi, perataan horizontal & vertikal. Tidak butuh server.
"use strict";

const CFG = window.LOKER_CONFIG;
const ORDER = window.FIELD_ORDER;
const CANVAS = CFG.output_size[0]; // 1080

const $ = (sel) => document.querySelector(sel);
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusMsg = document.getElementById("statusMsg");

let templateImg = null;
let fontsReady = false;

const data = { posisi: "", lokasi: "", perusahaan: "", deskripsi: "", kontak: "" };

// ---------- util teks ----------
function applyCase(text, mode) {
  if (mode === "upper") return text.toUpperCase();
  if (mode === "lower") return text.toLowerCase();
  if (mode === "title") {
    return text.split(" ").map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");
  }
  return text;
}

function setFont(size, family) {
  ctx.font = `${size}px "${family}"`;
}

function lineHeightFor(size, family, lineSpacing) {
  setFont(size, family);
  const m = ctx.measureText("Mg");
  let h;
  if (m.fontBoundingBoxAscent != null && m.fontBoundingBoxDescent != null) {
    h = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
  } else {
    h = size * 1.2;
  }
  return h * lineSpacing;
}

function wrapText(text, maxWidth, size, family) {
  setFont(size, family);
  const lines = [];
  for (const paragraph of String(text).split("\n")) {
    const words = paragraph.split(/\s+/).filter((w) => w.length);
    if (!words.length) { lines.push(""); continue; }
    let current = "";
    for (const word of words) {
      const test = current ? current + " " + word : word;
      if (ctx.measureText(test).width <= maxWidth || !current) {
        current = test;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function widestLine(lines, size, family) {
  setFont(size, family);
  let w = 0;
  for (const l of lines) w = Math.max(w, ctx.measureText(l).width);
  return w;
}

function fitFixed(text, boxW, family, maxFont, minFont, lineSpacing) {
  let size = maxFont;
  while (size > minFont) {
    const lines = wrapText(text, boxW, size, family);
    if (widestLine(lines, size, family) <= boxW) break;
    size -= 2;
  }
  size = Math.max(size, minFont);
  const lines = wrapText(text, boxW, size, family);
  return { size, lines, lineH: lineHeightFor(size, family, lineSpacing) };
}

function fitShrink(text, boxW, boxH, family, maxFont, minFont, lineSpacing) {
  let size = maxFont;
  while (size >= minFont) {
    const lines = wrapText(text, boxW, size, family);
    const lineH = lineHeightFor(size, family, lineSpacing);
    const widthOk = widestLine(lines, size, family) <= boxW;
    if (lineH * lines.length <= boxH && widthOk) {
      return { size, lines, lineH };
    }
    size -= 2;
  }
  const lines = wrapText(text, boxW, minFont, family);
  return { size: minFont, lines, lineH: lineHeightFor(minFont, family, lineSpacing) };
}

function drawField(field) {
  const cfg = CFG.fields[field];
  let text = data[field] || "";
  if (!text.trim()) return;
  text = applyCase(text, cfg.case || "none");

  const [x, y, w, h] = cfg.box;
  const family = cfg.font;
  const lineSpacing = cfg.line_spacing || 1.1;

  let fit;
  if (cfg.fit_mode === "shrink") {
    fit = fitShrink(text, w, h, family, cfg.max_font, cfg.min_font, lineSpacing);
  } else {
    fit = fitFixed(text, w, family, cfg.max_font, cfg.min_font, lineSpacing);
  }
  const { size, lines, lineH } = fit;

  setFont(size, family);
  ctx.fillStyle = cfg.color || "#FFFFFF";
  ctx.textBaseline = "top";

  const totalH = lineH * lines.length;
  let curY;
  if (cfg.valign === "middle") curY = y + (h - totalH) / 2;
  else if (cfg.valign === "bottom") curY = y + (h - totalH);
  else curY = y;

  for (const line of lines) {
    const lineW = ctx.measureText(line).width;
    let curX;
    if (cfg.align === "center") curX = x + (w - lineW) / 2;
    else if (cfg.align === "right") curX = x + (w - lineW);
    else curX = x;
    ctx.fillText(line, curX, curY);
    curY += lineH;
  }
}

function render() {
  ctx.clearRect(0, 0, CANVAS, CANVAS);
  if (templateImg) {
    ctx.drawImage(templateImg, 0, 0, CANVAS, CANVAS);
  } else {
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, CANVAS, CANVAS);
  }
  if (!fontsReady) return;
  for (const field of ORDER) drawField(field);
}

// ---------- aset ----------
function loadTemplate() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { templateImg = img; resolve(true); };
    img.onerror = () => resolve(false);
    img.src = CFG.template;
  });
}

async function loadFonts() {
  try {
    const cool = new FontFace("Coolvetica", 'url("coolvetica.otf")');
    const helv = new FontFace("Helvetica", 'url("helvetica.ttf")');
    const loaded = await Promise.all([cool.load(), helv.load()]);
    loaded.forEach((f) => document.fonts.add(f));
    fontsReady = true;
    return true;
  } catch (e) {
    fontsReady = true;
    return false;
  }
}

// ---------- unduh ----------
function slugify(t) {
  return (String(t).toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-")) || "loker";
}

function download() {
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(data.posisi)}_${slugify(data.perusahaan)}.png`.slice(0, 90);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    statusMsg.textContent = "PNG terunduh. Cek galeri/Downloads, lalu posting ke Instagram.";
  }, "image/png");
}

// =====================================================================
// PARSER LOKER (rule-based). Fokus: ambil posisi yang mengandung "DRAFTER".
// Mendukung format ID/EN, multi-posisi, postingan panjang maupun singkat.
// =====================================================================
function cleanVal(s) {
  return String(s || "")
    .replace(/[\*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s:\-–—]+|[\s:\-–—.,;]+$/g, "")
    .trim();
}

// Akronim yang harus tetap KAPITAL saat merapikan teks.
const KEEP_UPPER = new Set(["PT", "CV", "UD", "PD", "TBK", "BIM", "IKN", "PUPR", "NRC", "SLD", "BOQ", "WFH", "HRD", "3D", "2D"]);
function niceCase(s) {
  return cleanVal(s).split(" ").map((w) => {
    if (!w) return w;
    const bare = w.replace(/[.,)]/g, "");
    if (w === w.toUpperCase() && KEEP_UPPER.has(bare.toUpperCase())) return w;
    if (w.length > 1 && w === w.toUpperCase()) return w[0] + w.slice(1).toLowerCase();
    return w[0].toUpperCase() + w.slice(1);
  }).join(" ");
}

// Ambil judul posisi yang mengandung "Drafter" (paling spesifik bila ada).
function extractDrafter(raw) {
  let m = raw.match(/\bDrafter\s+(Bocad\s*\/\s*Tekla|Bocad|Tekla|Mekanikal|Mechanical|Arsitektur|Architecture|Sipil|Civil|Interior|Staff|Electrical|Elektrikal|Landscape|Struktur|Structural)\b/i);
  if (m) return niceCase("Drafter " + m[1]);
  m = raw.match(/\b(Interior|Mechanical|Mekanikal|Electrical|Elektrikal|Civil|Sipil|Junior|Senior|Architecture|Arsitektur|Structural|Landscape)\s+Drafter\b/i);
  if (m) return niceCase(m[1] + " Drafter");
  if (/\bDrafter\b/i.test(raw)) return "Drafter";
  return "";
}

// Ambil nama perusahaan (PT/CV/dst, atau "perusahaan X").
const COMP_STOP = new Set([
  "salah", "satu", "merupakan", "adalah", "sebagai", "yang", "kontraktor", "perusahaan",
  "kami", "sedang", "membutuhkan", "membuka", "mencari", "looking", "hiring", "currently",
  "is", "are", "proyek", "jasa", "salah", "kini", "saat", "dengan", "untuk",
  // kata jabatan/penanda → berhenti agar nama perusahaan tidak kebablasan
  "drafter", "estimator", "supervisor", "engineer", "manager", "surveyor", "architect",
  "technical", "site", "quantity", "posisi", "position", "lowongan", "kualifikasi",
  "requirement", "tugas", "membutuhkan", "membuka",
]);

function extractCompany(raw) {
  const re = /\b(PT|CV|UD|PD|Perum|Koperasi|Yayasan)\.?/gi;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const after = raw.slice(m.index).replace(/\n/g, " ");
    const tokens = after.split(/\s+/);
    const out = [tokens[0]];
    for (let i = 1; i < tokens.length && out.length < 6; i++) {
      const cut = (tokens[i].match(/^[^@(),\n]*/) || [""])[0];
      const word = cut.replace(/[.;:]+$/, "");
      if (!word) break;
      const lw = word.toLowerCase().replace(/[^a-z]/g, "");
      if (lw && COMP_STOP.has(lw)) break;
      if (/^[a-z]/.test(word) && word !== "&") break;
      out.push(cut);
      if (/[@(),]/.test(tokens[i])) break;
    }
    const name = cleanVal(out.join(" "));
    if (name.replace(/[^A-Za-z]/g, "").length > 2) return niceCase(name);
  }
  const pm = raw.match(/(?:untuk\s+)?perusahaan\s+(.+?)(?=\s*@|\n|,|\.|$)/i);
  if (pm) return niceCase(pm[1]);
  return "";
}

// Daftar kota umum (untuk ambil NAMA KOTA saja, bukan kecamatan/provinsi).
const CITY_PATTERNS = [
  /Jakarta(?:\s+(?:Barat|Timur|Selatan|Utara|Pusat))?/i,
  /Tangerang(?:\s+Selatan)?/i, /Bandung/i, /Surabaya/i, /Semarang/i,
  /Yogyakarta/i, /Medan/i, /Makassar/i, /Palembang/i, /Bekasi/i, /Depok/i,
  /Bogor/i, /Cilegon/i, /Serang/i, /Denpasar/i, /Malang/i, /Batam/i,
  /Pekanbaru/i, /Balikpapan/i, /Samarinda/i, /Banjarmasin/i, /Pontianak/i,
  /Manado/i, /Padang/i, /Bandar Lampung/i, /Lampung/i, /Cikarang/i,
  /Karawang/i, /Cirebon/i, /Surakarta/i, /Solo/i, /Sidoarjo/i, /Gresik/i,
  /Kudus/i, /Cibitung/i, /Purwakarta/i, /Sukabumi/i, /Tasikmalaya/i,
  /Jember/i, /Kediri/i, /Mojokerto/i, /Pasuruan/i, /Cilacap/i, /Tegal/i,
];
// Alias slang -> nama kota baku.
const CITY_ALIAS = {
  tangsel: "Tangerang Selatan", jaksel: "Jakarta Selatan", jaktim: "Jakarta Timur",
  jakbar: "Jakarta Barat", jakut: "Jakarta Utara", jakpus: "Jakarta Pusat",
  jabodetabek: "Jabodetabek", jogja: "Yogyakarta", jogjakarta: "Yogyakarta",
  bdg: "Bandung", sby: "Surabaya",
};

// Dari sebuah string lokasi mentah, kembalikan NAMA KOTA-nya saja.
function resolveCity(locStr) {
  const s = cleanVal(locStr);
  if (!s) return "";
  // 1) alias slang
  const key = s.toLowerCase().replace(/[^a-z]/g, "");
  if (CITY_ALIAS[key]) return CITY_ALIAS[key];
  // 2) cocokkan kota yang dikenal
  for (const re of CITY_PATTERNS) {
    const mm = s.match(re);
    if (mm) return niceCase(mm[0]);
  }
  // 3) ada pemisah "-" (kecamatan - kota) -> ambil bagian setelah strip
  if (s.includes("-")) return niceCase(s.split("-").pop());
  // 4) terakhir: ambil maksimal 2 kata pertama (hindari kalimat panjang)
  return niceCase(s.split(" ").slice(0, 2).join(" "));
}

// Ambil lokasi/kota (nama berkapital agar tidak salah ambil kata biasa).
function extractLocation(raw) {
  let m = raw.match(/(?:lokasi(?:\s*penempatan|\s*kerja)?|location|penempatan|domisili|placement|wilayah)\s*[:\-]\s*([A-Za-z][A-Za-z .'\-]+?)(?=[\n,.(/]|$)/i);
  if (m) return resolveCity(m[1]);
  m = raw.match(/(?:lokasi(?:\s*kerja)?|penempatan(?:\s*kerja)?|domisili|berlokasi di|cabang|kawasan)\s+(?:kerja\s+)?(?:di\s+)?([A-Z][A-Za-z .'\-]+?)(?=[\n,.(/]|$)/i);
  if (m) return resolveCity(m[1]);
  // fallback: scan kota di seluruh teks
  for (const re of CITY_PATTERNS) {
    const mm = raw.match(re);
    if (mm) return niceCase(mm[0]);
  }
  return "";
}


function parseLoker(text) {
  const out = { posisi: "", lokasi: "", perusahaan: "", deskripsi: "", kontak: "" };
  const raw = String(text).replace(/\r/g, "");
  const isID = /\b(dibutuhkan|lowongan|perusahaan|penempatan|lamaran|kirim|melamar|persyaratan|kualifikasi|gaji|domisili|segera)\b/i.test(raw);

  // KONTAK: email > nomor WA > tautan (bit.ly/shorturl/dll)
  const email = raw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  if (email) {
    out.kontak = email[0];
  } else {
    const wa = raw.match(/(?:\+?62|0)\s?8[0-9][0-9\s().-]{6,15}[0-9]/);
    if (wa) {
      out.kontak = wa[0].replace(/[\s().-]/g, "");
    } else {
      const link = raw.match(/((?:https?:\/\/)?(?:bit\.ly|shorturl\.at|tinyurl\.com|linktr\.ee|s\.id)\/[^\s]+)/i);
      if (link) out.kontak = link[1];
    }
  }

  out.posisi = extractDrafter(raw);
  out.perusahaan = extractCompany(raw);
  out.lokasi = extractLocation(raw);

  // DESKRIPSI = teks ajakan singkat (detail dibaca di caption IG)
  out.deskripsi = isID ? "Kirim CV ke:" : "Send your CV to:";

  return out;
}

function applyFields(parsed) {
  let filled = 0;
  document.querySelectorAll("input[data-field], textarea[data-field]").forEach((el) => {
    const f = el.dataset.field;
    if (parsed[f]) { el.value = parsed[f]; data[f] = parsed[f]; filled++; }
  });
  render();
  return filled;
}

function autoFill() {
  const text = $("#pasteText").value;
  const msg = $("#parseMsg");
  if (!text.trim()) {
    msg.textContent = "Tempel teks lowongan dulu di kotak atas.";
    msg.className = "note parse-warn";
    return;
  }
  const parsed = parseLoker(text);
  applyFields(parsed);

  const empty = ORDER.filter((f) => !parsed[f]);
  if (empty.length === 0) {
    msg.textContent = "Terisi otomatis. Cek & rapikan bila perlu, lalu Unduh PNG.";
    msg.className = "note parse-ok";
  } else {
    const labels = empty.map((f) => FIELD_LABELS[f]).join(", ");
    msg.textContent = `Sebagian terisi. Belum kebaca: ${labels} — isi/perbaiki manual ya.`;
    msg.className = "note parse-warn";
  }
}

// ---------- events ----------
function bind() {
  const auto = document.getElementById("btnAutoFill");
  if (auto) auto.addEventListener("click", autoFill);

  document.querySelectorAll("[data-field]").forEach((el) => {
    el.addEventListener("input", () => {
      data[el.dataset.field] = el.value;
      render();
    });
  });
  document.getElementById("btnDownload").addEventListener("click", download);
  document.getElementById("btnDownload2").addEventListener("click", download);
  document.getElementById("btnReset").addEventListener("click", () => {
    document.querySelectorAll("[data-field]").forEach((el) => (el.value = ""));
    ORDER.forEach((f) => (data[f] = ""));
    render();
  });
}

async function init() {
  bind();
  statusMsg.textContent = "Memuat template & font...";
  await Promise.all([loadTemplate(), loadFonts()]);
  statusMsg.textContent = "Isi data di samping, poster otomatis ter-update.";
  render();
}

init();
