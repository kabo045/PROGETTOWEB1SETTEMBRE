document.addEventListener('DOMContentLoaded', () => {
  caricaNotifiche();
  document.getElementById('notificaForm').onsubmit = inviaNotifica;
  document.getElementById('destinatario').onchange = function() {
    document.getElementById('utenteEmailDiv').style.display = this.value === "utente" ? "" : "none";
  };
});

// Carica ultime notifiche inviate
async function caricaNotifiche() {
  try {
    const res = await fetch('/api/admin/notifications/list', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    });
    if (!res.ok) throw new Error("Errore fetch notifiche");
    const notifiche = await res.json();
    const container = document.getElementById('notificheList');
    container.innerHTML = "";

    if (!Array.isArray(notifiche) || notifiche.length === 0) {
      container.innerHTML = `
        <div class="text-muted text-center my-4">
          <i class="bi bi-inbox fs-1 mb-2"></i><br>
          Nessuna notifica inviata.
        </div>`;
      return;
    }

    notifiche.forEach(n => {
      let iconHtml, borderColor, bgColor;

      if (n.message.toLowerCase().includes('approvata')) {
        iconHtml = '<i class="bi bi-check-circle-fill text-success fs-3"></i>';
        borderColor = '#28a745';
        bgColor = '#eafbf1';
      } else if (n.message.toLowerCase().includes('rifiutata')) {
        iconHtml = '<i class="bi bi-x-circle-fill text-danger fs-3"></i>';
        borderColor = '#dc3545';
        bgColor = '#fef1f2';
      } else {
        iconHtml = '<i class="bi bi-info-circle-fill text-primary fs-3"></i>';
        borderColor = '#0d6efd';
        bgColor = '#eef5ff';
      }

      container.innerHTML += `
        <div class="card mb-3 shadow-sm" style="border-left: 6px solid ${borderColor}; background-color: ${bgColor}; border-radius: 10px;">
          <div class="card-body d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
              <div class="me-3">${iconHtml}</div>
              <div>
                <h6 class="card-title mb-1 fw-bold">${n.message}</h6>
                <p class="card-text text-muted small mb-0">Inviata a: <strong>${n.email || n.role || 'tutti'}</strong></p>
              </div>
            </div>
            <button class="btn btn-outline-danger btn-sm rounded-circle" 
                    onclick="eliminaNotifica(${n.id})" title="Elimina notifica" style="width:40px; height:40px;">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
    });

  } catch (e) {
    showToast("Errore caricamento notifiche", "danger");
  }
}

async function inviaNotifica(e) {
  e.preventDefault();
  const destinatario = document.getElementById('destinatario').value;
  const message = document.getElementById('testoNotifica').value.trim();
  if (!message) return showToast("Scrivi un messaggio!", "danger");

  let body = { message };

  if (destinatario.startsWith('ruolo:')) {
    body.role = destinatario.split(':')[1];
  } else {
    const email = document.getElementById('utenteEmail').value.trim();
    if (!email) return showToast("Inserisci l'email utente!", "danger");
    // Recupera user_id da email
    try {
      const res = await fetch('/api/admin/users?role=', {
        headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}
      });
      if (!res.ok) throw new Error("Errore fetch utenti");
      const users = await res.json();
      const user = users.find(u => u.email === email);
      if (!user) return showToast("Utente non trovato", "danger");
      body.user_id = user.id;
    } catch {
      return showToast("Errore ricerca utente", "danger");
    }
  }

  try {
    const res = await fetch('/api/admin/notifications', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem('token')
      },
      body: JSON.stringify(body)
    });
    if(res.ok) {
      showToast("Notifica inviata!");
      document.getElementById('testoNotifica').value = '';
      caricaNotifiche();
    } else showToast("Errore invio notifica", "danger");
  } catch {
    showToast("Errore invio notifica", "danger");
  }
}

window.eliminaNotifica = function(id) {
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
        <span class="fs-5 fw-bold text-danger">Elimina Notifica</span>
      </div>
      <div class="mb-2 ps-1 text-dark" style="font-size:1.08rem;">
        Vuoi davvero <b>eliminare questa notifica</b>?<br>
        <span class="text-secondary" style="font-size:.97rem;">L’azione è <b>irreversibile</b>.</span>
      </div>
      <div class="d-flex gap-2 mt-2 ps-1">
        <button type="button" class="btn btn-danger flex-fill fw-semibold shadow-sm rounded-pill py-2" id="confirmDeleteNotificaBtn">
          <i class="bi bi-trash"></i> Sì, elimina
        </button>
        <button type="button" class="btn btn-outline-secondary flex-fill fw-semibold rounded-pill py-2 border-2"
          data-bs-dismiss="toast" style="transition:.16s;">
          Annulla
        </button>
      </div>
    </div>
  `;
  document.querySelector('.toast-container').appendChild(confirmToast);

  // Chiudi toast su Annulla
  confirmToast.querySelector('[data-bs-dismiss="toast"]').onclick = () => confirmToast.remove();

  // Conferma eliminazione
  confirmToast.querySelector('#confirmDeleteNotificaBtn').onclick = async () => {
    confirmToast.remove();
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, {
        method: "DELETE",
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
      });
      if (res.ok) {
        showToast("Notifica eliminata!", "danger");
        caricaNotifiche();
      } else {
        showToast("Errore eliminazione", "danger");
      }
    } catch {
      showToast("Errore di rete", "danger");
    }
  };

  // Chiudi toast dopo 10s se non si decide
  setTimeout(() => confirmToast.remove(), 10000);
};

// Toast Bootstrap
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
