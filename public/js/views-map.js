// ChukaHomes — Map view (free & keyless: Leaflet + OpenStreetMap/CARTO/Esri — no API key, no billing)
let leafletPromise = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve();
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    css.integrity = 'sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H';
    css.crossOrigin = '';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.async = true;
    s.integrity = 'sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH';
    s.crossOrigin = '';
    s.onload = resolve;
    s.onerror = () => { leafletPromise = null; reject(new Error('Map library failed to load')); };
    document.head.appendChild(s);
  });
  return leafletPromise;
}

function osmMap(el, opts) {
  const map = L.map(el, { ...opts });
  // Default basemap: Esri World Street Map — road names + popular places clearly written (best for directions)
  const streets = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  }).addTo(map);
  // Satellite imagery — best for pinpointing an exact plot/gate
  const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Imagery &copy; <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a>, Maxar, Earthstar Geographics',
  });
  // Classic OSM streets
  const osmStd = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  });
  L.control.layers(
    { 'Map — roads & places': streets, 'Satellite': sat, 'Streets (classic)': osmStd },
    null, { position: 'topright' }
  ).addTo(map);
  return map;
}

// legacy geocoder (used by older flows) — now bounded to the Chuka area
async function geocodePlace(q) {
  const hit = await searchPlaces(q);
  return hit ? { lat: hit.lat, lng: hit.lng } : null;
}

const gateIcon = () => L.divIcon({ className: '', html: '<div class="pin-gate">GATE</div>', iconSize: [48, 24], iconAnchor: [24, 12] });
const priceIcon = (txt, boosted) => L.divIcon({ className: '', html: `<div class="pin-price${boosted ? ' pin-b' : ''}">${txt}</div>`, iconSize: [46, 28], iconAnchor: [23, 14] });
const pickIcon = () => L.divIcon({ className: '', html: '<div class="pin-pick"></div>', iconSize: [20, 20], iconAnchor: [10, 10] });
const landIcon = (txt) => L.divIcon({ className: '', html: `<div class="pin-land">${txt}</div>`, iconSize: [110, 22], iconAnchor: [55, 24] });

async function viewMap() {
  const v = document.getElementById('view');
  v.innerHTML = `
    <div class="sec-h"><h2>Map of rooms near campus</h2></div>
    <div class="map-search">
      <input class="inp" id="map-q" placeholder="Search a place — e.g. Ndagani, Main Gate, Chuka Town" autocomplete="off">
      <button class="btn btn-primary btn-sm" id="map-go" type="button" style="flex:none">${ic('search')} Search</button>
    </div>
    <p class="hint-t" style="margin:-4px 0 10px">Green pins = rooms. Switch to <b>Satellite</b> (layers button, top right) to see houses and gates clearly.</p>
    <div class="map-wrap">
      <div class="map-side" id="map-side">${skeletonGrid(2)}</div>
      <div id="mapbox"><div class="gm-err">Loading map…</div></div>
    </div>`;

  const r = await api('/listings?limit=100&sort=walk');
  const items = (r.ok && r.items) || [];
  const withPos = items.filter(l => l.lat != null && l.lng != null);
  renderSide(items);

  function renderSide(list) {
    const side = v.querySelector('#map-side');
    if (!list.length) { side.innerHTML = emptyBox('Nothing on the map yet', 'Listings with a location pin will appear here.'); return; }
    side.innerHTML = list.map(l => `
      <a class="conv-row" href="#/listing/${l.id}" data-id="${l.id}" data-lat="${l.lat || ''}" data-lng="${l.lng || ''}">
        <div class="cph" style="width:56px;height:56px;border-radius:10px;overflow:hidden;flex:none;aspect-ratio:auto">
          ${l.thumb ? `<img src="${l.thumb}" style="width:100%;height:100%;object-fit:cover">` : `<div class="cph-empty">${ic('photo')}</div>`}
        </div>
        <div class="conv-main">
          <div class="conv-top"><span class="conv-name">${kes(l.rent)}/${perShort(l.period)}</span>
            ${l.boostedUntil && l.boostedUntil > Date.now() ? `<span class="pill pill-o">${ic('bolt')}Boost</span>` : ''}</div>
          <div class="conv-last">${esc(l.title)}</div>
          <div class="conv-sub"><span style="font-size:11.5px;color:var(--ink3)">${esc(l.area)}${l.landmark ? ' · ' + esc(l.landmark) : ''}</span></div>
        </div>
      </a>`).join('');
    side.querySelectorAll('a[data-id]').forEach(a => a.addEventListener('click', () => {
      if (window._lmap && a.dataset.lat) {
        window._lmap.panTo([+a.dataset.lat, +a.dataset.lng]);
        window._lmap.setZoom(17);
      }
    }));
  }

  const box = v.querySelector('#mapbox');
  try {
    await loadLeaflet();
    box.querySelector('.gm-err')?.remove();
    // zoom 16 = street & house level: road names + popular places are readable here.
    const map = osmMap(box, { center: [GATE.lat, GATE.lng], zoom: 16, scrollWheelZoom: true });
    L.control.scale({ imperial: false }).addTo(map);
    window._lmap = map;

    // ---- search: local gazetteer first (instant), Nominatim (bounded to Chuka) as fallback ----
    const flyTo = (lat, lng, zoom) => map.flyTo([lat, lng], zoom || 17, { duration: 0.8 });
    const doSearch = async () => {
      const q = v.querySelector('#map-q').value.trim();
      if (!q) return;
      go.disabled = true;
      const hit = await searchPlaces(q);
      go.disabled = false;
      if (!hit) { toast('Place not found — try "Ndagani", "Main Gate" or a road name', true); return; }
      flyTo(hit.lat, hit.lng);
    };
    const go = v.querySelector('#map-go');
    go.onclick = doSearch;
    v.querySelector('#map-q').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });

    // ---- permanent area labels (verified coordinates — always visible, no geocoder needed) ----
    CHUKA_PLACES.forEach(p => {
      if (p.hide) return; // search-only entries (too close to another label)
      L.marker([p.lat, p.lng], { icon: landIcon(p.n), keyboard: false, interactive: false, zIndexOffset: 100 }).addTo(map);
    });

    // Chuka University Main Gate — exact, always shown (tooltip points right, away from labels)
    L.marker([GATE.lat, GATE.lng], { icon: gateIcon(), keyboard: false, zIndexOffset: 500 }).addTo(map)
      .bindTooltip('Chuka University Main Gate', { permanent: true, direction: 'right', offset: [12, 0], className: 'gate-tip' });

    const bounds = [[GATE.lat, GATE.lng]];
    CHUKA_PLACES.forEach(p => bounds.push([p.lat, p.lng]));
    withPos.forEach(l => {
      const boosted = l.boostedUntil && l.boostedUntil > Date.now();
      L.marker([l.lat, l.lng], { icon: priceIcon(shortK(l.rent), boosted), title: l.title, keyboard: false })
        .bindPopup(`<div style="font-family:Instrument Sans,sans-serif;max-width:210px">
          ${l.thumb ? `<img src="${l.thumb}" style="width:100%;height:90px;object-fit:cover;border-radius:8px">` : ''}
          <div style="font-weight:800;margin-top:6px">${kes(l.rent)}/${perShort(l.period)}</div>
          <div style="font-size:12.5px;color:#444">${esc(l.title)}</div>
          <div style="font-size:11.5px;color:#777">${esc(l.area)}${l.landmark ? ' · ' + esc(l.landmark) : ''}</div>
          <a href="#/listing/${l.id}" style="display:inline-block;margin-top:6px;color:#e0620f;font-weight:700;font-size:12.5px">Open listing →</a>
        </div>`)
        .addTo(map);
      bounds.push([l.lat, l.lng]);
    });
    // maxZoom keeps fitBounds from zooming out to a nameless country view
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  } catch (e) {
    box.innerHTML = `<div class="gm-err"><div><b>Map failed to load.</b><br>
      <span style="margin-top:6px;display:inline-block">Check your internet connection and try again.</span></div></div>`;
  }
}
