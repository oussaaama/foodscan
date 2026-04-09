// Elementi base
const form = document.getElementById("barcode-form");
const barcodeInput = document.getElementById("barcode-input");
const messageDiv = document.getElementById("message");
const productCard = document.getElementById("product-card");

const nameEl = document.getElementById("product-name");
const imageEl = document.getElementById("product-image");
const brandEl = document.getElementById("product-brand");
const categoryEl = document.getElementById("product-category");
const nutriscoreEl = document.getElementById("product-nutriscore");
const allergensEl = document.getElementById("product-allergens");

const historyList = document.getElementById("history-list");

// --------------------
// Messaggi
// --------------------
function showMessage(text, isError = false) {
  messageDiv.textContent = text;
  messageDiv.style.color = isError ? "#b91c1c" : "#15803d";
}

// --------------------
// API OpenFoodFacts
// --------------------
async function fetchProduct(barcode) {
  showMessage("Caricamento...");
  productCard.classList.add("hidden");

  const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 0) {
      showMessage("Prodotto non trovato.", true);
      return;
    }

    renderProduct(data.product);
    addToHistory(barcode, data.product.product_name || "Senza nome");
    showMessage("Prodotto trovato!");

  } catch (err) {
    showMessage("Errore di rete.", true);
  }
}

// --------------------
// Rendering prodotto
// --------------------
function renderProduct(product) {
  nameEl.textContent = product.product_name || "Nome non disponibile";
  brandEl.textContent = product.brands || "N/D";
  categoryEl.textContent = product.categories || "N/D";
  allergensEl.textContent = product.allergens || "Non specificati";

  const nutri = product.nutriscore_grade
    ? product.nutriscore_grade.toUpperCase()
    : "NA";

  nutriscoreEl.textContent = nutri;
  nutriscoreEl.className = "nutriscore-badge nutri-" + nutri;

  if (product.image_front_url) {
    imageEl.src = product.image_front_url;
    imageEl.classList.remove("hidden");
  } else {
    imageEl.classList.add("hidden");
  }

  productCard.classList.remove("hidden");
}

// --------------------
// Storico ricerche
// --------------------
const HISTORY_KEY = "foodscan_history";

function loadHistory() {
  return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function addToHistory(barcode, name) {
  let history = loadHistory();

  history = history.filter(h => h.barcode !== barcode);
  history.unshift({ barcode, name });

  if (history.length > 5) history.pop();

  saveHistory(history);
  renderHistory();
}

function renderHistory() {
  const history = loadHistory();
  historyList.innerHTML = "";

  if (history.length === 0) {
    historyList.innerHTML = "<li>Nessuna ricerca recente.</li>";
    return;
  }

  history.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.name} — ${item.barcode}`;
    li.onclick = () => {
      barcodeInput.value = item.barcode;
      fetchProduct(item.barcode);
    };
    historyList.appendChild(li);
  });
}

// --------------------
// Form submit
// --------------------
form.addEventListener("submit", e => {
  e.preventDefault();
  fetchProduct(barcodeInput.value.trim());
});

// --------------------
// Init
// --------------------
renderHistory();
