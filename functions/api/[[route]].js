// ============================================================
// ChukaHomes API — Cloudflare Pages Functions (catch-all)
// File: functions/api/[[route]].js
// Binding required: D1 database bound as `DB`
// ============================================================

const DAY = 86400000;

const json = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});
const ok = (o = {}) => json({ ok: true, ...o });
const bad = (error, s = 400) => json({ ok: false, error }, s);

// ---------- helpers ----------
const S = v => String(v == null ? '' : v).trim();
const N = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const bool = v => (v === true || v === 'true' || v === 1 || v === 'Yes') ? 1 : 0;

function b64e(buf) { let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }
function rand(len) {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return b64e(a).replace(/[^a-zA-Z0-9]/g, '').slice(0, len);
}
async function hashPw(pw, salt) {
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, km, 256);
  return b64e(bits);
}

const pubUser = u => u ? {
  id: u.id, username: u.username, name: u.name, role: u.role, phone: u.phone, regNo: u.reg_no,
  verifyStatus: u.verify_status, verifyNote: u.verify_note, suspended: !!u.suspended, createdAt: u.created_at
} : null;

async function getSession(request, env) {
  const h = request.headers.get('Authorization') || '';
  const t = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!t) return null;
  return await env.DB.prepare(
    'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?'
  ).bind(t, Date.now()).first();
}
async function newSession(env, uid) {
  const t = rand(40);
  await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(t, uid, Date.now() + 30 * DAY).run();
  return t;
}

const isImg = (d, max = 1200000) => typeof d === 'string' && d.startsWith('data:image/') && d.length < max;

// ---------- auto schema (runs once per isolate; makes deployment zero-config) ----------
const SCHEMA = String.raw`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pass_hash TEXT NOT NULL,
  pass_hint TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'STUDENT',
  phone TEXT NOT NULL DEFAULT '',
  reg_no TEXT NOT NULL DEFAULT '',
  verify_status TEXT NOT NULL DEFAULT 'NONE',
  doc_id TEXT NOT NULL DEFAULT '',
  doc_own TEXT NOT NULL DEFAULT '',
  verify_note TEXT NOT NULL DEFAULT '',
  suspended INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ownerId INTEGER NOT NULL,
  title TEXT NOT NULL,
  ptype TEXT NOT NULL DEFAULT 'Bedsitter',
  units INTEGER NOT NULL DEFAULT 1,
  furnishing TEXT NOT NULL DEFAULT 'Unfurnished',
  floor TEXT NOT NULL DEFAULT 'Ground',
  area TEXT NOT NULL DEFAULT '',
  landmark TEXT NOT NULL DEFAULT '',
  lat REAL,
  lng REAL,
  walkGate INTEGER,
  walkStage INTEGER,
  road TEXT NOT NULL DEFAULT 'Tarmac',
  rent INTEGER NOT NULL,
  period TEXT NOT NULL DEFAULT 'Per Month',
  terms TEXT NOT NULL DEFAULT '',
  deposit INTEGER NOT NULL DEFAULT 0,
  fees TEXT NOT NULL DEFAULT 'None',
  negotiable INTEGER NOT NULL DEFAULT 0,
  water TEXT NOT NULL DEFAULT 'Included in rent',
  waterCost TEXT NOT NULL DEFAULT '',
  waterSched TEXT NOT NULL DEFAULT '',
  waterTank TEXT NOT NULL DEFAULT 'No',
  elec TEXT NOT NULL DEFAULT 'Own token meter',
  elecCost TEXT NOT NULL DEFAULT '',
  wifi TEXT NOT NULL DEFAULT 'Not available',
  wifiCost TEXT NOT NULL DEFAULT '',
  wifiProvider TEXT NOT NULL DEFAULT '',
  garbage TEXT NOT NULL DEFAULT 'Included',
  backup TEXT NOT NULL DEFAULT 'None',
  bath TEXT NOT NULL DEFAULT 'Shared',
  kitchen TEXT NOT NULL DEFAULT 'Shared',
  cooking TEXT NOT NULL DEFAULT 'Yes',
  balcony TEXT NOT NULL DEFAULT 'No',
  tile TEXT NOT NULL DEFAULT 'Tiled',
  ceiling TEXT NOT NULL DEFAULT 'Yes',
  wardrobe TEXT NOT NULL DEFAULT 'No',
  bed TEXT NOT NULL DEFAULT 'No',
  desk TEXT NOT NULL DEFAULT 'No',
  security TEXT NOT NULL DEFAULT '[]',
  gender TEXT NOT NULL DEFAULT 'Mixed',
  curfewOn TEXT NOT NULL DEFAULT 'No',
  curfewTime TEXT NOT NULL DEFAULT '',
  visitors TEXT NOT NULL DEFAULT 'Daytime only',
  alcohol TEXT NOT NULL DEFAULT 'No',
  availableFrom TEXT NOT NULL DEFAULT '',
  contactPhone TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  views INTEGER NOT NULL DEFAULT 0,
  boostedUntil INTEGER,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_listings_owner ON listings(ownerId);
CREATE INDEX IF NOT EXISTS idx_listings_created ON listings(createdAt);
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listingId INTEGER NOT NULL,
  url TEXT NOT NULL,
  idx INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_photos_listing ON photos(listingId);
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listingId INTEGER NOT NULL,
  studentId INTEGER NOT NULL,
  landlordId INTEGER NOT NULL,
  lastMsg TEXT NOT NULL DEFAULT '',
  lastAt INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL,
  UNIQUE(listingId, studentId)
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  convId INTEGER NOT NULL,
  senderId INTEGER NOT NULL,
  text TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  readAt INTEGER
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(convId, id);
CREATE TABLE IF NOT EXISTS favorites (
  user_id INTEGER NOT NULL,
  listing_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, listing_id)
);
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listingId INTEGER NOT NULL,
  reporterId INTEGER,
  reason TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'OPEN',
  createdAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS boosts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listingId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  mpesaCode TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PENDING',
  until INTEGER,
  createdAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);
INSERT OR IGNORE INTO settings (key, value) VALUES ('paybill_number','0143374333');
INSERT OR IGNORE INTO settings (key, value) VALUES ('paybill_name','Isaac Bridget');
INSERT OR IGNORE INTO settings (key, value) VALUES ('gmaps_key','');
`;

let schemaReady = null;
async function ensureSchema(env) {
  if (!schemaReady) {
    schemaReady = (async () => {
      try {
        const r = await env.DB.prepare("SELECT value FROM settings WHERE key = 'schema_ver'").first();
        if (r && r.value === '1') return;
      } catch (e) { /* tables missing — create them */ }
      const stmts = SCHEMA.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')
        .split(';').map(s => s.trim()).filter(Boolean);
      for (const st of stmts) await env.DB.prepare(st).run();
      await env.DB.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('schema_ver','1')").run();
    })().catch(e => { schemaReady = null; throw e; });
  }
  await schemaReady;
}

// ---------- listing field mapping (camelCase = D1 columns) ----------
const LSTR = ['title', 'ptype', 'furnishing', 'floor', 'area', 'landmark', 'road', 'period', 'terms',
  'water', 'waterCost', 'waterSched', 'elec', 'elecCost', 'wifiCost', 'wifiProvider', 'garbage', 'backup',
  'bath', 'kitchen', 'cooking', 'gender', 'curfewTime', 'visitors', 'alcohol', 'availableFrom', 'contactPhone'];
const LYNN = ['waterTank', 'negotiable', 'balcony', 'tile', 'ceiling', 'wardrobe', 'bed', 'desk', 'curfewOn'];
const LNUM = ['units', 'walkGate', 'walkStage', 'rent', 'deposit'];
// wifi is a string option in this schema; lat/lng handled separately.

function listingCols(b, base) {
  const out = {};
  for (const k of LSTR) if (b[k] !== undefined) out[k] = S(b[k]);
  for (const k of LYNN) if (b[k] !== undefined) out[k] = S(b[k]); // stored as Yes/No text
  for (const k of LNUM) if (b[k] !== undefined) out[k] = Math.max(0, N(b[k]));
  if (b.wifi !== undefined) out.wifi = S(b.wifi);
  if (b.lat !== undefined) out.lat = b.lat === '' || b.lat === null ? null : N(b.lat);
  if (b.lng !== undefined) out.lng = b.lng === '' || b.lng === null ? null : N(b.lng);
  if (b.security !== undefined) {
    out.security = JSON.stringify(Array.isArray(b.security) ? b.security.map(S).filter(Boolean) : []);
  }
  if (out.title !== undefined && out.title.length < 4) return { error: 'Title must be at least 4 characters' };
  if (out.rent !== undefined && out.rent < 1) return { error: 'Rent is required' };
  if (out.area !== undefined && !out.area) return { error: 'Area is required' };
  void base;
  return { v: out };
}

async function attachThumbs(env, rows, keyField = 'id', outField = 'thumb') {
  if (!rows.length) return rows;
  const ids = [...new Set(rows.map(r => r[keyField]))];
  const qs = ids.map(() => '?').join(',');
  const res = await env.DB.prepare(
    `SELECT p.listingId, p.url FROM photos p
     JOIN (SELECT listingId, MIN(idx) AS mIdx FROM photos WHERE listingId IN (${qs}) GROUP BY listingId) t
     ON p.listingId = t.listingId AND p.idx = t.mIdx`).bind(...ids).all();
  const m = {};
  (res.results || []).forEach(p => { m[p.listingId] = p.url; });
  rows.forEach(r => { r[outField] = m[r[keyField]] || ''; });
  return rows;
}

const CARD_COLS = `l.id, l.title, l.ptype, l.units, l.rent, l.period, l.area, l.landmark, l.walkGate, l.lat, l.lng,
  l.furnishing, l.water, l.elec, l.wifi, l.bath, l.kitchen, l.backup, l.garbage, l.gender, l.availableFrom,
  l.status, l.views, l.boostedUntil, l.createdAt, o.verify_status AS ownerVerified`;

function like(v) { return '%' + S(v).replace(/[%_]/g, ' ') + '%'; }

async function queryListings(env, url, opts = {}) {
  const w = ["l.status != 'REMOVED'", 'o.suspended = 0'];
  const p = [];
  const add = (cond, ...vals) => { w.push(cond); p.push(...vals); };
  const q = url.searchParams;

  if (opts.mine && opts.user) { w.length = 0; w.push('l.ownerId = ?'); p.push(opts.user.id); }
  const s = S(q.get('q'));
  if (s) add('(l.title LIKE ? OR l.area LIKE ? OR l.landmark LIKE ?)', like(s), like(s), like(s));
  if (q.get('area')) add('l.area = ?', S(q.get('area')));
  if (q.get('ptype')) add('l.ptype = ?', S(q.get('ptype')));
  if (q.get('furnishing')) add('l.furnishing = ?', S(q.get('furnishing')));
  const min = N(q.get('min')), max = N(q.get('max'));
  if (min > 0) add('l.rent >= ?', min);
  if (max > 0) add('l.rent <= ?', max);
  const g = S(q.get('gender'));
  if (g && g !== 'Mixed') add("l.gender IN ('Mixed', ?)", g);
  if (opts.mine && S(q.get('status'))) add('l.status = ?', S(q.get('status')));
  for (const a of S(q.get('amenities')).split(',')) {
    if (a === 'water') add("l.water = 'Included in rent'");
    else if (a === 'elec') add("l.elec = 'Included in rent'");
    else if (a === 'wifi') add("l.wifi = 'Included in rent'");
    else if (a === 'ensuite') add("l.bath = 'Ensuite (own)'");
    else if (a === 'kitchen') add("l.kitchen = 'Own'");
    else if (a === 'guard') add("l.security LIKE '%Guard%'");
    else if (a === 'backup') add("l.backup != 'None'");
  }
  if (opts.exclude) add('l.id != ?', opts.exclude);
  if (opts.similarTo) {
    const base = await env.DB.prepare('SELECT area, ptype FROM listings WHERE id = ?').bind(opts.similarTo).first();
    if (base) add('(l.area = ? OR l.ptype = ?)', base.area, base.ptype);
  }

  const sort = S(q.get('sort')) || 'new';
  const boostCase = 'CASE WHEN l.boostedUntil IS NOT NULL AND l.boostedUntil > ? THEN 0 ELSE 1 END';
  const ob = []; // order-by binds
  let order;
  if (sort === 'priceAsc') { order = `${boostCase}, l.rent ASC`; }
  else if (sort === 'priceDesc') { order = `${boostCase}, l.rent DESC`; }
  else if (sort === 'walk') { order = `${boostCase}, (CASE WHEN l.walkGate IS NULL THEN 9999 ELSE l.walkGate END) ASC`; }
  else { order = `${boostCase}, l.createdAt DESC`; }
  ob.push(Date.now());

  const lim = Math.min(100, Math.max(1, N(q.get('limit')) || 60));
  const sql = `SELECT ${CARD_COLS} FROM listings l JOIN users o ON o.id = l.ownerId
    WHERE ${w.join(' AND ')} ORDER BY ${order} LIMIT ?`;
  const rows = (await env.DB.prepare(sql).bind(...p, ...ob, lim).all()).results || [];
  await attachThumbs(env, rows);
  return rows;
}

// ---------- main entry ----------
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const seg = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const method = request.method;
  const json_ = () => request.json().catch(() => ({}));

  try {
    if (!env.DB) return bad('Database not connected. Add the D1 binding named "DB" in Cloudflare Pages settings.', 500);
    await ensureSchema(env);
    const user = await getSession(request, env);
    const need = (roles) => {
      if (!user) throw Object.assign(new Error('Please sign in first'), { status: 401 });
      if (roles && !roles.includes(user.role)) throw Object.assign(new Error('You are not allowed to do that'), { status: 403 });
      return user;
    };
    const p0 = seg[0] || '';

    // ============ SETUP (first admin) ============
    if (p0 === 'setup') {
      const admins = await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'ADMIN'").first();
      if (method === 'GET') return ok({ available: !admins.n });
      if (admins.n) return bad('Setup is closed — an admin already exists.', 403);
      const b = await json_();
      const username = S(b.username).toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(username)) return bad('Username must be 3–20 letters, numbers or underscore');
      if (S(b.password).length < 6) return bad('Password must be at least 6 characters');
      if (b.password !== b.confirm) return bad('Passwords do not match');
      if (!S(b.hint)) return bad('Password hint is required');
      const dup = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
      if (dup) return bad('That username is taken');
      const salt = rand(16);
      const hash = await hashPw(S(b.password), salt);
      const r = await env.DB.prepare(
        "INSERT INTO users (username, pass_hash, pass_hint, name, role, phone, created_at) VALUES (?,?,?,?,?,?,?)")
        .bind(username, salt + '$' + hash, S(b.hint), S(b.name) || 'Admin', 'ADMIN', S(b.phone), Date.now()).run();
      const token = await newSession(env, r.meta.last_row_id);
      const u = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(r.meta.last_row_id).first();
      return ok({ token, user: pubUser(u) });
    }

    // ============ AUTH ============
    if (p0 === 'register' && method === 'POST') {
      const b = await json_();
      const username = S(b.username).toLowerCase();
      const password = S(b.password);
      const role = b.role === 'LANDLORD' ? 'LANDLORD' : 'STUDENT';
      if (!/^[a-z0-9_]{3,20}$/.test(username)) return bad('Username must be 3–20 letters, numbers or underscore');
      if (password.length < 6) return bad('Password must be at least 6 characters');
      if (password !== S(b.confirm)) return bad('Passwords do not match');
      if (!S(b.hint)) return bad('Password hint is required (it helps you recover your account)');
      if (S(b.hint).toLowerCase() === password.toLowerCase()) return bad('Hint must be different from the password');
      if (!S(b.name)) return bad('Your name is required');
      const phone = S(b.phone).replace(/[\s-]/g, '');
      if (!/^\+?\d{9,15}$/.test(phone)) return bad('Enter a valid phone / WhatsApp number, e.g. 254712345678');
      const dup = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
      if (dup) return bad('That username is taken');
      const salt = rand(16);
      const hash = await hashPw(password, salt);
      const r = await env.DB.prepare(
        'INSERT INTO users (username, pass_hash, pass_hint, name, role, phone, reg_no, created_at) VALUES (?,?,?,?,?,?,?,?)')
        .bind(username, salt + '$' + hash, S(b.hint), S(b.name), role, phone, role === 'STUDENT' ? S(b.regNo) : '', Date.now()).run();
      const token = await newSession(env, r.meta.last_row_id);
      const u = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(r.meta.last_row_id).first();
      return ok({ token, user: pubUser(u) });
    }

    if (p0 === 'login' && method === 'POST') {
      const b = await json_();
      const u = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(S(b.username).toLowerCase()).first();
      if (!u) return bad('Wrong username or password', 401);
      const [salt, hash] = String(u.pass_hash).split('$');
      const test = await hashPw(S(b.password), salt);
      if (test !== hash) return bad('Wrong username or password', 401);
      if (u.suspended) return bad('This account has been suspended. Contact support.', 403);
      const token = await newSession(env, u.id);
      return ok({ token, user: pubUser(u) });
    }

    if (p0 === 'logout' && method === 'POST') {
      const h = request.headers.get('Authorization') || '';
      if (h.startsWith('Bearer ')) {
        await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(h.slice(7).trim()).run();
      }
      return ok();
    }

    if (p0 === 'hint' && method === 'GET' && seg[1]) {
      const u = await env.DB.prepare('SELECT pass_hint FROM users WHERE username = ?').bind(S(seg[1]).toLowerCase()).first();
      return ok({ hint: u ? u.pass_hint : '' });
    }

    if (p0 === 'me' && method === 'GET') {
      return ok({ user: pubUser(user) });
    }

    if (p0 === 'me' && method === 'PUT') {
      const u = need();
      const b = await json_();
      const name = b.name !== undefined ? S(b.name) : u.name;
      const phone = b.phone !== undefined ? S(b.phone).replace(/[\s-]/g, '') : u.phone;
      const regNo = b.regNo !== undefined ? S(b.regNo) : u.reg_no;
      if (phone && !/^\+?\d{9,15}$/.test(phone)) return bad('Enter a valid phone / WhatsApp number');
      if (!name) return bad('Name is required');
      await env.DB.prepare('UPDATE users SET name = ?, phone = ?, reg_no = ? WHERE id = ?').bind(name, phone, regNo, u.id).run();
      const nu = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(u.id).first();
      return ok({ user: pubUser(nu) });
    }

    // ============ LANDLORD VERIFICATION ============
    if (p0 === 'verify' && method === 'POST') {
      const u = need(['LANDLORD']);
      const b = await json_();
      if (!isImg(b.docId) || !isImg(b.docOwn)) return bad('Upload both your ID photo and your ownership document photo');
      await env.DB.prepare("UPDATE users SET doc_id = ?, doc_own = ?, verify_status = 'PENDING', verify_note = '' WHERE id = ?")
        .bind(b.docId, b.docOwn, u.id).run();
      return ok({ verifyStatus: 'PENDING' });
    }

    // ============ SETTINGS ============
    if (p0 === 'settings' && method === 'GET') {
      const rows = (await env.DB.prepare('SELECT key, value FROM settings').all()).results || [];
      const st = {};
      rows.forEach(r => { st[r.key] = r.value; });
      return ok({ settings: st });
    }
    if (p0 === 'settings' && method === 'PUT') {
      const u = need(['ADMIN']);
      const b = await json_();
      const allowed = ['paybill_number', 'paybill_name', 'gmaps_key'];
      for (const k of allowed) if (b[k] !== undefined) {
        await env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
          .bind(k, S(b[k])).run();
      }
      return ok();
    }

    // ============ LISTINGS ============
    if (p0 === 'listings') {
      // detail
      if (seg[1] && !seg[2] && method === 'GET') {
        const id = N(seg[1]);
        const l = await env.DB.prepare(
          `SELECT l.*, o.name AS ownerName, o.username AS ownerUsername, o.phone AS ownerPhone,
                  o.verify_status AS ownerVerify, o.created_at AS ownerSince
           FROM listings l JOIN users o ON o.id = l.ownerId WHERE l.id = ?`).bind(id).first();
        if (!l) return bad('Listing not found', 404);
        const isOwner = user && (user.id === l.ownerId || user.role === 'ADMIN');
        if (l.status === 'REMOVED' && !isOwner) return bad('Listing not found', 404);
        const photos = (await env.DB.prepare('SELECT id, url FROM photos WHERE listingId = ? ORDER BY idx').bind(id).all()).results || [];
        const similar = await queryListings(env, new URL('http://x/?limit=4'), { similarTo: id, exclude: id });
        const pub = { ...l };
        if (!user) pub.ownerPhone = ''; // contact details require sign-in
        return ok({ listing: pub, photos, similar, isOwner: !!isOwner });
      }
      // create
      if (!seg[1] && method === 'POST') {
        const u = need(['LANDLORD']);
        const b = await json_();
        const { v, error } = listingCols(b);
        if (error) return bad(error);
        if (!v.rent || v.rent < 1) return bad('Rent is required');
        if (!v.title || v.title.length < 4) return bad('Title must be at least 4 characters');
        if (!v.area) return bad('Choose the area');
        const photos = Array.isArray(b.photos) ? b.photos.filter(x => isImg(x)) : [];
        if (photos.length < 3) return bad('Add at least 3 photos');
        if (photos.length > 8) return bad('Maximum 8 photos');
        const cnt = (await env.DB.prepare("SELECT COUNT(*) AS n FROM listings WHERE ownerId = ? AND status != 'REMOVED'").bind(u.id).first()).n;
        const limit = u.verify_status === 'APPROVED' ? 5 : 2;
        if (cnt >= limit) return bad(u.verify_status === 'APPROVED'
          ? 'You have reached the 5-listing limit. Contact support to add more.'
          : 'Free plan: 2 listings. Get verified in your Profile to post up to 5.');
        const now = Date.now();
        const keys = Object.keys(v);
        const r = await env.DB.prepare(
          `INSERT INTO listings (ownerId, ${keys.join(', ')}, createdAt, updatedAt) VALUES (${Array(keys.length + 3).fill('?').join(', ')})`)
          .bind(u.id, ...keys.map(k => v[k]), now, now).run();
        const lid = r.meta.last_row_id;
        await env.DB.batch(photos.map((url, i) =>
          env.DB.prepare('INSERT INTO photos (listingId, url, idx) VALUES (?, ?, ?)').bind(lid, url, i)));
        return ok({ id: lid });
      }
      // update
      if (seg[1] && !seg[2] && method === 'PUT') {
        const u = need(['LANDLORD']);
        const id = N(seg[1]);
        const own = await env.DB.prepare('SELECT * FROM listings WHERE id = ?').bind(id).first();
        if (!own || own.ownerId !== u.id) return bad('Listing not found', 404);
        const b = await json_();
        const { v, error } = listingCols(b, own);
        if (error) return bad(error);
        const keys = Object.keys(v);
        if (keys.length) {
          await env.DB.prepare(`UPDATE listings SET ${keys.map(k => k + ' = ?').join(', ')}, updatedAt = ? WHERE id = ?`)
            .bind(...keys.map(k => v[k]), Date.now(), id).run();
        }
        if (Array.isArray(b.photos)) {
          const photos = b.photos.filter(x => isImg(x));
          if (photos.length < 3) return bad('Keep at least 3 photos');
          if (photos.length > 8) return bad('Maximum 8 photos');
          await env.DB.prepare('DELETE FROM photos WHERE listingId = ?').bind(id).run();
          await env.DB.batch(photos.map((url, i) =>
            env.DB.prepare('INSERT INTO photos (listingId, url, idx) VALUES (?, ?, ?)').bind(id, url, i)));
        }
        return ok({ id });
      }
      // delete (soft)
      if (seg[1] && !seg[2] && method === 'DELETE') {
        const u = need(['LANDLORD', 'ADMIN']);
        const id = N(seg[1]);
        const own = await env.DB.prepare('SELECT * FROM listings WHERE id = ?').bind(id).first();
        if (!own) return bad('Listing not found', 404);
        if (user.role !== 'ADMIN' && own.ownerId !== u.id) return bad('Not your listing', 403);
        await env.DB.prepare("UPDATE listings SET status = 'REMOVED', updatedAt = ? WHERE id = ?").bind(Date.now(), id).run();
        return ok();
      }
      // status toggle
      if (seg[1] && seg[2] === 'status' && method === 'POST') {
        const u = need(['LANDLORD']);
        const id = N(seg[1]);
        const own = await env.DB.prepare('SELECT * FROM listings WHERE id = ?').bind(id).first();
        if (!own || own.ownerId !== u.id) return bad('Listing not found', 404);
        const b = await json_();
        const st = b.status === 'TAKEN' ? 'TAKEN' : 'AVAILABLE';
        await env.DB.prepare('UPDATE listings SET status = ?, updatedAt = ? WHERE id = ?').bind(st, Date.now(), id).run();
        return ok({ status: st });
      }
      // view counter
      if (seg[1] && seg[2] === 'view' && method === 'POST') {
        await env.DB.prepare('UPDATE listings SET views = views + 1 WHERE id = ?').bind(N(seg[1])).run();
        return ok();
      }
      // report
      if (seg[1] && seg[2] === 'report' && method === 'POST') {
        const u = need();
        const b = await json_();
        if (!S(b.reason)) return bad('Choose a reason');
        await env.DB.prepare('INSERT INTO reports (listingId, reporterId, reason, note, createdAt) VALUES (?,?,?,?,?)')
          .bind(N(seg[1]), u.id, S(b.reason), S(b.note), Date.now()).run();
        return ok();
      }
      // boost request
      if (seg[1] && seg[2] === 'boost' && method === 'POST') {
        const u = need(['LANDLORD']);
        const id = N(seg[1]);
        const own = await env.DB.prepare('SELECT * FROM listings WHERE id = ?').bind(id).first();
        if (!own || own.ownerId !== u.id) return bad('Listing not found', 404);
        if (own.boostedUntil && own.boostedUntil > Date.now()) return bad('This listing is already boosted');
        const pend = await env.DB.prepare("SELECT id FROM boosts WHERE listingId = ? AND status = 'PENDING'").bind(id).first();
        if (pend) return bad('You already have a boost awaiting confirmation');
        const b = await json_();
        await env.DB.prepare('INSERT INTO boosts (listingId, userId, mpesaCode, createdAt) VALUES (?,?,?,?)')
          .bind(id, u.id, S(b.mpesaCode), Date.now()).run();
        return ok();
      }
      // browse/search
      if (!seg[1] && method === 'GET') {
        const rows = await queryListings(env, url, {});
        return ok({ items: rows });
      }
    }

    // ============ MY (landlord) ============
    if (p0 === 'my') {
      const u = need();
      if (seg[1] === 'listings' && method === 'GET') {
        const url2 = new URL('http://x/?mine=1&limit=100');
        const rows = await queryListings(env, url2, { mine: true, user: u });
        return ok({ items: rows });
      }
      if (seg[1] === 'favorites' && method === 'GET') {
        const rows = (await env.DB.prepare(
          `SELECT ${CARD_COLS}
           FROM favorites f JOIN listings l ON l.id = f.listing_id JOIN users o ON o.id = l.ownerId
           WHERE f.user_id = ? AND l.status != 'REMOVED' ORDER BY f.created_at DESC`).bind(u.id).all()).results || [];
        await attachThumbs(env, rows);
        return ok({ items: rows });
      }
      if (seg[1] === 'boosts' && method === 'GET') {
        const rows = (await env.DB.prepare(
          `SELECT b.*, l.title FROM boosts b JOIN listings l ON l.id = b.listingId
           WHERE b.userId = ? ORDER BY b.createdAt DESC LIMIT 20`).bind(u.id).all()).results || [];
        return ok({ items: rows });
      }
    }

    // ============ FAVORITES ============
    if (p0 === 'favorites' && seg[1] && method === 'POST') {
      const u = need();
      const lid = N(seg[1]);
      const ex = await env.DB.prepare('SELECT user_id FROM favorites WHERE user_id = ? AND listing_id = ?').bind(u.id, lid).first();
      if (ex) {
        await env.DB.prepare('DELETE FROM favorites WHERE user_id = ? AND listing_id = ?').bind(u.id, lid).run();
        return ok({ on: false });
      }
      await env.DB.prepare('INSERT OR IGNORE INTO favorites (user_id, listing_id, created_at) VALUES (?,?,?)').bind(u.id, lid, Date.now()).run();
      return ok({ on: true });
    }

    // ============ CHAT ============
    if (p0 === 'convs') {
      const u = need();
      // open or create
      if (!seg[1] && method === 'POST') {
        const b = await json_();
        const lid = N(b.listingId);
        const l = await env.DB.prepare('SELECT * FROM listings WHERE id = ?').bind(lid).first();
        if (!l || l.status === 'REMOVED') return bad('Listing not found', 404);
        if (l.ownerId === u.id) return bad('This is your own listing');
        const ex = await env.DB.prepare('SELECT id FROM conversations WHERE listingId = ? AND studentId = ?').bind(lid, u.id).first();
        if (ex) return ok({ id: ex.id });
        const r = await env.DB.prepare(
          'INSERT INTO conversations (listingId, studentId, landlordId, createdAt) VALUES (?,?,?,?)')
          .bind(lid, u.id, l.ownerId, Date.now()).run();
        return ok({ id: r.meta.last_row_id });
      }
      // list
      if (!seg[1] && method === 'GET') {
        const rows = (await env.DB.prepare(
          `SELECT c.id, c.listingId, c.studentId, c.landlordId, c.lastMsg, c.lastAt,
                  st.name AS stName, lo.name AS loName, st.phone AS stPhone, lo.phone AS loPhone,
                  l.title AS ltitle, l.rent AS lrent, l.ptype AS lptype, l.status AS lstatus,
                  (SELECT COUNT(*) FROM messages m WHERE m.convId = c.id AND m.senderId != ? AND m.readAt IS NULL) AS unread
           FROM conversations c
           JOIN listings l ON l.id = c.listingId
           JOIN users st ON st.id = c.studentId
           JOIN users lo ON lo.id = c.landlordId
           WHERE c.studentId = ? OR c.landlordId = ?
           ORDER BY c.lastAt DESC LIMIT 100`).bind(u.id, u.id, u.id).all()).results || [];
        await attachThumbs(env, rows, 'listingId', 'thumb');
        rows.forEach(r => {
          r.otherName = r.studentId === u.id ? r.loName : r.stName;
          r.otherPhone = r.studentId === u.id ? r.loPhone : r.stPhone;
          r.amLandlord = r.landlordId === u.id;
          delete r.stName; delete r.loName; delete r.stPhone; delete r.loPhone;
        });
        return ok({ items: rows });
      }
      // thread info
      if (seg[1] && !seg[2] && method === 'GET') {
        const c = await env.DB.prepare('SELECT * FROM conversations WHERE id = ?').bind(N(seg[1])).first();
        if (!c || (c.studentId !== u.id && c.landlordId !== u.id && u.role !== 'ADMIN')) return bad('Conversation not found', 404);
        const l = await env.DB.prepare('SELECT id, title, rent, period, ptype, status, contactPhone FROM listings WHERE id = ?').bind(c.listingId).first();
        const other = await env.DB.prepare('SELECT id, name, username, phone, role, verify_status FROM users WHERE id = ?')
          .bind(c.studentId === u.id ? c.landlordId : c.studentId).first();
        await env.DB.prepare('UPDATE messages SET readAt = ? WHERE convId = ? AND senderId != ? AND readAt IS NULL')
          .bind(Date.now(), c.id, u.id).run();
        return ok({
          conv: { id: c.id, listingId: c.listingId },
          listing: l, other: pubUser(other)
        });
      }
      // messages
      if (seg[1] && seg[2] === 'messages') {
        const cid = N(seg[1]);
        const c = await env.DB.prepare('SELECT * FROM conversations WHERE id = ?').bind(cid).first();
        if (!c || (c.studentId !== u.id && c.landlordId !== u.id && u.role !== 'ADMIN')) return bad('Conversation not found', 404);
        if (method === 'GET') {
          const after = N(new URL(request.url).searchParams.get('after'));
          const rows = (await env.DB.prepare(
            `SELECT * FROM (SELECT * FROM messages WHERE convId = ? AND id > ? ORDER BY id DESC LIMIT 300) ORDER BY id ASC`)
            .bind(cid, after).all()).results || [];
          if (after === 0) {
            await env.DB.prepare('UPDATE messages SET readAt = ? WHERE convId = ? AND senderId != ? AND readAt IS NULL')
              .bind(Date.now(), cid, u.id).run();
          }
          return ok({ items: rows, me: u.id });
        }
        if (method === 'POST') {
          const b = await json_();
          const text = S(b.text).slice(0, 2000);
          if (!text) return bad('Type a message');
          const r = await env.DB.prepare('INSERT INTO messages (convId, senderId, text, createdAt) VALUES (?,?,?,?)')
            .bind(cid, u.id, text, Date.now()).run();
          await env.DB.prepare('UPDATE conversations SET lastAt = ?, lastMsg = ? WHERE id = ?')
            .bind(Date.now(), text.slice(0, 80), cid).run();
          return ok({ id: r.meta.last_row_id });
        }
      }
    }

    if (p0 === 'unread' && method === 'GET') {
      if (!user) return ok({ n: 0 });
      const r = await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM messages m
         JOIN conversations c ON c.id = m.convId
         WHERE (c.studentId = ? OR c.landlordId = ?) AND m.senderId != ? AND m.readAt IS NULL`)
        .bind(user.id, user.id, user.id).first();
      return ok({ n: r.n });
    }

    // ============ ADMIN ============
    if (p0 === 'admin') {
      const u = need(['ADMIN']);
      if (seg[1] === 'stats' && method === 'GET') {
        const one = async (sql, ...b) => (await env.DB.prepare(sql).bind(...b).first()).n;
        const stats = {
          users: await one('SELECT COUNT(*) AS n FROM users'),
          landlords: await one("SELECT COUNT(*) AS n FROM users WHERE role = 'LANDLORD'"),
          listings: await one("SELECT COUNT(*) AS n FROM listings WHERE status != 'REMOVED'"),
          available: await one("SELECT COUNT(*) AS n FROM listings WHERE status = 'AVAILABLE'"),
          verifications: await one("SELECT COUNT(*) AS n FROM users WHERE verify_status = 'PENDING'"),
          boosts: await one("SELECT COUNT(*) AS n FROM boosts WHERE status = 'PENDING'"),
          reports: await one("SELECT COUNT(*) AS n FROM reports WHERE status = 'OPEN'"),
          views: await one('SELECT COALESCE(SUM(views),0) AS n FROM listings')
        };
        return ok({ stats });
      }
      if (seg[1] === 'verifications' && method === 'GET') {
        const rows = (await env.DB.prepare(
          "SELECT id, username, name, phone, created_at, doc_id, doc_own FROM users WHERE verify_status = 'PENDING' ORDER BY created_at ASC")
          .all()).results || [];
        return ok({ items: rows });
      }
      if (seg[1] === 'verify' && seg[2] && method === 'POST') {
        const b = await json_();
        const st = b.decision === 'approve' ? 'APPROVED' : 'REJECTED';
        await env.DB.prepare('UPDATE users SET verify_status = ?, verify_note = ? WHERE id = ?')
          .bind(st, S(b.note), N(seg[2])).run();
        return ok({ verifyStatus: st });
      }
      if (seg[1] === 'boosts' && method === 'GET') {
        const rows = (await env.DB.prepare(
          `SELECT b.*, l.title AS ltitle, us.username AS uname FROM boosts b
           JOIN listings l ON l.id = b.listingId JOIN users us ON us.id = b.userId
           WHERE b.status = 'PENDING' ORDER BY b.createdAt ASC`).all()).results || [];
        return ok({ items: rows });
      }
      if (seg[1] === 'boosts' && seg[2] && method === 'POST') {
        const b = await json_();
        const req = await env.DB.prepare('SELECT * FROM boosts WHERE id = ?').bind(N(seg[2])).first();
        if (!req || req.status !== 'PENDING') return bad('Request not found', 404);
        if (b.decision === 'approve') {
          const until = Date.now() + 7 * DAY;
          await env.DB.batch([
            env.DB.prepare("UPDATE boosts SET status = 'ACTIVE', until = ? WHERE id = ?").bind(until, req.id),
            env.DB.prepare('UPDATE listings SET boostedUntil = ? WHERE id = ?').bind(until, req.listingId)
          ]);
        } else {
          await env.DB.prepare("UPDATE boosts SET status = 'DECLINED' WHERE id = ?").bind(req.id).run();
        }
        return ok();
      }
      if (seg[1] === 'reports' && method === 'GET') {
        const rows = (await env.DB.prepare(
          `SELECT r.*, l.title AS ltitle, l.status AS lstatus, us.username AS uname FROM reports r
           JOIN listings l ON l.id = r.listingId LEFT JOIN users us ON us.id = r.reporterId
           WHERE r.status = 'OPEN' ORDER BY r.createdAt ASC`).all()).results || [];
        return ok({ items: rows });
      }
      if (seg[1] === 'reports' && seg[2] && method === 'POST') {
        const b = await json_();
        const rep = await env.DB.prepare('SELECT * FROM reports WHERE id = ?').bind(N(seg[2])).first();
        if (!rep) return bad('Report not found', 404);
        if (b.action === 'remove') {
          await env.DB.batch([
            env.DB.prepare("UPDATE listings SET status = 'REMOVED' WHERE id = ?").bind(rep.listingId),
            env.DB.prepare("UPDATE reports SET status = 'RESOLVED' WHERE id = ?").bind(rep.id)
          ]);
        } else {
          await env.DB.prepare("UPDATE reports SET status = 'RESOLVED' WHERE id = ?").bind(rep.id).run();
        }
        return ok();
      }
      if (seg[1] === 'listings' && method === 'GET') {
        const rows = (await env.DB.prepare(
          `SELECT l.id, l.title, l.ptype, l.rent, l.area, l.status, l.views, l.createdAt, l.boostedUntil, us.username AS owner
           FROM listings l JOIN users us ON us.id = l.ownerId ORDER BY l.createdAt DESC LIMIT 200`).all()).results || [];
        return ok({ items: rows });
      }
      if (seg[1] === 'listings' && seg[2] && seg[3] === 'remove' && method === 'POST') {
        await env.DB.prepare("UPDATE listings SET status = 'REMOVED' WHERE id = ?").bind(N(seg[2])).run();
        return ok();
      }
      if (seg[1] === 'listings' && seg[2] && seg[3] === 'restore' && method === 'POST') {
        await env.DB.prepare("UPDATE listings SET status = 'AVAILABLE' WHERE id = ?").bind(N(seg[2])).run();
        return ok();
      }
      if (seg[1] === 'users' && method === 'GET') {
        const rows = (await env.DB.prepare(
          `SELECT id, username, name, role, phone, verify_status, suspended, created_at FROM users ORDER BY created_at DESC LIMIT 300`)
          .all()).results || [];
        return ok({ items: rows });
      }
      if (seg[1] === 'users' && seg[2] && seg[3] === 'suspend' && method === 'POST') {
        const b = await json_();
        await env.DB.prepare('UPDATE users SET suspended = ? WHERE id = ? AND role != ?').bind(b.on ? 1 : 0, N(seg[2]), 'ADMIN').run();
        return ok();
      }
    }

    return bad('Not found: ' + method + ' /api/' + seg.join('/'), 404);
  } catch (e) {
    const s = e.status || 500;
    if (s === 500) console.error('API error', e);
    return bad(e.message || 'Server error', s);
  }
}
