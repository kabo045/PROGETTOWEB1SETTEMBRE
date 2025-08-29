// main.js

// Esegui il codice solo quando il DOM è stato completamente caricato
document.addEventListener("DOMContentLoaded", () => {

  // Definizione delle sedi coworking con proprietà dinamiche
  // Ogni sede ha: nome, città, tipo di spazi disponibili, servizi e immagine
  const sedi = [
    {
      nome: "Milano Centrale",
      città: "Milano",
      tipo: ["stanza privata", "postazione"],
      servizi: ["Wi-Fi", "Stampante", "Caffè"],
      img: "https://picsum.photos/seed/milano/400/200"
    },
    {
      nome: "Torino Porta Nuova",
      città: "Torino",
      tipo: ["sala riunioni"],
      servizi: ["Wi-Fi", "Parcheggio"],
      img: "https://picsum.photos/seed/torino/400/200"
    },
    {
      nome: "Bologna Centro",
      città: "Bologna",
      tipo: ["stanza privata", "sala riunioni"],
      servizi: ["Wi-Fi", "Caffè"],
      img: "https://picsum.photos/seed/bologna/400/200"
    },
    {
      nome: "Roma EUR",
      città: "Roma",
      tipo: ["postazione", "sala riunioni"],
      servizi: ["Wi-Fi", "Reception"],
      img: "https://picsum.photos/seed/roma/400/200"
    },
    {
      nome: "Napoli Centro Direzionale",
      città: "Napoli",
      tipo: ["stanza privata"],
      servizi: ["Wi-Fi", "Parcheggio", "Snack bar"],
      img: "https://picsum.photos/seed/napoli/400/200"
    },
    {
      nome: "Firenze Business Park",
      città: "Firenze",
      tipo: ["postazione"],
      servizi: ["Wi-Fi", "Stampante"],
      img: "https://picsum.photos/seed/firenze/400/200"
    }
  ];

  // Funzione globale per gestire il click su "Prenota"
  // Se l'utente ha un token salvato (quindi è loggato) → lo porta in dashboard
  // Altrimenti → lo porta alla pagina di login
  window.handlePrenota = () => {
    const token = localStorage.getItem("token");
    if (token) {
      window.location.href = "dashboard_cliente.html"; // o "booking.html"
    } else {
      window.location.href = "login.html";
    }
  };

  // Popola lo slider Splide con le sedi
  const sliderContainer = document.getElementById("sedi-carousel");
  if (sliderContainer) {
    // Genera dinamicamente le card HTML per ogni sede
    sliderContainer.innerHTML = sedi.map(sede => `
      <li class="splide__slide">
        <div class="card shadow h-100">
          <img src="${sede.img}" class="card-img-top" alt="${sede.nome}">
          <div class="card-body">
            <h5 class="card-title">${sede.nome}</h5>
            <p class="card-text">
              <strong>Città:</strong> ${sede.città}<br>
              <strong>Tipi:</strong> ${sede.tipo.join(", ")}<br>
              <strong>Servizi:</strong> ${sede.servizi.join(", ")}
            </p>
            <button class="btn btn-outline-primary" onclick="handlePrenota()">Prenota</button>
          </div>
        </div>
      </li>
    `).join("");

    // Inizializza il carosello Splide con configurazione responsive
    new Splide('#slider-sedi', {
      type: 'loop',       // ciclo infinito
      perPage: 3,         // 3 card per volta
      gap: '1rem',        // spazio tra le card
      breakpoints: {      // regole responsive
        992: { perPage: 2 }, // su schermi medi → 2 card
        768: { perPage: 1 }  // su schermi piccoli → 1 card
      }
    }).mount();
  }

  // Scroll dolce per i link ancora (ancoraggi a sezioni interne della pagina)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault(); // Evita il salto immediato
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({ behavior: "smooth" }); // Scorrimento fluido
      }
    });
  });

  // Gestione pulsante "Scopri di più"
  const btnScopri = document.getElementById("btn-scopri"); 
  if (btnScopri) {
    btnScopri.addEventListener("click", () => {
      const extraInfo = document.getElementById("extra-info");
      if (extraInfo) {
        extraInfo.classList.remove("d-none"); // Mostra la sezione nascosta
        extraInfo.scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  // Gestione pulsante principale "Prenota ora"
  const btnPrenota = document.getElementById("btn-prenota");
  if (btnPrenota) {
    btnPrenota.addEventListener("click", () => {
      const token = localStorage.getItem("token");
      if (token) {
        window.location.href = "dashboard_cliente.html"; // o "booking.html"
      } else {
        window.location.href = "login.html";
      }
    });
  }
});
