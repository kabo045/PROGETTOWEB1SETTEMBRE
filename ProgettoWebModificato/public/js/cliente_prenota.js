const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

const listaSedi = document.getElementById("listaSedi");
const toastContainer = document.getElementById("toast-container");
const btnCerca = document.getElementById("btnCerca");
const noSedi = document.getElementById("noSedi");
const filtroCitta = document.getElementById("filtroCitta");
const filtroTipologia = document.getElementById("filtroTipologia");
const filtroServizi = document.getElementById("filtroServizi");

let userBookings = [];

// Toast con azioni (conferme)
function showToast(msg, type = "success", actions = []) {
  const toast = document.createElement("div");
  toast.className = `toast align-items-center bg-${type === "danger" ? "danger" : "dark"} text-white border-0 show mb-2`;
  toast.role = "alert";
  let actionsHtml = "";
  if (actions.length) {
    actionsHtml = `<div class="mt-2 pt-2 border-top d-flex gap-2">${actions.map(a => `
      <button type="button" class="btn btn-sm btn-${a.type || 'secondary'} ms-auto" data-action="${a.id}">${a.label}</button>
    `).join("")}</div>`;
  }
  toast.innerHTML = `
    <div class="d-flex flex-column">
      <div class="toast-body">${msg}</div>
      ${actionsHtml}
      <button type="button" class="btn-close btn-close-white me-2 m-auto position-absolute top-0 end-0 mt-2 me-2" data-bs-dismiss="toast"></button>
    </div>
  `;
  toastContainer.appendChild(toast);

  // Azioni custom
  actions.forEach(a => {
    toast.querySelector(`[data-action="${a.id}"]`).onclick = () => {
      a.onClick();
      toast.remove();
    }
  });

  if (!actions.length) setTimeout(() => toast.remove(), 4000);
}

async function caricaPrenotazioniUtente() {
  try {
    const res = await fetch("/api/cliente/bookings", {
      headers: { Authorization: `Bearer ${token}` }
    });
    userBookings = await res.json();
  } catch {
    userBookings = [];
    showToast("Errore nel caricamento delle tue prenotazioni", "danger");
  }
}

let debounceTimeout = null;
function debounce(fn, ms = 350) {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(fn, ms);
}

async function cercaSedi() {
  listaSedi.innerHTML = `<div class="text-center w-100"><div class="spinner-border text-info"></div></div>`;
  noSedi.style.display = "none";

  const citta = filtroCitta.value.trim();
  const tipo = filtroTipologia.value;
  const serviziChecked = Array.from(filtroServizi.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);

  const params = new URLSearchParams();
  if (citta) params.append("city", citta);
  if (tipo) params.append("type", tipo);
  if (serviziChecked.length > 0) params.append("service", serviziChecked.join(","));

  try {
    const res = await fetch(`/api/cliente/locations?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const sedi = await res.json();
    if (!sedi.length) {
      listaSedi.innerHTML = "";
      noSedi.style.display = "";
      return;
    }
    listaSedi.innerHTML = sedi.map(sede => `
      <div class="col-md-6 col-lg-4">
        <div class="card card-sede h-100" onclick="selezionaSede(${sede.id})" data-sede-id="${sede.id}" style="cursor:pointer;">
          <div class="card-body d-flex align-items-center gap-3">
            <img src="${sede.image_url || 'https://cdn-icons-png.flaticon.com/512/2920/2920209.png'}" alt="Immagine sede" width="80" height="55">
            <div>
              <h5 class="card-title mb-0">${sede.name}</h5>
              <span class="badge bg-primary">${sede.city}</span>
              <div class="small text-muted">${(sede.services || []).join(", ")}</div>
              <div class="fw-bold mt-1">
                da €${(sede.price && !isNaN(sede.price)) ? Number(sede.price).toFixed(2) : '--'}
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join("");
  } catch {
    listaSedi.innerHTML = "";
    showToast("Errore nel caricamento delle sedi", "danger");
  }
}

// -- MODAL LOGIC smart: seleziona sede, spazio e postazione/sala --

// 1. Seleziona sede → mostra spazi disponibili
window.selezionaSede = async function (sedeId) {
  prenotaModalBody.innerHTML = `<div class="text-center my-5"><div class="spinner-border text-info"></div></div>`;
  prenotaModal.show();

  try {
    const resSpazi = await fetch(`/api/cliente/locations/${sedeId}/spaces`, { headers: { Authorization: `Bearer ${token}` } });
    const spazi = await resSpazi.json();

    if (!spazi.length) {
      prenotaModalBody.innerHTML = `<div class="text-center text-muted">Nessuno spazio prenotabile in questa sede.</div>`;
      return;
    }

    prenotaModalBody.innerHTML = `
      <div class="step-title mb-3 fs-5">Scegli uno spazio disponibile</div>
      <div class="row g-3 mb-3">
        ${spazi.map(spazio => `
          <div class="col-12 col-md-6">
            <div class="card shadow border-0 h-100" style="cursor:pointer;" onclick="selezionaSpazioModal(${sedeId},${spazio.id},'${spazio.type.replace(/'/g,"")}')">
              <div class="card-body d-flex flex-column gap-2">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="badge bg-primary">${spazio.type}</span>
                  <span class="badge bg-secondary">${spazio.capacity} posti</span>
                </div>
                <div class="fw-bold fs-6">${spazio.name || 'Spazio'}</div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
      <div id="selezionePostazioneModal"></div>
    `;
  } catch {
    prenotaModalBody.innerHTML = `<div class="alert alert-danger">Errore nel caricamento degli spazi</div>`;
  }
};

// 2. Seleziona spazio (smart: distingue tra sala e open space)
window.selezionaSpazioModal = async function (sedeId, spazioId, spazioType) {
  const container = document.getElementById("selezionePostazioneModal");
  container.innerHTML = `<div class="my-3 text-center"><div class="spinner-border text-info"></div></div>`;

  // Spazi "collettivi": sala riunioni, aula, stanza privata
  if (["sala riunioni", "stanza privata", "aula"].includes(spazioType.toLowerCase())) {
    const oggi = new Date();
    const futureDates = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(oggi);
      d.setDate(oggi.getDate() + i);
      return d.toISOString().split("T")[0];
    });
    container.innerHTML = `
      <div class="step-title mb-2">Scegli data e orario</div>
      <div class="row g-2 mb-2">
        ${futureDates.map(d =>
      `<div class="col-auto"><button class="btn btn-light border" onclick="caricaSlotSpazioCollettivo(${spazioId},'${d}')">${d}</button></div>`
    ).join("")}
      </div>
      <div id="selezioneSlotModal"></div>
    `;
    return;
  }

  // Altri tipi (open space/postazione): scegli postazione
  try {
    const resPost = await fetch(`/api/cliente/spaces/${spazioId}/workstations`, { headers: { Authorization: `Bearer ${token}` } });
    const postazioni = await resPost.json();

    if (!postazioni.length) {
      container.innerHTML = `<div class="text-center text-muted">Nessuna postazione in questo spazio.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="step-title mb-2">Scegli una postazione</div>
      <div class="row g-2 mb-2">
        ${postazioni.map(post => `
          <div class="col-6 col-md-4">
            <button class="btn btn-outline-success w-100" onclick="selezionaPostazioneModal(${spazioId},${post.id})">
              ${post.name}
            </button>
          </div>
        `).join("")}
      </div>
      <div id="selezioneDataModal"></div>
    `;
  } catch {
    container.innerHTML = `<div class="alert alert-danger">Errore nel caricamento delle postazioni</div>`;
  }
};

// 3A. Seleziona data/orario per sala/intero spazio
window.caricaSlotSpazioCollettivo = async function (spazioId, data) {
  const slotContainer = document.getElementById("selezioneSlotModal");
  slotContainer.innerHTML = `<div class="my-3 text-center"><div class="spinner-border text-info"></div></div>`;

  const orari = ["09:00-11:00", "11:00-13:00", "14:00-16:00", "16:00-18:00"];

  slotContainer.innerHTML = `
    <div class="mb-2">Orari disponibili:</div>
    <div class="row g-2">
      ${orari.map(slot => `
        <div class="col-auto">
          <button class="btn btn-outline-info" onclick="toastConfermaPrenotazioneCollettiva(${spazioId},'${data}','${slot}')">
            ${slot}
          </button>
        </div>
      `).join("")}
    </div>
  `;
};

// Nuova funzione per conferma toast (NO alert)
window.toastConfermaPrenotazioneCollettiva = function (spazioId, data, timeSlot) {
  showToast(
    `Confermare la prenotazione di tutta la sala per il ${data}, orario ${timeSlot}?`,
    "info",
    [
      {
        id: "yes",
        label: "Conferma",
        type: "primary",
        onClick: () => confermaPrenotazioneCollettiva(spazioId, data, timeSlot)
      },
      {
        id: "no",
        label: "Annulla",
        type: "secondary",
        onClick: () => {}
      }
    ]
  );
};

window.confermaPrenotazioneCollettiva = async function (spazioId, data, timeSlot) {
  try {
    const res = await fetch("/api/cliente/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ space_id: spazioId, date: data, time_slot: timeSlot })
    });
    const body = await res.json();
    if (res.ok) {
      showToast("Prenotazione confermata! Procedi al pagamento...");
      prenotaModal.hide();
      await caricaPrenotazioniUtente();
      try { sessionStorage.setItem("checkoutBookingId", String(body.bookingId)); } catch (_) {}
setTimeout(() => { window.location.href = "checkout.html"; }, 1200);
} else {
      showToast(body.message || "Errore prenotazione", "danger");
    }
  } catch {
    showToast("Errore prenotazione", "danger");
  }
};

// 3B. Seleziona data → orario (per postazione singola)
window.selezionaPostazioneModal = async function (spazioId, postazioneId) {
  const container = document.getElementById("selezioneDataModal");
  const oggi = new Date();
  const futureDates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(oggi);
    d.setDate(oggi.getDate() + i);
    return d.toISOString().split("T")[0];
  });
  container.innerHTML = `
    <div class="step-title mb-2">Scegli data e orario</div>
    <div class="row g-2 mb-2">
      ${futureDates.map(d =>
    `<div class="col-auto"><button class="btn btn-light border" onclick="caricaSlotDisponibiliModal(${postazioneId},'${d}')">${d}</button></div>`
  ).join("")}
    </div>
    <div id="selezioneSlotModal"></div>
  `;
};

window.caricaSlotDisponibiliModal = async function (postazioneId, data) {
  const slotContainer = document.getElementById("selezioneSlotModal");
  slotContainer.innerHTML = `<div class="my-3 text-center"><div class="spinner-border text-info"></div></div>`;

  try {
    const res = await fetch(`/api/cliente/workstations/${postazioneId}/availability?date=${data}`, { headers: { Authorization: `Bearer ${token}` } });
    const slots = await res.json();

    if (!slots.length) {
      slotContainer.innerHTML = `<div class="text-center text-muted">Nessuno slot disponibile per questa data.</div>`;
      return;
    }

    slotContainer.innerHTML = `
      <div class="mb-2">Orari disponibili:</div>
      <div class="row g-2">
        ${slots.filter(s => s.available).map(slot => {
          const alreadyBooked = userBookings.some(b =>
            b.workstation_id == postazioneId &&
            b.date === data &&
            b.time_slot === slot.time_slot &&
            b.status !== "cancellato"
          );
          if (alreadyBooked) {
            return `<div class="col-auto">
              <button class="btn btn-secondary" disabled title="Hai già prenotato questo slot!">
                ${slot.time_slot} <i class="bi bi-check-circle"></i>
              </button>
            </div>`;
          } else {
            return `<div class="col-auto">
              <button class="btn btn-outline-info" onclick="toastConfermaPrenotazioneModal(${postazioneId},'${data}','${slot.time_slot}')">
                ${slot.time_slot}
              </button>
            </div>`;
          }
        }).join("")}
      </div>
    `;
  } catch {
    slotContainer.innerHTML = `<div class="alert alert-danger">Errore nel caricamento degli slot</div>`;
  }
};

// Nuova funzione per conferma toast (NO alert)
window.toastConfermaPrenotazioneModal = function (postazioneId, data, timeSlot) {
  showToast(
    `Confermare la prenotazione per il ${data}, orario ${timeSlot}?`,
    "info",
    [
      {
        id: "yes",
        label: "Conferma",
        type: "primary",
        onClick: () => confermaPrenotazioneModal(postazioneId, data, timeSlot)
      },
      {
        id: "no",
        label: "Annulla",
        type: "secondary",
        onClick: () => {}
      }
    ]
  );
};

window.confermaPrenotazioneModal = async function (postazioneId, data, timeSlot) {
  try {
    const res = await fetch("/api/cliente/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ workstation_id: postazioneId, date: data, time_slot: timeSlot })
    });
    const body = await res.json();
    if (res.ok) {
      showToast("Prenotazione confermata! Procedi al pagamento...");
      prenotaModal.hide();
      await caricaPrenotazioniUtente();
      try { sessionStorage.setItem("checkoutBookingId", String(body.bookingId)); } catch (_) {}
setTimeout(() => { window.location.href = "checkout.html"; }, 1200);
} else {
      showToast(body.message || "Errore prenotazione", "danger");
    }
  } catch {
    showToast("Errore prenotazione", "danger");
  }
};

// Live search
filtroCitta.addEventListener("input", () => debounce(cercaSedi));
filtroTipologia.addEventListener("change", cercaSedi);
filtroServizi.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.addEventListener("change", cercaSedi));
btnCerca.addEventListener("click", cercaSedi);

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "login.html";
});

// Assicurati di avere una sola modale attiva, global
let prenotaModal, prenotaModalBody;
document.addEventListener("DOMContentLoaded", async () => {
  prenotaModal = new bootstrap.Modal(document.getElementById('prenotaModal'));
  prenotaModalBody = document.getElementById('prenotaModalBody');
  await caricaPrenotazioniUtente();
  cercaSedi();
});
