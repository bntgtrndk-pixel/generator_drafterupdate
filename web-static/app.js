// Loker Drafter - Versi Statis (render di browser pakai Canvas)
// =============================================================
// Meniru logika render Pillow (generate.py): fit_fixed / shrink, wrap teks,
// kapitalisasi, perataan horizontal & vertikal. Tidak butuh server.
"use strict";

const CFG = window.LOKER_CONFIG;
const ORDER = window.FIELD_ORDER;
const CANVAS = CFG.output_size[0]; // 1080

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

// ---------- events ----------
function bind() {
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
