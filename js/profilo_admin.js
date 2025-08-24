// profilo_admin.js

// Toast universale
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
  loadAdminProfile();
  document.getElementById('adminProfileForm').onsubmit = saveProfile;
});

async function loadAdminProfile() {
  const form = document.getElementById('adminProfileForm');
  form.querySelectorAll('input').forEach(input => input.disabled = true);
  try {
    let token = localStorage.getItem('token');
    if (!token) {
      showToast("Token di autenticazione mancante", "danger");
      return;
    }
    const res = await fetch('/api/admin/profile', {
      headers: {'Authorization': 'Bearer ' + token}
    });
    if (!res.ok) {
      showToast("Errore caricamento profilo", "danger");
      return;
    }
    const user = await res.json();
    document.getElementById('name').value = user.name || '';
    document.getElementById('surname').value = user.surname || '';
    document.getElementById('email').value = user.email || '';
  } catch (e) {
    showToast("Errore di rete", "danger");
  }
  form.querySelectorAll('input').forEach(input => input.disabled = false);
}

// Salva profilo
async function saveProfile(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;

  const name = document.getElementById('name').value.trim();
  const surname = document.getElementById('surname').value.trim();
  const password = document.getElementById('password').value;

  if (!name) {
    showToast("Il nome è obbligatorio", "danger");
    btn.disabled = false;
    return;
  }

  try {
    let token = localStorage.getItem('token');
    if (!token) {
      showToast("Token di autenticazione mancante", "danger");
      btn.disabled = false;
      return;
    }
    const res = await fetch('/api/admin/profile', {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({name, surname, password: password || undefined})
    });
    if (res.ok) {
      showToast('Profilo aggiornato!');
    } else {
      let err = await res.json().catch(()=>({}));
      showToast(err.error || 'Errore aggiornamento profilo', "danger");
    }
  } catch {
    showToast('Errore di rete', "danger");
  }
  document.getElementById('password').value = '';
  btn.disabled = false;
}
