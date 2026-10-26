// ChukaHomes — Google Maps everywhere (keyless embed, no API key, no billing).
// The user-facing map IS Google Maps: real roads, estates, shops and bus stops are
// all labelled by Google — the most accurate data for Kenya.
//
// The embed iframe cannot be scripted, so GMap tracks pointer input on a transparent
// overlay and converts pixel offsets to coordinates with Web Mercator math. Every
// interaction re-renders the iframe centered on the new point; Google then draws its
// own pin there. First tap is exact to within a few tens of metres, and because the
// view recenters on every interaction, any residual offset self-corrects.

function ll2px(lat, lng, z) {
  const scale = 256 * Math.pow(2, z);
  const x = (lng + 180) / 360 * scale;
  const s = Math.min(Math.max(Math.sin(lat * Math.PI / 180), -0.9999), 0.9999);
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale;
  return [x, y];
}
function px2ll(x, y, z) {
  const scale = 256 * Math.pow(2, z);
  const lng = x / scale * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y / scale;
  const lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return [lat, lng];
}
const gmUrl = (lat, lng, z, sat) =>
  'https://maps.google.com/maps?q=' + lat.toFixed(6) + ',' + lng.toFixed(6) +
  '&z=' + z + '&t=' + (sat ? 'h' : 'm') + '&hl=en&output=embed';

class GMap {
  // opts: { lat, lng, zoom, sat, pick, onPin(lat,lng), zoomMin, zoomMax }
  constructor(el, opts = {}) {
    if (!el) throw new Error('GMap: no container');
    this.el = el;
    this.dead = false;
    this.lat = opts.lat ?? GATE.lat;
    this.lng = opts.lng ?? GATE.lng;
    this.z = opts.zoom ?? 16;
    this.sat = !!opts.sat;
    this.pick = opts.pick !== false;      // click-to-drop-pin enabled by default
    this.onPin = opts.onPin || null;
    this.zMin = opts.zoomMin ?? 12;
    this.zMax = opts.zoomMax ?? 20;
    this._build();
  }

  _build() {
    this.el.classList.add('gmap');
    this.el.innerHTML = `
      <iframe allowfullscreen loading="lazy" title="Google map" referrerpolicy="no-referrer-when-downgrade"></iframe>
      <div class="gmap-ov" aria-hidden="true"></div>
      <div class="gmap-ctl">
        <button type="button" class="gmap-btn" data-a="zi" aria-label="Zoom in">+</button>
        <button type="button" class="gmap-btn" data-a="zo" aria-label="Zoom out">&minus;</button>
        <button type="button" class="gmap-btn wide" data-a="sat" aria-label="Toggle satellite view">Satellite</button>
      </div>`;
    if (this.pick) {
      const h = document.createElement('div');
      h.className = 'gmap-hint';
      h.textContent = 'Tap the map to drop the pin';
      this.el.appendChild(h);
    }
    this.iframe = this.el.querySelector('iframe');
    this.ov = this.el.querySelector('.gmap-ov');
    this.satBtn = this.el.querySelector('[data-a="sat"]');
    this._render();
    this._wire();
  }

  _render() {
    if (this.dead) return;
    this.iframe.src = gmUrl(this.lat, this.lng, this.z, this.sat);
    this.satBtn.textContent = this.sat ? 'Map' : 'Satellite';
  }

  setView(lat, lng, z) {
    if (this.dead) return;
    this.lat = +(+lat).toFixed(6);
    this.lng = +(+lng).toFixed(6);
    this.z = Math.max(this.zMin, Math.min(this.zMax, z ?? this.z));
    this._render();
  }

  _wire() {
    const ov = this.ov;
    let down = false, moved = false, sx = 0, sy = 0;
    ov.addEventListener('pointerdown', e => {
      down = true; moved = false; sx = e.clientX; sy = e.clientY;
      try { ov.setPointerCapture(e.pointerId); } catch (err) {}
      ov.classList.add('grabbing');
    });
    ov.addEventListener('pointermove', e => {
      if (!down) return;
      if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 7) moved = true;
    });
    const up = e => {
      if (!down) return;
      down = false;
      ov.classList.remove('grabbing');
      if (this.dead) return;
      if (moved) {
        // drag = pan: the centre moves opposite to the finger, in Mercator pixels
        const [cx, cy] = ll2px(this.lat, this.lng, this.z);
        const [lat, lng] = px2ll(cx - (e.clientX - sx), cy - (e.clientY - sy), this.z);
        this.setView(lat, lng, this.z);
      } else if (this.pick && this.onPin) {
        // tap = drop pin at the tapped coordinates
        const r = this.iframe.getBoundingClientRect();
        const [cx, cy] = ll2px(this.lat, this.lng, this.z);
        const [lat, lng] = px2ll(cx + (e.clientX - (r.left + r.width / 2)), cy + (e.clientY - (r.top + r.height / 2)), this.z);
        this.onPin(+lat.toFixed(6), +lng.toFixed(6));
      }
    };
    ov.addEventListener('pointerup', up);
    ov.addEventListener('pointercancel', () => { down = false; ov.classList.remove('grabbing'); });

    // wheel zoom (desktop), debounced so the iframe reloads once, not per tick
    let wt = null;
    ov.addEventListener('wheel', e => {
      e.preventDefault();
      const nz = Math.max(this.zMin, Math.min(this.zMax, this.z + (e.deltaY < 0 ? 1 : -1)));
      clearTimeout(wt);
      wt = setTimeout(() => { if (!this.dead) this.setView(this.lat, this.lng, nz); }, 240);
    }, { passive: false });

    this.el.querySelector('[data-a="zi"]').onclick = () => this.setView(this.lat, this.lng, this.z + 1);
    this.el.querySelector('[data-a="zo"]').onclick = () => this.setView(this.lat, this.lng, this.z - 1);
    this.satBtn.onclick = () => { this.sat = !this.sat; this._render(); };
  }

  destroy() {
    this.dead = true;
    if (this.el) this.el.innerHTML = '';
  }
}
