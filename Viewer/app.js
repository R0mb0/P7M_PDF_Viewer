(function() {
  'use strict';

  // Rilevazione lingua
  const isItalian = (navigator.language || (navigator.languages && navigator.languages[0]) || 'en')
    .toLowerCase().startsWith('it');

  const t = isItalian ? {
    title: 'Apri documenti P7m',
    open: 'Apri documento',
    dropHere: 'Rilascia qui il file',
    hint: 'Seleziona un file .p7m oppure trascinalo qui.',
    processing: 'Elaborazione in corso…',
    invalidType: 'Formato non supportato. Seleziona un file con estensione .p7m.',
    noPdfFound: 'Il file non contiene un PDF valido. Assicurati che sia un P7M con documento PDF.',
    download: 'Scarica documento',
    reset: 'Reset',
    pagesCount: (n) => `${n} pagine`,
  } : {
    title: 'Open P7m documents',
    open: 'Open document',
    dropHere: 'Drop file here',
    hint: 'Choose a .p7m file or drag & drop it here.',
    processing: 'Processing…',
    invalidType: 'Unsupported format. Please choose a .p7m file.',
    noPdfFound: 'No valid PDF was found in the provided file. Make sure it is a P7M containing a PDF.',
    download: 'Download document',
    reset: 'Reset',
    pagesCount: (n) => `${n} pages`,
  };

  // Elementi DOM
  const titleEl      = document.getElementById('title');
  const openBtn      = document.getElementById('openBtn');
  const fileInput    = document.getElementById('fileInput');
  const dropZone     = document.getElementById('dropZone');
  const dropLabel    = document.getElementById('dropLabel');
  const hintEl       = document.getElementById('hint');
  const statusEl     = document.getElementById('status');
  const landing      = document.getElementById('landing');

  const viewer       = document.getElementById('viewerSection');
  const pagesContainer = document.getElementById('pagesContainer');
  const downloadBtn  = document.getElementById('downloadBtn');
  const resetBtn     = document.getElementById('resetBtn');

  // Testi iniziali
  titleEl.textContent   = t.title;
  openBtn.textContent   = t.open;
  dropLabel.textContent = t.dropHere;
  hintEl.textContent    = t.hint;
  downloadBtn.textContent = t.download;
  resetBtn.textContent    = t.reset;
  document.title = t.title;

  // Stato
  let currentPdfBlob = null;
  let currentPdfArrayBuffer = null;
  let currentDownloadName = null;
  let lockedForReset = false;

  // UI helpers
  function setStatus(msg) {
    statusEl.textContent = msg || '';
  }
  function showLanding() {
    landing.classList.remove('hidden');
    viewer.classList.add('hidden');
    lockedForReset = false;
    enableInputs(true);
    setStatus('');
  }
  function showViewer() {
    // Nasconde completamente la sezione landing (rimane solo il titolo)
    landing.classList.add('hidden');
    viewer.classList.remove('hidden');
    // blocca ulteriori input fino al reset
    lockedForReset = true;
    enableInputs(false);
  }
  function clearViewer() {
    pagesContainer.innerHTML = '';
  }
  function enableInputs(enable) {
    openBtn.disabled = !enable;
  }

  // Pulsante "Apri documento"
  openBtn.addEventListener('click', () => {
    if (lockedForReset) return;
    fileInput.click();
  });

  // Selezione file
  fileInput.addEventListener('change', async (e) => {
    if (lockedForReset) { fileInput.value=''; return; }
    const file = e.target.files && e.target.files[0];
    if (file) handleFile(file);
    fileInput.value = ''; // reset input
  });

  // Drag & drop
  function allowDragEvents() {
    ['dragenter','dragover'].forEach((evt) => {
      dropZone.addEventListener(evt, onDragEnterOver);
    });
    ['dragleave','dragend','drop'].forEach((evt) => {
      dropZone.addEventListener(evt, onDragLeaveDrop);
    });
    dropZone.addEventListener('drop', onDrop);
  }
  function removeDragEvents() {
    ['dragenter','dragover'].forEach((evt) => {
      dropZone.removeEventListener(evt, onDragEnterOver);
    });
    ['dragleave','dragend','drop'].forEach((evt) => {
      dropZone.removeEventListener(evt, onDragLeaveDrop);
    });
    dropZone.removeEventListener('drop', onDrop);
  }

  function onDragEnterOver(e) {
    if (lockedForReset) { e.preventDefault(); e.stopPropagation(); return; }
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('dragover');
    setStatus(t.dropHere);
  }
  function onDragLeaveDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');
    if (!lockedForReset) setStatus('');
  }
  function onDrop(e) {
    if (lockedForReset) { e.preventDefault(); e.stopPropagation(); return; }
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  allowDragEvents();

  // Reset
  resetBtn.addEventListener('click', () => {
    currentPdfBlob = null;
    currentPdfArrayBuffer = null;
    currentDownloadName = null;
    clearViewer();
    showLanding();
    allowDragEvents();
  });

  // Download
  downloadBtn.addEventListener('click', () => {
    if (!currentPdfBlob || !currentDownloadName) return;
    const url = URL.createObjectURL(currentPdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentDownloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Gestione file p7m
  async function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.p7m')) {
      setStatus(t.invalidType);
      return;
    }
    setStatus(t.processing);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfBuffer = extractPdfFromP7m(arrayBuffer);

      if (!pdfBuffer) {
        setStatus(t.noPdfFound);
        return;
      }

      currentPdfArrayBuffer = pdfBuffer;
      currentPdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });

      let base = file.name.replace(/\.p7m$/i, '');
      if (!base.toLowerCase().endsWith('.pdf')) base += '.pdf';
      currentDownloadName = base;

      clearViewer();
      await renderPdfInto(pagesContainer, pdfBuffer);
      showViewer(); // nasconde completamente il landing
      setStatus(`${t.pagesCount(pagesContainer.childElementCount)} — ${currentDownloadName}`);

      // durante il viewer non servono più eventi drag sulla dropzone
      removeDragEvents();
    } catch (err) {
      console.error(err);
      setStatus(err && err.message ? err.message : t.noPdfFound);
    }
  }

  // Estrazione PDF da P7M
  function extractPdfFromP7m(buffer) {
    const sequencesToRemove = [
      [4,130,1,11],[4,130,1,67],[4,130,1,87],[4,130,1,97],[4,130,1,115],
      [4,130,1,122],[4,130,1,149],[4,130,1,154],[4,130,1,195],[4,130,1,2],
      [4,130,1,253],[4,130,1,167],[4,130,1,209],[4,130,1,246],[4,130,2,25],
      [4,130,2,79],[4,130,2,105],[4,130,2,110],[4,130,2,122],[4,130,2,144],
      [4,130,2,167],[4,130,2,183],[4,130,2,202],[4,130,2,206],[4,130,2,209],
      [4,130,2,245],[4,130,3,17],[4,130,3,22],[4,130,3,30],[4,130,3,35],
      [4,130,3,58],[4,130,3,70],[4,130,3,105],[4,130,3,124],[4,130,3,148],
      [4,130,3,159],[4,130,3,165],[4,130,3,179],[4,130,3,196],[4,130,3,204],
      [4,130,3,205],[4,130,3,209],[4,130,3,226],[4,130,3,232],[4,130,4,0]
    ];
    buffer = removeSequencesFromArrayBuffer(buffer, sequencesToRemove);
    buffer = removeSequencesFromArrayBuffer(buffer, sequencesToRemove);

    const u8 = new Uint8Array(buffer);
    const pdfStart = utf8Bytes('%PDF');
    const pdfEnd   = utf8Bytes('%%EOF');

    const startIndex = indexOfSequence(u8, pdfStart, 0, false);
    const endIndex   = indexOfSequence(u8, pdfEnd, 0, true);
    if (startIndex === -1 || endIndex === -1) return null;

    const sliceEnd = endIndex + pdfEnd.length;
    if (sliceEnd <= startIndex) return null;

    const pdfSlice = u8.slice(startIndex, sliceEnd);
    return pdfSlice.buffer;
  }

  function utf8Bytes(str) {
    return new TextEncoder().encode(str);
  }

  function indexOfSequence(uint8Array, sequence, fromIndex = 0, searchLast = false) {
    let found = -1;
    outer: for (let i = fromIndex; i <= uint8Array.length - sequence.length; i++) {
      for (let j = 0; j < sequence.length; j++) {
        if (uint8Array[i + j] !== sequence[j]) continue outer;
      }
      found = i;
      if (!searchLast) break;
    }
    return found;
  }

  function removeSequencesFromArrayBuffer(buffer, sequences) {
    let u8 = new Uint8Array(buffer);
    sequences.forEach(seq => {
      const s = new Uint8Array(seq);
      let resultChunks = [];
      let last = 0;
      for (let i = 0; i <= u8.length - s.length;) {
        let match = true;
        for (let j = 0; j < s.length; j++) {
          if (u8[i + j] !== s[j]) { match = false; break; }
        }
        if (match) {
          if (i > last) resultChunks.push(u8.slice(last, i));
          i += s.length;
          last = i;
        } else {
          i++;
        }
      }
      if (last < u8.length) resultChunks.push(u8.slice(last));
      const total = resultChunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const merged = new Uint8Array(total);
      let off = 0;
      for (const chunk of resultChunks) {
        merged.set(chunk, off);
        off += chunk.length;
      }
      u8 = merged;
    });
    return u8.buffer;
  }

  // Rendering PDF con pdf.js + text layer
  async function renderPdfInto(container, arrayBuffer) {
    if (!window['pdfjsLib']) throw new Error('pdf.js non disponibile');

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const containerWidth = container.clientWidth || 900;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      const initialViewport = page.getViewport({ scale: 1 });
      const scale = (containerWidth - 32) / initialViewport.width;
      const viewport = page.getViewport({ scale });

      const pageWrapper = document.createElement('div');
      pageWrapper.className = 'page';
      pageWrapper.style.width = `${viewport.width}px`;
      pageWrapper.style.height = `${viewport.height}px`;
      container.appendChild(pageWrapper);

      const canvas = document.createElement('canvas');
      canvas.width  = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      pageWrapper.appendChild(canvas);
      const ctx = canvas.getContext('2d', { alpha: false });

      await page.render({ canvasContext: ctx, viewport }).promise;

      // text layer per selezione testo
      try {
        const textContent = await page.getTextContent();
        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;
        pageWrapper.appendChild(textLayerDiv);

        if (pdfjsLib.renderTextLayer) {
          await pdfjsLib.renderTextLayer({
            textContent,
            container: textLayerDiv,
            viewport,
            textDivs: [],
          }).promise;
        } else {
          renderTextLayerFallback(textContent, textLayerDiv, viewport);
        }
      } catch (e) {
        console.warn('Text layer non disponibile:', e);
      }
    }
  }

  // Fallback minimale per il text layer (senza pdf_viewer.js)
  function renderTextLayerFallback(textContent, container, viewport) {
    const Util = pdfjsLib && pdfjsLib.Util;
    if (!Util) return;

    for (const item of textContent.items) {
      const tx = Util.transform(viewport.transform, item.transform);
      const angle = Math.atan2(tx[2], tx[3]);
      const fontSize = Math.sqrt(tx[2]*tx[2] + tx[3]*tx[3]);

      const span = document.createElement('span');
      span.textContent = item.str;
      span.style.fontSize = `${fontSize}px`;
      span.style.transform = `translate(${tx[4]}px, ${tx[5] - fontSize}px) rotate(${angle}rad)`;
      // rendere selezionabile
      span.style.position = 'absolute';
      span.style.userSelect = 'text';
      container.appendChild(span);
    }
  }

  // Stato iniziale
  showLanding();

})();