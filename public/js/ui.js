// ChukaHomes — shared UI helpers, constants, icons
const TYPES = ['Bedsitter', 'Single Room', '1 Bedroom', '2 Bedroom', 'Shared Hostel Room', 'Double Room'];
const AREAS = ['Ndagani', 'Marine', 'Slaughter', 'Mungoni'];
const FURN = ['Furnished', 'Semi-furnished', 'Unfurnished'];
const PERIODS = ['Per Month', 'Per Semester (4 months)', 'Per Year'];
const WATER = ['Included in rent', 'Pay separately', 'Rationed'];
const ELEC = ['Included in rent', 'Own token meter', 'Shared meter', 'Prepaid'];
const WIFI = ['Included in rent', 'Available but paid separately', 'Not available'];
const GARBAGE = ['Included', 'Not included', 'Paid separately'];
const BACKUP = ['None', 'Solar', 'Generator'];
const BATH = ['Ensuite (own)', 'Shared', 'Communal'];
const KITCHEN = ['Own', 'Shared', 'None — meals only'];
const GENDER = ['Male only', 'Female only', 'Mixed'];
const VISITORS = ['Yes', 'Daytime only', 'No'];
const ROADS = ['Tarmac', 'Murram', 'Footpath only'];
const SECURITY = ['Guard', 'Gate lock', 'CCTV'];
const FLOORS = ['Ground', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
const AVAIL_OPTIONS = ['Available now', 'Within a week', 'Within a month', 'Next semester (January)', 'Pick a date…'];
const REPORT_REASONS = ['Fake or scam listing', 'Unit is already taken', 'Wrong price or info', 'Poster is not the landlord', 'Misleading photos', 'Other'];
const GATE = { lat: -0.3410, lng: 37.6420 };
const BOOST = { amountKes: 200, days: 7 };

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kes = n => 'KES ' + Number(n || 0).toLocaleString('en-KE');
const shortK = n => { const v = n / 1000; return (v >= 10 ? Math.round(v) : v.toFixed(1).replace('.0', '')) + 'k'; };
const perShort = p => !p ? 'mo' : p.startsWith('Per Month') ? 'mo' : p.startsWith('Per Semester') ? 'sem' : 'yr';

function distMeters(a, b) {
  const R = 6371000, dLa = (b.lat - a.lat) * Math.PI / 180, dLo = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const walkMinutes = (lat, lng) => (lat == null || lng == null) ? null : Math.max(1, Math.round(distMeters(GATE, { lat, lng }) / 80));

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.max(1, (Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 86400 * 7) return Math.floor(s / 86400) + 'd ago';
  return new Date(ts).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}
function fmtDate(ts) { return new Date(ts).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }); }
function fmtAvail(v) { if (!v) return 'Now'; return /^\d{4}-\d{2}-\d{2}/.test(v) ? fmtDate(v) : v; }
const parseSecurity = s => { try { const v = JSON.parse(s || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };

function amenityTags(l) {
  const t = [];
  if (l.water === 'Included in rent') t.push('Water incl.');
  if (l.wifi === 'Included in rent') t.push('WiFi');
  if (l.elec === 'Included in rent') t.push('Power incl.');
  if (l.bath === 'Ensuite (own)') t.push('Ensuite');
  if (l.kitchen === 'Own') t.push('Own kitchen');
  if (l.backup && l.backup !== 'None') t.push(l.backup + ' backup');
  if (parseSecurity(l.security).includes('Guard')) t.push('Guard');
  return t.slice(0, 3).map(x => `<span class="mini-tag">${esc(x)}</span>`).join('');
}

function waLink(num, text) {
  let n = String(num || '').replace(/[\s+-]/g, '');
  if (n.startsWith('0')) n = '254' + n.slice(1);
  return 'https://wa.me/' + n + (text ? '?text=' + encodeURIComponent(text) : '');
}

// ---------- icons (stroke) ----------
function ic(name, cls) {
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    pin: '<path d="M12 21s-7-5.9-7-11a7 7 0 1 1 14 0c0 5.1-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/>',
    chat: '<path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.6 0-3-.4-4.3-1L3 21l1.6-4.2A8.5 8.5 0 1 1 21 12z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6"/>',
    heart: '<path d="M12 20.5C7 16.5 3.5 13.3 3.5 9.6 3.5 7 5.5 5 8 5c1.6 0 3.1.8 4 2.1C12.9 5.8 14.4 5 16 5c2.5 0 4.5 2 4.5 4.6 0 3.7-3.5 6.9-8.5 10.9z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    bolt: '<path d="M13 2 4.5 13.5H11L9.5 22 18 10.5h-6.5L13 2z"/>',
    shield: '<path d="M12 2.5 20 6v6c0 5-3.4 8.2-8 9.5C7.4 20.2 4 17 4 12V6l8-3.5z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>',
    back: '<path d="M15 19 8 12l7-7"/>',
    phone: '<path d="M5 3h4l1.5 5L8 9.7a13 13 0 0 0 6.3 6.3l1.7-2.5 5 1.5v4a2 2 0 0 1-2.2 2A17.9 17.9 0 0 1 3 5.2 2 2 0 0 1 5 3z"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.5"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/>',
    check: '<path d="m4.5 12.5 5 5L19.5 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1"/>',
    out: '<path d="M9 4H5v16h4"/><path d="M14 8l4 4-4 4M18 12H8"/>',
    chev: '<path d="m9 6 6 6-6 6"/>',
    photo: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4.5 17.5 5-5 3.5 3.5 3-3 3.5 3.5"/>',
    doc: '<path d="M6 2.5h8L19 8v13.5H6z"/><path d="M13.5 2.5V8H19"/>',
    wa: '<path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3z"/><path d="M8.8 9.2c.6 2.7 3.3 5.3 6 6l1.3-1.5-2-1.2-1 .7a6.4 6.4 0 0 1-2.3-2.3l.7-1-1.2-2-1.5 1.3z"/>',
    trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
    edit: '<path d="M4 20h4L20 8l-4-4L4 16v4z"/>',
    send: '<path d="M21 3 10.5 13.5M21 3l-7 18-3.5-7.5L3 10l18-7z"/>',
    star: '<path d="m12 3 2.7 5.8 6.3.8-4.6 4.4 1.2 6.2-5.6-3.1L6.4 20l1.2-6.2L3 9.6l6.3-.8L12 3z"/>',
  };
  // width/height attrs = safe intrinsic default (18px); CSS rules override per context.
  // Without these, an SVG with only a viewBox blows up to fill flex/grid containers.
  return `<svg class="${cls || ''}" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}

// ---------- toast / modal / lightbox ----------
let toastTimer;
function toast(msg, isErr) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (isErr ? ' err' : '');
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}
function modal(html, onOpen) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-ov"><div class="modal">${html}</div></div>`;
  const ov = root.firstElementChild;
  ov.addEventListener('click', e => { if (e.target === ov) closeModal(); });
  root.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
  if (onOpen) onOpen(root.querySelector('.modal'));
  return () => closeModal();
}
function closeModal() { document.getElementById('modal-root').innerHTML = ''; }
function confirmDlg(title, text, okLabel, cb, danger) {
  modal(`<h3>${esc(title)}</h3><p class="auth-sub">${esc(text)}</p>
    <div style="display:flex;gap:9px;margin-top:18px">
      <button class="btn btn-outline" style="flex:1" data-close>Cancel</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" style="flex:1" id="cf-ok">${esc(okLabel || 'Yes')}</button>
    </div>`, m => m.querySelector('#cf-ok').addEventListener('click', () => { closeModal(); cb(); }));
}
// report modal shared by listing page + chat thread
function openReport(listingId) {
  if (!state.user) { location.hash = '#/login'; return; }
  modal(`<h3>Report this listing</h3>
    <label class="lbl">Reason</label>
    <select class="inp" id="rp-reason">${REPORT_REASONS.map(x => `<option>${esc(x)}</option>`).join('')}</select>
    <label class="lbl">Details (optional)</label>
    <textarea class="inp" id="rp-note" placeholder="Tell us what is wrong…"></textarea>
    <button class="btn btn-primary btn-block" style="margin-top:14px" id="rp-send">Send report</button>`,
    m => m.querySelector('#rp-send').onclick = async () => {
      const res = await api('/listings/' + listingId + '/report', { body: { reason: m.querySelector('#rp-reason').value, note: m.querySelector('#rp-note').value } });
      closeModal();
      toast(res.ok ? 'Report sent. Our team will review it.' : res.error, !res.ok);
    });
}

// one-time scam warning for students (port of the prototype caution modal)
function maybeStudentCaution() {
  let acked = false;
  try { acked = !!localStorage.getItem('ch_caution'); } catch (e) { return; }
  if (acked || !state.user || state.user.role !== 'STUDENT') return;
  modal(`<div style="text-align:center;padding:4px 2px">
    <div style="width:60px;height:60px;margin:0 auto 12px;border-radius:18px;background:var(--ember-mist);color:var(--ember-deep);display:grid;place-items:center">${ic('shield')}</div>
    <h3 style="font-family:var(--disp);font-size:19px">Before you pay anyone</h3>
    <p style="font-size:13.5px;color:var(--ink2);line-height:1.55;margin:8px 0 12px">ChukaHomes never handles your rent. <b>Never send money — M-Pesa or cash — before you have physically visited the house and met the landlord or caretaker in person.</b></p>
    <div class="notice notice-r" style="text-align:left;margin-bottom:14px">${ic('flag')}<span><b>Scam signs:</b> a "viewing fee", refusing to meet in person, or pressure to pay before you have seen the room.</span></div>
    <button class="btn btn-green btn-block" id="ca-ok">I understand — show me rooms</button>
  </div>`, m => m.querySelector('#ca-ok').onclick = () => {
    try { localStorage.setItem('ch_caution', '1'); } catch (e) {}
    closeModal();
  });
}

function lightbox(src) {
  const lb = document.getElementById('lightbox');
  document.getElementById('lightbox-img').src = src;
  lb.hidden = false;
  lb.onclick = () => { lb.hidden = true; };
}

// ---------- listing card ----------
function listingCard(l) {
  const boosted = l.boostedUntil && l.boostedUntil > Date.now();
  const verified = l.ownerVerified === 'APPROVED';
  const locTxt = [esc(l.area), l.landmark ? esc(l.landmark) : ''].filter(Boolean).join(' · ');
  return `<a class="card" href="#/listing/${l.id}">
    <div class="cph">${l.thumb ? `<img loading="lazy" src="${l.thumb}" alt="${esc(l.title)}">` : `<div class="cph-empty">${ic('photo')}</div>`}
      <span class="wm"></span>
      ${boosted ? `<span class="badge-boost">${ic('bolt')}BOOSTED</span>` : ''}
    </div>
    <div class="cbody">
      <div class="cprice">${kes(l.rent)}<span>/${perShort(l.period)}</span></div>
      <div class="ctitle">${esc(l.title)}</div>
      <div class="cmeta">${ic('pin')}<span>${locTxt}</span></div>
      <div class="ctags">${amenityTags(l)}</div>
      <div class="cfoot"><span>${verified ? `<span class="vbadge">${ic('shield')}Verified</span>` : ''}</span><span>${l.views || 0} views · ${timeAgo(l.createdAt)}</span></div>
    </div></a>`;
}
const skeletonGrid = n => `<div class="grid">${Array(n).fill('<div><div class="skel" style="aspect-ratio:4/3;border-radius:16px 16px 0 0"></div><div class="skel" style="height:110px;border-radius:0 0 16px 16px;margin-top:-1px"></div></div>').join('')}</div>`;
const emptyBox = (title, text) => `<div class="empty">${ic('pin')}<h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;
