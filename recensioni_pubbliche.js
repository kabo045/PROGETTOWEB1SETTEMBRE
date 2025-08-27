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
let currentFiltered = [];

// --------- LOAD ----------
async function loadRecensioni() {
  const container = document.getElementById("reviewsList");
  container.innerHTML = `<div class="text-center w-100 my-5"><div class="spinner-border text-info"></div></div>`;
  try {
    const res = await fetch("/api/public/reviews");
    const reviews = await res.json();

    if (!Array.isArray(reviews) || !reviews.length) {
      container.innerHTML = `<div class="text-center text-muted w-100">Nessuna recensione trovata.</div>`;
      aggiornaFiltroSedi([]);
      return;
    }

    // Normalizzo qualche campo per sicurezza
    allReviews = reviews.map(r => ({
      ...r,
      rating: Number(r.rating || r.voto || 0),
      location_name: r.location_name || r.sede_nome || r.nome_sede || "",
      created_at: r.created_at || r.data || r.timestamp || null
    }));

    aggiornaFiltroSedi(allReviews);
    applicaFiltriERender();
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="text-danger w-100">Errore caricamento recensioni.</div>`;
  }
}

// --------- UI FILTERS ----------
function aggiornaFiltroSedi(reviews) {
  const select = document.getElementById('filtro-sede');
  if (!select) return;
  const nomi = [...new Set(reviews.map(r => r.location_name).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  select.innerHTML = `<option value="">Tutte le sedi</option>` + nomi.map(n => `<option value="${n}">${n}</option>`).join('');
}

function getFiltriCorrenti() {
  const sede = document.getElementById('filtro-sede')?.value || "";
  const minStars = Number(document.getElementById('filtro-stelle')?.value || 0);
  const ordina = document.getElementById('ordina')?.value || "rating_desc";
  return { sede, minStars, ordina };
}

function applicaFiltriERender() {
  const { sede, minStars, ordina } = getFiltriCorrenti();

  // filtro base
  let filtered = allReviews.filter(r => {
    const sedeOk = !sede || r.location_name === sede;
    const starOk = !minStars || (r.rating >= minStars);
    return sedeOk && starOk;
  });

  // ordinamento
  if (ordina === "rating_desc") {
    filtered.sort((a,b) => (b.rating||0) - (a.rating||0));
  } else if (ordina === "rating_asc") {
    filtered.sort((a,b) => (a.rating||0) - (b.rating||0));
  } else if (ordina === "recenti") {
    filtered.sort((a,b) => new Date(b.created_at||0) - new Date(a.created_at||0));
  } else if (ordina === "vecchie") {
    filtered.sort((a,b) => new Date(a.created_at||0) - new Date(b.created_at||0));
  }

  currentFiltered = filtered;
  renderRecensioni(filtered);
}

// --------- RENDER ----------
function renderRecensioni(reviews) {
  const container = document.getElementById("reviewsList");
  if (!reviews.length) {
    container.innerHTML = `<div class="text-center text-muted w-100">Nessuna recensione trovata per questo filtro.</div>`;
    return;
  }

  container.innerHTML = reviews.map(r => {
    const img = getImgUrl(r.image_url);
    const nomeSede = r.location_name || "-";
    const commento = r.commento || r.comment || "-";
    const autore = r.user_name || r.utente || "Utente anonimo";
    const stelle = Number(r.rating || 0);

    return `
      <div class="review-card">
        <div class="review-img">
          <img src="${img}" alt="Immagine sede" loading="lazy"
               onerror="this.onerror=null;this.src='https://cdn-icons-png.flaticon.com/512/2920/2920209.png';">
        </div>

        <div class="review-body">
          <div class="nome-sede"><i class="bi bi-buildings me-1"></i>${nomeSede}</div>
          <div class="stars" aria-label="${stelle} stelle su 5">
            ${"★".repeat(stelle)}${"☆".repeat(5 - stelle)}
          </div>
          <div class="commento">“${escapeHtml(String(commento))}”</div>
          <div class="autore"><i class="bi bi-person me-1"></i>${escapeHtml(String(autore))}</div>

          <div class="review-actions">
            <button class="btn btn-outline-secondary btn-sm"
                    data-action="dettagli"
                    data-sede="${encodeURIComponent(nomeSede)}">
              <i class="bi bi-info-circle me-1"></i>Dettagli
            </button>

            <!-- Tasto Prenota ben visibile -->
            <button class="btn btn-warning btn-sm"
                    data-action="prenota"
                    data-sede="${encodeURIComponent(nomeSede)}">
              <i class="bi bi-calendar2-check me-1"></i>Prenota
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // delega eventi per pulsanti
  container.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const sede = e.currentTarget.getAttribute("data-sede") || "";
      const decoded = decodeURIComponent(sede);

      if (e.currentTarget.getAttribute("data-action") === "dettagli") {
        // Vai alla pagina sedi con filtro per mostrare i dettagli di quella sede
        window.location.href = `sedi_pubbliche.html?q=${encodeURIComponent(decoded)}&dettagli=1`;
      }
      if (e.currentTarget.getAttribute("data-action") === "prenota") {
        // Reindirizza alla pagina sedi filtrata su quella sede (poi l’utente prenota da lì)
        window.location.href = `sedi_pubbliche.html?q=${encodeURIComponent(decoded)}&prenota=1`;
      }
    });
  });
}

// --------- UTILS ----------
function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// --------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  loadRecensioni();

  const filtroSede = document.getElementById('filtro-sede');
  const filtroStelle = document.getElementById('filtro-stelle');
  const ordina = document.getElementById('ordina');

  [filtroSede, filtroStelle, ordina].forEach(el => {
    if (el) el.addEventListener('change', applicaFiltriERender);
  });
});
