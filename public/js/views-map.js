// ChukaHomes — Explore map: real Google Maps tiles (roads, estates, shops all
// labelled) with every pinned room shown as a price chip. Tap a room in the
// side list (or a pin on the map) to see its exact spot and open the listing.
// This page IS a map, so one finger pans the map here — but embedded maps
// (listing page, wizard) never hijack the page scroll.
async function viewMap() {
  const v = document.getElementById('view');
  const gen = routeGen;
  v.innerHTML = `
    <div class="sec-h"><h2>Map of rooms near campus</h2></div>
    <div class="map-search">
      <input class="inp" id="map-q" placeholder="Search a place — e.g. Ndagani, Main Gate, Chuka Town" autocomplete="off">
      <button class="btn btn-primary btn-sm" id="map-go" type="button" style="flex:none">${ic('search')} Search</button>
    </div>
    <p class="hint-t" style="margin:-4px 0 10px">Live Google map — roads, estates and shops are all named. Tap a room below to fly to its exact spot, then use <b>Directions</b> in its listing to get there.</p>
    <div class="map-wrap">
      <div class="map-side" id="map-side">${skeletonGrid(2)}</div>
      <div id="mapbox" class="gmap-loading"><div class="gm-err">Loading map…</div></div>
    </div>`;

  const r = await api('/listings?limit=100&sort=walk');
  if (stale(gen)) return; // navigated away while loading — never paint over the new page
  const items = (r.ok && r.items) || [];
  renderSide(items);

  const box = v.querySelector('#mapbox');
  if (!box) return;
  let M = null;
  const markers = new Map(); // listing id -> marker
  try {
    await loadLeaflet();
    if (stale(gen)) return; // Leaflet can take a moment on slow networks
    box.querySelector('.gm-err')?.remove();
    box.classList.remove('gmap-loading');
    M = makeMap(box, { lat: GATE.lat, lng: GATE.lng, zoom: 16, zoomMin: 10, mode: 'map' });
    onLeave(() => { try { M.destroy(); } catch (e) {} M = null; });

    const pinned = items.filter(l => l.lat != null && l.lng != null);
    pinned.forEach(l => {
      const m = L.marker([l.lat, l.lng], { icon: priceIcon(l.rent, l.period), keyboard: false }).addTo(M.map);
      const walk = walkMinutes(l.lat, l.lng);
      m.bindPopup(`
        <div style="max-width:190px">
          <b>${esc(l.title)}</b><br>
          <span style="color:var(--ink2)">${kes(l.rent)}/${perShort(l.period)} · ${esc(l.area)}${walk ? ' · ' + walk + ' min to gate' : ''}</span><br>
          <a href="#/listing/${l.id}">Open listing →</a>
        </div>`);
      m.on('click', () => highlightSide(l.id));
      markers.set(l.id, m);
    });
    M.fit(pinned.map(l => [l.lat, l.lng]));
    setTimeout(() => M.map.invalidateSize(), 60);
  } catch (e) {
    box.innerHTML = `<div class="gm-err"><div><b>Map failed to load.</b><br>
      <span style="margin-top:6px;display:inline-block">Check your internet connection and try again.</span></div></div>`;
  }

  function highlightSide(id) {
    v.querySelectorAll('#map-side [data-id]').forEach(a => a.classList.toggle('on', +a.dataset.id === id));
    const row = v.querySelector(`#map-side [data-id="${id}"]`);
    if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function showOnMap(l) {
    if (l.lat == null || l.lng == null) { toast('This room is not pinned yet — ask the landlord in chat', true); return; }
    if (!M) return;
    M.setView(l.lat, l.lng, 18, true);
    const m = markers.get(l.id);
    if (m) setTimeout(() => m.openPopup(), 450);
    highlightSide(l.id);
  }

  function renderSide(list) {
    const side = v.querySelector('#map-side');
    if (!list.length) { side.innerHTML = emptyBox('Nothing on the map yet', 'Listings with a location pin will appear here.'); return; }
    side.innerHTML = list.map(l => {
      const boosted = l.boostedUntil && l.boostedUntil > Date.now();
      const pinned = l.lat != null && l.lng != null;
      const walk = pinned ? walkMinutes(l.lat, l.lng) : null;
      return `
      <div class="conv-row map-row ${pinned ? '' : 'nopin'}" data-id="${l.id}" tabindex="0" role="button" aria-label="Show ${esc(l.title)} on map">
        <div class="cph" style="width:56px;height:56px;border-radius:10px;overflow:hidden;flex:none;aspect-ratio:auto">
          ${l.thumb ? `<img src="${l.thumb}" style="width:100%;height:100%;object-fit:cover">` : `<div class="cph-empty">${ic('photo')}</div>`}
        </div>
        <div class="conv-main">
          <div class="conv-top"><span class="conv-name">${kes(l.rent)}/${perShort(l.period)}</span>
            ${boosted ? `<span class="pill pill-o">${ic('bolt')}Boost</span>` : ''}</div>
          <div class="conv-last">${esc(l.title)}</div>
          <div class="conv-sub"><span style="font-size:11.5px;color:var(--ink3)">${esc(l.area)}${l.landmark ? ' · ' + esc(l.landmark) : ''}${walk ? ' · ' + walk + ' min' : ''}</span>
            <a href="#/listing/${l.id}" class="mini-open">View</a></div>
        </div>
      </div>`;
    }).join('');
    side.querySelectorAll('.map-row').forEach(row => {
      const go = () => {
        const l = list.find(x => x.id === +row.dataset.id);
        if (l) showOnMap(l);
      };
      row.addEventListener('click', go);
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }

  // search: local gazetteer first (instant), Nominatim (bounded to Chuka) as fallback
  const doSearch = async () => {
    const q = v.querySelector('#map-q').value.trim();
    if (!q) return;
    go.disabled = true;
    const hit = await searchPlaces(q);
    go.disabled = false;
    if (!hit) { toast('Place not found — try "Ndagani", "Main Gate" or a road name', true); return; }
    if (M) M.setView(hit.lat, hit.lng, 17, true);
    v.querySelectorAll('#map-side .map-row.on').forEach(a => a.classList.remove('on'));
  };
  const go = v.querySelector('#map-go');
  go.onclick = doSearch;
  v.querySelector('#map-q').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });
}
