// ChukaHomes — Login / Register / Setup / Profile
function authRedirect() { location.hash = state.user && state.user.role === 'ADMIN' ? '#/admin' : '#/home'; }

async function afterAuth(res) {
  if (!res.ok) { toast(res.error, true); return; }
  token.set(res.token);
  state.user = res.user;
  buildNav();
  toast('Welcome, ' + (res.user.name || res.user.username) + '!');
  authRedirect();
}

function viewAuth(tab) {
  const v = document.getElementById('view');
  const isReg = tab === 'register';
  v.innerHTML = `<div class="auth-wrap"><div class="auth-card">
    <h1>${isReg ? 'Create your account' : 'Welcome back'}</h1>
    <p class="auth-sub">${isReg ? 'Username and password only — no email needed.' : 'Sign in to chat with landlords and save rooms.'}</p>
    <div class="seg" style="margin:16px 0">
      <button id="t-login" class="${isReg ? '' : 'on'}">Sign in</button>
      <button id="t-reg" class="${isReg ? 'on' : ''}">Create account</button>
    </div>
    <div id="auth-body">${isReg ? regForm() : loginForm()}</div>
    <div class="auth-alt">${isReg ? 'Already have an account? <a href="#/login">Sign in</a>' : 'New to ChukaHomes? <a href="#/register">Create an account</a>'}</div>
  </div></div>`;

  v.querySelector('#t-login').onclick = () => viewAuth('login');
  v.querySelector('#t-reg').onclick = () => viewAuth('register');
  wireLogin(v); wireReg(v);
}

function loginForm() {
  return `
    <label class="lbl">Username</label><input class="inp" id="li-u" autocomplete="username" placeholder="your username">
    <label class="lbl">Password</label><input class="inp" id="li-p" type="password" autocomplete="current-password" placeholder="••••••••">
    <button class="btn btn-green btn-block" id="li-go" style="margin-top:16px">Sign in</button>
    <button class="btn btn-ghost btn-block" id="li-forgot" style="margin-top:6px;font-size:13px">Forgot password?</button>`;
}

function wireLogin(v) {
  const go = v.querySelector('#li-go'); if (!go) return;
  const submit = async () => {
    go.disabled = true;
    const res = await api('/login', { body: { username: v.querySelector('#li-u').value, password: v.querySelector('#li-p').value } });
    go.disabled = false;
    afterAuth(res);
  };
  go.onclick = submit;
  v.querySelector('#li-p').addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  v.querySelector('#li-forgot').onclick = () => {
    modal(`<h3>Password hint</h3>
      <p class="hint-t">Enter your username and we will show you the hint you saved when registering.</p>
      <input class="inp" id="fg-u" placeholder="username" style="margin-top:10px">
      <div id="fg-out"></div>
      <button class="btn btn-green btn-block" style="margin-top:14px" id="fg-go">Show my hint</button>`,
      m => m.querySelector('#fg-go').onclick = async () => {
        const r = await api('/hint/' + encodeURIComponent(m.querySelector('#fg-u').value.trim().toLowerCase()));
        m.querySelector('#fg-out').innerHTML = r.ok
          ? `<div class="notice notice-g" style="margin-top:12px">${ic('shield')}<span>${r.hint ? 'Your hint: <b>' + esc(r.hint) + '</b>' : 'No account found with that username.'}</span></div>`
          : `<div class="notice notice-o" style="margin-top:12px">${ic('flag')}<span>${esc(r.error)}</span></div>`;
      });
  };
}

function regForm() {
  return `
    <label class="lbl">I am a…</label>
    <div class="seg" id="rg-role"><button type="button" class="on" data-v="STUDENT">Student</button><button type="button" data-v="LANDLORD">Landlord</button></div>
    <label class="lbl">Full name</label><input class="inp" id="rg-name" placeholder="e.g. Brian Mutua">
    <label class="lbl">WhatsApp number <span style="font-weight:500">(tenants will reach you here)</span></label>
    <input class="inp" id="rg-phone" inputmode="tel" placeholder="e.g. 254712345678">
    <div id="rg-regno-box"><label class="lbl">Admission / registration number <span style="font-weight:500">(optional)</span></label>
      <input class="inp" id="rg-regno" placeholder="e.g. CS/0451/22"></div>
    <label class="lbl">Username</label><input class="inp" id="rg-u" autocomplete="username" placeholder="3–20 letters, numbers or _">
    <label class="lbl">Password</label><input class="inp" id="rg-p" type="password" placeholder="At least 6 characters">
    <label class="lbl">Confirm password</label><input class="inp" id="rg-p2" type="password" placeholder="Type the password again">
    <label class="lbl">Password hint</label>
    <input class="inp" id="rg-hint" placeholder="e.g. my nickname + year I joined campus">
    <p class="hint-t">Shown to you if you forget your password. Don't make it the same as the password.</p>
    <button class="btn btn-green btn-block" id="rg-go" style="margin-top:18px">Create account</button>`;
}

function wireReg(v) {
  const seg = v.querySelector('#rg-role'); if (!seg) return;
  let role = 'STUDENT';
  seg.querySelectorAll('button').forEach(b => b.onclick = () => {
    seg.querySelectorAll('button').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); role = b.dataset.v;
    v.querySelector('#rg-regno-box').style.display = role === 'STUDENT' ? '' : 'none';
  });
  v.querySelector('#rg-go').onclick = async () => {
    const btn = v.querySelector('#rg-go'); btn.disabled = true;
    const res = await api('/register', {
      body: {
        role, name: v.querySelector('#rg-name').value, phone: v.querySelector('#rg-phone').value,
        regNo: v.querySelector('#rg-regno').value,
        username: v.querySelector('#rg-u').value, password: v.querySelector('#rg-p').value,
        confirm: v.querySelector('#rg-p2').value, hint: v.querySelector('#rg-hint').value,
      }
    });
    btn.disabled = false;
    afterAuth(res);
  };
}

// ---------- first-run admin setup ----------
async function viewSetup() {
  const v = document.getElementById('view');
  const r = await api('/setup');
  if (!r.ok || !r.available) { location.hash = '#/login'; return; }
  v.innerHTML = `<div class="auth-wrap"><div class="auth-card">
    <span class="pill pill-o" style="margin-bottom:10px">${ic('shield')} One-time setup</span>
    <h1>Create the admin account</h1>
    <p class="auth-sub">This page only works once — the first account created here becomes the platform Admin. Do this right after deploying.</p>
    <label class="lbl">Admin name</label><input class="inp" id="su-name" placeholder="e.g. Isaac">
    <label class="lbl">WhatsApp number</label><input class="inp" id="su-phone" inputmode="tel" placeholder="e.g. 2547…">
    <label class="lbl">Username</label><input class="inp" id="su-u" placeholder="admin">
    <label class="lbl">Password</label><input class="inp" id="su-p" type="password" placeholder="At least 6 characters">
    <label class="lbl">Confirm password</label><input class="inp" id="su-p2" type="password">
    <label class="lbl">Password hint</label><input class="inp" id="su-hint">
    <button class="btn btn-green btn-block" id="su-go" style="margin-top:18px">Create admin & sign in</button>
  </div></div>`;
  v.querySelector('#su-go').onclick = async () => {
    const btn = v.querySelector('#su-go'); btn.disabled = true;
    const res = await api('/setup', {
      body: {
        name: v.querySelector('#su-name').value, phone: v.querySelector('#su-phone').value,
        username: v.querySelector('#su-u').value, password: v.querySelector('#su-p').value,
        confirm: v.querySelector('#su-p2').value, hint: v.querySelector('#su-hint').value,
      }
    });
    btn.disabled = false;
    afterAuth(res);
  };
}

// ---------- profile ----------
async function viewProfile() {
  if (!state.user) { location.hash = '#/login'; return; }
  const v = document.getElementById('view');
  const u = state.user;
  const isLandlord = u.role === 'LANDLORD';
  v.innerHTML = `<div class="sec-h"><h2>My profile</h2></div>
    <div class="auth-card">
      <div class="owner-row">
        <div class="avatar">${esc((u.name || u.username)[0].toUpperCase())}</div>
        <div><div class="nm" style="font-weight:800;font-size:16px">${esc(u.name || u.username)}</div>
        <div class="sb">@${esc(u.username)} · ${u.role === 'ADMIN' ? 'Admin' : isLandlord ? 'Landlord' : 'Student'} · joined ${fmtDate(u.createdAt)}</div></div>
      </div>

      <label class="lbl">Full name</label><input class="inp" id="pf-name" value="${esc(u.name)}">
      <label class="lbl">WhatsApp number <span style="font-weight:500">(shown to tenants on your listings)</span></label>
      <input class="inp" id="pf-phone" inputmode="tel" value="${esc(u.phone)}">
      ${u.role === 'STUDENT' ? `<label class="lbl">Admission / registration number</label><input class="inp" id="pf-regno" value="${esc(u.regNo)}">` : ''}
      <button class="btn btn-green" id="pf-save" style="margin-top:16px">Save changes</button>
    </div>

    ${isLandlord ? landlordVerifyCard(u) : ''}

    <div class="auth-card" style="margin-top:14px">
      <h3 class="font-disp" style="font-size:16px">Quick links</h3>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
        ${isLandlord ? `<a class="btn btn-outline" href="#/mylistings">${ic('home')} My listings</a><a class="btn btn-outline" href="#/new">${ic('plus')} Post a new listing</a>` : ''}
        <a class="btn btn-outline" href="#/favorites">${ic('heart')} Favourites</a>
        <a class="btn btn-outline" href="#/privacy">${ic('shield')} Privacy & safety</a>
      </div>
      <button class="btn btn-danger btn-block" id="pf-out" style="margin-top:14px">${ic('out')} Sign out</button>
    </div>`;

  v.querySelector('#pf-save').onclick = async () => {
    const body = { name: v.querySelector('#pf-name').value, phone: v.querySelector('#pf-phone').value };
    if (u.role === 'STUDENT') body.regNo = v.querySelector('#pf-regno').value;
    const res = await api('/me', { method: 'PUT', body });
    if (res.ok) { state.user = res.user; buildNav(); toast('Profile saved'); }
    else toast(res.error, true);
  };
  v.querySelector('#pf-out').onclick = async () => {
    await api('/logout', { method: 'POST' });
    token.set(null); state.user = null; buildNav();
    location.hash = '#/home'; toast('Signed out');
  };

  wireVerifyCard(v);
}

function landlordVerifyCard(u) {
  const st = u.verifyStatus;
  const pill = st === 'APPROVED' ? '<span class="pill pill-g">Verified landlord — up to 5 listings</span>'
    : st === 'PENDING' ? '<span class="pill pill-o">Verification under review</span>'
    : st === 'REJECTED' ? `<span class="pill pill-r">Rejected${u.verifyNote ? ': ' + esc(u.verifyNote) : ''}</span>`
    : '<span class="pill pill-x">Not verified — 2 listing limit</span>';
  const needDocs = st === 'NONE' || st === 'REJECTED';
  return `<div class="auth-card" style="margin-top:14px" id="verify-card">
    <h3 class="font-disp" style="font-size:16px">Landlord verification</h3>
    <div style="margin:8px 0 4px">${pill}</div>
    <p class="hint-t" style="margin-bottom:8px">Verified landlords get a green badge on every listing and can post up to 5 listings. Upload a photo of your <b>National ID</b> and a proof of ownership (title deed, allotment letter, or a signed note from the compound owner).</p>
    ${needDocs ? `
      <div class="photo-grid" style="margin-top:10px">
        <div class="photo-cell" id="doc-id">${docCell('ID photo')}</div>
        <div class="photo-cell" id="doc-own">${docCell('Ownership doc')}</div>
      </div>
      <button class="btn btn-green btn-block" id="vf-send" style="margin-top:14px">Submit for verification</button>` : ''}
  </div>`;
}

function docCell(label) {
  return `<div class="ph-doc" style="width:100%;height:100%;display:grid;place-items:center;background:#fbfaf5;color:var(--ink2);font-size:11.5px;font-weight:700;text-align:center;cursor:pointer;padding:6px">
    ${ic('camera')}<span style="margin-top:4px">${esc(label)}</span></div>`;
}

function wireVerifyCard(v) {
  const card = v.querySelector('#verify-card'); if (!card) return;
  const docs = { docId: '', docOwn: '' };
  ['doc-id', 'doc-own'].forEach(key => {
    const cell = card.querySelector('#' + key);
    cell.onclick = async () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = async () => {
        if (!inp.files[0]) return;
        toast('Processing image…');
        try {
          docs[key === 'doc-id' ? 'docId' : 'docOwn'] = await compressTo(inp.files[0], 260, 1400, 0.78);
          cell.innerHTML = `<img src="${docs[key === 'doc-id' ? 'docId' : 'docOwn']}" style="width:100%;height:100%;object-fit:cover">`;
        } catch (e) { toast(e.message, true); }
      };
      inp.click();
    };
  });
  card.querySelector('#vf-send').onclick = async () => {
    if (!docs.docId || !docs.docOwn) { toast('Upload both photos first', true); return; }
    const btn = card.querySelector('#vf-send'); btn.disabled = true;
    const res = await api('/verify', { body: docs });
    btn.disabled = false;
    if (res.ok) { toast('Submitted! The admin will review your documents.'); state.user.verifyStatus = 'PENDING'; viewProfile(); }
    else toast(res.error, true);
  };
}
