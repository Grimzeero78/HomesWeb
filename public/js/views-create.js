// ChukaHomes — 8-step create/edit listing wizard
const LBLANK = () => ({
  title: '', ptype: 'Bedsitter', units: 1, furnishing: 'Unfurnished', floor: 'Ground',
  area: '', landmark: '', lat: null, lng: null, walkGate: null, walkStage: null, road: 'Tarmac',
  rent: '', period: 'Per Month', deposit: '', fees: 'None', negotiable: false, terms: '',
  water: 'Included in rent', waterCost: '', waterSched: '', waterTank: 'No',
  elec: 'Own token meter', elecCost: '', wifi: 'Not available', wifiCost: '', wifiProvider: '',
  garbage: 'Included', backup: 'None',
  bath: 'Shared', kitchen: 'Shared', cooking: 'Yes', balcony: 'No', tile: 'Tiled', ceiling: 'Yes',
  wardrobe: 'No', bed: 'No', desk: 'No',
  security: [], gender: 'Mixed', curfewOn: 'No', curfewTime: '', visitors: 'Daytime only', alcohol: 'No',
  availableFrom: '', contactPhone: '', photos: [],
});

const WIZ_STEPS = ['Basics', 'Location', 'Pricing', 'Utilities', 'Room', 'Rules', 'Availability', 'Photos'];

async function viewCreate(id) {
  if (!state.user) { location.hash = '#/login'; return; }
  if (state.user.role !== 'LANDLORD') {
    document.getElementById('view').innerHTML = emptyBox('Landlords only',
      'Only landlord accounts can post listings. Create a landlord account to list your rooms.');
    return;
  }
  const v = document.getElementById('view');
  let L = LBLANK();
  let editingId = null;

  if (id) {
    v.innerHTML = `<div class="pageload"><div class="skel" style="height:200px"></div><div class="skel" style="height:60px"></div></div>`;
    const r = await api('/listings/' + id);
    if (!r.ok || !r.isOwner) { v.innerHTML = emptyBox('Cannot edit', r.error || 'Not your listing.'); return; }
    L = { ...L, ...r.listing, security: parseSecurity(r.listing.security), photos: (r.photos || []).map(p => p.url) };
    editingId = id;
  }
  let step = 0;

  const yesNo = (k, label) => `
    <label class="lbl">${label}</label>
    <div class="seg" data-k="${k}"><button type="button" data-v="No" class="${L[k] !== 'Yes' ? 'on' : ''}">No</button><button type="button" data-v="Yes" class="${L[k] === 'Yes' ? 'on' : ''}">Yes</button></div>`;
  const sel = (k, label, opts, hint) => `
    <label class="lbl">${label}</label>
    <select class="inp" data-k="${k}">${opts.map(o => `<option ${L[k] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>
    ${hint ? `<p class="hint-t">${hint}</p>` : ''}`;
  const txt = (k, label, ph, type = 'text') => `
    <label class="lbl">${label}</label>
    <input class="inp" data-k="${k}" type="${type}" ${type === 'number' ? 'min="0"' : ''} placeholder="${esc(ph || '')}" value="${esc(L[k] == null ? '' : L[k])}">`;

  const STEPS = [
    { t: 'Property basics', html: () => `
      ${txt('title', 'Listing title', 'e.g. Sunlight Bedsitters — Ndagani')}
      ${sel('ptype', 'Property type', TYPES)}
      ${txt('units', 'Total units in the compound', 'e.g. 6', 'number')}
      ${sel('furnishing', 'Furnishing', FURN)}
      ${sel('floor', 'Floor', FLOORS)}` },
    { t: 'Location', html: () => `
      ${sel('area', 'Area', AREAS)}
      ${txt('landmark', 'Nearest landmark', 'e.g. opposite Ndagani stage, near the shopping centre')}
      ${sel('road', 'Road access', ROADS)}
      <div class="sec-block" style="margin-top:14px;padding:13px">
        <h3 style="font-size:14.5px">${ic('pin')} Pin on map</h3>
        <p class="hint-t">Pin the exact spot so students find you easily. Walking time to the Main Gate is calculated automatically (80 m per minute).</p>
        <div id="pick-map" style="margin-top:10px"></div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" id="pick-gps" type="button">${ic('pin')} Use my current location</button>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <input class="inp" id="pick-lat" placeholder="lat" value="${L.lat ?? ''}">
          <input class="inp" id="pick-lng" placeholder="lng" value="${L.lng ?? ''}">
        </div>
        <p class="hint-t" id="pick-walk" style="margin-top:8px"></p>
      </div>
      ${txt('walkGate', 'Walk to Main Gate (minutes)', 'auto-calculated', 'number')}
      ${txt('walkStage', 'Walk to nearest matatu stage (minutes)', 'e.g. 3', 'number')}` },
    { t: 'Pricing', html: () => `
      ${txt('rent', 'Rent (KES)', 'e.g. 6500', 'number')}
      ${sel('period', 'Payment period', PERIODS)}
      ${txt('deposit', 'Deposit (KES)', 'e.g. 6500 — leave empty if none', 'number')}
      ${txt('fees', 'Move-in fees', 'e.g. Water connection KES 500 — or "None"')}
      <label class="check"><input type="checkbox" id="w-neg" ${L.negotiable ? 'checked' : ''}> Rent is negotiable</label>
      <label class="lbl">Payment terms & house rules</label>
      <textarea class="inp" data-k="terms" placeholder="e.g. Rent due by 5th of the month. One month deposit."> ${esc(L.terms)}</textarea>` },
    { t: 'Utilities', html: () => `
      ${sel('water', 'Water', WATER)}
      ${txt('waterCost', 'Water cost (if paid)', 'e.g. KES 200/month or per jerrican')}
      <div id="w-sched-box">${txt('waterSched', 'Water schedule (if rationed)', 'e.g. Tuesday & Friday evenings')}</div>
      ${yesNo('waterTank', 'Has storage tank / backup tank?')}
      ${sel('elec', 'Electricity', ELEC)}
      ${txt('elecCost', 'Electricity cost (if paid)', 'e.g. own tokens, ~KES 300/week')}
      ${sel('wifi', 'WiFi / internet', WIFI)}
      ${txt('wifiCost', 'WiFi cost (if paid)', 'e.g. KES 300/month shared')}
      ${txt('wifiProvider', 'WiFi provider', 'e.g. Faiba, Safaricom, Starlink — optional')}
      ${sel('garbage', 'Garbage disposal', GARBAGE)}
      ${sel('backup', 'Backup power', BACKUP)}` },
    { t: 'Room & building', html: () => `
      ${sel('bath', 'Bathroom', BATH)}
      ${sel('kitchen', 'Kitchen', KITCHEN)}
      ${sel('cooking', 'Cooking allowed', ['Yes', 'No', 'Outside kitchen only'])}
      ${yesNo('balcony', 'Balcony?')}
      ${sel('tile', 'Floor finish', ['Tiled', 'Not tiled'])}
      ${yesNo('ceiling', 'Ceiling board?')}
      ${yesNo('wardrobe', 'Wardrobe provided?')}
      ${yesNo('bed', 'Bed provided?')}
      ${yesNo('desk', 'Study desk provided?')}` },
    { t: 'Security & rules', html: () => `
      <label class="lbl">Security (choose all that apply)</label>
      <div class="chips" id="w-sec">${SECURITY.map(s => `<button type="button" class="chip ${L.security.includes(s) ? 'on' : ''}" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      ${sel('gender', 'Gender policy', GENDER)}
      ${yesNo('curfewOn', 'Is there a curfew?')}
      <div id="w-curfew-box">${txt('curfewTime', 'Curfew time', 'e.g. 10:30 PM')}</div>
      ${sel('visitors', 'Visitors allowed?', VISITORS)}
      ${yesNo('alcohol', 'Alcohol allowed in the compound?')}` },
    { t: 'Availability & contact', html: () => `
      <label class="lbl">Available from</label>
      <input class="inp" type="date" data-k="availableFrom" value="${esc(L.availableFrom)}">
      <p class="hint-t">Leave today's date if it is vacant right now.</p>
      ${txt('contactPhone', 'Contact phone / WhatsApp', 'Defaults to your profile number')}
      <div class="notice notice-g" style="margin-top:14px">${ic('shield')}<span>Your number is only shown to signed-in users. ChukaHomes never collects any payment on your behalf.</span></div>` },
    { t: 'Photos & publish', html: () => `
      <label class="lbl">Photos (3–8) — first photo is the cover</label>
      <div class="photo-grid" id="w-photos"></div>
      <input type="file" id="w-file" accept="image/*" multiple hidden>
      <p class="hint-t" style="margin-top:8px">Photos are compressed in your browser before upload. Add clear daylight photos — listings with good photos get 3× more chats.</p>
      <div class="sec-block" style="margin-top:14px"><h3>Review</h3><div id="w-review"></div></div>` },
  ];

  function render() {
    const st = STEPS[step];
    v.innerHTML = `
      <div class="wiz-progress">
        <span class="wiz-step">Step ${step + 1}/8</span>
        <div class="wiz-bar"><i style="width:${((step + 1) / 8) * 100}%"></i></div>
        <span class="wiz-step">${esc(st.t)}</span>
      </div>
      <div class="wiz-card"><h2>${esc(st.t)}</h2><div id="wiz-fields">${st.html()}</div>
        <div class="wiz-nav">
          ${step > 0 ? '<button class="btn btn-outline" id="wz-back">Back</button>' : '<button class="btn btn-outline" id="wz-cancel">Cancel</button>'}
          <button class="btn btn-green" id="wz-next">${step === 7 ? (editingId ? 'Save changes' : 'Publish listing') : 'Next'}</button>
        </div>
      </div>`;

    // bind generic inputs
    v.querySelectorAll('[data-k]').forEach(el => {
      const k = el.dataset.k;
      const ev = el.tagName === 'SELECT' || el.type === 'date' ? 'change' : 'input';
      el.addEventListener(ev, () => { L[k] = el.value; });
    });
    v.querySelectorAll('.seg[data-k]').forEach(seg => seg.querySelectorAll('button').forEach(b => b.onclick = () => {
      seg.querySelectorAll('button').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); L[seg.dataset.k] = b.dataset.v;
    }));
    const neg = v.querySelector('#w-neg'); if (neg) neg.onchange = () => { L.negotiable = neg.checked; };
    const schedBox = v.querySelector('#w-sched-box'); if (schedBox) schedBox.style.display = L.water === 'Rationed' ? '' : 'none';
    const ws = v.querySelector('[data-k="water"]'); if (ws) ws.addEventListener('change', () => schedBox.style.display = L.water === 'Rationed' ? '' : 'none');
    const cfBox = v.querySelector('#w-curfew-box'); if (cfBox) cfBox.style.display = L.curfewOn === 'Yes' ? '' : 'none';
    const co = v.querySelector('[data-k="curfewOn"]'); if (co) co.addEventListener('click', () => setTimeout(() => cfBox.style.display = L.curfewOn === 'Yes' ? '' : 'none', 0));
    const secBox = v.querySelector('#w-sec'); if (secBox) secBox.onclick = e => {
      const b = e.target.closest('.chip'); if (!b) return;
      b.classList.toggle('on');
      const val = b.dataset.v;
      if (b.classList.contains('on')) { if (!L.security.includes(val)) L.security.push(val); }
      else L.security = L.security.filter(x => x !== val);
    };

    if (step === 1) wireLocation();
    if (step === 7) wirePhotos();

    const back = v.querySelector('#wz-back') || v.querySelector('#wz-cancel');
    back.onclick = () => {
      if (back.id === 'wz-cancel' && step === 0) { location.hash = editingId ? '#/listing/' + editingId : '#/mylistings'; return; }
      step--; render();
    };
    v.querySelector('#wz-next').onclick = () => {
      const err = validate(step);
      if (err) { toast(err, true); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      if (step === 7) publish(); else { step++; render(); window.scrollTo({ top: 0 }); }
    };
  }

  function validate(s) {
    if (s === 0) { if ((L.title || '').trim().length < 4) return 'Give your listing a title (at least 4 characters)'; if (!L.ptype) return 'Choose the property type'; }
    if (s === 1 && !L.area) return 'Choose the area';
    if (s === 2) {
      if (!L.rent || Number(L.rent) < 1) return 'Enter the rent';
      if ((L.contactPhone || state.user.phone || '').replace(/[\s-]/g, '').length < 9) return 'Add a valid contact phone number';
    }
    if (s === 7 && L.photos.length < 3) return 'Add at least 3 photos';
    return null;
  }

  // ----- location picker -----
  function wireLocation() {
    const box = v.querySelector('#pick-map');
    const latIn = v.querySelector('#pick-lat'), lngIn = v.querySelector('#pick-lng');
    const walkEl = v.querySelector('#pick-walk');
    const setPos = (lat, lng) => {
      L.lat = +(+lat).toFixed(6); L.lng = +(+lng).toFixed(6);
      latIn.value = L.lat; lngIn.value = L.lng;
      const w = walkMinutes(L.lat, L.lng);
      if (w) { L.walkGate = w; const wg = v.querySelector('[data-k="walkGate"]'); if (wg) wg.value = w; }
      walkEl.textContent = w ? `Approx. ${w} min walk to the Main Gate` : '';
    };
    latIn.addEventListener('change', () => { if (latIn.value && lngIn.value) setPos(latIn.value, lngIn.value); });
    lngIn.addEventListener('change', () => { if (latIn.value && lngIn.value) setPos(latIn.value, lngIn.value); });
    v.querySelector('#pick-gps').onclick = () => {
      if (!navigator.geolocation) { toast('Geolocation is not supported on this device', true); return; }
      toast('Getting your location…');
      navigator.geolocation.getCurrentPosition(
        p => { setPos(p.coords.latitude, p.coords.longitude); if (window._pmap) window._pmap.placeMarker(p.coords.latitude, p.coords.longitude); },
        () => toast('Could not get your location — check location permission', true)
      );
    };
    loadLeaflet().then(() => {
      box.innerHTML = '<div id="pm-inner" style="height:240px;border-radius:12px;overflow:hidden;border:1px solid var(--line)"></div>';
      const inner = box.querySelector('#pm-inner');
      const map = osmMap(inner, { center: [L.lat ?? GATE.lat, L.lng ?? GATE.lng], zoom: L.lat ? 17 : 14 });
      let marker = null;
      window._pmap = { placeMarker: (a, b) => { placeMarker(a, b); map.panTo([a, b]); } };
      function placeMarker(lat, lng) {
        if (marker) marker.remove();
        marker = L.marker([lat, lng], { icon: pickIcon(), keyboard: false }).addTo(map);
      }
      map.on('click', e => { setPos(e.latlng.lat, e.latlng.lng); placeMarker(e.latlng.lat, e.latlng.lng); });
      if (L.lat != null) placeMarker(L.lat, L.lng);
    }).catch(() => { box.innerHTML = '<div class="notice notice-o">Map could not load — check your internet connection and reopen this step.</div>'; });
  }

  // ----- photos -----
  function wirePhotos() {
    const grid = v.querySelector('#w-photos');
    const fileIn = v.querySelector('#w-file');
    const draw = () => {
      grid.innerHTML = L.photos.map((src, i) => `
        <div class="photo-cell"><img src="${src}"><button class="photo-x" data-i="${i}" type="button">✕</button>
          ${i === 0 ? '<span class="mini-tag" style="position:absolute;bottom:4px;left:4px">Cover</span>' : ''}</div>`).join('')
        + (L.photos.length < 8 ? `<button class="photo-add" id="ph-add" type="button">${ic('camera')}<span>Add photo</span></button>` : '');
      grid.querySelectorAll('.photo-x').forEach(b => b.onclick = () => { L.photos.splice(+b.dataset.i, 1); draw(); });
      grid.querySelector('#ph-add').onclick = () => fileIn.click();
      drawReview();
    };
    fileIn.onchange = async () => {
      const files = [...fileIn.files].filter(f => f.type.startsWith('image/'));
      for (const f of files) {
        if (L.photos.length >= 8) { toast('Maximum 8 photos', true); break; }
        toast('Processing photo…');
        try { L.photos.push(await compressTo(f, 150, 1150, 0.72)); } catch (e) { toast(e.message, true); }
      }
      fileIn.value = '';
      draw();
    };
    function drawReview() {
      const rv = v.querySelector('#w-review'); if (!rv) return;
      const rows = [
        ['Title', L.title], ['Type', L.ptype], ['Area', L.area + (L.landmark ? ' — ' + L.landmark : '')],
        ['Rent', L.rent ? kes(L.rent) + ' / ' + (L.period || '').toLowerCase() : ''],
        ['Deposit', L.deposit ? kes(L.deposit) : 'None'],
        ['Water', L.water], ['Electricity', L.elec], ['WiFi', L.wifi], ['Bathroom', L.bath],
        ['Gender', L.gender], ['Available', L.availableFrom || 'Now'], ['Photos', L.photos.length + ' added'],
      ];
      rv.innerHTML = rows.filter(r2 => r2[1]).map(r2 => `<div class="rev-row"><span class="k">${r2[0]}</span><span class="v">${esc(r2[1])}</span></div>`).join('');
    }
    draw();
  }

  async function publish() {
    const btn = v.querySelector('#wz-next'); btn.disabled = true; btn.textContent = editingId ? 'Saving…' : 'Publishing…';
    if (!L.contactPhone) L.contactPhone = state.user.phone || '';
    const body = { ...L, photos: L.photos };
    const res = editingId
      ? await api('/listings/' + editingId, { method: 'PUT', body })
      : await api('/listings', { body });
    if (res.ok) {
      toast(editingId ? 'Listing updated' : 'Listing published!');
      location.hash = '#/listing/' + (editingId || res.id);
    } else { toast(res.error, true); btn.disabled = false; btn.textContent = editingId ? 'Save changes' : 'Publish listing'; }
  }

  render();
}
