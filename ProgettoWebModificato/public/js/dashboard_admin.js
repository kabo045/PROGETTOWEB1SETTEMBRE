const TOKEN = localStorage.getItem('token');

// CARD STATISTICHE
async function caricaStatistiche() {
  try {
    const res = await fetch("/api/admin/stats/global", {
      headers: { "Authorization": "Bearer " + TOKEN }
    });
    if (!res.ok) throw new Error("API non disponibile");
    const stats = await res.json();
    document.getElementById("stat-utenti").innerText = stats.utenti || "0";
    document.getElementById("stat-sedi").innerText = stats.sedi || "0";
    document.getElementById("stat-spazi").innerText = stats.spazi || "0";
    document.getElementById("stat-postazioni").innerText = stats.postazioni || "0";
    document.getElementById("stat-prenotazioni").innerText = stats.prenotazioni || "0";
    document.getElementById("stat-revenue").innerText = (Number(stats.revenue) || 0).toLocaleString("it-IT", {minimumFractionDigits:2, maximumFractionDigits:2});
  } catch (e) {
    // Fallback: mostra zero
    document.getElementById("stat-utenti").innerText = "0";
    document.getElementById("stat-sedi").innerText = "0";
    document.getElementById("stat-spazi").innerText = "0";
    document.getElementById("stat-postazioni").innerText = "0";
    document.getElementById("stat-prenotazioni").innerText = "0";
    document.getElementById("stat-revenue").innerText = "0.00";
  }
}
caricaStatistiche();

// GRAFICO PRENOTAZIONI PER SEDE
async function caricaGraficoPrenotazioniSede() {
  try {
    const res = await fetch("/api/admin/stats/by-location", {
      headers: { "Authorization": "Bearer " + TOKEN }
    });
    if (!res.ok) throw new Error("API non disponibile");
    const dati = await res.json();
    if (!Array.isArray(dati) || dati.length === 0) return; // niente dati, non mostrare grafico
    const ctx = document.getElementById('chartPrenotazioniSede').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dati.map(r => r.name),
        datasets: [{
          label: 'Prenotazioni',
          data: dati.map(r => r.prenotazioni),
          backgroundColor: '#0d6efd99',
          borderColor: '#0d6efd',
          borderWidth: 1
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        responsive: true,
        scales: { y: { beginAtZero: true, ticks: { precision:0 } } }
      }
    });
  } catch (e) {
    // Se non va la fetch, il grafico resta vuoto
  }
}
window.addEventListener("DOMContentLoaded", () => {
  caricaGraficoPrenotazioniSede();
});
