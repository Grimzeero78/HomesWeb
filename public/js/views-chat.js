// ChukaHomes — Chats: conversation list + live thread (2.5s polling)
let chatTimer = null;

async function viewChats() {
  if (!state.user) { location.hash = '#/login'; return; }
  const v = document.getElementById('view');
  v.innerHTML = `<div class="sec-h"><h2>Chats</h2></div><div class="skel" style="height:74px"></div><div class="skel" style="height:74px"></div>`;
  const load = async () => {
    const r = await api('/convs');
    if (!r.ok) { v.innerHTML = emptyBox('Could not load chats', r.error); return; }
    const el = document.getElementById('view');
    if (el !== v) return; // route changed
    if (!r.items.length) {
      v.innerHTML = `<div class="sec-h"><h2>Chats</h2></div>` + emptyBox('No chats yet',
        'Open any listing and tap "Message in app" to start talking to the landlord.');
      return;
    }
    v.innerHTML = `<div class="sec-h"><h2>Chats</h2></div>` + r.items.map(c => `
      <a class="conv-row" href="#/chat/${c.id}">
        <div class="conv-av avatar" style="border-radius:50%">${esc((c.otherName || '?')[0].toUpperCase())}
          ${c.unread ? `<span class="conv-un">${c.unread > 9 ? '9+' : c.unread}</span>` : ''}</div>
        <div class="conv-main">
          <div class="conv-top"><span class="conv-name">${esc(c.otherName || 'User')}</span>
            <span class="conv-time">${timeAgo(c.lastAt)}</span></div>
          <div class="conv-sub"><span class="conv-last">${esc(c.lastMsg || 'New conversation')}</span>
            <span class="conv-listing">${kes(c.lrent)}/${perShort(c.lperiod)}</span></div>
        </div>
      </a>`).join('');
  };
  await load();
  clearInterval(chatTimer);
  chatTimer = setInterval(load, 8000);
  onLeave(() => clearInterval(chatTimer));
}

async function viewThread(id) {
  if (!state.user) { location.hash = '#/login'; return; }
  const v = document.getElementById('view');
  v.innerHTML = `<div class="pageload"><div class="skel" style="height:70px"></div><div class="skel" style="height:300px"></div></div>`;

  const info = await api('/convs/' + id);
  if (!info.ok) { v.innerHTML = emptyBox('Conversation not found', info.error); return; }
  const { listing, other } = info;
  const me = state.user.id;

  v.innerHTML = `
    <div class="thread-head">
      <button class="back-m" id="th-back">${ic('back')}</button>
      <div class="avatar" style="width:38px;height:38px;font-size:14px">${esc((other.name || '?')[0].toUpperCase())}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:800;font-size:14.5px">${esc(other.name || other.username)}
          ${other.verify_status === 'APPROVED' ? `<span class="vbadge">${ic('shield')}</span>` : ''}</div>
        <div style="font-size:11.5px;color:var(--ink2)">${esc(listing.title)} · ${kes(listing.rent)}/${perShort(listing.period)}</div>
      </div>
      ${other.phone ? `<a class="btn btn-green btn-sm" href="tel:${esc(other.phone)}">${ic('phone')}</a>
      <a class="btn btn-primary btn-sm" target="_blank" rel="noopener" href="${waLink(other.phone, 'Hi! About “' + listing.title + '” on ChukaHomes…')}">${ic('wa')}</a>` : ''}
    </div>
    <div class="thread">
      <div class="thread-msgs" id="th-msgs"></div>
      <div class="thread-bar">
        <input class="inp" id="th-inp" placeholder="Type a message…" autocomplete="off">
        <button class="btn btn-green" id="th-send" style="flex:none">${ic('send')}</button>
      </div>
    </div>
    <p class="hint-t" style="margin-top:8px">${ic('shield')} Agree on a viewing first. Never send money before you have seen the room.</p>`;

  v.querySelector('#th-back').onclick = () => { location.hash = '#/chats'; };

  const msgsEl = v.querySelector('#th-msgs');
  const inp = v.querySelector('#th-inp');
  let lastId = 0;

  function bubble(m) {
    const mine = m.senderId === me;
    return `<div class="bub ${mine ? 'me' : ''}">${esc(m.text)}<span class="bub-time">${new Date(m.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</span></div>`;
  }

  async function poll(initial) {
    const r = await api('/convs/' + id + '/messages?after=' + lastId);
    if (!r.ok || !r.items.length) return;
    const nearBottom = msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 160;
    r.items.forEach(m => { msgsEl.insertAdjacentHTML('beforeend', bubble(m)); lastId = Math.max(lastId, m.id); });
    if (initial || nearBottom) msgsEl.scrollTop = msgsEl.scrollHeight;
    if (r.items.length) refreshUnread();
  }

  async function send() {
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    const r = await api('/convs/' + id + '/messages', { body: { text } });
    if (!r.ok) { toast(r.error, true); inp.value = text; return; }
    msgsEl.insertAdjacentHTML('beforeend', bubble({ senderId: me, text, createdAt: Date.now(), id: r.id }));
    lastId = Math.max(lastId, r.id);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }
  v.querySelector('#th-send').onclick = send;
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

  await poll(true);
  clearInterval(chatTimer);
  chatTimer = setInterval(() => poll(false), 2500);
  onLeave(() => clearInterval(chatTimer));
}
