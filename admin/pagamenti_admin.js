let allSedi = [];

function showToast(msg, variant="success") {
  const toastId = "toast_" + Math.random();
  const toast = document.createElement("div");
  toast.className = `toast align-items-center border-0 text-bg-${variant}`;
  toast.id = toastId;
  toast.role = "alert";
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  document.querySelector(".toast-container").appendChild(toast);
  const t = new bootstrap.Toast(toast, { delay: 3200 });
  t.show();
  t._element.addEventListener("hidden.bs.toast", () => toast.remove());
}


document.addEventListener('DOMContentLoaded', () => {
  loadSedi();
  loadPagamenti();
  document.getElementById('btnFiltra').onclick = loadPagamenti;
  document.getElementById('btnResetFiltri').onclick = () => {
    document.getElementById('filtroSede').value = '';
    document.getElementById('filtroStato').value = '';
    document.getElementById('filtroUtente').value = '';
    loadPagamenti();
  };
  document.getElementById('btnExport').onclick = exportPagamentiCSV;
});

async function loadSedi() {
  const select = document.getElementById('filtroSede');
  select.innerHTML = '<option value="">Tutte le sedi</option>';
  try {
    let token = localStorage.getItem('token');
    if (!token) {
      showToast("Token di autenticazione mancante", "danger");
      return;
    }
    const res = await fetch('/api/admin/locations', {
      headers: {'Authorization': 'Bearer ' + token}
    });
    if (!res.ok) {
      showToast("Errore caricamento sedi", "danger");
      return;
    }
    allSedi = await res.json();
    if (!Array.isArray(allSedi) || allSedi.length === 0) {
      select.innerHTML = '<option value="">Nessuna sede disponibile</option>';
      return;
    }
    allSedi.forEach(s => {
      select.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });
  } catch (e) {
    showToast("Errore di rete", "danger");
  }
}

async function loadPagamenti() {
  const tbody = document.querySelector("#pagamentiTable tbody");
  tbody.innerHTML = `<tr><td colspan="7" class="text-center text-secondary">Caricamento...</td></tr>`;
  const sedeId = document.getElementById('filtroSede').value;
  const stato = document.getElementById('filtroStato').value;
  const utente = document.getElementById('filtroUtente').value.trim();

  let query = [];
  if (sedeId) query.push('sede=' + encodeURIComponent(sedeId));
  if (stato) query.push('stato=' + encodeURIComponent(stato));
  if (utente) query.push('utente=' + encodeURIComponent(utente));
  const queryString = query.length ? '?' + query.join('&') : '';

  try {
    let token = localStorage.getItem('token');
    if (!token) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Token di autenticazione mancante</td></tr>`;
      showToast("Token di autenticazione mancante", "danger");
      return;
    }
    const res = await fetch('/api/admin/payments' + queryString, {
      headers: {'Authorization': 'Bearer ' + token}
    });
    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Errore caricamento pagamenti</td></tr>`;
      showToast("Errore caricamento pagamenti", "danger");
      return;
    }
    const pagamenti = await res.json();
    if (!Array.isArray(pagamenti) || pagamenti.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-secondary">Nessun pagamento trovato.</td></tr>`;
      return;
    }
    tbody.innerHTML = "";
    pagamenti.forEach(p => {
      tbody.innerHTML += `
        <tr>
          <td>${p.user_name || ''} ${p.user_surname || ''}</td>
          <td>${p.location_name || ''}</td>
          <td>${p.space_name || ''}</td>
          <td>${p.date ? new Date(p.date).toLocaleDateString() : ''}</td>
          <td>€ ${(p.amount||0).toLocaleString('it-IT', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
          <td>${p.method || ''}</td>
          <td>${p.status || ''}</td>
        </tr>
      `;
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Errore di rete</td></tr>`;
    showToast("Errore di rete", "danger");
  }
}

// Export CSV pagamenti
async function exportPagamentiCSV() {
  const sedeId = document.getElementById('filtroSede').value;
  const stato = document.getElementById('filtroStato').value;
  const utente = document.getElementById('filtroUtente').value.trim();

  let query = [];
  if (sedeId) query.push('sede=' + encodeURIComponent(sedeId));
  if (stato) query.push('stato=' + encodeURIComponent(stato));
  if (utente) query.push('utente=' + encodeURIComponent(utente));
  const queryString = query.length ? '?' + query.join('&') : '';

  try {
    let token = localStorage.getItem('token');
    if (!token) { showToast("Token mancante", "danger"); return; }
    const res = await fetch('/api/admin/payments/export' + queryString, {
      headers: {'Authorization': 'Bearer ' + token}
    });
    if (!res.ok) throw new Error("Errore esportazione");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "pagamenti.csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
    showToast("Pagamenti esportati!");
  } catch (err) {
    showToast("Errore durante l'esportazione", "danger");
  }
}
