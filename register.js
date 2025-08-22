// Funzione per mostrare un toast Bootstrap
function showToast(message, type = "info") {
  const colors = {
    info:   "bg-primary text-white",
    success:"bg-success text-white",
    error:  "bg-danger text-white",
    warn:   "bg-warning text-dark"
  };
  const toast = document.createElement("div");
  toast.className = `toast align-items-center ${colors[type]||colors.info}`;
  toast.role = "alert";
  toast.ariaLive = "assertive";
  toast.ariaAtomic = "true";
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white ms-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  document.getElementById("toast-container").appendChild(toast);
  const bsToast = new bootstrap.Toast(toast, { delay: 3500 });
  bsToast.show();
  toast.addEventListener("hidden.bs.toast", () => toast.remove());
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      name: document.getElementById("name").value,
      surname: document.getElementById("surname").value,
      email: document.getElementById("email").value,
      phone: document.getElementById("phone").value,
      password: document.getElementById("password").value,
      role: document.getElementById("role").value
    };

    try {
      const res = await fetch("http://localhost:3000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (res.ok) {
        showToast("Registrazione avvenuta con successo! Ora puoi accedere.", "success");
        setTimeout(() => window.location.href = "login.html", 1300);
      } else {
        showToast("Errore: " + (result.message || "Registrazione fallita."), "error");
      }
    } catch (error) {
      console.error("Errore:", error);
      showToast("Errore di rete o server.", "error");
    }
  });
});
