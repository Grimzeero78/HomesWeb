// ChukaHomes — Map view (real Google Maps when an API key is set in Admin → Settings)
let gmapsPromise = null;
function loadGMaps(key) {
  if (window.google && window.google.maps) return Promise.resolve();
  if (gmapsPromise) return gmapsPromise;
  gmapsPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key) + '&loading=async&v=weekly';
    s.async = true;
    s.onload = resolve;
    s.onerror = () => { gmapsPromise = null; reject(new Error('Google Maps failed to load')); };
    document.head.appendChild(s);
  });
  return gmapsPromise;
}

async function viewMap() {
  const v = document.getElementById('view');
  v.innerHTML = `
    <div class="sec-h"><h2>Map of rooms near campus</h2></div>
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
          <div class="conv-sub"><span style="font-size:11.5px;color:var(--ink3)">${esc(l.area)}${l.walkGate ? ' · ' + l.walkGate + ' min' : ''}</span></div>
        </div>
      </a>`).join('');
    side.querySelectorAll('a[data-id]').forEach(a => a.addEventListener('click', () => {
      if (window._gmap && a.dataset.lat) {
        window._gmap.panTo({ lat: +a.dataset.lat, lng: +a.dataset.lng });
        window._gmap.setZoom(16);
      }
    }));
  }

  const key = (state.settings.gmaps_key || '').trim();
  const box = v.querySelector('#mapbox');

  if (!key) {
    const isAdmin = state.user && state.user.role === 'ADMIN';
    box.innerHTML = `<div class="gm-err"><div>
      <p><b>Google Maps is not configured yet.</b></p>
      <p style="margin-top:6px">The site owner can paste a free Google Maps API key in Admin → Settings to switch this page to a real Google Map with pins.<br>
      Meanwhile, open any listing to see its exact location on Google Maps.</p>
      ${isAdmin ? '<button class="btn btn-primary btn-sm" style="margin-top:12px" id="mk-btn">Add API key now</button>' : ''}
    </div></div>`;
    if (isAdmin) box.querySelector('#mk-btn').onclick = () =>
      modal(`<h3>Google Maps API key</h3>
        <p class="hint-t">Create a free key at console.cloud.google.com → enable “Maps JavaScript API” → Credentials → API key. Paste it here.</p>
        <input class="inp" id="mk-key" placeholder="AIza…" style="margin-top:10px">
        <button class="btn btn-green btn-block" id="mk-save" style="margin-top:12px">Save & reload map</button>`,
        m => m.querySelector('#mk-save').onclick = async () => {
          const res = await api('/settings', { method: 'PUT', body: { gmaps_key: m.querySelector('#mk-key').value.trim() } });
          if (res.ok) { state.settings.gmaps_key = m.querySelector('#mk-key').value.trim(); closeModal(); viewMap(); }
          else toast(res.error, true);
        });
    return;
  }

  try {
    await loadGMaps(key);
    box.querySelector('.gm-err')?.remove();
    const map = new google.maps.Map(box, {
      center: { lat: GATE.lat, lng: GATE.lng },
      zoom: 14, mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
    });
    window._gmap = map;
    new google.maps.Marker({
      position: GATE, map, title: 'Chuka University Main Gate',
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: '#0e5a33', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2.5 },
      label: { text: 'GATE', color: '#0a3d24', fontSize: '10px', fontWeight: '700' },
    });
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(GATE);
    withPos.forEach(l => {
      const boosted = l.boostedUntil && l.boostedUntil > Date.now();
      const mk = new google.maps.Marker({
        position: { lat: l.lat, lng: l.lng }, map, title: l.title,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 11,
          fillColor: boosted ? '#e0620f' : '#1b7a47', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2.5 },
        label: { text: shortK(l.rent), color: '#fff', fontSize: '10px', fontWeight: '800' },
      });
      const info = new google.maps.InfoWindow({
        content: `<div style="font-family:Instrument Sans,sans-serif;max-width:210px">
          ${l.thumb ? `<img src="${l.thumb}" style="width:100%;height:90px;object-fit:cover;border-radius:8px">` : ''}
          <div style="font-weight:800;margin-top:6px">${kes(l.rent)}/${perShort(l.period)}</div>
          <div style="font-size:12.5px;color:#444">${esc(l.title)}</div>
          <div style="font-size:11.5px;color:#777">${esc(l.area)}${l.walkGate ? ' · ' + l.walkGate + ' min walk' : ''}</div>
          <a href="#/listing/${l.id}" style="display:inline-block;margin-top:6px;color:#e0620f;font-weight:700;font-size:12.5px">Open listing →</a>
        </div>`,
      });
      mk.addListener('click', () => { info.open({ anchor: mk, map }); });
      bounds.extend(mk.position);
    });
    if (withPos.length) map.fitBounds(bounds, 60);
  } catch (e) {
    box.innerHTML = `<div class="gm-err"><div><b>Google Maps failed to load.</b><br>
      <span style="margin-top:6px;display:inline-block">If you just added the key, make sure “Maps JavaScript API” is enabled and billing is active on your Google Cloud project.</span></div></div>`;
  }
}
