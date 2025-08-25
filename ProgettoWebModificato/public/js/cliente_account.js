// js/cliente_account.js

const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

// Toast animato
const toastContainer = document.getElementById("toast-container");
function showToast(msg, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${type} border-0 show mb-2 animate__animated animate__fadeInRight`;
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ---- RIEPILOGO DATI ----
async function caricaRiepilogo() {
  try {
    const res = await fetch("/api/cliente/account", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const user = await res.json();
    // Riepilogo (top card)
    document.getElementById("valNome").textContent = user.name || "-";
    document.getElementById("valCognome").textContent = user.surname || "-";
    document.getElementById("valEmail").textContent = user.email || "-";
    document.getElementById("valTelefono").textContent = user.phone || "-";
    // Form modifica (compila anche il form sotto)
    document.getElementById("inputNome").value = user.name || "";
    document.getElementById("inputCognome").value = user.surname || "";
    document.getElementById("inputEmail").value = user.email || "";
    document.getElementById("inputTelefono").value = user.phone || "";
  } catch {
    showToast("Errore caricamento profilo", "danger");
  }
}

// ---- MODIFICA DATI ----
document.getElementById("formModificaDati").addEventListener("submit", async e => {
  e.preventDefault();
  const nome = document.getElementById("inputNome").value.trim();
  const cognome = document.getElementById("inputCognome").value.trim();
  const email = document.getElementById("inputEmail").value.trim();
  const telefono = document.getElementById("inputTelefono").value.trim();

  // Validazione semplice
  if (!nome || !email) {
    showToast("Compila i campi obbligatori!", "danger");
    return;
  }
  if (!email.match(/^[\w\-.]+@[\w\-]+\.\w{2,}$/)) {
    showToast("Email non valida", "danger");
    return;
  }
  const data = { name: nome, surname: cognome, email, phone: telefono };

  try {
    const res = await fetch("/api/cliente/account", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      showToast("Dati aggiornati con successo!");
      caricaRiepilogo(); // aggiorna sia form sia riepilogo in alto
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || "Errore aggiornamento dati", "danger");
    }
  } catch {
    showToast("Errore aggiornamento dati", "danger");
  }
});

// ---- CAMBIO PASSWORD ----
document.getElementById("formPassword").addEventListener("submit", async e => {
  e.preventDefault();
  const pw1 = document.getElementById("inputPassword").value;
  const pw2 = document.getElementById("inputPasswordConferma").value;
  if (!pw1 || !pw2) {
    showToast("Compila entrambi i campi!", "danger");
    return;
  }
  if (pw1 !== pw2) {
    showToast("Le password non coincidono!", "danger");
    return;
  }
  if (pw1.length < 8) {
    showToast("La password deve avere almeno 8 caratteri", "danger");
    return;
  }

  try {
    const res = await fetch("/api/cliente/account/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password: pw1 })
    });
    if (res.ok) {
      showToast("Password aggiornata!");
      document.getElementById("inputPassword").value = "";
      document.getElementById("inputPasswordConferma").value = "";
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || "Errore aggiornamento password", "danger");
    }
  } catch {
    showToast("Errore aggiornamento password", "danger");
  }
});

// ---- ELIMINA ACCOUNT ----
document.getElementById("btnEliminaAccount").addEventListener("click", () => {
  // Toast "alert" di conferma eliminazione account
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
        <span class="fs-5 fw-bold text-danger">Conferma Eliminazione</span>
      </div>
      <div class="mb-2 ps-1 text-dark" style="font-size:1.08rem;">
        Vuoi davvero <b>eliminare il tuo account</b>?<br>
        <span class="text-secondary" style="font-size:.97rem;">L’azione è <b>irreversibile</b>.<br>Tutti i tuoi dati verranno persi.</span>
      </div>
      <div class="d-flex gap-2 mt-2 ps-1">
        <button type="button" class="btn btn-danger flex-fill fw-semibold shadow-sm rounded-pill py-2" id="confirmDeleteAccountBtn">
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
  confirmToast.querySelector('#confirmDeleteAccountBtn').onclick = async () => {
    confirmToast.remove();
    try {
      const res = await fetch("/api/cliente/account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Account eliminato. Verrai disconnesso.", "success");
        setTimeout(() => {
          localStorage.removeItem("token");
          window.location.href = "login.html";
        }, 1800);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || "Errore eliminazione account", "danger");
      }
    } catch {
      showToast("Errore eliminazione account", "danger");
    }
  };

  // Chiudi dopo 11s se non si decide
  setTimeout(() => confirmToast.remove(), 11000);
});


// ---- LOGOUT ----
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "login.html";
});

// Avvio iniziale
caricaRiepilogo();
