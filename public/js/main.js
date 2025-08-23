// main.js

document.addEventListener("DOMContentLoaded", () => {
  // Sedi dinamiche
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

  // Funzione per gestire il click su "Prenota"
  window.handlePrenota = () => {
    const token = localStorage.getItem("token");
    if (token) {
      window.location.href = "dashboard_cliente.html"; // o "booking.html"
    } else {
      window.location.href = "login.html";
    }
  };

  // Popola lo slider Splide
  const sliderContainer = document.getElementById("sedi-carousel");
  if (sliderContainer) {
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

    // Inizializza Splide
    new Splide('#slider-sedi', {
      type: 'loop',
      perPage: 3,
      gap: '1rem',
      breakpoints: {
        992: { perPage: 2 },
        768: { perPage: 1 }
      }
    }).mount();
  }

  // Scroll dolce per anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  // Mostra info extra
  const btnScopri = document.getElementById("btn-scorpi");
  if (btnScopri) {
    btnScopri.addEventListener("click", () => {
      const extraInfo = document.getElementById("extra-info");
      if (extraInfo) {
        extraInfo.classList.remove("d-none");
        extraInfo.scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  // Pulsante principale "Prenota ora"
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
