// Elementi base
const form = document.getElementById('barcode-form');
const barcodeInput = document.getElementById('barcode-input');
const messageDiv = document.getElementById('message');
const productCard = document.getElementById('product-card');

const nameEl = document.getElementById('product-name');
const imageEl = document.getElementById('product-image');
const brandEl = document.getElementById('product-brand');
const categoryEl = document.getElementById('product-category');
const nutriscoreEl = document.getElementById('product-nutriscore');
const allergensEl = document.getElementById('product-allergens');

const historyList = document.getElementById('history-list');

// Scanner
const scanBtn = document.getElementById('scan-btn');
const scannerOverlay = document.getElementById('scanner-overlay');
const scannerView = document.getElementById('scanner');
const closeScannerBtn = document.getElementById('close-scanner-btn');

// Storico
const HISTORY_KEY = 'foodscan_history';
const MAX_HISTORY = 5;

// --------------------
// Gestione form
// --------------------
form.addEventListener('submit', function (event) {
  event.preventDefault();
  const barcode = barcodeInput.value.trim();

  if (!barcode) {
    showMessage('Inserisci un codice a barre.', true);
    return;
  }

  fetchProduct(barcode);
});

// --------------------
// Messaggi
// --------------------
function showMessage(text, isError = false) {
  messageDiv.textContent = text;
  messageDiv.style.color = isError ? '#b91c1c' : '#15803d';
}

// --------------------
// Chiamata API OpenFoodFacts
// --------------------
async function fetchProduct(barcode) {
  showMessage('Caricamento...', false);
  productCard.classList.add('hidden');

  const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      showMessage('Errore nella richiesta all’API.', true);
      return;
    }

    const data = await response.json();

    if (data.status === 0) {
      showMessage('Prodotto non trovato. Controlla il codice.', true);
      return;
    }

    const product = data.product;
    renderProduct(product);
    showMessage('Prodotto trovato!', false);

    addToHistory(barcode, product.product_name || 'Senza nome');

  } catch (error) {
    console.error(error);
    showMessage('Errore di rete.', true);
  }
}

// --------------------
// Rendering prodotto
// --------------------
function renderProduct(product) {
  const name = product.product_name || 'Nome non disponibile';
  const brand = product.brands || 'Marca non disponibile';
  const category = product.categories || 'Categoria non disponibile';
  const nutriscore = product.nutriscore_grade
    ? product.nutriscore_grade.toUpperCase()
    : 'NA';
  const imageUrl = product.image_front_url || '';
  const allergens = product.allergens || 'Non specificati';

  nameEl.textContent = name;
  brandEl.textContent = brand;
  categoryEl.textContent = category;
  allergensEl.textContent = allergens;

  // NutriScore con colore
  nutriscoreEl.textContent = nutriscore === 'NA' ? 'Non disponibile' : nutriscore;
  nutriscoreEl.className = 'nutriscore-badge'; // reset classi
  switch (nutriscore) {
    case 'A':
      nutriscoreEl.classList.add('nutri-A');
      break;
    case 'B':
      nutriscoreEl.classList.add('nutri-B');
      break;
    case 'C':
      nutriscoreEl.classList.add('nutri-C');
      break;
    case 'D':
      nutriscoreEl.classList.add('nutri-D');
      break;
    case 'E':
      nutriscoreEl.classList.add('nutri-E');
      break;
    default:
      nutriscoreEl.classList.add('nutri-NA');
  }

  if (imageUrl) {
    imageEl.src = imageUrl;
    imageEl.classList.remove('hidden');
  } else {
    imageEl.src = '';
    imageEl.classList.add('hidden');
  }

  productCard.classList.remove('hidden');
}

// --------------------
// Storico ricerche (localStorage)
// --------------------
function loadHistory() {
  const raw = localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function addToHistory(barcode, name) {
  let history = loadHistory();

  // rimuovi eventuale duplicato
  history = history.filter(item => item.barcode !== barcode);

  // aggiungi in testa
  history.unshift({ barcode, name });

  // limita lunghezza
  if (history.length > MAX_HISTORY) {
    history = history.slice(0, MAX_HISTORY);
  }

  saveHistory(history);
  renderHistory();
}

function renderHistory() {
  const history = loadHistory();
  historyList.innerHTML = '';

  if (history.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Nessuna ricerca recente.';
    li.style.fontStyle = 'italic';
    li.style.color = '#6b7280';
    historyList.appendChild(li);
    return;
  }

  history.forEach(item => {
    const li = document.createElement('li');

    const nameSpan = document.createElement('span');
    nameSpan.textContent = item.name;

    const codeSpan = document.createElement('span');
    codeSpan.textContent = item.barcode;
    codeSpan.classList.add('history-code');

    li.appendChild(nameSpan);
    li.appendChild(codeSpan);

    li.addEventListener('click', () => {
      barcodeInput.value = item.barcode;
      fetchProduct(item.barcode);
    });

    historyList.appendChild(li);
  });
}

// --------------------
// Scanner con fotocamera (QuaggaJS)
// --------------------
let scannerActive = false;

scanBtn.addEventListener('click', () => {
  openScanner();
});

closeScannerBtn.addEventListener('click', () => {
  closeScanner();
});

function openScanner() {
  scannerOverlay.classList.remove('hidden');

  if (scannerActive) return;

  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: scannerView,
      constraints: {
        facingMode: "environment" // fotocamera posteriore su smartphone
      }
    },
    decoder: {
      readers: ["ean_reader", "ean_8_reader", "upc_reader", "upc_e_reader"]
    },
    locate: true
  }, function (err) {
    if (err) {
      console.error(err);
      showMessage('Errore nell’inizializzazione dello scanner.', true);
      closeScanner();
      return;
    }
    Quagga.start();
    scannerActive = true;
  });

  Quagga.onDetected(onBarcodeDetected);
}

function closeScanner() {
  scannerOverlay.classList.add('hidden');
  if (scannerActive) {
    Quagga.stop();
    Quagga.offDetected(onBarcodeDetected);
    scannerActive = false;
  }
}

function onBarcodeDetected(result) {
  const code = result.codeResult.code;
  console.log('Codice rilevato:', code);

  // Metti il codice nell’input e cerca
  barcodeInput.value = code;
  closeScanner();
  fetchProduct(code);
}

// --------------------
// Inizializzazione
// --------------------
renderHistory();
