// Auth guard
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

const toastContainer = document.getElementById("toast-container");

// Toast Bootstrap
function showToast(msg, type = "info") {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ------------------ Stato ------------------
/**
 * allowedLocations: Map<number,string> con sedi prenotate dall'utente
 * (serve sia per popolare la select recensione, sia per validare lato client).
 */
const allowedLocations = new Map();

// ------------------ Caricamento FILTRI (tutte le sedi) ------------------
async function loadLocationsForFilter() {
  const sel = document.getElementById("filterLocation");
  if (!sel) return;
  sel.innerHTML = `<option value="">Tutte le sedi</option>`;
  try {
    // Endpoint pubblico/cliente per elenco sedi a scopo filtro
    const res = await fetch("/api/cliente/locations", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const locations = await res.json();
    locations.forEach(l => {
      sel.innerHTML += `<option value="${l.id}">${l.name} – ${l.city}</option>`;
    });
  } catch {
    sel.innerHTML = `<option disabled>Errore caricamento sedi</option>`;
  }
}

// ------------------ Caricamento RECENSIONI ------------------
async function loadReviews() {
  const filterLocation = document.getElementById("filterLocation");
  const filterRating = document.getElementById("filterRating");
  const reviewsDiv = document.getElementById("reviews");
  if (!reviewsDiv) return;

  const params = new URLSearchParams();
  if (filterLocation && filterLocation.value) params.append("location_id", filterLocation.value);
  if (filterRating && filterRating.value) params.append("rating", filterRating.value);

  reviewsDiv.innerHTML = `<div class="text-center my-5"><div class="spinner-border text-info"></div></div>`;
  try {
    const res = await fetch(`/api/cliente/reviews?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const reviews = await res.json();

    if (!Array.isArray(reviews) || !reviews.length) {
      reviewsDiv.innerHTML = `<div class="text-center text-muted">Nessuna recensione trovata.</div>`;
      return;
    }

    reviewsDiv.innerHTML = reviews.map(r => `
      <div class="review-card">
        <div class="location">${r.location_name}</div>
        <div class="stars mb-1">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
        <div class="comment">${r.comment ? r.comment : "<em>Nessun commento</em>"}</div>
        <div class="author">di ${r.user_name} <span class="date">· ${new Date(r.created_at).toLocaleDateString()}</span></div>
      </div>
    `).join("");
  } catch {
    reviewsDiv.innerHTML = `<div class="text-danger">Errore caricamento recensioni.</div>`;
  }
}

// ------------------ NUOVO: Carica SEDI PRENOTATE per RECENSIONE ------------------
async function loadBookedLocationsForReview() {
  const selRecensione = document.getElementById("location");
  const openBtn = document.getElementById("openReviewBtn");
  if (!selRecensione) return;

  selRecensione.innerHTML = `<option value="">Seleziona la sede...</option>`;
  allowedLocations.clear();

  try {
    const res = await fetch("/api/cliente/bookings", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Errore fetch prenotazioni");
    const bookings = await res.json();

    // Dedupe sedi prenotate
    bookings.forEach(b => {
      if (b.location_id && b.location_name) {
        allowedLocations.set(String(b.location_id), b.location_name);
      }
    });

    if (allowedLocations.size === 0) {
      selRecensione.innerHTML = `<option value="" disabled>Nessuna sede prenotata</option>`;
      selRecensione.disabled = true;
      if (openBtn) {
        openBtn.disabled = true;
        openBtn.title = "Per recensire una sede devi prima averla prenotata.";
      }
      showToast("Non hai prenotazioni: non puoi ancora lasciare recensioni.", "warning");
    } else {
      selRecensione.disabled = false;
      if (openBtn) {
        openBtn.disabled = false;
        openBtn.title = "";
      }
      for (const [id, name] of allowedLocations.entries()) {
        selRecensione.innerHTML += `<option value="${id}">${name}</option>`;
      }
    }
  } catch (err) {
    selRecensione.innerHTML = `<option value="" disabled>Errore nel caricamento</option>`;
    selRecensione.disabled = true;
    if (openBtn) openBtn.disabled = true;
    showToast("Errore nel caricamento delle sedi prenotate.", "danger");
  }
}

// ------------------ Submit RECENSIONE (con controllo forte) ------------------
async function handleSubmitReview(e) {
  e.preventDefault();
  const location = document.getElementById("location");
  const rating = document.getElementById("rating");
  const comment = document.getElementById("comment");
  const reviewError = document.getElementById("reviewError");

  if (!location || !rating || !comment) return;

  // Validazioni base
  if (!location.value || !rating.value) {
    if (reviewError) reviewError.innerText = "Scegli una sede e un punteggio!";
    return;
  }

  // 🔒 Controllo chiave: la sede scelta deve essere tra quelle prenotate
  if (!allowedLocations.has(String(location.value))) {
    if (reviewError) {
      reviewError.innerText = "Non puoi recensire questa sede perché non risulta tra le tue prenotazioni.";
    }
    showToast("Recensione bloccata: sede non prenotata.", "danger");
    return;
  }

  if (reviewError) reviewError.innerText = "Invio in corso...";

  try {
    const res = await fetch("/api/cliente/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        location_id: location.value,
        rating: Number(rating.value),
        comment: comment.value.trim()
      })
    });

    if (res.ok) {
      if (reviewError) reviewError.innerText = "";
      e.target.reset();
      showToast("Recensione inviata!", "success");
      loadReviews();
      const modalEl = document.getElementById("modalRecensione");
      const modal = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
      if (modal) modal.hide();
    } else {
      const data = await res.json().catch(() => ({}));
      if (reviewError) reviewError.innerText = "Errore: " + (data.message || "Hai già recensito questa sede.");
    }
  } catch {
    if (reviewError) reviewError.innerText = "Errore invio recensione.";
  }
}

// ------------------ Init ------------------
document.addEventListener("DOMContentLoaded", () => {
  // Filtri
  const filterLocation = document.getElementById("filterLocation");
  const filterRating = document.getElementById("filterRating");
  const btnReset = document.getElementById("resetFiltri");

  if (filterLocation) filterLocation.addEventListener("change", loadReviews);
  if (filterRating) filterRating.addEventListener("change", loadReviews);
  if (btnReset) btnReset.addEventListener("click", () => {
    if (filterLocation) filterLocation.value = "";
    if (filterRating) filterRating.value = "";
    loadReviews();
  });

  // Caricamenti iniziali
  loadLocationsForFilter();     // per filtrare la lista recensioni
  loadReviews();                // carica le recensioni
  loadBookedLocationsForReview(); // per la select di recensione (SOLO sedi prenotate)

  // Submit form recensione con controllo
  const formRecensione = document.getElementById("formRecensione");
  if (formRecensione) formRecensione.addEventListener("submit", handleSubmitReview);

  // Logout
  const btnLogout = document.getElementById("logoutBtn");
  if (btnLogout) btnLogout.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  });
});
