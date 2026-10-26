// ChukaHomes — Home + Search views
const SEARCH = { q: '', area: '', ptype: '', min: '', max: '', gender: '', furnishing: '', amenities: [], sort: 'new' };

async function viewHome() {
  const v = document.getElementById('view');
  v.innerHTML = `
    <section class="hero">
      <div class="hero-leaf"></div>
      <h1>Find a room near Chuka University</h1>
      <p>Bedsitters, singles and hostels around campus — chat with the landlord directly, view first, pay later.</p>
      <div class="hero-search">
        <input class="inp" id="hero-q" placeholder="Search area, landmark, title…">
        <button class="btn btn-primary" id="hero-go">${ic('search')}</button>
      </div>
      <div class="hero-chips">${AREAS.map(a => `<button class="chip" data-area="${esc(a)}">${esc(a)}</button>`).join('')}</div>
    </section>
    <div class="sec" id="home-boosted"></div>
    <div class="sec" id="home-newest"></div>
    <div class="sec">
      <div class="sec-h"><h2>How ChukaHomes works</h2></div>
      <div class="steps3">
        <div class="stepcard"><div class="step-n">1</div><div><h3>Search & compare</h3><p>Real prices, real photos, walking distance to the Main Gate and the matatu stage.</p></div></div>
        <div class="stepcard"><div class="step-n">2</div><div><h3>Chat with the landlord</h3><p>Message in the app or tap WhatsApp — agree on a viewing time. No agents, no middlemen.</p></div></div>
        <div class="stepcard"><div class="step-n">3</div><div><h3>View first, pay later</h3><p>Never send money before you have seen the room in person. That is the ChukaHomes rule.</p></div></div>
      </div>
    </div>
    <div class="sec"><div class="notice notice-g">${ic('shield')}<span>ChukaHomes never collects rent. Any payment happens face-to-face with the landlord after a viewing. Report anything suspicious.</span></div></div>
    <div class="sec" id="home-cta"></div>`;

  const go = q => { SEARCH.q = q; location.hash = '#/search'; };
  v.querySelector('#hero-go').onclick = () => go(v.querySelector('#hero-q').value);
  v.querySelector('#hero-q').addEventListener('keydown', e => { if (e.key === 'Enter') go(e.target.value); });
  v.querySelectorAll('.hero-chips .chip').forEach(c => c.onclick = () => { SEARCH.area = c.dataset.area; SEARCH.q = ''; location.hash = '#/search'; });

  const [boosted, newest] = await Promise.all([
    api('/listings?limit=6&sort=new'),
    api('/listings?limit=8&sort=new'),
  ]);
  const items = (newest.ok && newest.items) || [];
  const bItems = ((boosted.ok && boosted.items) || []).filter(l => l.boostedUntil && l.boostedUntil > Date.now());

  const bEl = v.querySelector('#home-boosted');
  if (bItems.length) bEl.innerHTML = `<div class="sec-h"><h2>${ic('bolt')} Boosted near campus</h2></div>
    <div class="grid">${bItems.slice(0, 4).map(listingCard).join('')}</div>`;
  else bEl.innerHTML = '';

  v.querySelector('#home-newest').innerHTML = items.length
    ? `<div class="sec-h"><h2>Newest listings</h2><a href="#/search">See all →</a></div><div class="grid">${items.map(listingCard).join('')}</div>`
    : emptyBox('No listings yet', state.user && state.user.role === 'LANDLORD'
        ? 'Be the first! Post your vacant room — it takes 2 minutes.'
        : 'Check back soon — landlords around Chuka are posting vacant rooms every week.');

  const cta = v.querySelector('#home-cta');
  if (!state.user) {
    cta.innerHTML = `<div class="sec-block" style="background:var(--pine);color:#fff;border:none">
      <h3 style="color:#fff">Have a vacant room?</h3>
      <p style="font-size:13.5px;color:#d8e8dd;margin-bottom:14px">Post it on ChukaHomes and reach thousands of Chuka students. First 2 listings are free.</p>
      <a class="btn btn-primary" href="#/register">List your property</a></div>`;
  } else if (state.user.role === 'LANDLORD') {
    cta.innerHTML = `<div class="sec-block" style="background:var(--pine);color:#fff;border:none">
      <h3 style="color:#fff">Get more students to your rooms</h3>
      <p style="font-size:13.5px;color:#d8e8dd;margin-top:8px"><b>1. Get verified</b> — upload your ID and ownership proof in your Profile to earn the green badge and post up to 5 listings instead of 2.</p>
      <p style="font-size:13.5px;color:#d8e8dd;margin-bottom:14px"><b>2. Boost</b> — KES ${BOOST.amountKes} pins a listing at the top of search results and this home page for ${BOOST.days} days, with an orange BOOSTED badge.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${state.user.verifyStatus !== 'APPROVED' ? `<a class="btn btn-primary" href="#/profile">${ic('shield')} Get verified</a>` : ''}
        <a class="btn btn-outline" href="#/mylistings">${ic('doc')} My listings</a>
      </div></div>`;
  }
}

async function viewSearch() {
  const v = document.getElementById('view');
  v.innerHTML = `
    <div class="filterbar">
      <input class="inp" id="s-q" placeholder="Search area, landmark…" value="${esc(SEARCH.q)}">
      <button class="btn btn-outline" id="s-toggle">${ic('gear')}<span class="hide-p">Filters</span></button>
      <button class="btn btn-green" id="s-go">${ic('search')}</button>
    </div>
    <div class="filters hide" id="s-filters">
      <h3>Area</h3><div class="chips" id="f-area">${['<button class="chip" data-v="">Any</button>'].concat(AREAS.map(a => `<button class="chip" data-v="${esc(a)}">${esc(a)}</button>`)).join('')}</div>
      <h3>Property type</h3><div class="chips" id="f-type">${['<button class="chip" data-v="">Any</button>'].concat(TYPES.map(t => `<button class="chip" data-v="${esc(t)}">${esc(t)}</button>`)).join('')}</div>
      <h3>Price (KES)</h3>
      <div style="display:flex;gap:8px"><input class="inp" id="f-min" type="number" placeholder="Min" value="${esc(SEARCH.min)}"><input class="inp" id="f-max" type="number" placeholder="Max" value="${esc(SEARCH.max)}"></div>
      <h3>Gender</h3><div class="chips" id="f-gender">${['<button class="chip" data-v="">Any</button>'].concat(GENDER.map(g => `<button class="chip" data-v="${esc(g)}">${esc(g)}</button>`)).join('')}</div>
      <h3>Amenities</h3>
      <label class="check"><input type="checkbox" data-a="water" ${SEARCH.amenities.includes('water') ? 'checked' : ''}> Water included</label>
      <label class="check"><input type="checkbox" data-a="wifi" ${SEARCH.amenities.includes('wifi') ? 'checked' : ''}> WiFi included</label>
      <label class="check"><input type="checkbox" data-a="ensuite" ${SEARCH.amenities.includes('ensuite') ? 'checked' : ''}> Ensuite bathroom</label>
      <label class="check"><input type="checkbox" data-a="kitchen" ${SEARCH.amenities.includes('kitchen') ? 'checked' : ''}> Own kitchen</label>
      <label class="check"><input type="checkbox" data-a="guard" ${SEARCH.amenities.includes('guard') ? 'checked' : ''}> Security guard</label>
      <label class="check"><input type="checkbox" data-a="backup" ${SEARCH.amenities.includes('backup') ? 'checked' : ''}> Backup power</label>
      <h3>Sort by</h3>
      <select class="inp" id="f-sort">
        <option value="new">Newest (boosted first)</option>
        <option value="priceAsc">Price: low to high</option>
        <option value="priceDesc">Price: high to low</option>
        <option value="walk">Closest to campus</option>
      </select>
    </div>
    <div class="result-count" id="s-count"></div>
    <div id="s-results">${skeletonGrid(6)}</div>`;

  const sel = (id, key) => {
    const box = v.querySelector(id);
    [...box.children].forEach(c => { if (c.dataset.v === SEARCH[key]) c.classList.add('on'); });
    box.addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      [...box.children].forEach(c => c.classList.remove('on'));
      b.classList.add('on'); SEARCH[key] = b.dataset.v; load();
    });
  };
  v.querySelector('#s-toggle').onclick = () => v.querySelector('#s-filters').classList.toggle('hide');
  v.querySelector('#s-go').onclick = () => { SEARCH.q = v.querySelector('#s-q').value; load(); };
  v.querySelector('#s-q').addEventListener('keydown', e => { if (e.key === 'Enter') { SEARCH.q = e.target.value; load(); } });
  ['#f-min', '#f-max'].forEach(s => v.querySelector(s).addEventListener('change', () => {
    SEARCH.min = v.querySelector('#f-min').value; SEARCH.max = v.querySelector('#f-max').value; load();
  }));
  v.querySelector('#f-sort').value = SEARCH.sort;
  v.querySelector('#f-sort').onchange = e => { SEARCH.sort = e.target.value; load(); };
  v.querySelectorAll('#s-filters input[data-a]').forEach(cb => cb.onchange = () => {
    const a = cb.dataset.a;
    if (cb.checked) { if (!SEARCH.amenities.includes(a)) SEARCH.amenities.push(a); }
    else SEARCH.amenities = SEARCH.amenities.filter(x => x !== a);
    load();
  });
  sel('#f-area', 'area'); sel('#f-type', 'ptype'); sel('#f-gender', 'gender');

  async function load() {
    const p = new URLSearchParams();
    if (SEARCH.q) p.set('q', SEARCH.q);
    if (SEARCH.area) p.set('area', SEARCH.area);
    if (SEARCH.ptype) p.set('ptype', SEARCH.ptype);
    if (SEARCH.min) p.set('min', SEARCH.min);
    if (SEARCH.max) p.set('max', SEARCH.max);
    if (SEARCH.gender) p.set('gender', SEARCH.gender);
    if (SEARCH.amenities.length) p.set('amenities', SEARCH.amenities.join(','));
    p.set('sort', SEARCH.sort);
    p.set('limit', 60);
    const r = await api('/listings?' + p.toString());
    const box = v.querySelector('#s-results');
    if (!r.ok) { box.innerHTML = emptyBox('Search failed', r.error || 'Try again'); return; }
    v.querySelector('#s-count').textContent = r.items.length + (r.items.length === 1 ? ' room found' : ' rooms found');
    box.innerHTML = r.items.length ? `<div class="grid">${r.items.map(listingCard).join('')}</div>`
      : emptyBox('Nothing matched', 'Try a wider price range or remove some filters.');
  }
  load();
}
