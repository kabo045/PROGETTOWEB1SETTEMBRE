// Toast Bootstrap dinamico
function showToast(msg, variant = "success") {
  const toastId = "toast_" + Math.random();
  const toast = document.createElement("div");
  toast.className = `toast align-items-center border-0 text-bg-${variant} show`;
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
  loadLogs();
  document.getElementById('btnFiltra').onclick = loadLogs;
  document.getElementById('btnResetFiltri').onclick = () => {
    document.getElementById('filtroUtente').value = '';
    document.getElementById('filtroAzione').value = '';
    document.getElementById('filtroData').value = '';
    loadLogs();
  };
  document.getElementById('btnExport').onclick = exportLogsCSV;
});

async function loadLogs() {
  const utente = document.getElementById('filtroUtente').value.trim();
  const azione = document.getElementById('filtroAzione').value.trim();
  const data = document.getElementById('filtroData').value;

  let query = [];
  if (utente) query.push('utente=' + encodeURIComponent(utente));
  if (azione) query.push('azione=' + encodeURIComponent(azione));
  if (data) query.push('data=' + encodeURIComponent(data));
  const queryString = query.length ? '?' + query.join('&') : '';

  try {
    const res = await fetch('/api/admin/logs' + queryString, {
      headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}
    });
    if (!res.ok) throw new Error("Errore fetch log");
    const logs = await res.json();
    const tbody = document.querySelector("#logTable tbody");
    tbody.innerHTML = "";
    if (!Array.isArray(logs) || logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-secondary">Nessun log trovato.</td></tr>`;
      return;
    }
    logs.forEach(l => {
      tbody.innerHTML += `
        <tr>
          <td>${l.user_name || ''} ${l.user_surname || ''}</td>
          <td>${l.action || ''}</td>
          <td>${l.target || ''}</td>
          <td>${l.timestamp ? l.timestamp.replace('T', ' ').slice(0, 16) : ''}</td>
        </tr>
      `;
    });
  } catch (e) {
    showToast("Errore caricamento log", "danger");
    const tbody = document.querySelector("#logTable tbody");
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Errore di rete o server</td></tr>`;
  }
}

// Esportazione log CSV
async function exportLogsCSV() {
  const utente = document.getElementById('filtroUtente').value.trim();
  const azione = document.getElementById('filtroAzione').value.trim();
  const data = document.getElementById('filtroData').value;

  let query = [];
  if (utente) query.push('utente=' + encodeURIComponent(utente));
  if (azione) query.push('azione=' + encodeURIComponent(azione));
  if (data) query.push('data=' + encodeURIComponent(data));
  const queryString = query.length ? '?' + query.join('&') : '';

  try {
    const res = await fetch('/api/admin/logs/export' + queryString, {
      headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}
    });
    if (!res.ok) throw new Error("Errore esportazione");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "log_attivita.csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
    showToast("Log esportato!");
  } catch (err) {
    showToast("Errore durante l'esportazione", "danger");
  }
}
