const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

const tbodyPagamenti = document.getElementById("tbodyPagamenti");
const filtroStato = document.getElementById("filtroStato");
const filtroPeriodo = document.getElementById("filtroPeriodo");
const btnAggiorna = document.getElementById("btnAggiorna");
const noPagamenti = document.getElementById("noPagamenti");
const totalePagato = document.getElementById("totalePagato");
const toastContainer = document.getElementById("toast-container");

function showToast(msg, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function methodIcon(method) {
  if (!method) return `<span class="text-muted">-</span>`;
  const m = method.toLowerCase();
  if (m.includes("visa") || m.includes("carta"))
    return `<i class="bi bi-credit-card-2-front-fill text-primary" title="Carta di credito"></i>`;
  if (m.includes("master"))
    return `<img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" width="26" title="Mastercard"/>`;
  if (m.includes("paypal"))
    return `<img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" width="26" title="PayPal"/>`;
  if (m.includes("apple"))
    return `<i class="bi bi-apple text-dark" title="Apple Pay"></i>`;
  if (m.includes("satispay"))
    return `<img src="https://static.satispay.com/website/dist/assets/img/icons/apple-touch-icon.png" width="26" title="Satispay" alt="Satispay"/>`;
  if (m.includes("bonifico"))
    return `<i class="bi bi-bank" title="Bonifico"></i>`;
  return `<span class="badge bg-primary">${method}</span>`;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatTimeSlot(t) {
  if (!t) return "";
  return `<span class="text-muted">${t}</span>`;
}

async function caricaPagamenti() {
  tbodyPagamenti.innerHTML = `<tr><td colspan="6" class="text-center"><div class="spinner-border text-info"></div></td></tr>`;
  noPagamenti.classList.add("d-none");
  totalePagato.classList.add("d-none");

  try {
    // 1) Pagamenti reali dal backend
    const resPagamenti = await fetch("/api/cliente/payments", { headers: { Authorization: `Bearer ${token}` } });
    let pagamenti = await resPagamenti.json();
    if (!Array.isArray(pagamenti)) pagamenti = [];

    // 2) Prenotazioni per costruire voci "in attesa" o "annullato" se non esiste un pagamento
    const resPrenotazioni = await fetch("/api/cliente/bookings", { headers: { Authorization: `Bearer ${token}` } });
    let prenotazioni = await resPrenotazioni.json();
    if (!Array.isArray(prenotazioni)) prenotazioni = [];

    // NON escludo più le prenotazioni cancellate: vogliamo mostrarle come "Annullato"

    // Trova prenotazioni senza pagamento associato
    const pagamentiIds = pagamenti.map(p => p.booking_id);
    const fakePagamenti = prenotazioni
      .filter(b => !pagamentiIds.includes(b.id))
      .map(b => ({
        location_name: b.location_name,
        space_type: b.space_type,
        workstation_name: b.workstation_name,
        date: b.date,
        time_slot: b.time_slot,
        // usa il prezzo reale salvato lato booking se presente
        amount: Number(b.booking_amount ?? b.amount ?? 0),
        method: null,
        // se la prenotazione è cancellata, riportiamo lo stato come "cancellato"
        status: b.status === "cancellato" ? "cancellato" : "attesa",
        timestamp: b.updated_at || b.created_at || b.date
      }));

    // Unisci entrambi i set (pagamenti reali + derivati da prenotazioni)
    pagamenti = [...pagamenti, ...fakePagamenti];

    // NON escludo più i pagamenti con status "cancellato": vanno mostrati

    // --- FILTRI ---
    // Stato
    const stato = filtroStato.value;
    if (stato === "pagato") {
      pagamenti = pagamenti.filter(p => p.status === "completato");
    } else if (stato === "attesa") {
      pagamenti = pagamenti.filter(p => p.status === "attesa");
    } else if (stato === "annullato") {
      pagamenti = pagamenti.filter(p => p.status === "cancellato");
    }

    // Periodo
    const periodo = filtroPeriodo.value;
    if (periodo === "30gg") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      pagamenti = pagamenti.filter(p => new Date(p.timestamp || p.date) >= cutoff);
    }
    if (periodo === "anno") {
      const year = new Date().getFullYear();
      pagamenti = pagamenti.filter(p => new Date(p.timestamp || p.date).getFullYear() === year);
    }

    // Nessun risultato
    if (!pagamenti.length) {
      tbodyPagamenti.innerHTML = "";
      noPagamenti.classList.remove("d-none");
      return;
    }

    // Tabella
    tbodyPagamenti.innerHTML = pagamenti.map(p => {
      const rowClass =
        p.status === "completato" ? "table-success" :
        p.status === "cancellato" ? "table-danger" : "";

      const statoBadge =
        p.status === "completato"
          ? `<span class="badge bg-success badge-status"><i class="bi bi-check-circle"></i> Pagato</span>`
          : p.status === "cancellato"
          ? `<span class="badge bg-danger badge-status"><i class="bi bi-x-circle"></i> Annullato</span>`
          : `<span class="badge bg-warning text-dark badge-status"><i class="bi bi-hourglass-split"></i> In attesa</span>`;

      const space = (p.space_type || "") + (p.workstation_name ? " - " + p.workstation_name : "");
      const amount = Number(p.amount ?? 0);

      return `
        <tr class="${rowClass}">
          <td class="align-middle">${p.location_name || ""}</td>
          <td class="align-middle">${space}</td>
          <td class="align-middle">${formatDate(p.date)} ${formatTimeSlot(p.time_slot)}</td>
          <td class="align-middle text-end"><b>€${amount.toFixed(2)}</b></td>
          <td class="align-middle text-center">${methodIcon(p.method)}</td>
          <td class="align-middle text-center">${statoBadge}</td>
        </tr>
      `;
    }).join("");

    // Totale pagato: solo i completati
    const totale = pagamenti
      .filter(p => p.status === "completato")
      .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

    if (totale > 0) {
      totalePagato.classList.remove("d-none");
      totalePagato.innerHTML = `<span style="font-size:1.1em"><b>Totale pagato:</b> <span class="text-primary">€${totale.toFixed(2)}</span></span>`;
    }

  } catch (err) {
    tbodyPagamenti.innerHTML = "";
    noPagamenti.classList.remove("d-none");
    showToast("Errore nel caricamento dei pagamenti", "danger");
  }
}

btnAggiorna.addEventListener("click", caricaPagamenti);
filtroStato.addEventListener("change", caricaPagamenti);
filtroPeriodo.addEventListener("change", caricaPagamenti);

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "login.html";
});

caricaPagamenti();
