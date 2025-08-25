document.getElementById("resetForm").onsubmit = async function(e) {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const res = await fetch("/api/user/reset-password", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ email })
  });
  if (res.ok) {
    alert("Controlla la tua mail! Link inviato.");
    window.location.href = "login.html";
  } else {
    alert("Errore: " + (await res.json()).error);
  }
};
