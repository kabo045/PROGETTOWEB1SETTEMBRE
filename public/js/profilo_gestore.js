// ==================[ PROFILO GESTORE - CoWorkSpace ]==================
// Basato sul tuo file precedente (mantenute le stesse funzionalità) :contentReference[oaicite:2]{index=2}
// Allineato a validazioni/toast in stile pagina cliente 

// --- AUTENTICAZIONE E CONTROLLO ACCESSO ---
const token = localStorage.getItem("token");
const user  = JSON.parse(localStorage.getItem("user") || "{}");
if (!token || !user || user.role !== "gestore") window.location.href = "login.html";

// --- TOPBAR: Nome e Avatar ---
const nomeGestoreEl   = document.getElementById("nomeGestore");
const avatarEl        = document.getElementById("avatarIcon");
const avatarProfileEl = document.getElementById("avatarIconProfile");

if (nomeGestoreEl && user?.name) nomeGestoreEl.textContent = user.name;
const initial = (user.name || "G")[0].toUpperCase();
if (avatarEl)        avatarEl.textContent = initial;
if (avatarProfileEl) avatarProfileEl.textContent = initial;

// --- LOGOUT ---
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}
document.getElementById("logoutBtnDropdown")?.addEventListener("click", logout);
document.getElementById("logoutBtn")?.addEventListener("click", logout);

// --- DATI STATICI/EXTRA ---
document.getElementById("profiloRuolo").textContent = "Gestore";
const extraParts = [];
if (user?.created_at) {
  const reg = new Date(user.created_at).toLocaleDateString("it-IT");
  extraParts.push(`<i class="bi bi-calendar-check me-1"></i> Registrato il <b>${reg}</b>`);
}
document.getElementById("extraInfoGestore").innerHTML = extraParts.join("<br>");

// --- POPOLA PROFILO ---
document.getElementById("profiloNome").textContent = user.name || "Gestore";
document.getElementById("profiloEmail").textContent = user.email || "";
document.getElementById("nomeInput").value  = user.name  || "";
document.getElementById("emailInput").value = user.email || "";

// --- TOGGLE VISUALIZZA PASSWORD ---
document.getElementById("togglePwd").onclick = function () {
  const pwdInput = document.getElementById("passwordInput");
  pwdInput.type = pwdInput.type === "password" ? "text" : "password";
  this.querySelector("i").className = pwdInput.type === "password" ? "bi bi-eye" : "bi bi-eye-slash";
};

// --- TOAST (coerente al tema blu) ---
function showToast(msg, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  const isDanger = type === "danger";
  toast.className = `toast align-items-center border-0 show mb-2 ${isDanger ? "bg-danger text-white" : "bg-primary text-white"}`;
  toast.role = "alert";
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// --- VALIDAZIONI ---
const emailRegex = /^[\w\-.]+@[\w\-]+\.\w{2,}$/;

// --- SUBMIT PROFILO ---
document.getElementById("formProfilo").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = document.getElementById("nomeInput").value.trim();
  const email = document.getElementById("emailInput").value.trim();
  const pwd   = document.getElementById("passwordInput").value;
  const pwd2  = document.getElementById("confermaPasswordInput").value;

  if (!nome || !email)      return showToast("Compila i campi obbligatori (nome, email).", "danger");
  if (!emailRegex.test(email)) return showToast("Email non valida.", "danger");
  if (pwd && pwd.length < 8)   return showToast("La password deve avere almeno 8 caratteri.", "danger");
  if (pwd && pwd !== pwd2)     return showToast("Le password non coincidono.", "danger");

  const body = { name: nome, email };
  if (pwd) body.password = pwd;

  try {
    const res = await fetch("/api/gestore/account", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || "Errore aggiornamento profilo");

    // OK
    showToast("Profilo aggiornato!");
    // aggiorna storage e UI
    const newUser = { ...user, name: nome, email };
    localStorage.setItem("user", JSON.stringify(newUser));
    document.getElementById("profiloNome").textContent = nome;
    document.getElementById("profiloEmail").textContent = email;
    if (nomeGestoreEl)   nomeGestoreEl.textContent   = nome;
    if (avatarEl)        avatarEl.textContent        = nome[0].toUpperCase();
    if (avatarProfileEl) avatarProfileEl.textContent = nome[0].toUpperCase();
    document.getElementById("passwordInput").value = "";
    document.getElementById("confermaPasswordInput").value = "";
  } catch (err) {
    showToast(err.message || "Errore aggiornamento profilo", "danger");
  }
});
