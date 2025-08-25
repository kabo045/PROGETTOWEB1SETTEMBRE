document.getElementById("changePasswordForm").onsubmit = async function(e) {
  e.preventDefault();
  const oldPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirm = document.getElementById("confirmPassword").value;
  if (newPassword.length < 7 || newPassword !== confirm) {
    alert("Le password non coincidono o troppo corte");
    return;
  }
  const token = localStorage.getItem("token");
  const res = await fetch("/api/user/change-password-auth", {
    method: "POST",
    headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ oldPassword, newPassword })
  });
  if (res.ok) {
    alert("Password aggiornata!");
    document.getElementById("changePasswordForm").reset();
  } else {
    alert("Errore: " + (await res.json()).error);
  }
};
