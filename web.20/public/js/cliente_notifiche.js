const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

const listaNotifiche = document.getElementById("listaNotifiche");
const noNotifiche = document.getElementById("noNotifiche");
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

async function caricaNotifiche() {
  listaNotifiche.innerHTML = `<div class="text-center"><div class="spinner-border text-info"></div></div>`;
  noNotifiche.classList.add("d-none");
  try {
    const res = await fetch("/api/cliente/notifications", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const notifiche = await res.json();
    window.notificheData = notifiche;
    mostraNotificheFiltrate();
  } catch {
    listaNotifiche.innerHTML = `<div class="text-danger">Errore caricamento notifiche</div>`;
  }
}

function mostraNotificheFiltrate() {
  const filtro = document.getElementById("filtroNotifiche").value;
  let dati = [...window.notificheData];

  if (filtro === "non-lette") dati = dati.filter(n => !n.read);
  if (filtro === "lette") dati = dati.filter(n => n.read);

  if (!dati.length) {
    listaNotifiche.innerHTML = "";
    noNotifiche.classList.remove("d-none");
    return;
  }

  listaNotifiche.innerHTML = dati.map((n, i) => `
    <div class="notification-card d-flex align-items-center${!n.read ? ' unread' : ''}">
      <i class="bi bi-bell-fill notification-icon ${!n.read ? 'text-warning' : 'text-secondary'}"></i>
      <div class="flex-grow-1">
        <div>${n.message}</div>
        <div class="small text-secondary">${new Date(n.created_at).toLocaleString()}</div>
      </div>
      ${!n.read ? `<button class="btn btn-outline-success btn-segna ms-3" onclick="segnaComeLetta(${i})"><i class="bi bi-check2"></i> Segna come letta</button>` : ''}
      <button class="btn btn-outline-danger btn-elimina ms-2" onclick="eliminaNotifica(${i})"><i class="bi bi-trash"></i></button>
    </div>
  `).join("");

  noNotifiche.classList.add("d-none");
}

window.segnaComeLetta = async function(idx) {
  const id = window.notificheData[idx].id;
  const res = await fetch(`/api/cliente/notifications/${id}/read`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.ok) {
    showToast("Notifica segnata come letta!");
    caricaNotifiche();
  } else {
    showToast("Errore aggiornamento", "danger");
  }
};

window.eliminaNotifica = async function(idx) {
  const id = window.notificheData[idx].id;
  const res = await fetch(`/api/cliente/notifications/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.ok) {
    showToast("Notifica eliminata");
    caricaNotifiche();
  } else {
    showToast("Errore eliminazione", "danger");
  }
};

document.getElementById("btnAggiorna").addEventListener("click", caricaNotifiche);
document.getElementById("btnSegnaTutte").addEventListener("click", async () => {
  const nonLette = window.notificheData.filter(n => !n.read);
  for (const n of nonLette) {
    await fetch(`/api/cliente/notifications/${n.id}/read`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    });
  }
  showToast("Tutte le notifiche segnate come lette!");
  caricaNotifiche();
});
document.getElementById("filtroNotifiche").addEventListener("change", mostraNotificheFiltrate);
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "login.html";
});

caricaNotifiche();
