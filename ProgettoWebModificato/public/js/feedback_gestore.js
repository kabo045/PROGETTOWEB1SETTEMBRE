// feedback_gestore.js
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

const filterLocation = document.getElementById("filterLocation");
const filterRating = document.getElementById("filterRating");
const reviewsDiv = document.getElementById("reviews");
const nomeGestore = document.getElementById("nomeGestore");
const resetFiltri = document.getElementById("resetFiltri");

let tutteLeRecensioni = []; // Caching locale per i filtri rapidi

// Carica il profilo gestore
async function caricaProfiloGestore() {
  try {
    const res = await fetch("/api/gestore/account", {
      headers: { Authorization: "Bearer " + token }
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    nomeGestore.innerText = data.name || "Gestore";
  } catch {
    nomeGestore.innerText = "Gestore";
  }
}

// Carica sedi del gestore
async function caricaSediGestore() {
  try {
    const res = await fetch("/api/gestore/sedi", {
      headers: { Authorization: "Bearer " + token }
    });
    const sedi = await res.json();
    filterLocation.innerHTML = '<option value="">Tutte le sedi</option>';
    sedi.forEach(s => {
      filterLocation.innerHTML += `<option value="${s.id}">${s.name} – ${s.city}</option>`;
    });
  } catch {
    filterLocation.innerHTML = '<option value="">Errore sedi</option>';
  }
}

// Carica tutte le recensioni (una sola chiamata, poi filtri in JS)
async function caricaTutteLeRecensioni() {
  reviewsDiv.innerHTML = `<div class="text-center text-muted">Caricamento...</div>`;
  try {
    const res = await fetch("/api/gestore/recensioni", {
      headers: { Authorization: "Bearer " + token }
    });
    tutteLeRecensioni = await res.json();
    filtraEMostraRecensioni();
  } catch {
    reviewsDiv.innerHTML = `<div class="text-danger text-center">Errore nel caricamento feedback</div>`;
  }
}

// Filtra e mostra le recensioni in base ai select
function filtraEMostraRecensioni() {
  let filtered = [...tutteLeRecensioni];
  const sedeId = filterLocation.value;
  const rating = filterRating.value;

  if (sedeId) filtered = filtered.filter(f => String(f.location_id) === String(sedeId));
  if (rating) filtered = filtered.filter(f => String(f.rating) === rating);

  if (!filtered.length) {
    reviewsDiv.innerHTML = `<div class="text-muted text-center mt-4">Nessun feedback disponibile</div>`;
    return;
  }
  reviewsDiv.innerHTML = filtered.map(f => `
    <div class="card mb-3 review-card">
      <div class="card-body d-flex align-items-center">
        <div class="avatar me-3 rounded-circle bg-primary bg-opacity-10">
          <i class="bi bi-person fs-3 text-primary"></i>
        </div>
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="fw-semibold">${f.user_name}</span>
            <span class="text-warning fs-5">
              ${'★'.repeat(f.rating || 0)}${'☆'.repeat(5 - (f.rating || 0))}
            </span>
          </div>
          <div class="commento">${f.comment || "<span class='text-muted'>Nessun commento</span>"}</div>
          <div class="mt-1 text-secondary" style="font-size:.95em;">
            <i class="bi bi-building"></i> ${f.location_name} &nbsp;·&nbsp;
            <i class="bi bi-calendar3"></i> ${new Date(f.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

// Eventi filtri
filterLocation.onchange = filtraEMostraRecensioni;
filterRating.onchange = filtraEMostraRecensioni;
resetFiltri.onclick = () => {
  filterLocation.value = "";
  filterRating.value = "";
  filtraEMostraRecensioni();
};

// Inizializzazione
document.addEventListener("DOMContentLoaded", async () => {
  await caricaProfiloGestore();
  await caricaSediGestore();
  await caricaTutteLeRecensioni();
});
