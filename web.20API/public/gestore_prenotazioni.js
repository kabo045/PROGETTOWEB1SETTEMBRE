document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem("token");
  if (!token) return window.location.href = "login.html";
  const headers = { "Authorization": "Bearer " + token, "Content-Type": "application/json" };
  const container = document.getElementById("prenotazioniContainer");
  const filtroData = document.getElementById("filtroData");
  const filtroStato = document.getElementById("filtroStato");
  const btnFiltra = document.getElementById("btnFiltra");
  const btnResetFiltri = document.getElementById("btnResetFiltri");
  const pagination = document.getElementById("pagination");

  let tuttePrenotazioni = [];
  let prenotazioniFiltrate = [];
  let paginaCorrente = 1;
  const perPagina = 10;

  // Badge stato colorato
  const badgeStato = stato => {
    if (stato === "cancellato") return `<span class="badge bg-danger-subtle text-danger badge-stato">Cancellata</span>`;
    if (stato === "concluso") return `<span class="badge bg-success-subtle text-success badge-stato">Conclusa</span>`;
    if (stato === "in attesa") return `<span class="badge bg-warning-subtle text-warning badge-stato">In attesa</span>`;
    return `<span class="badge bg-primary-subtle text-primary badge-stato">${stato.charAt(0).toUpperCase() + stato.slice(1)}</span>`;
  };

  function capitalizeType(type) {
    if (!type) return '';
    return type.split(' ').map(word => word.charAt(0).toUpperCase() + word.substring(1)).join(' ');
  }

  function showToast(msg, type = "success") {
    const c = document.getElementById("toast-container");
    const t = document.createElement("div");
    t.className = `toast align-items-center text-bg-${type === "danger" ? "danger" : "success"} border-0 show mb-2`;
    t.role = "alert";
    t.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  // Carica tutte le prenotazioni dal backend (una sola volta)
  async function caricaPrenotazioni() {
    container.innerHTML = '<div class="text-center py-5 text-muted">Caricamento…</div>';
    const res = await fetch("/api/gestore/prenotazioni", { headers });
    tuttePrenotazioni = await res.json();
    // Ordina: future prima, poi passato (desc)
    tuttePrenotazioni.sort((a, b) => new Date(b.date) - new Date(a.date));
    applicaFiltriEPagina();
  }

  // Applica filtri, paginazione, rendering
  function applicaFiltriEPagina() {
    const dataFiltro = filtroData.value ? new Date(filtroData.value) : null;
    const statoFiltro = filtroStato.value;
    prenotazioniFiltrate = tuttePrenotazioni.filter(p => {
      let ok = true;
      if (dataFiltro) {
        const dataPren = new Date(p.date);
        ok = ok && dataPren.toDateString() === dataFiltro.toDateString();
      }
      if (statoFiltro) ok = ok && (p.status === statoFiltro);
      return ok;
    });
    // Ordina: future prima, poi passato
    prenotazioniFiltrate.sort((a, b) => new Date(b.date) - new Date(a.date));

    renderPagina();
    renderPaginazione();
  }

  function renderPagina() {
    const inizio = (paginaCorrente - 1) * perPagina;
    const fine = inizio + perPagina;
    const pagePren = prenotazioniFiltrate.slice(inizio, fine);

    if (!pagePren.length) {
      container.innerHTML = `<div class="text-center py-5 text-muted">Nessuna prenotazione trovata.</div>`;
      return;
    }
    container.innerHTML = pagePren.map(p => `
      <div class="col-12">
        <div class="prenotazione-card card d-flex flex-row align-items-center p-3 mb-2 shadow-sm" style="border-radius: 1.2rem; background:#fff;">
          <div class="me-4" style="min-width:72px;max-width:90px;">
            ${
              p.sede_image_url 
                ? `<img src="${p.sede_image_url}" alt="Sede" class="rounded-3 img-fluid" style="max-width:85px;max-height:64px;object-fit:cover;">`
                : `<div class="d-flex align-items-center justify-content-center rounded-3" style="width:75px;height:62px;background:#f2f6fa;"><i class="bi bi-geo-alt-fill fs-2 text-primary"></i></div>`
            }
          </div>
          <div class="flex-grow-1">
            <div class="d-flex align-items-center mb-1">
              <h5 class="mb-0 fw-bold me-3">${p.sede}</h5>
              ${badgeStato(p.status || "confermato")}
            </div>
            <div class="small mb-1">
              <span class="fw-semibold">${p.spazio}</span> 
              <span class="text-muted">(${capitalizeType(p.tipo_spazio)})</span>
              &mdash; <span class="text-success">${p.time_slot || ''}</span>
            </div>
            <div class="small">
              <i class="bi bi-person-circle me-1"></i>
              ${p.utente_nome || "<em>Utente sconosciuto</em>"} <span class="text-muted">${p.utente_email ? "— "+p.utente_email : ""}</span>
            </div>
          </div>
          <div class="ms-2 text-end text-nowrap d-flex flex-column align-items-end gap-2">
            <div class="fw-semibold text-primary mb-1"><i class="bi bi-calendar-week"></i> ${(p.date || '').split("T")[0]}</div>
            <div>
              <button class="btn btn-outline-danger btn-sm btn-delete" data-id="${p.id}" title="Elimina"><i class="bi bi-trash"></i></button>
              <button class="btn btn-outline-secondary btn-sm btn-status" data-id="${p.id}" data-status="cancellato" title="Segna come Cancellata"><i class="bi bi-x-circle"></i></button>
              <button class="btn btn-outline-success btn-sm btn-status" data-id="${p.id}" data-status="confermato" title="Segna come Confermata"><i class="bi bi-check-circle"></i></button>
            </div>
          </div>
        </div>
      </div>
    `).join("");

    // Eventi DELETE
   container.querySelectorAll('.btn-delete').forEach(btn => {
  btn.onclick = function() {
    // Toast alert conferma
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
          <span class="fs-5 fw-bold text-danger">Elimina Prenotazione</span>
        </div>
        <div class="mb-2 ps-1 text-dark" style="font-size:1.08rem;">
          Vuoi davvero <b>eliminare questa prenotazione</b>?<br>
          <span class="text-secondary" style="font-size:.97rem;">L’azione è <b>irreversibile</b>. Tutti i dati associati andranno persi.</span>
        </div>
        <div class="d-flex gap-2 mt-2 ps-1">
          <button type="button" class="btn btn-danger flex-fill fw-semibold shadow-sm rounded-pill py-2" id="confirmDeletePrenotazioneBtn">
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
    confirmToast.querySelector('#confirmDeletePrenotazioneBtn').onclick = async () => {
      confirmToast.remove();
      const id = btn.dataset.id;
      const res = await fetch(`/api/gestore/prenotazioni/${id}`, { method: "DELETE", headers });
      if (res.ok) {
        showToast("Prenotazione eliminata!", "success");
        await caricaPrenotazioni();
      } else {
        showToast("Errore durante l'eliminazione", "danger");
      }
    };

    setTimeout(() => confirmToast.remove(), 10000);
  };
});


    // Eventi PATCH stato
    container.querySelectorAll('.btn-status').forEach(btn => {
      btn.onclick = async function() {
        const id = this.dataset.id;
        const nuovoStato = this.dataset.status;
        const res = await fetch(`/api/gestore/prenotazioni/${id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ status: nuovoStato })
        });
        if (res.ok) {
          showToast("Stato prenotazione aggiornato!", "success");
          await caricaPrenotazioni();
        } else {
          showToast("Errore aggiornamento stato", "danger");
        }
      };
    });
  }

  // PAGINAZIONE
  function renderPaginazione() {
    const tot = prenotazioniFiltrate.length;
    const totPagine = Math.ceil(tot / perPagina);
    let html = "";
    if (totPagine > 1) {
      html += `<li class="page-item${paginaCorrente === 1 ? " disabled" : ""}">
        <a class="page-link" href="#" data-page="${paginaCorrente - 1}">&laquo;</a></li>`;
      for (let i = 1; i <= totPagine; i++) {
        html += `<li class="page-item${i === paginaCorrente ? " active" : ""}">
          <a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
      }
      html += `<li class="page-item${paginaCorrente === totPagine ? " disabled" : ""}">
        <a class="page-link" href="#" data-page="${paginaCorrente + 1}">&raquo;</a></li>`;
    }
    pagination.innerHTML = html;
    pagination.querySelectorAll(".page-link").forEach(link => {
      link.onclick = function (e) {
        e.preventDefault();
        const np = parseInt(this.dataset.page);
        if (np >= 1 && np <= Math.ceil(tot / perPagina)) {
          paginaCorrente = np;
          renderPagina();
          renderPaginazione();
        }
      };
    });
  }

  // Eventi filtri
  btnFiltra.onclick = function() {
    paginaCorrente = 1;
    applicaFiltriEPagina();
  };
  btnResetFiltri.onclick = function() {
    filtroData.value = "";
    filtroStato.value = "";
    paginaCorrente = 1;
    applicaFiltriEPagina();
  };

  // Filtra automaticamente quando cambi i filtri (opzionale)
  filtroData.onchange = filtroStato.onchange = () => {
    paginaCorrente = 1;
    applicaFiltriEPagina();
  };

  // Load iniziale
  await caricaPrenotazioni();
});
