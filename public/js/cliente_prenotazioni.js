// js/cliente_prenotazioni.js — filtri: cerca, sede, intervallo date, nascondi cancellate
// + “nascondi selezionate” (solo vista)

const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

const listaPrenotazioni = document.getElementById("listaPrenotazioni");
const toastContainer = document.getElementById("toast-container");
const noPrenotazioni = document.getElementById("noPrenotazioni");
const btnAggiorna = document.getElementById("btnAggiorna");

// Controlli filtro (senza Stato)
const filtroCerca = document.getElementById("filtroCerca");
const filtroNascondiCancellate = document.getElementById("filtroNascondiCancellate");
const filtroSede = document.getElementById("filtroSede");
const dataDa = document.getElementById("dataDa");
const dataA = document.getElementById("dataA");

const btnResetFiltri = document.getElementById("btnResetFiltri");
const btnNascondiSelezionate = document.getElementById("btnNascondiSelezionate");
const btnMostraTutte = document.getElementById("btnMostraTutte");

// Stato locale
let ALL = [];                        // dataset dal backend
let HIDDEN_IDS = new Set();          // prenotazioni nascoste (solo vista)
const FILTERS = {
  query: "",
  hideCancelled: false,
  sede: "",
  da: "",
  a: ""
};

// Utility
function showToast(titolo, messaggio = "", tipo = "info") {
  const palette = {
    success: { bg: "#2e7d32", icon: "bi-check-circle" },
    danger:  { bg: "#d32f2f", icon: "bi-x-circle" },
    warning: { bg: "#f59e0b", icon: "bi-exclamation-triangle" },
    info:    { bg: "#3182ce", icon: "bi-info-circle" }
  };
  const p = palette[tipo] || palette.info;
  const toast = document.createElement("div");
  toast.className = "toast show mb-2";
  toast.innerHTML = `
    <div class="toast-header" style="background:${p.bg}">
      <i class="bi ${p.icon} me-2"></i>
      <strong class="me-auto text-white">${titolo}</strong>
      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
    </div>
    <div class="toast-body">${messaggio}</div>`;
  toast.querySelector('[data-bs-dismiss="toast"]').onclick = () => toast.remove();
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function formatEuro(v) {
  const n = Number(v || 0);
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function showLoader(target) {
  target.innerHTML = `
    <div class="d-flex justify-content-center align-items-center w-100" style="min-height:120px">
      <div class="spinner-border text-info" role="status"><span class="visually-hidden">Caricamento...</span></div>
    </div>`;
}

function formatStatusBadge(status) {
  if (status === "confermato") return `<span class="badge bg-success badge-status"><i class="bi bi-check-circle me-1"></i>Confermata</span>`;
  if (status === "cancellato") return `<span class="badge bg-danger badge-status"><i class="bi bi-x-circle me-1"></i>Cancellata</span>`;
  return `<span class="badge bg-warning text-dark badge-status"><i class="bi bi-hourglass-split me-1"></i>In attesa</span>`;
}

function isPast(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  return now > new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

// Popola select Sede dai dati
function populateSedi() {
  const names = Array.from(new Set(ALL.map(p => p.location_name).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'it'));
  filtroSede.innerHTML = `<option value="">Tutte</option>` + names.map(n => `<option value="${n}">${n}</option>`).join("");
}

// Debounce
function debounce(fn, ms = 250) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Applica filtri e renderizza
function render() {
  let data = ALL.slice();

  // Ricerca
  const q = FILTERS.query.trim().toLowerCase();
  if (q) {
    data = data.filter(p => {
      const sede = (p.location_name || "").toLowerCase();
      const tipo = (p.workstation_name
        ? `postazione ${p.workstation_name}`
        : (p.space_type ? `sala ${p.space_type}` : "")).toLowerCase();
      return sede.includes(q) || tipo.includes(q) || (p.date || "").toLowerCase().includes(q) || (p.time_slot || "").toLowerCase().includes(q);
    });
  }

  // Nascondi selezionate
  if (HIDDEN_IDS.size) {
    data = data.filter(p => !HIDDEN_IDS.has(p.id));
  }

  // Sede
  if (FILTERS.sede) data = data.filter(p => p.location_name === FILTERS.sede);

  // Data range (YYYY-MM-DD)
  if (FILTERS.da) data = data.filter(p => (p.date || "") >= FILTERS.da);
  if (FILTERS.a)  data = data.filter(p => (p.date || "") <= FILTERS.a);

  // Nascondi cancellate
  if (FILTERS.hideCancelled) data = data.filter(p => p.status !== "cancellato");

  // Output
  if (!data.length) {
    listaPrenotazioni.innerHTML = "";
    noPrenotazioni.style.display = "";
    btnMostraTutte.classList.toggle("d-none", HIDDEN_IDS.size === 0);
    return;
  }
  noPrenotazioni.style.display = "none";

  listaPrenotazioni.innerHTML = data.map(p => {
    const disableCancel = p.status !== "confermato" || isPast(p.date);
    const isPaid = p.payment_status === 'completato';
    const labelPagamento = isPaid
      ? `Pagato ${formatEuro(p.paid_amount ?? p.amount_to_pay ?? 0)}`
      : `Da pagare ${formatEuro(p.amount_to_pay ?? 0)}`;
    const badgePagamento = isPaid
      ? `<span class="badge bg-success">completato</span>`
      : `<span class="badge bg-warning text-dark">${p.payment_status ?? 'in attesa'}</span>`;
    const tipo = p.workstation_name
      ? `Postazione${p.workstation_name ? ` • ${p.workstation_name}` : ""}`
      : (p.space_type ? `Sala • ${p.space_type}` : "—");

    return `
      <div class="col-md-6 col-lg-4">
        <div class="card shadow h-100 prenotazione-card border-0">
          <div class="card-body pb-2">
            <div class="card-top mb-2">
              <h5 class="card-title">${p.location_name ?? '—'}</h5>
              <div class="form-check">
                <input class="form-check-input select-hide" type="checkbox" value="${p.id}" id="chk_${p.id}">
                <label class="form-check-label small text-muted" for="chk_${p.id}">seleziona</label>
              </div>
            </div>
            <span class="badge bg-primary filter-chip">${tipo}</span>
            <p class="mb-1 mt-2"><strong>Data:</strong> ${p.date} <strong>Orario:</strong> ${p.time_slot}</p>
            <p class="mb-1"><strong>Stato:</strong> ${formatStatusBadge(p.status)}</p>
            <p class="mb-1"><strong>Pagamento:</strong> ${labelPagamento} ${badgePagamento}</p>

            <div class="d-grid gap-2 mt-2">
              ${
                !disableCancel
                ? `<button class="btn btn-cancella" onclick="cancellaPrenotazione(${p.id})"><i class="bi bi-x-circle"></i> Cancella</button>`
                : `<button class="btn btn-outline-secondary" disabled><i class="bi bi-ban"></i> Non annullabile</button>`
              }
              <button class="btn btn-outline-secondary btn-sm" onclick="nascondiSingola(${p.id})">
                <i class="bi bi-eye-slash"></i> Nascondi dalla vista
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  btnMostraTutte.classList.toggle("d-none", HIDDEN_IDS.size === 0);
}

// Carica dati
async function caricaPrenotazioni() {
  showLoader(listaPrenotazioni);
  noPrenotazioni.style.display = "none";
  try {
    const res = await fetch("/api/cliente/bookings", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    ALL = await res.json();

    populateSedi();
    render();
  } catch (e) {
    listaPrenotazioni.innerHTML = `<div class="text-danger">Errore caricamento prenotazioni</div>`;
  }
}

// Cancella prenotazione (backend)
window.cancellaPrenotazione = async function(id) {
  if (!confirm("Vuoi cancellare questa prenotazione?")) return;
  try {
    const res = await fetch(`/api/cliente/bookings/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      showToast("Prenotazione annullata", "La prenotazione è stata cancellata.", "success");
      await caricaPrenotazioni();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast("Errore", err.message || "Errore annullamento", "danger");
    }
  } catch {
    showToast("Errore", "Errore annullamento", "danger");
  }
};

// Nascondi singola (solo vista)
window.nascondiSingola = function(id) {
  HIDDEN_IDS.add(id);
  render();
  showToast("Nascosta", "La prenotazione è stata nascosta dalla vista.", "info");
};

// Azioni UI
btnAggiorna.addEventListener("click", caricaPrenotazioni);

// Ricerca
filtroCerca.addEventListener("input", debounce((e) => {
  FILTERS.query = e.target.value || "";
  render();
}, 200));

// Altri filtri
[filtroNascondiCancellate, filtroSede, dataDa, dataA]
  .forEach(el => el.addEventListener("change", onFiltersChange));

function onFiltersChange() {
  FILTERS.hideCancelled = filtroNascondiCancellate.checked;
  FILTERS.sede = filtroSede.value || "";
  FILTERS.da = dataDa.value || "";
  FILTERS.a = dataA.value || "";
  render();
}

// Nascondi selezionate
btnNascondiSelezionate.addEventListener("click", () => {
  document.querySelectorAll(".select-hide:checked").forEach(chk => HIDDEN_IDS.add(Number(chk.value)));
  render();
  if (HIDDEN_IDS.size) showToast("Nascoste", "Prenotazioni selezionate nascoste dalla vista.", "info");
});

// Mostra tutte
btnMostraTutte.addEventListener("click", () => {
  HIDDEN_IDS.clear();
  render();
  showToast("Mostrate", "Tutte le prenotazioni sono nuovamente visibili.", "info");
});

// Reset filtri
btnResetFiltri.addEventListener("click", () => {
  filtroCerca.value = "";
  filtroNascondiCancellate.checked = false;
  filtroSede.value = "";
  dataDa.value = "";
  dataA.value = "";

  FILTERS.query = "";
  FILTERS.hideCancelled = false;
  FILTERS.sede = "";
  FILTERS.da = "";
  FILTERS.a = "";
  render();
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "login.html";
});

// Init
caricaPrenotazioni();
