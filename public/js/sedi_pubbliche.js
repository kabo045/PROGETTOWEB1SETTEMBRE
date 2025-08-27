/*
  sedi_pubbliche.js — Nome visibile + CTA + placeholder robusto
*/

// ============== Config ==============
const PAGE_SIZE = 8;
const PUBLIC_ENDPOINTS = [
  '/api/public/locations',
  '/api/public/sedi',
  '/api/locations/public',
  '/api/locations',
  '/api/sedi'
];
const AUTH_FALLBACK_ENDPOINTS = ['/api/gestore/sedi'];
const DETAILS_ENDPOINTS = [
  id => `/api/public/locations/${id}`,
  id => `/api/locations/${id}`,
  id => `/api/public/sedi/${id}`,
  id => `/api/sedi/${id}`,
  id => `/api/gestore/sedi/${id}`
];

// ============== Stato ==============
let RAW = [];
let filtered = [];
let currentPage = 1;

// ============== Helpers ==============
const el  = (sel) => document.querySelector(sel);
const els = (sel) => Array.from(document.querySelectorAll(sel));
const h = (s='') => (s==null?'':String(s)).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = (s) => (s||'').toString().toLowerCase();
const uniq = (arr) => Array.from(new Set(arr));
const debounce = (fn,ms)=>{ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args),ms); }; };

const PLACEHOLDER_FILE = 'img/placeholder-sede.jpg';
const PLACEHOLDER_DATA =
  'data:image/svg+xml;utf8,'+encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <rect width="100%" height="100%" rx="24" ry="24" fill="#eef3ff"/>
      <g fill="#c7d2fe">
        <circle cx="206" cy="56" r="18"/>
        <path d="M24 196l56-72 46 54 34-42 72 90H24z"/>
      </g>
    </svg>`
  );

function imgUrl(x){
  if(Array.isArray(x)) x = x[0];
  if(!x || typeof x!=='string' || !x.trim()) return PLACEHOLDER_FILE;
  if(/^https?:\/\//i.test(x)) return x;
  if(x.startsWith('/')) return x;
  if(x.startsWith('uploads/')) return '/'+x;
  return '/uploads/'+x.replace(/^\/?uploads\/?/, '');
}

function attachImageFallback(img){
  const toSvg  = ()=>{ img.onerror=null; img.src = PLACEHOLDER_DATA; };
  const toFile = ()=>{ img.onerror = toSvg; img.src = PLACEHOLDER_FILE; };
  if(img.complete && img.naturalWidth===0){ toFile(); }
  img.addEventListener('error', toFile, { once:true });
}
function fixImages(){ document.querySelectorAll('.sede-card__img img').forEach(attachImageFallback); }

function toArray(v){
  if(Array.isArray(v)) return v;
  if(typeof v==='string') return v.split(',').map(s=>s.trim()).filter(Boolean);
  return [];
}

function getAuthHeader(){
  const token = localStorage.getItem('token') || localStorage.getItem('jwt') || localStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function fetchJSON(url, withAuth=false){
  const init = withAuth ? { headers: { ...getAuthHeader() } } : {};
  const r = await fetch(url, init);
  if(!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

async function tryAllEndpoints(){
  for(const ep of PUBLIC_ENDPOINTS){ try{ return await fetchJSON(ep,false); }catch{} }
  for(const ep of AUTH_FALLBACK_ENDPOINTS){ try{ return await fetchJSON(ep,true); }catch{} }
  return null;
}

// ============== Riferimenti ==============
const refs = () => ({
  list: el('#sediList'), empty: el('#emptyState'),
  pager: el('#pager'), pageInfo: el('#pageInfo'), prev: el('#prevPage'), next: el('#nextPage'),
  q: el('#q'), city: el('#f-city'), tipo: el('#f-tipologia'),
  sort: el('#sort'), servicesWrap: el('#services-wrap'),
  count: el('#count-span'), resetBtn: el('#btn-reset'),
  offBody: el('#offcanvasBody'), offLabel: el('#offcanvasSedeLabel')
});

// ============== Normalizzazione ==============
function normalizeSede(s){
  return {
    id: s.id ?? s.location_id ?? s.ID,
    name: s.name ?? s.nome ?? s.title,
    city: s.city ?? s.citta ?? s.town ?? s.comune,
    address: s.address ?? s.indirizzo ?? s.via ?? s.street,
    tipologia: pickTipologia(s.tipologia ?? s.type ?? s.category), // << QUI
    image_url: s.image_url ?? s.img ?? s.image ?? s.cover,
    services: toArray(s.services),
    _raw:s
  };
}


// ============== Facets ==============
function buildFacets(rows){
  const {city:$city, tipo:$tipo} = refs();

  if ($city){
    const cities = uniq(rows.map(r=>r.city).filter(Boolean))
      .sort((a,b)=>a.localeCompare(b));
    $city.innerHTML = `<option value="">Tutte le città</option>` +
      cities.map(c=>`<option value="${h(c)}">${h(c)}</option>`).join('');
  }

  if ($tipo){
    // mappa key normalizzata -> etichetta "bella" (prima occorrenza)
    const map = new Map();
    rows.forEach(r=>{
      const raw = r.tipologia ? String(r.tipologia).trim() : '';
      const key = canonTipologia(raw);
      if (!key) return;
      if (!map.has(key)) map.set(key, raw);
    });

    const opts = Array.from(map.entries())
      .sort((a,b)=> a[1].localeCompare(b[1]))   // ordina per etichetta visibile
      .map(([key,label])=> `<option value="${h(key)}">${h(label)}</option>`)
      .join('');

    $tipo.innerHTML = `<option value="">Tutte</option>${opts}`;
  }
}


// ============== Filtri ==============
function applyFilters(){
  const {q:$q, city:$city, tipo:$tipo} = refs();
  let rows = RAW.slice();

  const q = norm($q?.value||'');
  if(q){
    rows = rows.filter(r => [r.name,r.city,r.address].some(v => norm(v||'').includes(q)));
  }
  if($city?.value){
    rows = rows.filter(r => (r.city||'') === $city.value);
  }
  if($tipo?.value){
    const key = $tipo.value;                 // è già la forma canonica
    rows = rows.filter(r => canonTipologia(r.tipologia) === key);
  }

  filtered = rows;
}


function renderCount(){
  const {count} = refs(); if(!count) return;
  const n = filtered.length;
  count.textContent = n === 1 ? '1 risultato' : `${n} risultati`;
}

// ============== Render ==============
function cardHTML(r){
  const title = h(r.name && r.name.trim() ? r.name : 'Sede senza nome');
  const src   = h(imgUrl(r.image_url));
  return `
    <article class="sede-card" data-id="${h(r.id)}" aria-label="${title}">
      <div class="sede-card__img">
        <img src="${src}" alt="${title}" loading="lazy"/>
      </div>

      <div class="sede-card__body">
        <span class="sede-card__title">${title}</span>

        <div class="sede-actions">
          <button class="btn btn-prenota" data-action="prenota" data-id="${h(r.id)}">
            <i class="bi bi-calendar-check me-1"></i> Prenota
          </button>
          <button class="btn btn-dettagli" data-action="details" data-id="${h(r.id)}">
            <i class="bi bi-info-circle me-1"></i> Dettagli
          </button>
        </div>
      </div>
    </article>`;
}



function renderList(){
  const {list, empty} = refs(); if(!list) return;
  if(!filtered.length){
    list.innerHTML = ''; if(empty) empty.style.display = 'block'; return;
  } else { if(empty) empty.style.display = 'none'; }
  const start = (currentPage-1)*PAGE_SIZE;
  const page = filtered.slice(start, start+PAGE_SIZE);
  list.innerHTML = page.map(cardHTML).join('');
  fixImages(); // placeholder robusto
  document.dispatchEvent(new CustomEvent('sedi:list:updated'));
}

function renderPager(){
  const {pager, pageInfo, prev, next} = refs(); if(!pager) return;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  pager.hidden = totalPages <= 1;
  if(pageInfo) pageInfo.textContent = `Pagina ${currentPage} di ${totalPages}`;
  if(prev) prev.disabled = currentPage<=1;
  if(next) next.disabled = currentPage>=totalPages;
}

function render(){ applyFilters(); currentPage = 1; renderList(); renderPager(); renderCount(); }

// ============== Dettagli ==============
async function fetchDetails(id){
  const local = RAW.find(x=> String(x.id)===String(id)) || {};
  for(const fn of DETAILS_ENDPOINTS){
    try{ const js = await fetchJSON(fn(id), false); return normalizeSede({...local, ...js}); }
    catch(e){ /* next */ }
  }
  return normalizeSede(local);
}

function renderDetailsHTML(s){
  const infoLine = [s.city || '-', s.address || ''].filter(Boolean).join(' • ');
  const serviziHTML = (s.services && s.services.length)
    ? `<div class="d-flex flex-wrap gap-2">${s.services.map(x=>`<span class="badge-chip">${h(x)}</span>`).join('')}</div>` : '';
  return `
    <div class="d-flex align-items-start gap-3 mb-3">
      <img src="${h(imgUrl(s.image_url))}" alt="${h(s.name||'Sede')}" width="96" height="96"
           style="object-fit:cover;border-radius:16px;border:1px solid #e6eef6"/>
      <div>
        <div class="fs-5 fw-bold">${h(s.name||'-')}</div>
        <div class="text-muted">${h(infoLine)}</div>
        ${s.tipologia?`<div class="mt-1"><span class="badge bg-light text-dark border">${h(s.tipologia)}</span></div>`:''}
      </div>
    </div>
    ${serviziHTML ? `<div class="mb-3"><div class="fw-semibold mb-1">Servizi</div>${serviziHTML}</div>` : ''}
    <div class="mt-3 d-flex gap-2">
      <a class="btn btn-prenota" href="login.html">Prenota</a>
    </div>`;
}
// Normalizza la tipologia per confronti affidabili
function pickTipologia(v){
  if (Array.isArray(v)) return v[0] ?? '';
  if (typeof v === 'string') {
    // se arriva "Coworking, Ufficio" prendo la prima voce significativa
    const first = v.split(/[;,\|]/)[0].trim();
    return first;
  }
  return v ?? '';
}
function canonTipologia(v){
  if (!v) return '';
  v = String(v).trim().toLowerCase();
  // unifica varianti comuni
  v = v.replace(/co[-\s]?working/g, 'coworking');
  v = v.replace(/\s*-\s*/g, ' ');   // "Ufficio-Privato" -> "Ufficio Privato"
  v = v.replace(/\s+/g, ' ');
  return v;
}

async function openDetails(row){
  const off = document.getElementById('offcanvasSede');
  const offBody = document.getElementById('offcanvasBody');
  const offLabel = document.getElementById('offcanvasSedeLabel');
  if(!off || !offBody){ alert('Manca il markup offcanvas'); return; }

  offBody.innerHTML = `<div class="text-center my-4"><div class="spinner-border text-primary"></div></div>`;
  if(offLabel) offLabel.textContent = row?.name || 'Dettagli sede';
  try{
    const s = await fetchDetails(row.id);
    offBody.innerHTML = renderDetailsHTML(s);
    fixImages();
    bootstrap.Offcanvas.getOrCreateInstance(off).show();
  }catch{
    offBody.innerHTML = `<div class="text-danger">Errore nel recupero dettagli.</div>`;
  }
}

// ============== Eventi ==============
function wireEvents(){
  const {q, city, tipo, resetBtn, prev, next, list} = refs();
  if(q) q.addEventListener('input', debounce(render,200));
  [city,tipo].forEach(n=> n && n.addEventListener('change', render));
  if(resetBtn) resetBtn.addEventListener('click', ()=>{ if(q) q.value=''; if(city) city.value=''; if(tipo) tipo.value=''; render(); });
  if(prev) prev.addEventListener('click', ()=>{ currentPage=Math.max(1,currentPage-1); renderList(); renderPager(); });
  if(next) next.addEventListener('click', ()=>{ const tot=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)); currentPage=Math.min(tot,currentPage+1); renderList(); renderPager(); });

  if(list) list.addEventListener('click', e=>{
    const card = e.target.closest('.sede-card'); if(!card) return;
    if(e.target.closest('[data-action="prenota"]')){ window.location.href = 'login.html'; return; }
    if(e.target.closest('[data-action="details"]')){
      const id = card.getAttribute('data-id');
      const row = filtered.find(s=> String(s.id)===String(id));
      if(row) openDetails(row);
    }
  });
}

// ============== Avvio ==============
async function loadData(){
  const {list} = refs();
  if(list){ list.innerHTML = `<div class="text-center w-100 my-5"><div class="spinner-border text-info"></div></div>`; }
  let data = await tryAllEndpoints();
  if(!Array.isArray(data)) data = [];
  RAW = data.map(normalizeSede);
  filtered = RAW.slice();
  buildFacets(RAW);
  render();
}

window.addEventListener('DOMContentLoaded', ()=>{ wireEvents(); loadData(); });
