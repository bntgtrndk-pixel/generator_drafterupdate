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

// Tinggi baris berdasar metrik font (mendekati ascent+descent Pillow).
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

// fit "fixed": ukuran tetap = maxFont, hanya mengecil bila terlalu lebar.
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

// fit "shrink": menyusut sampai muat tinggi & lebar box.
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
    // fallback: tetap render pakai font sistem
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

// ---------- auto-parse teks loker -> 5 field ----------
function parseLoker(text) {
  const out = { posisi: "", lokasi: "", perusahaan: "", deskripsi: "", kontak: "" };
  const raw = String(text).replace(/\r/g, "");
  const lines = raw.split("\n").map((l) => l.trim()).filter((l) => l.length);

  // KONTAK: email dulu, kalau tidak ada cari nomor WA
  const email = raw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  if (email) {
    out.kontak = email[0];
  } else {
    const wa = raw.match(/(?:\+?62|0)\s?8[0-9][0-9\s-]{6,13}[0-9]/);
    if (wa) out.kontak = wa[0].replace(/[\s-]/g, "");
  }

  // LOKASI: baris "Location/Lokasi/Penempatan/Domisili : xxx"
  const loc = raw.match(/(?:lokasi(?:\s*penempatan)?|location|penempatan|domisili|placement)\s*[:\-]\s*(.+)/i);
  if (loc) out.lokasi = loc[1].split(/[\n.,;|]/)[0].trim();

  // PERUSAHAAN: pola "PT/CV/UD/PD Nama ... (sebelum kata kerja/koma)"
  const comp = raw.match(/\b((?:PT|CV|UD|PD)\.?\s+[A-Z][A-Za-z0-9&.\-\s]+?)(?=\s+(?:looking|hiring|currently|is|are|membuka|mencari|sedang|membutuhkan|opening|invites?|seeking|adalah)\b|[\n,.])/);
  if (comp) {
    out.perusahaan = comp[1].trim().replace(/\s+/g, " ");
  } else {
    const cl = lines.find((l) => /^(PT|CV|UD|PD)\b/i.test(l));
    if (cl) out.perusahaan = cl.split(/\s+(?:looking|is|are|membuka|mencari|membutuhkan)\b/i)[0].trim();
  }

  // POSISI: 1) dari dalam kurung [ ... - POSISI ]  2) "looking for ... to join"  3) "dibutuhkan/posisi: xxx"
  const br = raw.match(/\[([^\]]+)\]/);
  if (br) {
    let t = br[1];
    if (t.includes("-")) t = t.split("-").pop();
    if (t.includes(":")) t = t.split(":").pop();
    out.posisi = t.trim();
  }
  if (!out.posisi) {
    const lf = raw.match(/looking for\s+(?:an?\s+)?(?:experienced\s+|several\s+)?(.+?)(?:\s+to join|\.|,)/i);
    if (lf) out.posisi = lf[1].trim();
  }
  if (!out.posisi) {
    const db = raw.match(/(?:dibutuhkan|membutuhkan|lowongan(?:\s*kerja)?|posisi|vacancy|position|hiring)\s*[:\-]?\s*(.+)/i);
    if (db) out.posisi = db[1].split(/[\n.,;|]/)[0].trim();
  }
  // bersihkan kata umum dari posisi
  out.posisi = out.posisi.replace(/^(job\s*vacancy|vacancy|loker|lowongan(?:\s*kerja)?)\s*[-:]\s*/i, "").trim();

  // DESKRIPSI: bukan requirement panjang, melainkan teks ajakan singkat
  // di atas kontak. Default "Send your CV to:" (detail dibaca di caption IG).
  out.deskripsi = "Send your CV to:";

  return out;
}


// Coba AI (Netlify Function) dulu; jika gagal, pakai parser rule-based.
async function parseWithAI(text) {
  const res = await fetch("/.netlify/functions/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const j = await res.json();
  if (!j.ok || !j.fields) throw new Error(j.error || "AI gagal");
  return j.fields;
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

async function autoFill() {
  const text = $("#pasteText").value;
  const msg = $("#parseMsg");
  const btn = $("#btnAutoFill");
  if (!text.trim()) {
    msg.textContent = "Tempel teks lowongan dulu di kotak atas.";
    msg.className = "note parse-warn";
    return;
  }

  btn.disabled = true;
  msg.textContent = "Memproses dengan AI...";
  msg.className = "note";

  let parsed = null;
  let usedAI = false;
  try {
    parsed = await parseWithAI(text);
    usedAI = true;
  } catch (e) {
    parsed = parseLoker(text); // fallback rule-based
  }

  applyFields(parsed);
  btn.disabled = false;

  const empty = ORDER.filter((f) => !parsed[f]);
  const tag = usedAI ? "AI" : "mode dasar (AI tdk tersedia)";
  if (empty.length === 0) {
    msg.textContent = `Terisi otomatis via ${tag}. Cek & rapikan bila perlu, lalu Unduh PNG.`;
    msg.className = "note parse-ok";
  } else {
    const labels = empty.map((f) => FIELD_LABELS[f]).join(", ");
    msg.textContent = `Via ${tag}. Belum kebaca: ${labels} — isi/perbaiki manual ya.`;
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
