// js/recupera_password.js

const form = document.getElementById("formRecuperaPassword");
const emailInput = document.getElementById("inputEmail");
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

form.addEventListener("submit", async e => {
  e.preventDefault();
  const email = emailInput.value.trim();
  if (!email.match(/^[\w\-.]+@[\w\-]+\.\w{2,}$/)) {
    showToast("Inserisci un'email valida.", "danger");
    return;
  }

  try {
    const res = await fetch("/api/recupera-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    if (res.ok) {
      showToast("Email inviata! Controlla la posta (anche lo spam)", "success");
      form.reset();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || "Email non trovata", "danger");
    }
  } catch {
    showToast("Errore di rete, riprova", "danger");
  }
});
