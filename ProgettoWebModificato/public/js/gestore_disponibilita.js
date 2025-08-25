// ==================[ GESTORE DISPONIBILITA' - CoWorkSpace ]==================

// --- AUTENTICAZIONE E CONTROLLO ACCESSO ---
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user"));
if (!token || !user || user.role !== "gestore") {
  window.location.href = "login.html";
}

const urlParams = new URLSearchParams(window.location.search);
const spazioId = urlParams.get("spazio");
if (!spazioId) window.location.href = "spazi_gestore.html";

// --- ELEMENTI PAGINA ---
const nomeSpazio = document.getElementById("nomeSpazio");
const form = document.getElementById("formDisponibilita");
const tbody = document.getElementById("tbodyDisponibilita");
const toastContainer = document.getElementById("toast-container");

// --- TOPBAR: nome gestore (se presente) ---
const nomeGestoreEl = document.getElementById("nomeGestore");
if (nomeGestoreEl) nomeGestoreEl.textContent = user.name;

// --- LOGOUT (topbar + sidebar) ---
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}
document.getElementById("logoutBtnDropdown")?.addEventListener("click", logout);
document.getElementById("logoutBtn")?.addEventListener("click", logout);

// --- NOTIFICHE (placeholder) ---
function aggiornaNotifiche() {
  const badgeNotifiche = document.getElementById("badgeNotifiche");
  const menuNotifiche = document.getElementById("menuNotifiche");
  if (!badgeNotifiche || !menuNotifiche) return;
  // TODO: fetch reali dal backend. Placeholder:
  badgeNotifiche.style.display = "none";
  menuNotifiche.innerHTML = `<li><h6 class="dropdown-header">Notifiche</h6></li>
    <li><span class="dropdown-item small text-muted">Nessuna notifica</span></li>`;
}
aggiornaNotifiche();

// --- TOAST ANIMATO ---
function showToast(msg, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// --- BADGE STATO DISPONIBILITA' ---
function badgeDisponibilita(available) {
  return available
    ? `<span class="badge bg-success">Disponibile</span>`
    : `<span class="badge bg-secondary">Non disponibile</span>`;
}

// --- ESCAPE HTML (sicurezza) ---
function escapeHTML(str) {
  return String(str || "").replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// --- CARICA DISPONIBILITÀ (ordinata) ---
async function caricaDisponibilita() {
  tbody.innerHTML = `
    <tr>
      <td colspan="4" class="text-center">
        <div class="spinner-border text-info" role="status"><span class="visually-hidden">Caricamento...</span></div>
      </td>
    </tr>`;
  try {
    const res = await fetch(`/api/gestore/spazi/${spazioId}/disponibilita`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    let data = await res.json();
    // Ordina per data + orario
    data.sort((a, b) => (a.date + (a.time || a.time_slot)).localeCompare(b.date + (b.time || b.time_slot)));

    tbody.innerHTML = "";
    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-muted text-center">Nessuna disponibilità presente</td></tr>`;
      return;
    }
    data.forEach(d => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHTML(d.date)}</td>
        <td>${escapeHTML(d.time || d.time_slot)}</td>
        <td>${badgeDisponibilita(d.available)}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger" data-id="${d.id}" title="Elimina">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
      tr.querySelector("button").addEventListener("click", () => eliminaDisponibilita(d.id));
      tbody.appendChild(tr);
    });
  } catch {
    tbody.innerHTML = `<tr><td colspan="4" class="text-danger text-center">Errore nel caricamento disponibilità</td></tr>`;
    showToast("Errore nel caricamento disponibilità", "danger");
  }
}

// --- VALIDAZIONE AVANZATA FORM ---
function isFutureDate(date) {
  const today = new Date();
  const d = new Date(date);
  return d.setHours(0,0,0,0) >= today.setHours(0,0,0,0);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const date = form.data.value;
  const time = form.orario.value;

  if (!date || !time) {
    showToast("Compila entrambi i campi", "danger");
    return;
  }
  if (!isFutureDate(date)) {
    showToast("La data deve essere oggi o futura", "danger");
    return;
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    showToast("Orario non valido (HH:mm)", "danger");
    return;
  }

  try {
    const res = await fetch(`/api/gestore/spazi/${spazioId}/disponibilita`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ date, time })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || "Errore durante l'aggiunta", "danger");
      return;
    }
    showToast("Disponibilità aggiunta");
    form.reset();
    caricaDisponibilita();
  } catch {
    showToast("Errore durante l'aggiunta", "danger");
  }
});

// --- ELIMINA DISPONIBILITA' ---
async function eliminaDisponibilita(id) {
  if (!confirm("Eliminare questa disponibilità?")) return;
  try {
    const res = await fetch(`/api/gestore/disponibilita/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      showToast("Disponibilità eliminata");
      caricaDisponibilita();
    } else {
      showToast("Errore eliminazione", "danger");
    }
  } catch {
    showToast("Errore eliminazione", "danger");
  }
}

// --- CARICA NOME SPAZIO ---
async function caricaNomeSpazio() {
  try {
    const res = await fetch(`/api/gestore/spazi/${spazioId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const spazio = await res.json();
    nomeSpazio.textContent = escapeHTML(spazio.name || spazio.nome || "");
  } catch {
    nomeSpazio.textContent = "Nome non disponibile";
  }
}

// --- AVVIO ---
caricaNomeSpazio();
caricaDisponibilita();
