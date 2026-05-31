// Layout TERKUNCI (sama dengan config.json versi server).
// Kanvas 1080x1080. box = [x, y, lebar, tinggi] piksel.
// fit_mode: "fixed" = ukuran font tetap (teks pendek tidak membesar, hanya
//           mengecil bila terlalu lebar). "shrink" = menyesuaikan isi kotak.
window.LOKER_CONFIG = {
  template: "template.png",
  output_size: [1080, 1080],
  fields: {
    posisi: {
      box: [88, 189, 900, 220],
      font: "Coolvetica",
      fit_mode: "fixed",
      max_font: 85, min_font: 50,
      color: "#FFFFFF",
      align: "center", valign: "middle",
      case: "upper", line_spacing: 1.0,
    },
    lokasi: {
      box: [88, 351, 900, 90],
      font: "Coolvetica",
      fit_mode: "fixed",
      max_font: 60, min_font: 26,
      color: "#FFFFFF",
      align: "center", valign: "middle",
      case: "title", line_spacing: 1.05,
    },
    perusahaan: {
      box: [88, 495, 900, 110],
      font: "Coolvetica",
      fit_mode: "fixed",
      max_font: 60, min_font: 30,
      color: "#FFFFFF",
      align: "center", valign: "middle",
      case: "title", line_spacing: 1.05,
    },
    deskripsi: {
      box: [88, 599, 901, 70],
      font: "Helvetica",
      fit_mode: "shrink",
      max_font: 30, min_font: 10,
      color: "#FFFFFF",
      align: "center", valign: "top",
      case: "title", line_spacing: 1.3,
    },
    kontak: {
      box: [88, 618, 900, 80],
      font: "Helvetica",
      fit_mode: "fixed",
      max_font: 30, min_font: 20,
      color: "#FFFFFF",
      align: "center", valign: "middle",
      case: "lower", line_spacing: 1.1,
    },
  },
};

// Urutan field & label tampilan
window.FIELD_ORDER = ["posisi", "lokasi", "perusahaan", "deskripsi", "kontak"];
window.FIELD_LABELS = {
  posisi: "Posisi", lokasi: "Lokasi", perusahaan: "Perusahaan",
  deskripsi: "Deskripsi", kontak: "Kontak",
};
