// ==================[ GESTORE SEDI - AUTENTICAZIONE E LOGOUT ]==================
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "{}");
if (!token || !user || user.role !== "gestore") {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

const nomeGestoreEl = document.getElementById("nomeGestore");
if (nomeGestoreEl && user?.name) nomeGestoreEl.textContent = user.name;
document.getElementById("logoutBtn").onclick = logout;
document.getElementById("logoutBtnSidebar").onclick = logout;
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// ==================[ ELEMENTI DOM ]==================
const headers = { "Authorization": "Bearer " + token, "Content-Type": "application/json" };
const listaSedi = document.getElementById("listaSedi");
const btnAggiungiSede = document.getElementById("btnAggiungiSede");
const modaleSede = new bootstrap.Modal(document.getElementById("modaleSede"));
const formSede = document.getElementById("formSede");
const titoloModaleSede = document.getElementById("titoloModaleSede");
const toastContainer = document.getElementById("toast-container");
const fileInput = document.getElementById("fileImmagineSede");
const serviziCheckbox = document.getElementById("serviziCheckbox");
const servizioCustom = document.getElementById("servizioCustom");
const previewImg = document.getElementById("previewSedeImg");

let sedi = [];
let idSedeModifica = null;
let image_url_edit = "";

// =============== CARICA SEDI ================
async function caricaSedi() {
  listaSedi.innerHTML = '<div class="text-center py-4 text-muted">Caricamento…</div>';
  try {
    const res = await fetch("/api/gestore/sedi", { headers });
    if (res.status === 401 || res.status === 403) {
      logout(); return;
    }
    sedi = await res.json();
    if (!sedi.length) {
      listaSedi.innerHTML = '<div class="text-center text-muted py-5">Nessuna sede trovata.</div>';
      return;
    }
    listaSedi.innerHTML = "";
    for (const sede of sedi) {
      let imgHtml = "";
      // Path corretto per immagini (assicurati che il backend restituisca image_url completo es: "/uploads/xxx.png")
      if (sede.image_url) {
        let imgSrc = sede.image_url;
        // Fixa se manca la slash iniziale
        if (!imgSrc.startsWith("/") && !imgSrc.startsWith("http")) imgSrc = "/uploads/" + imgSrc;
        imgHtml = `<img src="${imgSrc}" alt="Immagine sede" class="img-fluid rounded mb-2 img-sede">`;
      } else {
        imgHtml = `<div class="fallback-icona"><i class="bi bi-buildings" style="font-size:2.3rem;color:#3b82f6;"></i></div>`;
      }
      listaSedi.innerHTML += `
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card card-sede p-3 h-100 d-flex flex-column shadow-sm">
            ${imgHtml}
            <div class="card-body py-2">
              <h5 class="card-title mb-1">${sede.name}</h5>
              <div class="small text-muted mb-1">${sede.city} – <span class="text-dark">${sede.address}</span></div>
              <div class="mb-2"><b>Prezzo:</b> € ${sede.price !== undefined && sede.price !== null ? sede.price : "-"} / giorno</div>
              <div class="mb-2"><b>Servizi:</b> ${
                Array.isArray(sede.services) && sede.services.length
                  ? sede.services.map(s => `<span class="badge bg-primary-subtle text-primary me-1">${s}</span>`).join("")
                  : "<i>Nessuno</i>"
              }</div>
            </div>
            <div class="mt-auto d-flex gap-2">
              <button class="btn btn-outline-secondary btn-sm flex-grow-1" data-sede="${sede.id}" data-action="modifica"><i class="bi bi-pencil"></i> Modifica</button>
              <button class="btn btn-outline-danger btn-sm" data-sede="${sede.id}" data-action="elimina"><i class="bi bi-trash"></i> Elimina</button>
            </div>
          </div>
        </div>`;
    }
  } catch (e) {
    showToast("Errore caricamento sedi", "danger");
    listaSedi.innerHTML = '<div class="text-center text-danger py-5">Errore caricamento sedi.</div>';
  }
}

// ============= APERTURA MODALE NUOVA SEDE ==============
btnAggiungiSede.onclick = () => {
  formSede.reset();
  idSedeModifica = null;
  image_url_edit = "";
  titoloModaleSede.textContent = "Aggiungi Sede";
  previewImg.innerHTML = `<span class="text-muted">Nessuna</span>`;
  serviziCheckbox.querySelectorAll("input[type='checkbox']").forEach(cb => cb.checked = false);
  servizioCustom.value = "";
  modaleSede.show();
};

// =========== GESTIONE CLICK SU MODIFICA/ELIMINA ==========
listaSedi.onclick = function (e) {
  const btn = e.target.closest("button[data-sede]");
  if (!btn) return;
  const sedeId = btn.dataset.sede;
  const action = btn.dataset.action;
  if (action === "elimina") eliminaSede(sedeId);
  if (action === "modifica") apriModificaSede(sedeId);
};

// =========== APRI MODIFICA SEDE ==========
function apriModificaSede(sedeId) {
  const sede = sedi.find(s => String(s.id) === String(sedeId));
  if (!sede) return;
  idSedeModifica = sedeId;
  titoloModaleSede.textContent = "Modifica Sede";
  document.getElementById("nomeSede").value = sede.name || "";
  document.getElementById("cittaSede").value = sede.city || "";
  document.getElementById("indirizzoSede").value = sede.address || "";
  document.getElementById("prezzoSede").value = sede.price || "";

  // Servizi checkbox
  serviziCheckbox.querySelectorAll("input[type='checkbox']").forEach(cb => cb.checked = false);
  servizioCustom.value = "";
  if (Array.isArray(sede.services)) {
    sede.services.forEach(s => {
      let cb = serviziCheckbox.querySelector(`input[type='checkbox'][value="${s}"]`);
      if (cb) cb.checked = true;
      else servizioCustom.value += (servizioCustom.value ? ", " : "") + s;
    });
  } else if (typeof sede.services === "string" && sede.services.trim()) {
    servizioCustom.value = sede.services;
  }

  // Immagine: anteprima e salvataggio url per patch/put
  image_url_edit = sede.image_url || "";
  previewImg.innerHTML = image_url_edit
    ? `<img src="${image_url_edit}" alt="Anteprima" style="max-width:100%;max-height:62px;border-radius:9px;">`
    : `<span class="text-muted">Nessuna</span>`;
  fileInput.value = ""; // reset file input
  modaleSede.show();
}

// =============== SUBMIT FORM ===============
formSede.onsubmit = async function (e) {
  e.preventDefault();

  // Validazione prezzo
  const price = parseFloat(document.getElementById("prezzoSede").value);
  if (isNaN(price) || price < 0) {
    showToast("Prezzo non valido", "danger");
    return;
  }

  // Raccolta servizi da checkbox e campo custom
  const servizi = [];
  serviziCheckbox.querySelectorAll("input[type='checkbox']").forEach(cb => {
    if (cb.checked) servizi.push(cb.value);
  });
  const custom = servizioCustom.value.trim();
  if (custom) {
    custom.split(",").map(s => s.trim()).filter(Boolean).forEach(s => servizi.push(s));
  }

  // Upload immagine se selezionata
  let image_url = image_url_edit || "";
  if (fileInput.files.length > 0) {
    const formData = new FormData();
    formData.append("immagine", fileInput.files[0]);
    const upload = await fetch("/api/upload/immagine", { method: "POST", body: formData });
    if (upload.ok) {
      const data = await upload.json();
      image_url = data.imageUrl;
    } else {
      showToast("Errore caricamento immagine", "danger");
      return;
    }
  }

  // Prepara il body per POST/PATCH
  const body = {
    name: document.getElementById("nomeSede").value.trim(),
    city: document.getElementById("cittaSede").value.trim(),
    address: document.getElementById("indirizzoSede").value.trim(),
    price: price,
    services: servizi,
    image_url
  };

  let url = `/api/gestore/sedi`;
  let method = "POST";
  if (idSedeModifica) {
    url = `/api/gestore/sedi/${idSedeModifica}`;
    method = "PATCH";
  }
  const res = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) return showToast("Errore salvataggio sede", "danger");
  modaleSede.hide();
  caricaSedi();
  showToast(idSedeModifica ? "Sede aggiornata!" : "Sede aggiunta!", "success");
  idSedeModifica = null;
  image_url_edit = "";
};

// =============== ELIMINA SEDE ===============
async function eliminaSede(id) {
  // Toast "alert" di conferma eliminazione sede
  const confirmToast = document.createElement("div");
  confirmToast.className = "toast show mb-3 border-0 shadow-lg";
  confirmToast.style.maxWidth = "390px";
  confirmToast.style.background = "#fff";
  confirmToast.style.borderLeft = "7px solid #d32f2f";
  confirmToast.style.boxShadow = "0 4px 32px #e5737340";
  confirmToast.innerHTML = `
    <div class="p-3 pb-2 d-flex flex-column gap-1">
      <div class="d-flex align-items-center mb-1">
        <span class="fs-2 text-danger me-2"><i class="bi bi-exclamation-triangle-fill"></i></span>
        <span class="fs-5 fw-bold text-danger">Elimina Sede</span>
      </div>
      <div class="mb-2 ps-1 text-dark" style="font-size:1.08rem;">
        Vuoi davvero <b>eliminare questa sede</b>?<br>
        <span class="text-secondary" style="font-size:.97rem;">L’azione è <b>irreversibile</b>. Tutti i dati associati andranno persi.</span>
      </div>
      <div class="d-flex gap-2 mt-2 ps-1">
        <button type="button" class="btn btn-danger flex-fill fw-semibold shadow-sm rounded-pill py-2" id="confirmDeleteSedeBtn">
          <i class="bi bi-trash"></i> Sì, elimina
        </button>
        <button type="button" class="btn btn-outline-secondary flex-fill fw-semibold rounded-pill py-2 border-2" data-bs-dismiss="toast" style="transition:.16s;">
          Annulla
        </button>
      </div>
    </div>
  `;
  toastContainer.appendChild(confirmToast);

  // Chiudi su Annulla
  confirmToast.querySelector('[data-bs-dismiss="toast"]').onclick = () => confirmToast.remove();

  // Conferma eliminazione
  confirmToast.querySelector('#confirmDeleteSedeBtn').onclick = async () => {
    confirmToast.remove();
    const res = await fetch(`/api/gestore/sedi/${id}`, { method: "DELETE", headers });
    if (!res.ok) return showToast("Errore eliminazione", "danger");
    caricaSedi();
    showToast("Sede eliminata", "success");
  };

  // Chiudi dopo 10s se non si decide
  setTimeout(() => confirmToast.remove(), 10000);
}


// =============== TOAST ===============
function showToast(msg, type = "success") {
  const c = toastContainer;
  const t = document.createElement("div");
  t.className = `toast align-items-center text-bg-${type === "danger" ? "danger" : "success"} border-0 show mb-2`;
  t.role = "alert";
  t.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// =============== ANTEPRIMA IMMAGINE FILE INPUT ===============
fileInput.onchange = function () {
  const file = this.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      previewImg.innerHTML = `<img src="${e.target.result}" alt="Anteprima" style="max-width:100%;max-height:62px;border-radius:9px;">`;
    };
    reader.readAsDataURL(file);
  } else {
    previewImg.innerHTML = `<span class="text-muted">Nessuna</span>`;
  }
};

caricaSedi();
