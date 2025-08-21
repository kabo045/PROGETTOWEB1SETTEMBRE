function getImgUrl(img) {
  if (!img || typeof img !== "string" || img.trim() === "") {
    return "https://cdn-icons-png.flaticon.com/512/2920/2920209.png";
  }
  if (img.startsWith("http")) return img;
  if (img.startsWith("/uploads/")) return img;
  if (img.startsWith("uploads/")) return "/" + img;
  return "/uploads/" + img.replace(/^\/?uploads\/?/, "");
}

let allSedi = [];

async function loadSedi() {
  const container = document.getElementById('sediList');
  container.innerHTML = `<div class="text-center w-100 my-5"><div class="spinner-border text-info"></div></div>`;
  try {
    const res = await fetch('/api/public/locations');
    const sedi = await res.json();
    if (!Array.isArray(sedi) || !sedi.length) {
      container.innerHTML = `<div class="text-center text-muted w-100">Nessuna sede trovata.</div>`;
      return;
    }
    allSedi = sedi;
    renderSedi(sedi);
    aggiornaFiltroSedi(sedi);
  } catch (e) {
    container.innerHTML = `<div class="text-danger w-100">Errore durante il caricamento delle sedi.</div>`;
  }
}

function renderSedi(sedi) {
  const container = document.getElementById('sediList');
  if (!sedi.length) {
    container.innerHTML = `<div class="text-center text-muted w-100">Nessuna sede trovata per questo filtro.</div>`;
    return;
  }
  container.innerHTML = sedi.map(sede => `
    <div class="sede-card">
      <img src="${getImgUrl(sede.image_url)}" alt="${sede.name || 'Sede'}" loading="lazy"
           onerror="this.onerror=null;this.src='https://cdn-icons-png.flaticon.com/512/2920/2920209.png';">
      <div class="info">
        <div class="title">${sede.name || '-'}</div>
        <div class="city">${sede.city || '-'}</div>
        <div class="address">${sede.address || ''}</div>
      </div>
      <a href="login.html" class="btn btn-primary">Prenota</a>
    </div>
  `).join('');
}

function aggiornaFiltroSedi(sedi) {
  const select = document.getElementById('filtro-sede');
  if (!select) return;
  // Ottieni solo i nomi unici delle sedi
  const nomi = [...new Set(sedi.map(s => s.name).filter(Boolean))];
  select.innerHTML = `<option value="">Tutte le sedi</option>` + 
    nomi.map(nome => `<option value="${nome}">${nome}</option>`).join('');
}

document.addEventListener("DOMContentLoaded", () => {
  loadSedi();

  const select = document.getElementById('filtro-sede');
  if (select) {
    select.addEventListener('change', function() {
      const nome = this.value;
      if (!nome) {
        renderSedi(allSedi);
      } else {
        renderSedi(allSedi.filter(s => s.name === nome));
      }
    });
  }
});
