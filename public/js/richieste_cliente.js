// ---- Gestione Richieste Clienti per Gestore ----

async function loadRequests() {
  const statoEl = document.getElementById("filterStato");
  const searchEl = document.getElementById("searchCliente");
  const requestsDiv = document.getElementById("requests");
  if (!requestsDiv) {
    console.error("Elemento #requests non trovato!");
    return;
  }
  const stato = statoEl ? statoEl.value : "";
  const search = searchEl ? searchEl.value.trim() : "";
  let url = `/api/gestore/support?`;
  if (stato) url += `stato=${encodeURIComponent(stato)}&`;
  if (search) url += `search=${encodeURIComponent(search)}&`;

  try {
    const res = await fetch(url, {
      headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    });
    if (!res.ok) {
      // Se il backend risponde 500, mostra errore e svuota lista
      const data = await res.json().catch(() => ({}));
      requestsDiv.innerHTML = `<div class="text-danger">Errore nel caricamento richieste: ${data.error || res.status}</div>`;
      return;
    }
    const requests = await res.json();
    requestsDiv.innerHTML = "";
    if (!requests.length) {
      requestsDiv.innerHTML = "<div class='text-center text-muted'>Nessuna richiesta trovata.</div>";
      return;
    }
    for (const r of requests) {
      requestsDiv.innerHTML += `
        <div class="request-card">
          <div class="oggetto mb-1"><i class="bi bi-envelope me-1"></i> ${r.subject || 'Richiesta generica'}</div>
          <div class="testo mb-1">${r.message.replace(/</g, "&lt;")}</div>
          <div class="cliente">da ${r.user_name || "Cliente"} (${r.user_email})</div>
          <div class="status ${r.status === 'risolta' ? 'risolta' : ''}">Stato: ${r.status}</div>
          <div class="date">${new Date(r.created_at).toLocaleDateString()}</div>
          ${r.status === 'aperta' ? `<button class="btn btn-success btn-sm mt-2" onclick="cambiaStato(${r.id})">
            Segna come risolta</button>` : ""}
        </div>
      `;
    }
  } catch (err) {
    requestsDiv.innerHTML = `<div class="text-danger">Errore di rete o server: ${err.message}</div>`;
  }
}

// ---- Gestione Richieste Clienti per Gestore ----

async function loadRequests() {
  const statoEl = document.getElementById("filterStato");
  const searchEl = document.getElementById("searchCliente");
  const requestsDiv = document.getElementById("requests");
  if (!requestsDiv) {
    console.error("Elemento #requests non trovato!");
    return;
  }
  const stato = statoEl ? statoEl.value : "";
  const search = searchEl ? searchEl.value.trim() : "";
  let url = `/api/gestore/support?`;
  if (stato) url += `stato=${encodeURIComponent(stato)}&`;
  if (search) url += `search=${encodeURIComponent(search)}&`;

  try {
    const res = await fetch(url, {
      headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    });
    if (!res.ok) {
      // Se il backend risponde 500, mostra errore e svuota lista
      const data = await res.json().catch(() => ({}));
      requestsDiv.innerHTML = `<div class="text-danger">Errore nel caricamento richieste: ${data.error || res.status}</div>`;
      return;
    }
    const requests = await res.json();
    requestsDiv.innerHTML = "";
    if (!requests.length) {
      requestsDiv.innerHTML = "<div class='text-center text-muted'>Nessuna richiesta trovata.</div>";
      return;
    }
    for (const r of requests) {
      requestsDiv.innerHTML += `
        <div class="request-card">
          <div class="oggetto mb-1"><i class="bi bi-envelope me-1"></i> ${r.subject || 'Richiesta generica'}</div>
          <div class="testo mb-1">${r.message.replace(/</g, "&lt;")}</div>
          <div class="cliente">da ${r.user_name || "Cliente"} (${r.user_email})</div>
          <div class="status ${r.status === 'risolta' ? 'risolta' : ''}">Stato: ${r.status}</div>
          <div class="date">${new Date(r.created_at).toLocaleDateString()}</div>
          ${r.status === 'aperta' ? `<button class="btn btn-success btn-sm mt-2" onclick="cambiaStato(${r.id})">
            Segna come risolta</button>` : ""}
        </div>
      `;
    }
  } catch (err) {
    requestsDiv.innerHTML = `<div class="text-danger">Errore di rete o server: ${err.message}</div>`;
  }
}

async function cambiaStato(requestId) {
  // Toast-alert moderno per conferma
  const confirmToast = document.createElement("div");
  confirmToast.className = "toast show mb-3 border-0 shadow-lg";
  confirmToast.style.maxWidth = "390px";
  confirmToast.style.background = "#fff";
  confirmToast.style.borderLeft = "7px solid #30a246";
  confirmToast.style.boxShadow = "0 4px 32px #30a24640";
  confirmToast.innerHTML = `
    <div class="p-3 pb-2 d-flex flex-column gap-1">
      <div class="d-flex align-items-center mb-1">
        <span class="fs-2 text-success me-2"><i class="bi bi-patch-check-fill"></i></span>
        <span class="fs-5 fw-bold text-success">Segna come risolta</span>
      </div>
      <div class="mb-2 ps-1 text-dark" style="font-size:1.08rem;">
        Vuoi segnare questa richiesta come <b>risolta</b>?<br>
        <span class="text-secondary" style="font-size:.97rem;">L’utente riceverà una notifica.</span>
      </div>
      <div class="d-flex gap-2 mt-2 ps-1">
        <button type="button" class="btn btn-success flex-fill fw-semibold shadow-sm rounded-pill py-2" id="confirmStatoBtn">
          <i class="bi bi-check2-circle"></i> Sì, segna risolta
        </button>
        <button type="button" class="btn btn-outline-secondary flex-fill fw-semibold rounded-pill py-2 border-2" data-bs-dismiss="toast" style="transition:.16s;">
          Annulla
        </button>
      </div>
    </div>
  `;
  document.getElementById("toast-container").appendChild(confirmToast);

  // Chiudi su Annulla
  confirmToast.querySelector('[data-bs-dismiss="toast"]').onclick = () => confirmToast.remove();

  // Conferma aggiornamento stato
  confirmToast.querySelector('#confirmStatoBtn').onclick = async () => {
    confirmToast.remove();
    try {
      const res = await fetch(`/api/gestore/support/${requestId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({ status: "risolta" })
      });
      if (res.ok) {
        showToast("Richiesta segnata come risolta!", "success");
        loadRequests();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Errore aggiornamento stato richiesta", "danger");
      }
    } catch (err) {
      showToast("Errore di rete: " + err.message, "danger");
    }
  };

  setTimeout(() => confirmToast.remove(), 10000);
}


// Toast utility
function showToast(msg, type = "info") {
  const id = "toast" + Math.random();
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${type} border-0 show`;
  toast.id = id;
  toast.role = "alert";
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.style.position = "fixed";
    toastContainer.style.top = "15px";
    toastContainer.style.right = "15px";
    toastContainer.style.zIndex = "12000";
    document.body.appendChild(toastContainer);
  }
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}


document.addEventListener("DOMContentLoaded", () => {
  const statoEl = document.getElementById("filterStato");
  const searchEl = document.getElementById("searchCliente");
  const resetBtn = document.getElementById("resetFiltri");
  const logoutBtn = document.getElementById("logoutBtn");

  if (statoEl) statoEl.addEventListener("change", loadRequests);
  if (searchEl) searchEl.addEventListener("input", () => {
    setTimeout(loadRequests, 300); // debounce semplice
  });
  if (resetBtn) resetBtn.addEventListener("click", () => {
    if (statoEl) statoEl.value = "";
    if (searchEl) searchEl.value = "";
    loadRequests();
  });
  if (logoutBtn) logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "index.html";
  });

  loadRequests();
});

// Toast utility
function showToast(msg, type = "info") {
  const id = "toast" + Math.random();
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${type} border-0 show`;
  toast.id = id;
  toast.role = "alert";
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.style.position = "fixed";
    toastContainer.style.top = "15px";
    toastContainer.style.right = "15px";
    toastContainer.style.zIndex = "12000";
    document.body.appendChild(toastContainer);
  }
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}
