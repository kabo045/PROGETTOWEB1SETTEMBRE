// Funzione per mostrare un toast Bootstrap
function showToast(message, type = "info") {
  const colors = {
    info:   "bg-primary text-white",
    success:"bg-success text-white",
    error:  "bg-danger text-white",
    warn:   "bg-warning text-dark"
  };

  // assicurati che esista il container
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container position-fixed bottom-0 end-0 p-3";
    document.body.appendChild(container);
  }

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
  container.appendChild(toast);
  const bsToast = new bootstrap.Toast(toast, { delay: 3500 });
  bsToast.show();
  toast.addEventListener("hidden.bs.toast", () => toast.remove());
}

// ---------------- VALIDAZIONI ----------------
const isBlank = (s) => !s || !s.trim();

function validateNameLike(value, label) {
  const v = value.trim();
  if (v.length < 2 || v.length > 30) {
    showToast(`${label}: lunghezza 2–30 caratteri.`, "error");
    return false;
  }
  // lettere (anche accentate) e spazi
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(v)) {
    showToast(`${label}: usa solo lettere e spazi.`, "error");
    return false;
  }
  return true;
}

function validateEmail(email) {
  const v = email.trim();
  if (v.length < 6 || v.length > 50) {
    showToast(`Email: lunghezza 6–50 caratteri.`, "error");
    return false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
    showToast(`Inserisci un'email valida (es. nome@dominio.com).`, "error");
    return false;
  }
  return true;
}

function validatePhone(phone) {
  const v = phone.trim();
  if (v.length < 8 || v.length > 15) {
    showToast(`Telefono: lunghezza 8–15 cifre (opzionale il +).`, "error");
    return false;
  }
  if (!/^\+?\d{8,15}$/.test(v)) {
    showToast(`Telefono: solo cifre (8–15), opzionale + iniziale.`, "error");
    return false;
  }
  return true;
}

function isVeryCommonPassword(pwd) {
  const common = new Set([
    "password","123456","12345678","123456789","qwerty","abc123","111111",
    "letmein","admin","welcome","iloveyou","monkey","dragon","000000",
    "1234567","sunshine","princess","qwerty123","passw0rd","1q2w3e4r5t"
  ]);
  return common.has(pwd.toLowerCase());
}

function validatePassword(pwd, { name, surname, email, phone }) {
  const v = pwd; // non trim: gli spazi contano
  if (v.length < 8 || v.length > 30) {
    showToast(`Password: deve avere 8–30 caratteri.`, "error");
    return false;
  }
  const hasUpper = /[A-Z]/.test(v);
  const hasLower = /[a-z]/.test(v);
  const hasDigit = /\d/.test(v);
  const hasSymbol = /[\W_]/.test(v);
  if (!(hasUpper && hasLower && hasDigit && hasSymbol)) {
    showToast(`Password: almeno una maiuscola, una minuscola, un numero e un simbolo.`, "error");
    return false;
  }
  // blocco esplicito richiesto: "d" non deve MAI essere una password
  if (v.toLowerCase() === "d") {
    showToast(`Password troppo debole.`, "error");
    return false;
  }
  if (isVeryCommonPassword(v)) {
    showToast(`Password troppo comune.`, "error");
    return false;
  }
  // non uguale a dati personali
  const low = v.toLowerCase();
  if (name && low === name.trim().toLowerCase()) {
    showToast(`La password non può coincidere con il Nome.`, "error");
    return false;
  }
  if (surname && low === surname.trim().toLowerCase()) {
    showToast(`La password non può coincidere con il Cognome.`, "error");
    return false;
  }
  if (email && low === email.trim().toLowerCase()) {
    showToast(`La password non può coincidere con l'Email.`, "error");
    return false;
  }
  if (phone && low === phone.trim().toLowerCase()) {
    showToast(`La password non può coincidere con il Telefono.`, "error");
    return false;
  }
  return true;
}

function validateRole(role) {
  if (!role || role === "" || role === "-- Seleziona --") {
    showToast(`Seleziona un Ruolo.`, "error");
    return false;
  }
  if (!["cliente","gestore"].includes(role)) {
    showToast(`Ruolo non valido.`, "error");
    return false;
  }
  return true;
}

// ---------------- SUBMIT HANDLER ----------------
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nameEl = document.getElementById("name");
    const surnameEl = document.getElementById("surname");
    const emailEl = document.getElementById("email");
    const phoneEl = document.getElementById("phone");
    const passwordEl = document.getElementById("password");
    const confirmPasswordEl = document.getElementById("confirm-password");
    const roleEl = document.getElementById("role");

    const name = nameEl?.value ?? "";
    const surname = surnameEl?.value ?? "";
    const email = emailEl?.value ?? "";
    const phone = phoneEl?.value ?? "";
    const password = passwordEl?.value ?? "";
    const confirmPassword = confirmPasswordEl?.value ?? "";
    const role = roleEl?.value ?? "";

    // 1) TUTTI obbligatori
    if ([name, surname, email, phone, password, confirmPassword, role].some(isBlank)) {
      showToast("Compila tutti i campi obbligatori.", "error");
      return;
    }

    // 2) validazioni puntuali
    if (!validateNameLike(name, "Nome")) { nameEl.focus(); return; }
    if (!validateNameLike(surname, "Cognome")) { surnameEl.focus(); return; }
    if (!validateEmail(email)) { emailEl.focus(); return; }
    if (!validatePhone(phone)) { phoneEl.focus(); return; }
    if (!validatePassword(password, { name, surname, email, phone })) { passwordEl.focus(); return; }

    // 2bis) conferma password
    if (password !== confirmPassword) {
      showToast("Le password non coincidono.", "error");
      confirmPasswordEl.focus();
      return;
    }

    if (!validateRole(role)) { roleEl.focus(); return; }

    // 3) invio al backend (dopo trim dove opportuno)
    const payload = {
      name: name.trim(),
      surname: surname.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,   // non trim
      role
    };

    // anti-doppio submit
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn && (submitBtn.disabled = true);

    try {
      const res = await fetch("http://localhost:3000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      let result;
      try { result = await res.json(); }
      catch { result = {}; }

      if (res.ok) {
        showToast("Registrazione avvenuta con successo! Ora puoi accedere.", "success");
        setTimeout(() => window.location.href = "login.html", 1300);
      } else {
        showToast("Errore: " + (result.message || `Registrazione fallita (${res.status}).`), "error");
      }
    } catch (error) {
      console.error("Errore:", error);
      showToast("Errore di rete o server.", "error");
    } finally {
      submitBtn && (submitBtn.disabled = false);
    }
  });
});
