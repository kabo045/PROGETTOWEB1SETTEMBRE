document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem("token");
  if (!token) return window.location.href = "login.html";
  const headers = { "Authorization": "Bearer " + token, "Content-Type": "application/json" };

  const selectSede = document.getElementById("selectSede");
  const listaSpazi = document.getElementById("listaSpazi");
  const btnAggiungiSpazio = document.getElementById("btnAggiungiSpazio");
  const modaleSpazio = new bootstrap.Modal(document.getElementById("modaleSpazio"));
  const formSpazio = document.getElementById("formSpazio");
  const titoloModaleSpazio = document.getElementById("titoloModaleSpazio");
  const modalePostazione = new bootstrap.Modal(document.getElementById("modalePostazione"));
  const formPostazione = document.getElementById("formPostazione");

  // --- Gestione fasce orarie dinamiche nel modale postazione ---
  let maxPostazioniSpazio = 0;
  let spazi = [];
  let idSedeCorrente = null;
  let idSpazioModifica = null;
  let idSpazioPerPostazione = null;
  let sedi = [];

  const PRESET_FASCE = [
    { time: "09:00-12:00" },
    { time: "13:00-16:00" },
    { time: "16:00-19:00" }
  ];
  const containerFasceOrarie = document.getElementById("containerFasceOrarie");
  const btnAggiungiFascia = document.getElementById("btnAggiungiFascia");

  function aggiungiFasciaOraria(date = "", time = "") {
    const wrapper = document.createElement("div");
    wrapper.className = "row g-2 align-items-end mb-2 fascia-oraria-riga";
    wrapper.innerHTML = `
      <div class="col-5">
        <input type="date" class="form-control" value="${date}" required>
      </div>
      <div class="col-5">
        <input type="text" class="form-control" placeholder="es: 09:00-12:00" value="${time}" required>
      </div>
      <div class="col-2">
        <button type="button" class="btn btn-outline-danger btn-sm btn-rimuovi-fascia">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `;
    wrapper.querySelector(".btn-rimuovi-fascia").onclick = () => wrapper.remove();
    containerFasceOrarie.appendChild(wrapper);
  }
  btnAggiungiFascia.onclick = () => {
    const today = new Date().toISOString().slice(0, 10);
    aggiungiFasciaOraria(today, "");
  };
  formPostazione.addEventListener("reset", () => {
    containerFasceOrarie.innerHTML = "";
    const oggi = new Date().toISOString().slice(0, 10);
    for (const preset of PRESET_FASCE) aggiungiFasciaOraria(oggi, preset.time);
  });

  // --- DISPONIBILITA' ---
  let idPostazioneSelezionata = null;
  let disponibilitaCorrente = [];
  const modaleDisponibilita = new bootstrap.Modal(document.getElementById("modaleDisponibilita"));
  const formAggiungiDisponibilita = document.getElementById("formAggiungiDisponibilita");
  const tabellaDisponibilita = document.getElementById("tabellaDisponibilita");

  // CARICA SEDI
  async function caricaSedi() {
    selectSede.innerHTML = '<option>Caricamento…</option>';
    const res = await fetch("/api/gestore/sedi", { headers });
    sedi = await res.json();
    if (!sedi.length) {
      selectSede.innerHTML = '<option disabled>Nessuna sede trovata</option>';
      listaSpazi.innerHTML = '<div class="text-muted py-4">Nessuna sede. Creane una prima.</div>';
      return;
    }
    selectSede.innerHTML = sedi.map(s =>
      `<option value="${s.id}">${s.name} – ${s.city}</option>`
    ).join("");
    idSedeCorrente = selectSede.value = idSedeCorrente || sedi[0].id;
    caricaSpazi();
  }
  selectSede.onchange = function () {
    idSedeCorrente = selectSede.value;
    caricaSpazi();
  };

  // CARICA SPAZI
  async function caricaSpazi() {
    listaSpazi.innerHTML = '<div class="text-center py-4 text-muted">Caricamento…</div>';
    const res = await fetch(`/api/gestore/sedi/${idSedeCorrente}/spazi`, { headers });
    spazi = await res.json();
    if (!spazi.length) {
      listaSpazi.innerHTML = '<div class="text-center text-muted py-5">Nessuno spazio trovato.</div>';
      return;
    }
    const sede = sedi.find(s => String(s.id) === String(idSedeCorrente));
    listaSpazi.innerHTML = "";
    for (const spazio of spazi) {
      // Carica postazioni per spazio
      const resp = await fetch(`/api/gestore/spazi/${spazio.id}/postazioni`, { headers });
      const postazioni = await resp.json();
      const col = document.createElement("div");
      col.className = "col-12 col-md-6 col-lg-4";
      let imgHtml = "";
      if (spazio.image_url) {
        imgHtml = `<img src="${spazio.image_url}" alt="Immagine spazio" class="img-fluid rounded mb-2 img-spazio">`;
      } else if (sede && sede.image_url) {
        imgHtml = `<img src="${sede.image_url}" alt="Immagine sede" class="img-fluid rounded mb-2 img-spazio">`;
      } else {
        imgHtml = `<div class="fallback-icona"><i class="bi bi-door-open" style="font-size:2.5rem;color:#3b82f6;"></i></div>`;
      }
      // CARD SPAZIO E POSTAZIONI
      col.innerHTML = `
        <div class="card card-spazio p-3 h-100 d-flex flex-column shadow-sm" style="border-radius: 18px;">
          ${imgHtml}
          <div class="card-body py-2">
            <h5 class="card-title mb-1">${spazio.name}</h5>
            <div class="small text-muted mb-1">${capitalizeType(spazio.type)} &bull; <span class="text-dark">Capienza: ${spazio.capacity}</span></div>
            <div class="mb-2"><span class="badge text-bg-primary badge-posti">${postazioni.length} Postazioni</span></div>
            <div class="mb-1"><b>Postazioni:</b>
              ${postazioni.map(p =>
                `<span class="badge text-bg-light border me-1 mb-1">${p.name}
                  <button class="btn btn-link btn-sm px-1 py-0" style="font-size:.98em;" 
                    data-postazione-id="${p.id}" data-action="gestisci-disponibilita" title="Disponibilità">
                    <i class="bi bi-calendar-week"></i>
                  </button>
                </span>`
              ).join(" ") || "<i>Nessuna</i>"}
            </div>
          </div>
          <div class="mt-auto d-flex gap-2">
            <button class="btn btn-outline-success btn-sm flex-grow-1" data-spazio="${spazio.id}" data-action="add-postazione"><i class="bi bi-plus"></i> Postazione</button>
            <button class="btn btn-outline-danger btn-sm" data-spazio="${spazio.id}" data-action="elimina"><i class="bi bi-trash"></i></button>
          </div>
        </div>`;
      listaSpazi.appendChild(col);
    }
  }

  // AGGIUNGI SPAZIO
  btnAggiungiSpazio.onclick = () => {
    formSpazio.reset();
    idSpazioModifica = null;
    titoloModaleSpazio.textContent = "Aggiungi Spazio";
    modaleSpazio.show();
  };

  formSpazio.onsubmit = async function (e) {
    e.preventDefault();
    const tipiValidi = ['open space', 'stanza privata', 'postazione', 'sala riunioni'];
    const tipo = document.getElementById("tipoSpazio").value;
    if (!tipiValidi.includes(tipo)) {
      showToast("Tipo spazio non valido!", "danger");
      return;
    }
    const body = {
      name: document.getElementById("nomeSpazio").value.trim(),
      type: tipo,
      capacity: parseInt(document.getElementById("capienzaSpazio").value)
    };
    let url = `/api/gestore/sedi/${idSedeCorrente}/spazi`;
    let method = "POST";
    if (idSpazioModifica) {
      url = `/api/gestore/spazi/${idSpazioModifica}`;
      method = "PATCH";
    }
    const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
    if (!res.ok) return showToast("Errore salvataggio spazio", "danger");
    modaleSpazio.hide();
    caricaSpazi();
    showToast("Spazio salvato!", "success");
  };

  // GESTIONE CLICK SPAZI E POSTAZIONI
  listaSpazi.onclick = async function (e) {
    const btnDisp = e.target.closest("button[data-postazione-id][data-action='gestisci-disponibilita']");
    if (btnDisp) {
      idPostazioneSelezionata = btnDisp.dataset.postazioneId;
      await caricaDisponibilita(idPostazioneSelezionata);
      modaleDisponibilita.show();
      return;
    }
    const btn = e.target.closest("button[data-spazio]");
    if (!btn) return;
    const spazioId = btn.dataset.spazio;
    const action = btn.dataset.action;
    if (action === "add-postazione") {
      idSpazioPerPostazione = spazioId;
      // --- CONTROLLA CAPIENZA ---
      const spazio = spazi.find(s => String(s.id) === String(spazioId));
      maxPostazioniSpazio = spazio ? Number(spazio.capacity) : 1;
      // Conta postazioni già esistenti
      const resp = await fetch(`/api/gestore/spazi/${spazioId}/postazioni`, { headers });
      const postazioni = await resp.json();
      if (postazioni.length >= maxPostazioniSpazio) {
        showToast(`Non puoi aggiungere altre postazioni. Capienza massima (${maxPostazioniSpazio}) raggiunta!`, "danger");
        return;
      }
      formPostazione.reset();
      modalePostazione.show();
    }
    if (action === "elimina") {
      eliminaSpazio(spazioId);
    }
  };

  // AGGIUNGI POSTAZIONE
  formPostazione.onsubmit = async function (e) {
    e.preventDefault();
    const nome = document.getElementById("nomePostazione").value.trim();
    if (!nome) return showToast("Nome obbligatorio", "danger");

    // Raccogli tutte le fasce orarie aggiunte
    const fasce = Array.from(containerFasceOrarie.querySelectorAll(".fascia-oraria-riga")).map(riga => {
      const date = riga.querySelector('input[type="date"]').value;
      const time = riga.querySelector('input[type="text"]').value;
      return { date, time_slot: time };
    }).filter(f => f.date && f.time_slot);

    // --- Controllo fasce duplicate ---
    const fasceKeySet = new Set();
    for (let f of fasce) {
      const key = `${f.date}_${f.time_slot}`;
      if (fasceKeySet.has(key)) {
        showToast(`Attenzione: fascia oraria duplicata (${f.date} ${f.time_slot})`, "danger");
        return;
      }
      fasceKeySet.add(key);
    }

    // 1. Crea la postazione
    const body = { name: nome };
    const res = await fetch(`/api/gestore/spazi/${idSpazioPerPostazione}/postazioni`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    if (!res.ok) return showToast("Errore aggiunta postazione", "danger");
    const postazione = await res.json();

    // 2. Aggiungi tutte le fasce orarie
    for (let f of fasce) {
      const resFascia = await fetch(`/api/gestore/spazi/${postazione.id}/disponibilita`, {
        method: "POST",
        headers,
        body: JSON.stringify({ date: f.date, time_slot: f.time_slot })
      });
      if (!resFascia.ok) showToast("Errore su una fascia oraria", "danger");
    }

    modalePostazione.hide();
    caricaSpazi();
    showToast("Postazione e fasce aggiunte!", "success");
  };

async function eliminaSpazio(id) {
  // Toast "alert" di conferma eliminazione spazio
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
        <span class="fs-5 fw-bold text-danger">Elimina Spazio</span>
      </div>
      <div class="mb-2 ps-1 text-dark" style="font-size:1.08rem;">
        Vuoi davvero <b>eliminare questo spazio</b>?<br>
        <span class="text-secondary" style="font-size:.97rem;">L’azione è <b>irreversibile</b>. Tutti i dati associati andranno persi.</span>
      </div>
      <div class="d-flex gap-2 mt-2 ps-1">
        <button type="button" class="btn btn-danger flex-fill fw-semibold shadow-sm rounded-pill py-2" id="confirmDeleteSpazioBtn">
          <i class="bi bi-trash"></i> Sì, elimina
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

  // Conferma eliminazione
  confirmToast.querySelector('#confirmDeleteSpazioBtn').onclick = async () => {
    confirmToast.remove();
    const res = await fetch(`/api/gestore/spazi/${id}`, { method: "DELETE", headers });
    if (!res.ok) return showToast("Errore eliminazione", "danger");
    caricaSpazi();
    showToast("Spazio eliminato", "success");
  };

  // Chiudi dopo 10s se non si decide
  setTimeout(() => confirmToast.remove(), 10000);
}

  // GESTIONE DISPONIBILITÀ + PRENOTAZIONI
  async function caricaDisponibilita(idPostazione) {
    tabellaDisponibilita.innerHTML = '<tr><td colspan="5">Caricamento...</td></tr>';

    // Carica disponibilità
    const res = await fetch(`/api/gestore/spazi/${idPostazione}/disponibilita`, { headers });
    disponibilitaCorrente = await res.json();

    // Carica prenotazioni per questa postazione
    let prenotazioni = [];
    try {
      const resPren = await fetch(`/api/gestore/spazi/${idPostazione}/prenotazioni`, { headers });
      if (resPren.ok) prenotazioni = await resPren.json();
    } catch (e) { prenotazioni = []; }

    tabellaDisponibilita.innerHTML = disponibilitaCorrente.length
      ? disponibilitaCorrente.map(d => {
          const pren = prenotazioni.find(
            p => p.date === d.date && p.time_slot === d.time_slot
          );
          return `<tr>
            <td>${d.date}</td>
            <td>${d.time_slot}</td>
            <td>${d.available ? '<span class="badge bg-success">Sì</span>' : '<span class="badge bg-danger">No</span>'}</td>
            <td>${pren ? `<span class="badge bg-warning text-dark">${pren.cliente_name}</span>` : '-'}</td>
            <td>
              <button class="btn btn-outline-danger btn-sm" data-disponibilita-id="${d.id}" data-action="elimina-disponibilita">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>`;
        }).join('')
      : '<tr><td colspan="5" class="text-center">Nessuna fascia disponibile.</td></tr>';
  }

  formAggiungiDisponibilita.onsubmit = async function(e) {
    e.preventDefault();
    if (!idPostazioneSelezionata) return;
    const body = {
      date: document.getElementById("dataDisponibilita").value,
      time_slot: document.getElementById("fasciaOrariaDisponibilita").value
    };
    const res = await fetch(`/api/gestore/spazi/${idPostazioneSelezionata}/disponibilita`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      showToast("Errore aggiunta disponibilità", "danger");
      return;
    }
    showToast("Disponibilità aggiunta!", "success");
    await caricaDisponibilita(idPostazioneSelezionata);
    formAggiungiDisponibilita.reset();
  };

tabellaDisponibilita.onclick = async function(e) {
  const btn = e.target.closest("button[data-disponibilita-id][data-action='elimina-disponibilita']");
  if (!btn) return;
  const id = btn.dataset.disponibilitaId;
  // -- Toast di conferma anche qui --
  const confirmToast = document.createElement("div");
  confirmToast.className = "toast show mb-3 border-0 shadow-lg";
  confirmToast.style.maxWidth = "370px";
  confirmToast.style.background = "#fff";
  confirmToast.style.borderLeft = "7px solid #f59e42";
  confirmToast.style.boxShadow = "0 4px 24px #fbc02d33";
  confirmToast.innerHTML = `
    <div class="p-3 pb-2 d-flex flex-column gap-1">
      <div class="d-flex align-items-center mb-1">
        <span class="fs-2 text-warning me-2"><i class="bi bi-exclamation-triangle-fill"></i></span>
        <span class="fs-6 fw-bold text-warning">Elimina fascia oraria?</span>
      </div>
      <div class="mb-2 ps-1 text-dark" style="font-size:1.01rem;">
        Vuoi davvero eliminare questa fascia oraria?<br>
        <span class="text-secondary" style="font-size:.95rem;">Questa azione non è reversibile.</span>
      </div>
      <div class="d-flex gap-2 mt-2 ps-1">
        <button type="button" class="btn btn-warning flex-fill fw-semibold shadow-sm rounded-pill py-2" id="confirmDeleteFasciaBtn">
          <i class="bi bi-trash"></i> Sì, elimina
        </button>
        <button type="button" class="btn btn-outline-secondary flex-fill fw-semibold rounded-pill py-2 border-2" data-bs-dismiss="toast" style="transition:.16s;">
          Annulla
        </button>
      </div>
    </div>
  `;
  document.getElementById("toast-container").appendChild(confirmToast);

  confirmToast.querySelector('[data-bs-dismiss="toast"]').onclick = () => confirmToast.remove();
  confirmToast.querySelector('#confirmDeleteFasciaBtn').onclick = async () => {
    confirmToast.remove();
    const res = await fetch(`/api/gestore/disponibilita/${id}`, { method: "DELETE", headers });
    if (!res.ok) {
      showToast("Errore eliminazione", "danger");
      return;
    }
    showToast("Disponibilità eliminata!", "success");
    await caricaDisponibilita(idPostazioneSelezionata);
  };

  setTimeout(() => confirmToast.remove(), 9000);
};


  // TOAST
  function showToast(msg, type = "success") {
    const c = document.getElementById("toast-container");
    const t = document.createElement("div");
    t.className = `toast align-items-center text-bg-${type === "danger" ? "danger" : "success"} border-0 show mb-2`;
    t.role = "alert";
    t.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }
  function capitalizeType(type) {
    if (!type) return '';
    return type
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.substring(1))
      .join(' ');
  }

  document.getElementById("logoutBtn").onclick = function () {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
  };
  document.getElementById("nomeGestore").textContent =
    (JSON.parse(localStorage.getItem("user") || "{}").name || "Gestore");

  caricaSedi();
});
