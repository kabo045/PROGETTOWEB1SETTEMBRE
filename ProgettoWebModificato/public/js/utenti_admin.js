// utenti_admin.js

// --- Toast di feedback ---
function showToast(msg, type='success') {
  let el = document.createElement('div');
  el.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
  el.role = "alert";
  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${msg}</div>
      <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  document.querySelector('.toast-container').appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// --- Carica gli utenti alla partenza ---
document.addEventListener('DOMContentLoaded', () => {
  loadUsers();

  // Gestione submit form aggiungi utente
  // Gestione submit form aggiungi utente
document.getElementById("userForm").onsubmit = async function(e) {
  e.preventDefault();
  const name = document.getElementById('name').value;
  const surname = document.getElementById('surname').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;

  const btn = document.getElementById('saveUserBtn');
  btn.disabled = true;
  try {
    let res = await fetch('/api/admin/users', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem('token')
      },
      body: JSON.stringify({name, surname, email, password, role})
    });

    // Gestione email già esistente (409)
    if (res.status === 409) {
      showToast("Errore: questa email è già registrata.", 'danger');
      btn.disabled = false;
      return;
    }
    if (!res.ok) {
      let err = await res.json().catch(()=>({}));
      showToast(err.error || err.message || "Errore aggiunta utente", 'danger');
      btn.disabled = false;
      return;
    }
    showToast("Utente aggiunto!");
    bootstrap.Modal.getOrCreateInstance(document.getElementById('addUserModal')).hide();
    document.getElementById('userForm').reset();
    loadUsers();
  } catch (e) {
    showToast("Errore di rete", 'danger');
  }
  btn.disabled = false;
};

});

// --- Caricamento utenti ---
async function loadUsers() {
  const tbody = document.querySelector("#usersTable tbody");
  tbody.innerHTML = `<tr><td colspan="5" class="text-center text-secondary">Caricamento...</td></tr>`;
  try {
    let token = localStorage.getItem('token');
    if (!token) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Token di autenticazione mancante</td></tr>`;
      return;
    }
    const res = await fetch('/api/admin/users', {
      headers: {'Authorization': 'Bearer ' + token}
    });
    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Errore caricamento utenti</td></tr>`;
      showToast("Errore caricamento utenti", "danger");
      return;
    }
    const users = await res.json();
    if (!Array.isArray(users) || users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-secondary">Nessun utente trovato.</td></tr>`;
      return;
    }
    tbody.innerHTML = "";
    users.forEach(u => {
      tbody.innerHTML += `
        <tr>
          <td>${u.name}</td>
          <td>${u.surname || ""}</td>
          <td>${u.email}</td>
          <td>
            <select class="form-select" onchange="changeRole(${u.id}, this.value)" ${u.id === 1 ? "disabled" : ""}>
              <option value="cliente" ${u.role==='cliente'?'selected':''}>Cliente</option>
              <option value="gestore" ${u.role==='gestore'?'selected':''}>Gestore</option>
              <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
            </select>
          </td>
          <td class="action-btns">
            <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})" ${u.id === 1 ? "disabled" : ""}>
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Errore di rete</td></tr>`;
    showToast("Errore di rete", "danger");
  }
}

// --- Cambio ruolo utente ---
window.changeRole = async function(userId, newRole) {
  try {
    let res = await fetch(`/api/admin/users/${userId}/role`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem('token')
      },
      body: JSON.stringify({role: newRole})
    });
    if (!res.ok) {
      let err = await res.json().catch(()=>({}));
      showToast(err.error || err.message || "Errore modifica ruolo", 'danger');
      return;
    }
    showToast("Ruolo aggiornato!");
    loadUsers();
  } catch (e) {
    showToast("Errore di rete", 'danger');
  }
}

// --- Elimina utente ---
window.deleteUser = function(userId) {
  // Toast di conferma "alert"
  const confirmToast = document.createElement("div");
  confirmToast.className = "toast show mb-3 border-0 shadow-lg";
  confirmToast.style.maxWidth = "370px";
  confirmToast.style.background = "#fff";
  confirmToast.style.borderLeft = "7px solid #d32f2f";
  confirmToast.style.boxShadow = "0 4px 32px #e5737340";
  confirmToast.innerHTML = `
    <div class="p-3 pb-2 d-flex flex-column gap-1">
      <div class="d-flex align-items-center mb-1">
        <span class="fs-2 text-danger me-2"><i class="bi bi-exclamation-triangle-fill"></i></span>
        <span class="fs-5 fw-bold text-danger">Elimina Utente</span>
      </div>
      <div class="mb-2 ps-1 text-dark" style="font-size:1.08rem;">
        Vuoi davvero <b>eliminare questo utente</b>?<br>
        <span class="text-secondary" style="font-size:.97rem;">L’azione è <b>irreversibile</b>. Tutti i dati associati saranno persi.</span>
      </div>
      <div class="d-flex gap-2 mt-2 ps-1">
        <button type="button" class="btn btn-danger flex-fill fw-semibold shadow-sm rounded-pill py-2" id="confirmDeleteUserBtn">
          <i class="bi bi-trash"></i> Sì, elimina
        </button>
        <button type="button" class="btn btn-outline-secondary flex-fill fw-semibold rounded-pill py-2 border-2" data-bs-dismiss="toast" style="transition:.16s;">
          Annulla
        </button>
      </div>
    </div>
  `;
  document.querySelector('.toast-container').appendChild(confirmToast);

  // Chiudi su annulla
  confirmToast.querySelector('[data-bs-dismiss="toast"]').onclick = () => confirmToast.remove();

  // Conferma eliminazione
  confirmToast.querySelector('#confirmDeleteUserBtn').onclick = async () => {
    confirmToast.remove();
    try {
      let res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
      });
      if (!res.ok) {
        let err = await res.json().catch(()=>({}));
        showToast(err.error || err.message || "Errore eliminazione utente", 'danger');
        return;
      }
      showToast("Utente eliminato!");
      loadUsers();
    } catch (e) {
      showToast("Errore di rete", 'danger');
    }
  };

  // Chiudi toast dopo 10s se non si decide
  setTimeout(() => confirmToast.remove(), 10000);
};


// --- Filtro lato client ---
function filterUsers() {
  const term = document.getElementById('userSearch').value.toLowerCase();
  document.querySelectorAll("#usersTable tbody tr").forEach(tr => {
    tr.style.display = [...tr.children].some(td => td.textContent.toLowerCase().includes(term)) ? "" : "none";
  });
}
