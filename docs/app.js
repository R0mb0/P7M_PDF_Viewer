(function() {
  'use strict';

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
  };

  const titleEl   = document.getElementById('title');
  const openBtn   = document.getElementById('openBtn');
  const fileInput = document.getElementById('fileInput');
  const dropZone  = document.getElementById('dropZone');
  const dropLabel = document.getElementById('dropLabel');
  const hintEl    = document.getElementById('hint');
  const statusEl  = document.getElementById('status');
  const landing   = document.getElementById('landing');

  const embedSection = document.getElementById('embedSection');
  const pdfEmbed     = document.getElementById('pdfEmbed');

  const downloadBtn2 = document.getElementById('downloadBtn2');
  const resetBtn2    = document.getElementById('resetBtn2');

  titleEl.textContent = t.title;
  openBtn.textContent = t.open;
  dropLabel.textContent = t.dropHere;
  hintEl.textContent = t.hint;
  downloadBtn2.textContent = t.download;
  resetBtn2.textContent = t.reset;
  document.title = t.title;

  let currentPdfBlob = null;
  let currentDownloadName = null;
  let currentPdfObjectUrl = null;
  let lockedForReset = false;

  function setStatus(msg) { statusEl.textContent = msg || ''; }
  function showLanding() {
    landing.classList.remove('hidden');
    embedSection.classList.add('hidden');
    lockedForReset = false;
    openBtn.disabled = false;
    cleanupObjectUrl();
    setStatus('');
  }
  function showEmbeddedViewer() {
    landing.classList.add('hidden');
    embedSection.classList.remove('hidden');
    lockedForReset = true;
    openBtn.disabled = true;
  }
  function cleanupObjectUrl() {
    if (currentPdfObjectUrl) {
      URL.revokeObjectURL(currentPdfObjectUrl);
      currentPdfObjectUrl = null;
    }
    // Clear embed
    pdfEmbed.removeAttribute('src');
  }

  // Open input
  openBtn.addEventListener('click', () => {
    if (lockedForReset) return;
    fileInput.click();
  });
  fileInput.addEventListener('change', async (e) => {
    if (lockedForReset) { fileInput.value=''; return; }
    const file = e.target.files && e.target.files[0];
    if (file) handleFile(file);
    fileInput.value = '';
  });

  // Drag & drop
  function onDragEnterOver(e) {
    if (lockedForReset) { e.preventDefault(); e.stopPropagation(); return; }
    e.preventDefault(); e.stopPropagation();
    dropZone.classList.add('dragover');
    setStatus(t.dropHere);
  }
  function onDragLeaveDrop(e) {
    e.preventDefault(); e.stopPropagation();
    dropZone.classList.remove('dragover');
    if (!lockedForReset) setStatus('');
  }
  function onDrop(e) {
    if (lockedForReset) { e.preventDefault(); e.stopPropagation(); return; }
    e.preventDefault(); e.stopPropagation();
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
  }
  ['dragenter','dragover'].forEach(evt => dropZone.addEventListener(evt, onDragEnterOver));
  ['dragleave','dragend','drop'].forEach(evt => dropZone.addEventListener(evt, onDragLeaveDrop));
  dropZone.addEventListener('drop', onDrop);

  // Reset/Download
  function doReset() {
    currentPdfBlob = null;
    currentDownloadName = null;
    cleanupObjectUrl();
    showLanding();
  }
  resetBtn2.addEventListener('click', doReset);

  function doDownload() {
    if (!currentPdfBlob || !currentDownloadName) return;
    const url = URL.createObjectURL(currentPdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentDownloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  downloadBtn2.addEventListener('click', doDownload);

  async function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.p7m')) {
      setStatus(t.invalidType);
      return;
    }
    setStatus(t.processing);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfBuffer = extractPdfFromP7m(arrayBuffer);
      if (!pdfBuffer) { setStatus(t.noPdfFound); return; }

      currentPdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
      let base = file.name.replace(/\.p7m$/i, '');
      if (!base.toLowerCase().endsWith('.pdf')) base += '.pdf';
      currentDownloadName = base;

      // Use Blob URL in <embed>
      cleanupObjectUrl();
      currentPdfObjectUrl = URL.createObjectURL(currentPdfBlob);
      pdfEmbed.setAttribute('src', currentPdfObjectUrl);

      showEmbeddedViewer();
      setStatus(currentDownloadName);
    } catch (err) {
      console.error(err);
      setStatus(err && err.message ? err.message : t.noPdfFound);
    }
  }

  // PDF extraction (same as before)
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
    const pdfStart = new TextEncoder().encode('%PDF');
    const pdfEnd   = new TextEncoder().encode('%%EOF');

    const startIndex = indexOfSequence(u8, pdfStart, 0, false);
    const endIndex   = indexOfSequence(u8, pdfEnd, 0, true);
    if (startIndex === -1 || endIndex === -1) return null;

    const sliceEnd = endIndex + pdfEnd.length;
    if (sliceEnd <= startIndex) return null;

    const pdfSlice = u8.slice(startIndex, sliceEnd);
    return pdfSlice.buffer;
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

  showLanding();
})();