# P7M_PDF_Viewer


[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/R0mb0/P7M_PDF_Viewer)
[![Open Source Love svg3](https://badges.frapsoft.com/os/v3/open-source.svg?v=103)](https://github.com/R0mb0/P7M_PDF_Viewer)
[![MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/license/mit)

Client‑side viewer to open PDF documents embedded in P7M (CAdES) files directly in the browser. Modern UI, automatic light/dark theme and language detection, drag & drop, stacked page rendering, selectable text, and local download. 100% front‑end, no backend or uploads.

<div align="center">

## 👉 [Click here to test the page!]() 👈

</div>

---

## 🚀 Features

- Open P7M‑signed PDFs fully client‑side (privacy‑first)
- Modern, responsive UI with rounded components
- Auto theme (light/dark) via prefers‑color‑scheme
- Auto language: Italian if browser is IT, English otherwise
- Drag & drop or green “Open document” button
- Stacked page viewer (A4 portrait/landscape) with smooth scrolling
- Selectable/copyable text via PDF.js text layer
- Download extracted PDF and “Reset” to restart
- No backend, no file uploads, no installation

---

## 🛠️ How it works

1. The app reads the P7M file as raw bytes in the browser.
2. It applies a pragmatic “file carving” approach to extract PDFs by:
   - Removing a set of known ASN.1 byte sequences commonly seen around CAdES content.
   - Locating the first “%PDF” header and the last “%%EOF” marker, and slicing the in‑between segment.
3. The extracted PDF is rendered with PDF.js. Pages are stacked vertically and a text layer is placed above the canvas to enable natural text selection.
4. You can download the extracted PDF or reset the UI to load another file.

Note: This is an empirical extraction method aimed specifically at PDFs inside P7M. It does not verify the digital signature.

---

## 🔒 Privacy & Security

- 100% front‑end: processing happens in your browser.
- No files are uploaded to any server.
- No signature validation is performed; only extraction and viewing of the embedded PDF.

---

## ⚡ Getting Started

1. Download or clone this repository.
2. Make sure the following files are present in the same folder:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `pdf.min.js`
   - `pdf.worker.min.js`
   - (optional) `pkijs-asn1js.bundle.js` for future local signature/ASN.1 experiments
3. Open `index.html` in a modern browser.

If your browser blocks local worker files, serve the folder with a tiny static server, for example:

```bash
# Python 3
python -m http.server 8000

# or with Node (requires npx)
npx serve .
```

Then open http://localhost:8000

---

## 🧭 Usage

- From the landing screen:
  - Click the green “Open document” button and select a `.p7m` file, or
  - Drag and drop a `.p7m` file into the blue drop zone.
- After loading:
  - The landing controls disappear (only the title remains), the PDF pages are shown stacked.
  - Use “Download document” to save the extracted PDF.
  - Use “Reset” to go back and open a different file.

Language and theme are applied automatically:
- Language: Italian if your browser locale starts with “it”, English otherwise.
- Theme: respects the system light/dark preference.

---

## 🧩 Project Structure

```
Viewer/
├─ index.html         # App shell: layout, script/style includes
├─ styles.css         # Modern UI, light/dark theme, viewer styles
├─ app.js             # P7M→PDF extraction, PDF.js rendering, UI logic
├─ pdf.min.js         # PDF.js library (local)
├─ pdf.worker.min.js  # PDF.js worker (local)
└─ pkijs-asn1js.bundle.js (optional)
```

---

## ✅ Browser Support

- Chrome, Firefox, Edge, Safari — latest versions recommended
- Desktop and mobile supported; very large PDFs may be slower on mobile devices

---

## ⚠️ Limitations & Notes

- Works for P7M files that contain a PDF. Other embedded types are not supported.
- No digital signature validation, revocation checks, or trust verification.
- The byte‑sequence cleanup and carving approach is pragmatic and may not work for every P7M variant or producer.
- Rendering and text selection rely on PDF.js; quality may vary depending on the PDF content.

---

## 🙌 Credits & Inspiration

- [PDF.js](https://github.com/mozilla/pdf.js)
