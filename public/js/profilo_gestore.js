// ==================[ PROFILO GESTORE - CoWorkSpace ]==================

// --- AUTENTICAZIONE E CONTROLLO ACCESSO ---
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user"));
if (!token || !user || user.role !== "gestore") window.location.href = "login.html";

// --- TOPBAR: Nome e Avatar ---
const nomeGestoreEl = document.getElementById("nomeGestore");
if (nomeGestoreEl && user?.name) nomeGestoreEl.textContent = user.name;
const avatarEl = document.getElementById("avatarIcon");
const avatarProfileEl = document.getElementById("avatarIconProfile");
const initial = (user.name || "G")[0].toUpperCase();
if (avatarEl) avatarEl.textContent = initial;
if (avatarProfileEl) avatarProfileEl.textContent = initial;

// --- LOGOUT ---
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}
document.getElementById("logoutBtnDropdown")?.addEventListener("click", logout);
document.getElementById("logoutBtn")?.addEventListener("click", logout);

// --- INFO EXTRA ---
document.getElementById("profiloRuolo").textContent = "Gestore";
const extraInfo = [];
if (user?.created_at) {
  const reg = new Date(user.created_at).toLocaleDateString('it-IT');
  extraInfo.push(`<i class="bi bi-calendar-check me-1"></i> Registrato il <b>${reg}</b>`);
}
document.getElementById("extraInfoGestore").innerHTML = extraInfo.join("<br>");

// --- POPOLA DATI PROFILO ---
document.getElementById("profiloNome").textContent = user.name || "";
document.getElementById("profiloEmail").textContent = user.email || "";
document.getElementById("nomeInput").value = user.name || "";
document.getElementById("emailInput").value = user.email || "";

// --- TOGGLE VISUALIZZA PASSWORD ---
document.getElementById("togglePwd").onclick = function() {
  const pwdInput = document.getElementById("passwordInput");
  pwdInput.type = pwdInput.type === "password" ? "text" : "password";
  this.querySelector("i").className = pwdInput.type === "password" ? "bi bi-eye" : "bi bi-eye-slash";
};

// --- TOAST ---
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${type === "danger" ? "danger" : "success"} border-0 show mb-2`;
  toast.role = "alert";
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// --- AGGIORNA DATI PROFILO ---
document.getElementById("formProfilo").addEventListener("submit", async function(e) {
  e.preventDefault();
  const nome = document.getElementById("nomeInput").value.trim();
  const email = document.getElementById("emailInput").value.trim();
  const pwd = document.getElementById("passwordInput").value;
  const confPwd = document.getElementById("confermaPasswordInput").value;

  if (!nome || !email) {
    showToast("Compila nome ed email", "danger");
    return;
  }
  if (pwd && pwd.length < 6) {
    showToast("Password minima: 6 caratteri", "danger");
    return;
  }
  if (pwd !== confPwd) {
    showToast("Le password non coincidono", "danger");
    return;
  }

  const body = { name: nome, email };
  if (pwd) body.password = pwd;

  try {
    const res = await fetch("/api/gestore/account", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Errore aggiornamento profilo");
    showToast("Profilo aggiornato!", "success");
    // Aggiorna localStorage e UI
    localStorage.setItem("user", JSON.stringify({ ...user, name: nome, email }));
    document.getElementById("profiloNome").textContent = nome;
    document.getElementById("profiloEmail").textContent = email;
    if (nomeGestoreEl) nomeGestoreEl.textContent = nome;
    if (avatarEl) avatarEl.textContent = nome[0].toUpperCase();
    if (avatarProfileEl) avatarProfileEl.textContent = nome[0].toUpperCase();
    document.getElementById("passwordInput").value = "";
    document.getElementById("confermaPasswordInput").value = "";
  } catch (err) {
    showToast(err.message, "danger");
  }
});
