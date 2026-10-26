// ChukaHomes — Explore map (keyless Google Maps embed: real roads, estates, shops)
// The side list holds the rooms; tapping one shows its exact Google pin with a price
// chip and walk time. Search jumps the map to any place (gazetteer + Nominatim).
async function viewMap() {
  const v = document.getElementById('view');
  v.innerHTML = `
    <div class="sec-h"><h2>Map of rooms near campus</h2></div>
    <div class="map-search">
      <input class="inp" id="map-q" placeholder="Search a place — e.g. Ndagani, Main Gate, Chuka Town" autocomplete="off">
      <button class="btn btn-primary btn-sm" id="map-go" type="button" style="flex:none">${ic('search')} Search</button>
    </div>
    <p class="hint-t" style="margin:-4px 0 10px">This is live Google Maps — roads, estates and shops are all named. Tap a room below to show its exact spot, then use <b>Directions</b> to get there.</p>
    <div class="map-wrap">
      <div class="map-side" id="map-side">${skeletonGrid(2)}</div>
      <div id="mapbox"><div class="gm-err">Loading Google Maps…</div></div>
    </div>`;

  const r = await api('/listings?limit=100&sort=walk');
  const items = (r.ok && r.items) || [];
  renderSide(items);

  const box = v.querySelector('#mapbox');
  let gm = null;
  try {
    box.querySelector('.gm-err')?.remove();
    gm = new GMap(box, { lat: GATE.lat, lng: GATE.lng, zoom: 16, pick: false, zoomMin: 10 });
  } catch (e) {
    box.innerHTML = `<div class="gm-err"><div><b>Map failed to load.</b><br>
      <span style="margin-top:6px;display:inline-block">Check your internet connection and try again.</span></div></div>`;
  }

  function showOnMap(l) {
    if (!gm) return;
    if (l.lat == null || l.lng == null) { toast('This room is not pinned yet — ask the landlord in chat', true); return; }
    gm.setView(l.lat, l.lng, 18);
    box.querySelector('.gm-chip')?.remove();
    const walk = walkMinutes(l.lat, l.lng);
    const chip = document.createElement('div');
    chip.className = 'gm-chip';
    chip.innerHTML = `<b>${esc(l.title)}</b>
      <span>${kes(l.rent)}/${perShort(l.period)} · ${esc(l.area)}${l.landmark ? ' · ' + esc(l.landmark) : ''}${walk ? ' · ' + walk + ' min walk to gate' : ''}</span>
      <a href="#/listing/${l.id}">Open listing →</a>`;
    box.appendChild(chip);
    v.querySelectorAll('#map-side [data-id]').forEach(a => a.classList.toggle('on', +a.dataset.id === l.id));
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
    if (gm) gm.setView(hit.lat, hit.lng, 17);
    box.querySelector('.gm-chip')?.remove();
    v.querySelectorAll('#map-side .map-row.on').forEach(a => a.classList.remove('on'));
  };
  const go = v.querySelector('#map-go');
  go.onclick = doSearch;
  v.querySelector('#map-q').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });
}
