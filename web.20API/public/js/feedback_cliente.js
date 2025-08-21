const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

const toastContainer = document.getElementById("toast-container");

// Toast animato Bootstrap
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

// Carica le sedi per filtro
async function loadLocationsForFilter() {
  const sel = document.getElementById("filterLocation");
  if (!sel) return;
  sel.innerHTML = `<option value="">Tutte le sedi</option>`;
  try {
    const res = await fetch("/api/cliente/locations", { headers: { Authorization: `Bearer ${token}` } });
    const locations = await res.json();
    locations.forEach(l =>
      sel.innerHTML += `<option value="${l.id}">${l.name} – ${l.city}</option>`
    );
  } catch {
    sel.innerHTML = `<option disabled>Errore caricamento sedi</option>`;
  }
}

// Carica recensioni filtrate
async function loadReviews() {
  const filterLocation = document.getElementById("filterLocation");
  const filterRating = document.getElementById("filterRating");
  const reviewsDiv = document.getElementById("reviews"); // <-- usa questo!
  if (!reviewsDiv) return;

  const params = new URLSearchParams();
  if (filterLocation && filterLocation.value) params.append("location_id", filterLocation.value);
  if (filterRating && filterRating.value) params.append("rating", filterRating.value);

  reviewsDiv.innerHTML = `<div class="text-center my-5"><div class="spinner-border text-info"></div></div>`;
  try {
    const res = await fetch(`/api/cliente/reviews?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
    const reviews = await res.json();
    if (!reviews.length) {
      reviewsDiv.innerHTML = `<div class="text-center text-muted">Nessuna recensione trovata.</div>`;
      return;
    }
    reviewsDiv.innerHTML = reviews.map(r => `
      <div class="review-card">
        <div class="location">${r.location_name}</div>
        <div class="stars mb-1">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
        <div class="comment">${r.comment || "<em>Nessun commento</em>"}</div>
        <div class="author">di ${r.user_name} <span class="date">· ${new Date(r.created_at).toLocaleDateString()}</span></div>
      </div>
    `).join("");
  } catch {
    reviewsDiv.innerHTML = `<div class="text-danger">Errore caricamento recensioni.</div>`;
  }
}

// Invia nuova recensione
document.addEventListener("DOMContentLoaded", () => {
  const filterLocation = document.getElementById("filterLocation");
  const filterRating = document.getElementById("filterRating");
  const btnReset = document.getElementById("resetFiltri");
  const formRecensione = document.getElementById("formRecensione");
  const reviewError = document.getElementById("reviewError");

  // Filtri recensioni
  if (filterLocation) filterLocation.addEventListener("change", loadReviews);
  if (filterRating) filterRating.addEventListener("change", loadReviews);
  if (btnReset) btnReset.addEventListener("click", () => {
    if (filterLocation) filterLocation.value = "";
    if (filterRating) filterRating.value = "";
    loadReviews();
  });

  loadLocationsForFilter();
  loadReviews();

  // Form nuova recensione
  if (formRecensione) formRecensione.onsubmit = async function (e) {
    e.preventDefault();
    const location = document.getElementById("location");
    const rating = document.getElementById("rating");
    const comment = document.getElementById("comment");

    if (!location || !rating || !comment) return;
    if (!location.value || !rating.value) {
      if (reviewError) reviewError.innerText = "Scegli una sede e un punteggio!";
      return;
    }
    reviewError.innerText = "Invio in corso...";

    try {
      const res = await fetch("/api/cliente/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ location_id: location.value, rating: rating.value, comment: comment.value })
      });
      if (res.ok) {
        reviewError.innerText = "";
        formRecensione.reset();
        showToast("Recensione inviata!", "success");
        loadReviews();
        const modal = bootstrap.Modal.getInstance(document.getElementById("modalRecensione"));
        if (modal) modal.hide();
      } else {
        const data = await res.json().catch(() => ({}));
        reviewError.innerText = "Errore: " + (data.message || "Non puoi recensire questa sede.");
      }
    } catch {
      reviewError.innerText = "Errore invio recensione";
    }
  };

  // Carica sedi anche nella modale recensione
  const selRecensione = document.getElementById("location");
  if (selRecensione) {
    selRecensione.innerHTML = `<option value="">Scegli la sede...</option>`;
    fetch("/api/cliente/locations", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(locations => {
        locations.forEach(l => {
          selRecensione.innerHTML += `<option value="${l.id}">${l.name} – ${l.city}</option>`;
        });
      });
  }

  // Logout
  const btnLogout = document.getElementById("logoutBtn");
  if (btnLogout) btnLogout.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  });
});
