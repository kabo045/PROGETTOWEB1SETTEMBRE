document.getElementById("changePasswordForm").onsubmit = async function(e) {
  e.preventDefault();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const pw1 = document.getElementById("newPassword").value;
  const pw2 = document.getElementById("confirmPassword").value;
  if (pw1.length < 7 || pw1 !== pw2) {
    alert("Le password non coincidono o troppo corte");
    return;
  }
  const res = await fetch("/api/user/change-password", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ token, password: pw1 })
  });
  if (res.ok) {
    alert("Password aggiornata! Ora puoi fare login.");
    window.location.href = "login.html";
  } else {
    alert("Errore: " + (await res.json()).error);
  }
};
