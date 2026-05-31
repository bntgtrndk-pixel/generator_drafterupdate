// Loker Drafter - Web Editor
// ===========================
"use strict";

const CANVAS = 1080; // ukuran kanvas asli (config dalam piksel 1080)
const FIELD_LABELS = {
  posisi: "Posisi", lokasi: "Lokasi", perusahaan: "Perusahaan",
  deskripsi: "Deskripsi", kontak: "Kontak",
};

let config = null;
let lokers = [];
let lokerIndex = 0;
let activeField = null;
const boxEls = {}; // field -> elemen .box

const $ = (sel) => document.querySelector(sel);
const previewImg = $("#previewImg");
const previewWrap = $("#previewWrap");
const boxLayer = $("#boxLayer");
const statusMsg = $("#statusMsg");

// ---------- init ----------
async function init() {
  config = await (await fetch("/api/config")).json();
  lokers = await (await fetch("/api/lokers")).json();
  if (!Array.isArray(lokers) || lokers.length === 0) {
    lokers = [{ posisi: "", lokasi: "", perusahaan: "", deskripsi: "", kontak: "" }];
  }
  buildFieldSelect();
  buildBoxes();
  loadLoker(0);
  activeField = Object.keys(config.fields)[0];
  $("#fieldSelect").value = activeField;
  setActiveField(activeField);
  bindEvents();
  await applyLockState();
  refreshPreview();
}

// Sembunyikan tombol simpan layout bila server dalam mode terkunci (publik).
async function applyLockState() {
  try {
    const st = await (await fetch("/api/status")).json();
    if (st.editor_locked) {
      const btn = $("#btnSave");
      if (btn) btn.style.display = "none";
      const sl = $("#saveLokers");
      if (sl) sl.style.display = "none";
    }
  } catch (e) { /* abaikan: anggap tidak terkunci */ }
}


function buildFieldSelect() {
  const sel = $("#fieldSelect");
  sel.innerHTML = "";
  Object.keys(config.fields).forEach((k) => {
    const o = document.createElement("option");
    o.value = k; o.textContent = FIELD_LABELS[k] || k;
    sel.appendChild(o);
  });
}

// ---------- buat semua kotak field di preview ----------
function buildBoxes() {
  boxLayer.innerHTML = "";
  Object.keys(config.fields).forEach((field) => {
    const box = document.createElement("div");
    box.className = "box";
    box.dataset.field = field;

    const label = document.createElement("span");
    label.className = "box-label";
    label.textContent = FIELD_LABELS[field] || field;
    box.appendChild(label);

    const handle = document.createElement("div");
    handle.className = "resize-handle";
    box.appendChild(handle);

    boxLayer.appendChild(box);
    boxEls[field] = box;
    setupDrag(box, field, handle);
  });
  positionAllBoxes();
}

// ---------- data loker ----------
function loadLoker(i) {
  lokerIndex = (i + lokers.length) % lokers.length;
  const d = lokers[lokerIndex];
  document.querySelectorAll("[data-field]").forEach((el) => {
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.value = d[el.dataset.field] || "";
    }
  });
  $("#lokerCounter").textContent = `${lokerIndex + 1} / ${lokers.length}`;
}

function currentData() {
  const d = {};
  document.querySelectorAll("input[data-field], textarea[data-field]").forEach((el) => {
    d[el.dataset.field] = el.value;
  });
  return d;
}

// ---------- pilih field aktif ----------
function setActiveField(field) {
  activeField = field;
  Object.entries(boxEls).forEach(([f, el]) => {
    el.classList.toggle("active", f === field);
  });
  $("#fieldSelect").value = field;
  loadFieldControls();
}

// ---------- kontrol field (atur teks) ----------
function loadFieldControls() {
  const f = config.fields[activeField];
  $("#boxX").value = f.box[0];
  $("#boxY").value = f.box[1];
  $("#boxW").value = f.box[2];
  $("#boxH").value = f.box[3];
  $("#fitMode").value = f.fit_mode || "fixed";
  $("#maxFont").value = f.max_font;
  $("#minFont").value = f.min_font;
  $("#lblMaxFont").textContent = (f.fit_mode === "shrink") ? "Ukuran Maks" : "Ukuran Font";

  const color = (f.color || "#FFFFFF").toUpperCase();
  $("#colorPick").value = color;
  $("#colorHex").value = color;
  $("#alignSel").value = f.align || "center";
  $("#valignSel").value = f.valign || "middle";
  $("#caseSel").value = f.case || "none";
  $("#lineSpacing").value = f.line_spacing != null ? f.line_spacing : 1.1;
  $("#fontSel").value = f.font || "Helvetica.ttf";
}

function pushFieldControls() {
  const f = config.fields[activeField];
  f.box = [num("#boxX"), num("#boxY"), num("#boxW"), num("#boxH")];
  f.fit_mode = $("#fitMode").value;
  f.max_font = num("#maxFont");

  f.min_font = num("#minFont");
  f.color = $("#colorHex").value;
  f.align = $("#alignSel").value;
  f.valign = $("#valignSel").value;
  f.case = $("#caseSel").value;
  f.line_spacing = parseFloat($("#lineSpacing").value) || 1.1;
  f.font = $("#fontSel").value;
}

const num = (sel) => parseInt($(sel).value, 10) || 0;

// ---------- preview ----------
let previewTimer = null;
function refreshPreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(async () => {
    statusMsg.textContent = "Memperbarui preview...";
    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, data: currentData() }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      if (previewImg.src.startsWith("blob:")) URL.revokeObjectURL(previewImg.src);
      previewImg.src = URL.createObjectURL(blob);
      statusMsg.textContent = "Ketuk kotak untuk pilih, seret untuk geser, tarik pojok untuk ubah ukuran.";
    } catch (e) {
      statusMsg.textContent = "Gagal preview: " + e.message;
    }
    positionAllBoxes();
  }, 180);
}

// ---------- posisi kotak (peta 1080 -> piksel layar) ----------
function scaleFactor() {
  return previewWrap.clientWidth / CANVAS;
}

function positionBox(field) {
  const f = config.fields[field];
  const el = boxEls[field];
  if (!f || !el) return;
  const s = scaleFactor();
  el.style.left = f.box[0] * s + "px";
  el.style.top = f.box[1] * s + "px";
  el.style.width = f.box[2] * s + "px";
  el.style.height = f.box[3] * s + "px";
}

function positionAllBoxes() {
  Object.keys(config.fields).forEach(positionBox);
}

// ---------- drag & resize per kotak ----------
function setupDrag(box, field, handle) {
  let mode = null;
  let startX, startY, startBox, moved;

  const getPoint = (e) => {
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX, y: t.clientY };
  };

  const onDown = (e, m) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveField(field);
    mode = m;
    moved = false;
    const p = getPoint(e);
    startX = p.x; startY = p.y;
    startBox = [...config.fields[field].box];
    document.addEventListener("mousemove", onMove, { passive: false });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
  };

  const onMove = (e) => {
    if (!mode) return;
    e.preventDefault();
    const p = getPoint(e);
    const s = scaleFactor();
    const dx = Math.round((p.x - startX) / s);
    const dy = Math.round((p.y - startY) / s);
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) moved = true;
    const f = config.fields[field];
    if (mode === "move") {
      f.box[0] = clamp(startBox[0] + dx, 0, CANVAS - f.box[2]);
      f.box[1] = clamp(startBox[1] + dy, 0, CANVAS - f.box[3]);
    } else {
      f.box[2] = clamp(startBox[2] + dx, 40, CANVAS - f.box[0]);
      f.box[3] = clamp(startBox[3] + dy, 20, CANVAS - f.box[1]);
    }
    loadFieldControls();
    positionBox(field);
  };

  const onUp = () => {
    if (!mode) return;
    mode = null;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("mouseup", onUp);
    document.removeEventListener("touchend", onUp);
    if (moved) refreshPreview();
  };

  handle.addEventListener("mousedown", (e) => onDown(e, "resize"));
  handle.addEventListener("touchstart", (e) => onDown(e, "resize"), { passive: false });
  box.addEventListener("mousedown", (e) => onDown(e, "move"));
  box.addEventListener("touchstart", (e) => onDown(e, "move"), { passive: false });
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---------- events ----------
function bindEvents() {
  // tabs
  document.querySelectorAll(".tab").forEach((t) => {
    t.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      $("#tab-isi").hidden = t.dataset.tab !== "isi";
      $("#tab-atur").hidden = t.dataset.tab !== "atur";
    });
  });

  // isi loker -> preview
  document.querySelectorAll("input[data-field], textarea[data-field]").forEach((el) => {
    el.addEventListener("input", () => {
      lokers[lokerIndex][el.dataset.field] = el.value;
      refreshPreview();
    });
  });

  // navigasi loker
  $("#prevLoker").addEventListener("click", () => { loadLoker(lokerIndex - 1); refreshPreview(); });
  $("#nextLoker").addEventListener("click", () => { loadLoker(lokerIndex + 1); refreshPreview(); });

  // pilih field via dropdown
  $("#fieldSelect").addEventListener("change", (e) => {
    setActiveField(e.target.value);
    // pindah ke tab atur teks supaya kontrol terlihat
    document.querySelector('.tab[data-tab="atur"]').click();
  });

  // kontrol atur teks
  ["#boxX", "#boxY", "#boxW", "#boxH", "#fitMode", "#maxFont", "#minFont",
   "#alignSel", "#valignSel", "#caseSel", "#lineSpacing", "#fontSel"].forEach((sel) => {
    $(sel).addEventListener("input", () => {
      pushFieldControls();
      $("#lblMaxFont").textContent = ($("#fitMode").value === "shrink") ? "Ukuran Maks" : "Ukuran Font";
      positionBox(activeField);
      refreshPreview();
    });
  });


  // warna
  $("#colorPick").addEventListener("input", (e) => {
    $("#colorHex").value = e.target.value.toUpperCase();
    pushFieldControls(); refreshPreview();
  });
  $("#colorHex").addEventListener("input", (e) => {
    let v = e.target.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) { $("#colorPick").value = v; }
    pushFieldControls(); refreshPreview();
  });

  // toggle tampilkan kotak
  $("#toggleBoxes").addEventListener("change", (e) => {
    boxLayer.classList.toggle("hidden-boxes", !e.target.checked);
  });

  // simpan & generate
  $("#btnSave").addEventListener("click", saveConfig);
  $("#saveLokers").addEventListener("click", saveLokers);
  $("#btnDownload").addEventListener("click", generatePNG);

  window.addEventListener("resize", positionAllBoxes);
  previewImg.addEventListener("load", positionAllBoxes);
}

// ---------- simpan ----------
async function saveConfig() {
  const r = await fetch("/api/save-config", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  const j = await r.json();
  statusMsg.textContent = j.ok ? "Layout tersimpan permanen ke config.json ✓" : "Gagal simpan: " + j.error;
}

async function saveLokers() {
  const r = await fetch("/api/save-lokers", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lokers),
  });
  const j = await r.json();
  statusMsg.textContent = j.ok ? "Data loker tersimpan ✓" : "Gagal simpan data loker";
}

async function generatePNG() {
  statusMsg.textContent = "Membuat PNG...";
  const r = await fetch("/api/generate", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config, data: currentData() }),
  });
  const j = await r.json();
  statusMsg.textContent = j.ok ? `Poster dibuat: output/${j.file} ✓` : "Gagal generate: " + j.error;
}

init();
