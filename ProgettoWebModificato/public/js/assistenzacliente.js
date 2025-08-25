// Funzione per mostrare toast Bootstrap animati
function showToast(msg, type = "info") {
  const id = "toast" + Math.random();
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${type} border-0 show`;
  toast.id = id;
  toast.role = "alert";
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.style.position = "fixed";
    toastContainer.style.top = "15px";
    toastContainer.style.right = "15px";
    toastContainer.style.zIndex = "12000";
    document.body.appendChild(toastContainer);
  }
  toastContainer.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3500);
}

async function caricaSedi() {
  const sel = document.getElementById('location');
  sel.innerHTML = `<option value="">Seleziona la sede...</option>`;
  try {
    const res = await fetch('/api/cliente/bookings', {
      headers: {
        'Authorization': 'Bearer ' + (localStorage.token || sessionStorage.token)
      }
    });
    if (!res.ok) throw new Error("Errore fetch prenotazioni");
    const bookings = await res.json();

    // ---- QUI METTI IL CONSOLE.LOG! ----
    console.log("Bookings ricevuti:", bookings);
    bookings.forEach(b => {
      console.log("location_id:", b.location_id, "location_name:", b.location_name);
    });
    // -----------------------------------

    // Il resto del codice...
    let uniche = {};
    let almenoUna = false;
    bookings.forEach(b => {
      if (b.location_id && b.location_name) {
        uniche[b.location_id] = b.location_name;
        almenoUna = true;
      }
    });

    if (!almenoUna) {
      sel.innerHTML = `<option disabled>Non hai mai prenotato una sede</option>`;
      sel.disabled = true;
    } else {
      sel.disabled = false;
      for (const id in uniche) {
        sel.innerHTML += `<option value="${id}">${uniche[id]}</option>`;
      }
    }
  } catch (err) {
    sel.innerHTML = `<option disabled>Errore nel caricamento sedi</option>`;
    sel.disabled = true;
    showToast("Errore nel caricamento delle sedi!", "danger");
  }
}


// Invia la richiesta assistenza
document.getElementById('supportForm').onsubmit = async function(e) {
  e.preventDefault();
  const subject = document.getElementById('subject').value.trim();
  const message = document.getElementById('message').value.trim();
  const location_id = document.getElementById('location').value;
  const sendBtn = document.getElementById('sendBtn');
  const supportResponse = document.getElementById('supportResponse');
  if (!subject || !message || !location_id) {
    supportResponse.innerText = "Compila tutti i campi!";
    supportResponse.style.color = "#b31321";
    return;
  }
  sendBtn.disabled = true;
  supportResponse.innerText = "Invio in corso...";
  try {
    const res = await fetch('/api/cliente/support', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (localStorage.token || sessionStorage.token)
      },
      body: JSON.stringify({ subject, message, location_id })
    });
    if (res.ok) {
      supportResponse.innerText = "✅ La tua richiesta è stata inviata! Riceverai risposta via email.";
      supportResponse.style.color = "#299147";
      document.getElementById('supportForm').reset();
      showToast("Richiesta inviata!", "success");
    } else {
      const data = await res.json().catch(() => ({}));
      supportResponse.innerText = "❌ Errore invio richiesta. " + (data.message || "");
      supportResponse.style.color = "#b31321";
      showToast("Errore invio richiesta", "danger");
    }
  } catch {
    supportResponse.innerText = "❌ Errore di rete, riprova.";
    supportResponse.style.color = "#b31321";
    showToast("Errore di rete", "danger");
  }
  sendBtn.disabled = false;
};

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "login.html";
});

// Carica le sedi al caricamento pagina
window.addEventListener('DOMContentLoaded', caricaSedi);
