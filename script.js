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

// NUOVI ELEMENTI
const healthSection = document.getElementById("health-score-section");
const healthBar = document.getElementById("health-bar");
const healthText = document.getElementById("health-score-text");
const adviceList = document.getElementById("health-advice-list");

function showMessage(text, isError = false) {
  messageDiv.textContent = text;
  messageDiv.style.color = isError ? "#b91c1c" : "#15803d";
}

async function fetchProduct(barcode) {
  showMessage("Caricamento...");
  productCard.classList.add("hidden");
  healthSection.classList.add("hidden");

  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 0) {
      showMessage("Prodotto non trovato.", true);
      return;
    }

    renderProduct(data.product);

    // 🔥 NUOVO: calcolo punteggio salute
    const score = calculateHealthScore(data.product);
    updateHealthBar(score);
    renderPersonalAdvice(data.product);

    addToHistory(barcode, data.product.product_name || "Senza nome");
    showMessage("Prodotto trovato!");

  } catch (err) {
    showMessage("Errore di rete.", true);
  }
}

function renderProduct(product) {

  const name =
    product.product_name_it ||
    product.product_name_en ||
    product.product_name ||
    "Nome non disponibile";

  nameEl.textContent = name;

  brandEl.textContent =
    product.brands ||
    product.brands_tags?.join(", ") ||
    "N/D";

  const category =
    product.categories_it ||
    product.categories_en ||
    product.categories ||
    "N/D";

  categoryEl.textContent = category;

  const allergens =
    product.allergens_it ||
    product.allergens_en ||
    product.allergens ||
    "Non specificati";

  allergensEl.textContent = allergens;

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

/* -------------------------
   STORICO
--------------------------*/

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

/* -------------------------
   🔥 PUNTEGGIO SALUTE (0–100)
--------------------------*/

function calculateHealthScore(product) {
  const n = product.nutriments || {};

  const sugar = n["sugars_100g"] || 0;
  const satFat = n["saturated-fat_100g"] || 0;
  const salt = n["salt_100g"] || 0;
  const additives = (product.additives_tags || []).length;

  let score = 100;

  score -= sugar * 2;
  score -= satFat * 3;
  score -= salt * 4;
  score -= additives * 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/* -------------------------
   🔥 BARRA COLORATA
--------------------------*/

function updateHealthBar(score) {
  healthSection.classList.remove("hidden");

  healthBar.style.width = score + "%";

  let color = "green";
  if (score < 70) color = "orange";
  if (score < 40) color = "red";

  healthBar.style.backgroundColor = color;

  healthText.textContent = `Punteggio: ${score}/100`;
}

/* -------------------------
   🔥 CONSIGLI PERSONALIZZATI
--------------------------*/

function getUserPreferences() {
  return {
    lowSugar: document.getElementById("pref-low-sugar").checked,
    lowSatFat: document.getElementById("pref-low-satfat").checked,
    lowSalt: document.getElementById("pref-low-salt").checked,
    noAdditives: document.getElementById("pref-no-additives").checked
  };
}

function generatePersonalAdvice(product) {
  const n = product.nutriments || {};

  const sugar = n["sugars_100g"] || 0;
  const satFat = n["saturated-fat_100g"] || 0;
  const salt = n["salt_100g"] || 0;
  const additives = (product.additives_tags || []).length;

  const prefs = getUserPreferences();
  const advice = [];

  if (prefs.lowSugar && sugar > 10)
    advice.push("Questo prodotto contiene molti zuccheri.");

  if (prefs.lowSatFat && satFat > 5)
    advice.push("Livello alto di grassi saturi.");

  if (prefs.lowSalt && salt > 1)
    advice.push("Contenuto di sale elevato.");

  if (prefs.noAdditives && additives > 3)
    advice.push(`Contiene molti additivi (${additives}).`);

  if (advice.length === 0)
    advice.push("Questo prodotto è in linea con le tue preferenze.");

  return advice;
}

function renderPersonalAdvice(product) {
  adviceList.innerHTML = "";

  const advice = generatePersonalAdvice(product);

  advice.forEach(msg => {
    const li = document.createElement("li");
    li.textContent = msg;
    adviceList.appendChild(li);
  });
}

/* -------------------------
   AVVIO
--------------------------*/

form.addEventListener("submit", e => {
  e.preventDefault();
  fetchProduct(barcodeInput.value.trim());
});

renderHistory();
