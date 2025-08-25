let allGestori = [];
let editingSedeId = null;
let submitInProgress = false;

// Toast universale
function showToast(msg, type="success") {
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

document.addEventListener('DOMContentLoaded', () => {
  loadSedi();
  loadGestori();

  // Reset modale e stato su "Aggiungi"
  document.querySelector('[data-bs-target="#addSedeModal"]').addEventListener('click', () => {
    editingSedeId = null;
    document.getElementById('sedeForm').reset();
    document.getElementById('modalTitleSede').innerText = 'Aggiungi Sede';
    document.getElementById('saveSedeBtn').innerText = 'Salva';
  });

  // Gestione submit form
  document.getElementById("sedeForm").onsubmit = async function(e) {
    e.preventDefault();
    if (submitInProgress) return;
    submitInProgress = true;

    const nome = document.getElementById('nomeSede').value.trim();
    const citta = document.getElementById('cittaSede').value.trim();
    const indirizzo = document.getElementById('indirizzoSede').value.trim();
    const servizi = document.getElementById('serviziSede').value.split(',').map(s => s.trim()).filter(Boolean);
    const manager_id = document.getElementById('gestoreSede').value;

    if (!nome || !citta || !manager_id) {
      showToast("Compila tutti i campi obbligatori", "danger");
      submitInProgress = false;
      return;
    }

    try {
      let response;
      if (editingSedeId) {
        response = await fetch(`/api/admin/locations/${editingSedeId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem('token')
          },
          body: JSON.stringify({name: nome, city: citta, address: indirizzo, services: servizi, manager_id})
        });
      } else {
        response = await fetch('/api/admin/locations', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem('token')
          },
          body: JSON.stringify({name: nome, city: citta, address: indirizzo, services: servizi, manager_id})
        });
      }
      if (response.ok) {
        bootstrap.Modal.getOrCreateInstance(document.getElementById('addSedeModal')).hide();
        loadSedi();
        document.getElementById('sedeForm').reset();
        editingSedeId = null;
        document.getElementById('modalTitleSede').innerText = 'Aggiungi Sede';
        document.getElementById('saveSedeBtn').innerText = 'Salva';
        showToast(editingSedeId ? "Sede aggiornata!" : "Sede creata!");
      } else {
        const err = await response.json().catch(() => ({}));
        showToast(err.error || "Errore salvataggio sede", "danger");
      }
    } catch (error) {
      showToast("Errore di rete", "danger");
    }
    submitInProgress = false;
  };
});

// Carica sedi
async function loadSedi() {
  const tbody = document.querySelector("#sediTable tbody");
  tbody.innerHTML = `<tr><td colspan="6" class="text-center text-secondary">Caricamento...</td></tr>`;
  try {
    let token = localStorage.getItem('token');
    if (!token) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Token di autenticazione mancante</td></tr>`;
      showToast("Token di autenticazione mancante", "danger");
      return;
    }
    const res = await fetch('/api/admin/locations', {
      headers: {'Authorization': 'Bearer ' + token}
    });
    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Errore caricamento sedi</td></tr>`;
      showToast("Errore caricamento sedi", "danger");
      return;
    }
    const sedi = await res.json();
    if (!Array.isArray(sedi) || sedi.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-secondary">Nessuna sede trovata.</td></tr>`;
      return;
    }
    tbody.innerHTML = "";
    sedi.forEach(s => {
      tbody.innerHTML += `
        <tr>
          <td>${s.name}</td>
          <td>${s.city}</td>
          <td>${s.address || ""}</td>
          <td>${(s.services || []).join(', ')}</td>
          <td>${s.manager_name || ""}</td>
          <td class="action-btns">
            <button class="btn btn-primary btn-sm" onclick="editSede(${s.id})">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteSede(${s.id})">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Errore di rete</td></tr>`;
    showToast("Errore di rete", "danger");
  }
}

// Carica gestori nel select
async function loadGestori() {
  const select = document.getElementById('gestoreSede');
  select.innerHTML = '<option value="">Caricamento...</option>';
  try {
    const res = await fetch('/api/admin/users?role=gestore', {
      headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}
    });
    if (!res.ok) {
      select.innerHTML = '<option value="">Errore caricamento gestori</option>';
      showToast("Errore caricamento gestori", "danger");
      return;
    }
    allGestori = await res.json();
    if (!Array.isArray(allGestori) || allGestori.length === 0) {
      select.innerHTML = '<option value="">Nessun gestore disponibile</option>';
      return;
    }
    select.innerHTML = '';
    allGestori.forEach(g => {
      select.innerHTML += `<option value="${g.id}">${g.name} ${g.surname || ''} (${g.email})</option>`;
    });
  } catch (e) {
    select.innerHTML = '<option value="">Errore di rete</option>';
    showToast("Errore di rete", "danger");
  }
}

// Modifica sede
window.editSede = async function(sedeId) {
  const res = await fetch(`/api/admin/locations/${sedeId}`, {
    headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}
  });
  const sede = await res.json();
  document.getElementById('nomeSede').value = sede.name;
  document.getElementById('cittaSede').value = sede.city;
  document.getElementById('indirizzoSede').value = sede.address || '';
  document.getElementById('serviziSede').value = (sede.services || []).join(', ');
  document.getElementById('gestoreSede').value = sede.manager_id || '';
  editingSedeId = sede.id;
  document.getElementById('modalTitleSede').innerText = 'Modifica Sede';
  document.getElementById('saveSedeBtn').innerText = 'Aggiorna';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('addSedeModal')).show();
}

// Elimina sede
window.deleteSede = function(sedeId) {
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
        <span class="fs-5 fw-bold text-danger">Elimina Sede</span>
      </div>
      <div class="mb-2 ps-1 text-dark" style="font-size:1.08rem;">
        Vuoi davvero <b>eliminare questa sede</b>?<br>
        <span class="text-secondary" style="font-size:.97rem;">L’azione è <b>irreversibile</b>. Tutti i dati associati saranno persi.</span>
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
  document.querySelector('.toast-container').appendChild(confirmToast);

  // Chiudi su annulla
  confirmToast.querySelector('[data-bs-dismiss="toast"]').onclick = () => confirmToast.remove();

  // Conferma eliminazione
  confirmToast.querySelector('#confirmDeleteSedeBtn').onclick = async () => {
    confirmToast.remove();
    try {
      const response = await fetch(`/api/admin/locations/${sedeId}`, {
        method: "DELETE",
        headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}
      });
      if (response.ok) {
        loadSedi();
        showToast("Sede eliminata!", "danger");
      } else {
        showToast("Errore durante l'eliminazione", "danger");
      }
    } catch (err) {
      showToast("Errore di rete", "danger");
    }
  };

  // Chiudi toast dopo 10s se non si decide
  setTimeout(() => confirmToast.remove(), 10000);
};
