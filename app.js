/**********************
 * INICIALIZAÇÃO
 **********************/
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('data-fisc');
  const hoje = new Date();
  input.value = hoje.toISOString().split('T')[0];
});


// Tecla ENTER ativa o botão "Gerar PDF"
document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && items.length > 0) {
    generatePdfBtn.click();
  }
});

/**********************
 * ELEMENTOS DE UI
 **********************/
const gallery = document.getElementById('gallery');
const fileInput = document.getElementById('fileInput');
const generatePdfBtn = document.getElementById('generatePdf');
const reportNumberInput = document.getElementById('reportNumber');
const photosPerPageSelect = document.getElementById('photosPerPage');
const tpDoc = document.getElementById('tipoDocumento');

const defaultGeneratePdfText = generatePdfBtn.textContent || 'Gerar PDF';

let items = [];
// {
//   id,
//   file,
//   dataUrl,
//   caption,
//   order,
//   compressedBlob,
//   compressedSize
// }


function setGeneratePdfLoading(isLoading) {
  generatePdfBtn.disabled = isLoading;
  generatePdfBtn.textContent = isLoading ? 'Aguarde...' : defaultGeneratePdfText;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

/**********************
 * UPLOAD DE IMAGENS
 **********************/
fileInput.addEventListener('change', async (e) => {

  const files = Array
    .from(e.target.files || [])
    .filter(f => f.type.startsWith('image/'));

  const restantes = 25 - items.length;

  if (restantes <= 0) {
    alert('Limite máximo de 25 imagens já atingido.');
    fileInput.value = '';
    return;
  }

  const filesPermitidos = files.slice(0, restantes);

  if (files.length > restantes) {
    alert(`⚠️ Somente ${restantes} imagens adicionais foram carregadas.`);
  }

  let successCount = 0;
  for (const f of filesPermitidos) {
    try {
      const id = uid();
      const dataUrl = await fileToDataURL(f);
  
      items.push({
        id,
        file: f,
        dataUrl,
        caption: '',
        order: items.length,
        compressedBlob: null,
        compressedSize: 0
      });
      successCount++;
    } catch (error) {
      ErrorHandler.handle(error, `Imagem: ${f.name}`);
    }
  }

  if (successCount > 0) {
    fileInput.value = '';
    renderGallery();
    await exibirTamanhoEstimado();
  } 

});

/**********************
 * GALERIA
 **********************/
function renderGallery() {
  setGeneratePdfLoading(true);

  gallery.innerHTML = '';
  items.sort((a, b) => a.order - b.order);

  items.forEach(it => {
    const card = document.createElement('div');
    card.className = 'card';

    const img = document.createElement('img');
    img.className = 'thumb';
    img.src = it.dataUrl;

    const input = document.createElement('input');
    input.className = 'caption';
    input.placeholder = 'Legenda...';
    input.value = it.caption;
    input.addEventListener('input', e => it.caption = e.target.value);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const up = document.createElement('button');
    up.textContent = '↑';
    up.onclick = () => moveItem(it.id, -1);

    const down = document.createElement('button');
    down.textContent = '↓';
    down.onclick = () => moveItem(it.id, 1);

    const openBtn = document.createElement('button');
    openBtn.textContent = '🔍';
    openBtn.onclick = () => abrirImagem(it.dataUrl);

    const remove = document.createElement('button');
    remove.textContent = '❌';
    remove.onclick = async () => {
      if (confirm('Remover imagem?')) {
        items = items.filter(x => x.id !== it.id);
        renderGallery();
        await exibirTamanhoEstimado();
      }
    };

    actions.append(up, down, openBtn, remove);
    card.append(img, input, actions);
    gallery.appendChild(card);
  });
  setGeneratePdfLoading(false);
}

function moveItem(id, delta) {
  const idx = items.findIndex(x => x.id === id);
  if (idx < 0) return;

  const newIdx = Math.max(0, Math.min(items.length - 1, idx + delta));
  const [it] = items.splice(idx, 1);
  items.splice(newIdx, 0, it);

  items.forEach((x, i) => x.order = i);
  renderGallery();
  exibirTamanhoEstimado();
}

/***********************
 * ESTIMATIVA DE TAMANHO
 **********************/
async function getCompressedBlob(item, targetMaxBytes = 1_000_000) {
  if (item.compressedBlob) return item.compressedBlob;

 try {
   const blob = await compressImageDataUrl(item.dataUrl, targetMaxBytes);
   item.compressedBlob = blob;
   item.compressedSize = blob.size;
 
   return blob;
 } catch (error) {
  ErrorHandler.handle(error, 'Compressão de imagem');
  throw error;
 }
}

async function estimarTamanhoPDF() {
  try {
    setGeneratePdfLoading(true);
    let total = 0;
    for (const item of items) {
      const blob = await getCompressedBlob(item);
      total += blob.size;
    }

    const overheadPDF = 80 * 1024;
    return (total + overheadPDF) / (1024 * 1024);
  } catch (error) {
    throw new Error("Não foi possível estimar o tamanho do PDF.");
  } finally {
    setGeneratePdfLoading(false);
  }
}

async function exibirTamanhoEstimado() {
  const el = document.getElementById('qtdFiles');

  if (items.length === 0) {
    el.innerText = 'Nenhuma imagem carregada.';
    setGeneratePdfLoading(false);
    return;
  }

  setGeneratePdfLoading(true);
  try {
    const mb = await estimarTamanhoPDF();
    el.innerText = `Quantidade de imagens: ${items.length} · Tamanho estimado: ${mb.toFixed(2)} MB`;
    el.title = 'Estimativa baseada nas imagens comprimidas.';
  } finally {
    setGeneratePdfLoading(false);
  }
}

/**********************
 * COMPRESSÃO
 **********************/
async function compressImageDataUrl(dataUrl, targetMaxBytes) {
  const img = await loadImage(dataUrl);

  let canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');

  let w = img.width;
  let h = img.height;

  const maxDim = 2000;
  if (Math.max(w, h) > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);

  let qLow = 0.4;
  let qHigh = 0.95;
  let q = 0.85;

  let blob = await canvasToBlob(canvas, q);

  for (let i = 0; i < 7; i++) {
    if (blob.size > targetMaxBytes) {
      qHigh = q;
    } else {
      qLow = q;
    }
    q = (qLow + qHigh) / 2;
    blob = await canvasToBlob(canvas, q);
  }

  return blob;
}

/**********************
 * GERAÇÃO DO PDF
 **********************/
generatePdfBtn.addEventListener('click', async () => {
  if (items.length === 0) {
    ErrorHandler.showAlert('⚠️ Nenhuma imagem carregada.');
    return;
  }

  try {
    const tamanho = await estimarTamanhoPDF();
    if (tamanho > 10) {
      if (!confirm(`Arquivo estimado com ${tamanho.toFixed(2)} MB. Continuar?`)) return;
    }
  
    const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
    if (!jsPDF) {
      alert('jsPDF não carregado.');
      return;
    }
  
    await generateWithJsPDF(jsPDF);
  } catch (error) {
    ErrorHandler.handle(error, 'Geração de PDF');
  }
});

async function generateWithJsPDF(jsPDFClass) {
  const reportNumber = reportNumberInput.value.trim() || 'xxxx/7-xxxxxx-x';
  const photosPerPage = parseInt(photosPerPageSelect.value);

  const doc = new jsPDFClass({ unit: 'mm', format: 'a4' });
  const margin = 12;
  const pageH = 297;
  const usableH = pageH - margin * 2 - 20;

  const dataISO = document.getElementById('data-fisc').value;
  const [y, m, d] = dataISO.split('-');
  const dateStr = `${d}/${m}/${y}`;

  function header() {
    doc.setFontSize(10);
    const txt =
      tpDoc.value === 'rf'
        ? `Fotografias do Relatório de Fiscalização nº ${reportNumber}`
        : tpDoc.value === 'diligencia'
          ? `Fotografias da diligência nº ${reportNumber}`
          : `Fotografias do protocolo nº ${reportNumber}`;

    doc.text(txt, margin, 10);
    doc.text(dateStr, margin, pageH - 6);
  }

  const perPage = photosPerPage === 1 ? 1 : 2;

  for (let i = 0; i < items.length; i += perPage) {
    if (i > 0) doc.addPage();
    header();

    for (let col = 0; col < perPage; col++) {
      const item = items[i + col];
      if (!item) break;

      const blob = await getCompressedBlob(item);
      const dataUrl = await blobToDataURL(blob);
      const img = await loadImage(dataUrl);

      const slotH = usableH / perPage - 8;
      const ratio = Math.min(186 / img.width, slotH / img.height);
      const wmm = img.width * ratio;
      const hmm = img.height * ratio;

      const x = margin + (186 - wmm) / 2;
      const y = margin + 12 + col * (slotH + 20);

      doc.rect(x, y, wmm, hmm);
      doc.addImage(dataUrl, 'JPEG', x, y, wmm, hmm, undefined, 'FAST');
      doc.text(item.caption || ' ', margin + 2, y + hmm + 6, { maxWidth: 186 });
    }
  }

  const out = `Fotos_RF_${reportNumber.replace(/[^\w]/g, '_')+uid()}.pdf`;
  doc.save(out);

  doc.internal.pages = [];
  doc.internal.pageSize = null;
}

/**********************
 * UTILITÁRIOS
 **********************/
function fileToDataURL(file) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(file);
  });
}

function blobToDataURL(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error (`Falha ao ler arquivo: ${file.name}`));
    r.onabort = () => rej(new Error(`Leitura cancelada: ${file.name}`));
    r.readAsDataURL(blob);
  });
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
}

function abrirImagem(dataUrl) {
  const b = atob(dataUrl.split(',')[1]);
  const mime = dataUrl.split(',')[0].split(':')[1].split(';')[0];
  const buf = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) buf[i] = b.charCodeAt(i);
  const blob = new Blob([buf], { type: mime });
  window.open(URL.createObjectURL(blob), '_blank');
}

function resetApp() {
  items = [];
  gallery.innerHTML = '';
  reportNumberInput.value = '';
  photosPerPageSelect.value = '2';
  exibirTamanhoEstimado();
}

// Tratamento centralizado de erros
const ErrorHandler = {
  handle(error, context = '') {
    console.error(`[${context}]`, error);
    const msg = error?.message || 'Erro desconhecido';
    this.showAlert(`❌ Erro${context ? ` (${context})` : ''}: ${msg}`);
  },

  showAlert(msg){
    alert(msg);
  }
}