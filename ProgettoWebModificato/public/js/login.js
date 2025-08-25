document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const errorDiv = document.getElementById("loginError");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorDiv.textContent = ""; // Pulisci errori precedenti

    const data = {
      email: document.getElementById("email").value,
      password: document.getElementById("password").value
    };

    try {
      const res = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (res.ok) {
        localStorage.setItem("token", result.token);
        localStorage.setItem("user", JSON.stringify(result.user));
        // Redirect in base al ruolo
        switch (result.user.role) {
          case "admin":
            window.location.href = "dashboard_admin.html";
            break;
          case "gestore":
            window.location.href = "dashboard_gestore.html";
            break;
          default:
            window.location.href = "dashboard_cliente.html";
        }
      } else {
        errorDiv.textContent = result.message || "Errore nel login.";
      }
    } catch (error) {
      errorDiv.textContent = "Errore di rete o server.";
    }
  });
});
