// js/recensioni_pubbliche.js

function getImgUrl(img) {
  if (!img || typeof img !== "string" || img.trim() === "") {
    return "https://cdn-icons-png.flaticon.com/512/2920/2920209.png";
  }
  if (img.startsWith("http")) return img;
  if (img.startsWith("/uploads/")) return img;
  if (img.startsWith("uploads/")) return "/" + img;
  return "/uploads/" + img.replace(/^\/?uploads\/?/, "");
}

let allReviews = [];

async function loadRecensioni() {
  const container = document.getElementById("reviewsList");
  container.innerHTML = `<div class="text-center w-100 my-5"><div class="spinner-border text-info"></div></div>`;
  try {
    const res = await fetch("/api/public/reviews");
    const reviews = await res.json();
    if (!Array.isArray(reviews) || !reviews.length) {
      container.innerHTML = `<div class="text-center text-muted w-100">Nessuna recensione trovata.</div>`;
      aggiornaFiltroSedi([]); // Svuota filtro se vuoto
      return;
    }
    allReviews = reviews;
    renderRecensioni(reviews);
    aggiornaFiltroSedi(reviews);
  } catch {
    container.innerHTML = `<div class="text-danger w-100">Errore caricamento recensioni.</div>`;
  }
}

function renderRecensioni(reviews) {
  const container = document.getElementById("reviewsList");
  if (!reviews.length) {
    container.innerHTML = `<div class="text-center text-muted w-100">Nessuna recensione trovata per questo filtro.</div>`;
    return;
  }
  container.innerHTML = reviews.map(r => `
    <div class="review-card">
      <div class="review-img">
        ${
          r.image_url && getImgUrl(r.image_url)
          ? `<img src="${getImgUrl(r.image_url)}" alt="Immagine sede" loading="lazy" onerror="this.onerror=null;this.src='https://cdn-icons-png.flaticon.com/512/2920/2920209.png';">`
          : `<span class="icon"><i class="bi bi-buildings"></i></span>`
        }
      </div>
      <div class="review-body">
        <div class="stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
        <div class="nome-sede"><i class="bi bi-buildings"></i> ${r.location_name || r.sede_nome || "-"}</div>
        <div class="commento">“${r.commento || r.comment || "-"}”</div>
        <div class="autore"><i class="bi bi-person"></i> ${r.user_name || r.utente || "Utente anonimo"}</div>
      </div>
    </div>
  `).join("");
}

function aggiornaFiltroSedi(reviews) {
  const select = document.getElementById('filtro-sede');
  if (!select) return;
  // Prendi nomi unici delle sedi recensite
  const nomi = [...new Set(reviews.map(r => r.location_name || r.sede_nome).filter(Boolean))];
  select.innerHTML = `<option value="">Tutte le sedi</option>` +
    nomi.map(nome => `<option value="${nome}">${nome}</option>`).join('');
}

document.addEventListener("DOMContentLoaded", () => {
  loadRecensioni();

  const select = document.getElementById('filtro-sede');
  if (select) {
    select.addEventListener('change', function() {
      const nome = this.value;
      if (!nome) {
        renderRecensioni(allReviews);
      } else {
        renderRecensioni(allReviews.filter(r =>
          (r.location_name || r.sede_nome) === nome
        ));
      }
    });
  }
});
