const CARS = {
  corsa: {
    title: 'Opel Corsa 5-door hatchback', photos: ['corsa-1', 'corsa-2', 'corsa-3'],
    text: 'Silver Corsa C five-door: light on fuel, cheap to service and easy to park, with alloy wheels and a rear wiper. Sold in working condition.',
  },
  fortuner: {
    title: 'Toyota Fortuner 2.8 GD-6', photos: ['fortuner-1', 'fortuner-2', 'fortuner-3', 'fortuner-4', 'fortuner-5', 'fortuner-6'],
    text: 'Seven-seat SUV with Toyota\'s 2.8 GD-6 turbodiesel (130 kW). Nudge bar, side steps, tow bar and alloy wheels. No major damage, in full working condition.',
  },
  bantamCanopy: {
    title: 'Ford Bantam with canopy', photos: ['bantam-canopy-1', 'bantam-canopy-2', 'bantam-canopy-3', 'bantam-canopy-4', 'bantam-canopy-5', 'bantam-canopy-6'],
    text: 'Single-cab Bantam with a full-height canopy: a dependable little workhorse for deliveries. Sold in working condition.',
  },
  bantam: {
    title: 'Ford Bantam single cab', photos: ['bantam-1', 'bantam-2', 'bantam-3', 'bantam-4', 'bantam-5', 'bantam-6'],
    text: 'South Africa\'s favourite half-tonne bakkie, with a wide load bin and rubberised bin liner. Sold in working condition.',
  },
  spark: {
    title: 'Chevrolet Spark 5-door', photos: ['spark-1', 'spark-2', 'spark-3', 'spark-4', 'spark-5', 'spark-6'],
    text: 'Economical five-door city car that is easy to park and cheap to run. Sold in working condition.',
  },
};
const img = n => `images/${n}.jpeg`;
const rand = n => 'R' + Number(n).toLocaleString('en-ZA');
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
$('#year').textContent = new Date().getFullYear();

function gallery(el, photos, alt) {
  el.innerHTML = `<button class="main" aria-label="Enlarge photo"><img src="${img(photos[0])}" alt="${alt}"></button>
    <div class="thumbs">${photos.map((p, i) => `<button aria-label="Photo ${i + 1}"><img src="${img(p)}" alt="" loading="lazy"></button>`).join('')}</div>`;
  const main = el.querySelector('.main img');
  el.querySelectorAll('.thumbs button').forEach((b, i) => b.onclick = () => main.src = img(photos[i]));
  el.querySelector('.main').onclick = () => { $('#viewer-img').src = main.src; $('#viewer').showModal(); };
}
$('#viewer').onclick = () => $('#viewer').close();
gallery($('#auction .gallery'), ['spark-blue-1', 'spark-blue-2', 'spark-blue-3'], 'Light-blue 2011 Chevrolet Spark');

$('#sold-grid').innerHTML = Object.entries(CARS).map(([k, c], i) =>
  `<article class="card glass"><div class="gallery" data-car="${k}"></div><span class="tag sold">Sold</span>
   <p class="card-no"><span>No.</span>${String(i + 1).padStart(2, '0')}</p><h3>${c.title}</h3><p>${c.text}</p></article>`).join('');
document.querySelectorAll('#sold-grid .gallery').forEach(g => gallery(g, CARS[g.dataset.car].photos, CARS[g.dataset.car].title));

// --- motion ---------------------------------------------------------------------
// Fade sections up as they scroll into view.
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });
document.querySelectorAll('.reveal').forEach(el => calm ? el.classList.add('in') : io.observe(el));

// Big headings: the fade under the letters clears as the heading rises up the screen, until it is solid.
const megas = [...document.querySelectorAll('.mega')];
const fillMegas = () => megas.forEach(m => {
  const t = m.getBoundingClientRect().top, f = Math.min(1, Math.max(0, (innerHeight * .85 - t) / (innerHeight * .45)));
  m.style.setProperty('--fill', f.toFixed(3));
});
addEventListener('scroll', fillMegas, { passive: true }); addEventListener('resize', fillMegas); fillMegas();

// Phones: the step cards stack; the card underneath eases back as the next one slides over it.
const stepCards = [...document.querySelectorAll('.steps li')];
stepCards.forEach((li, i) => li.style.setProperty('--i', i));
const stackSteps = () => {
  const on = innerWidth <= 760 && !calm;
  stepCards.forEach((li, i) => {
    const next = stepCards[i + 1];
    if (!on || !next) { li.style.scale = ''; li.style.filter = ''; return; }
    const r = li.getBoundingClientRect(), p = Math.min(1, Math.max(0, (r.bottom - next.getBoundingClientRect().top) / r.height));
    li.style.scale = (1 - p * .07).toFixed(3); li.style.filter = p > .01 ? `brightness(${(1 - p * .35).toFixed(3)})` : '';
  });
};
addEventListener('scroll', stackSteps, { passive: true }); addEventListener('resize', stackSteps); stackSteps();

// Mobile menu
const menuBtn = $('#menu-btn'), nav = $('#nav');
const setMenu = open => { nav.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open); menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); };
menuBtn.onclick = () => setMenu(!nav.classList.contains('open'));
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
document.addEventListener('click', e => { if (!e.target.closest('.top')) setMenu(false); });
nav.querySelector('[data-register]').addEventListener('click', e => { if (!me) { e.preventDefault(); openRegister(); } });   // signed in: just go to the auction

// Cards tilt towards the mouse.
if (!calm && matchMedia('(pointer: fine)').matches) {
  document.querySelectorAll('.card, .lot .gallery, .steps li').forEach(el => {
    el.classList.add('tilt');
    el.onmousemove = e => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateZ(6px)`;
    };
    el.onmouseleave = () => el.style.transform = '';
  });
}

// Sold cars: the section pins and the cards travel sideways as you scroll down (wide screens only).
const hs = $('#sold'), track = $('#sold-grid');
const wide = matchMedia('(min-width: 900px) and (min-height: 760px)'); // short screens can't fit a pinned card row
function sizeHs() {
  const on = wide.matches && !calm;
  hs.classList.toggle('pinned', on);
  hs.style.height = on ? track.scrollWidth - innerWidth + innerHeight + 'px' : '';
  moveHs();
}
function moveHs() {
  if (!hs.classList.contains('pinned')) { track.style.transform = ''; return; }
  const p = Math.min(1, Math.max(0, -hs.getBoundingClientRect().top / (hs.offsetHeight - innerHeight)));
  track.style.transform = `translateX(${-p * (track.scrollWidth - innerWidth)}px)`;
}
addEventListener('scroll', moveHs, { passive: true });
addEventListener('resize', sizeHs);
addEventListener('load', sizeHs);
sizeHs();

// --- auction ---------------------------------------------------------------
let session = null; try { session = localStorage.getItem('yoda-token'); } catch {}
let auction = null, me = null;
const keep = t => { session = t; try { t ? localStorage.setItem('yoda-token', t) : localStorage.removeItem('yoda-token'); } catch {} };

async function api(path, body) {
  const r = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: 'Bearer ' + session } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({ error: 'Something went wrong. Please try again.' }));
  if (!r.ok) throw Object.assign(new Error(data.error), { status: r.status });
  return data;
}

function msg(text, ok) { const m = $('#bid-msg'); m.textContent = text || ''; m.className = 'msg' + (ok ? ' ok' : ''); }

function renderAuction() {
  const a = auction;
  $('#price-label').textContent = a.current ? 'Current bid' : 'Starting bid';
  $('#price').textContent = rand(a.current || a.startBid);
  $('#reserve').textContent = !a.open ? '' : a.current && a.hasReserve ? (a.reserveMet ? 'Reserve met: this car will sell.' : 'Reserve not met yet.') : `Bids go up in steps of ${rand(a.increment)}.`;
  $('#history').innerHTML = a.bids.length
    ? a.bids.map(b => `<li><span>${esc(b.bidder)}</span><b>${rand(b.amount)}</b><time>${new Date(b.at).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}</time></li>`).join('')
    : '<li class="muted">No bids yet. Be the first.</li>';
}

function renderBidArea() {
  const a = auction, area = $('#bid-area');
  const out = me ? `<p class="muted small">Signed in as ${esc(me.name)} · <button class="linkish" id="logout">Sign out</button></p>` : '';
  if (!a.open) {
    const mine = me && a.winner === 'Bidder #' + me.number;
    area.innerHTML = `<p class="closed">${a.winner ? `Auction closed. Won by ${esc(a.winner)}.` : 'Auction closed with no bids.'}</p>`
      + (mine ? '<p class="ok">Congratulations, you won! We will contact you to arrange payment within 48 hours.</p>' : '') + out;
  } else if (!me) {
    area.innerHTML = `<button class="btn wide" id="go-register">Create a bidder profile</button>
      <p class="muted small">Approved bidders only. Takes about 3 minutes. Already have a profile? <button class="linkish" id="go-login">Sign in</button></p>`;
    $('#go-register').onclick = openRegister;
    $('#go-login').onclick = () => $('#login').showModal();
  } else if (me.status === 'pending-review') {
    area.innerHTML = `<p><b>Thank you, ${esc(me.name.split(' ')[0])}.</b> Your profile, signed agreement and ID are with YODA for approval. Once you are approved you can bid right here. This page updates by itself.</p>` + out;
  } else if (me.status === 'rejected') {
    area.innerHTML = '<p class="closed">We could not approve your bidder profile. Please contact us if you think this is a mistake.</p>' + out;
  } else if (me.status === 'suspended') {
    area.innerHTML = '<p class="closed">Your bidder profile is suspended. Please contact us.</p>' + out;
  } else if (me.status === 'approved') {
    const quick = [a.minBid, a.minBid + a.increment, a.minBid + 4 * a.increment].filter(v => !me.limit || v <= me.limit);
    area.innerHTML = `<p class="muted small">You are <b>Bidder #${me.number}</b>${me.limit ? ` · bidding limit ${rand(me.limit)}` : ''}</p>
      ${me.leading ? '<p class="ok">You are the highest bidder.</p>' : ''}
      <form id="bid-form" class="inline"><span class="prefix">R</span><input name="amount" type="number" min="${a.minBid}" step="${a.increment}" value="${a.minBid}" aria-label="Your bid in rand" required><button class="btn">Place bid</button></form>
      <div class="quick">${quick.map(v => `<button class="chip" data-v="${v}">${rand(v)}</button>`).join('')}</div>` + out;
    const bid = async amount => {
      if (!confirm(`Place a bid of ${rand(amount)}? Bids are binding.`)) return;
      try { auction = await api('/api/bid', { amount }); me = await api('/api/me'); msg('Bid placed. You are the highest bidder.', true); render(); } catch (err) { msg(err.message); }
    };
    $('#bid-form').onsubmit = e => { e.preventDefault(); bid(parseInt(e.target.amount.value)); };
    area.querySelectorAll('.chip').forEach(c => c.onclick = () => bid(+c.dataset.v));
  }
  const lo = $('#logout');
  if (lo) lo.onclick = async () => { try { await api('/api/logout', {}); } catch {} keep(null); me = null; msg(''); render(); };
}

let lastKey = '';
function render() {
  renderAuction();
  // Only rebuild the bid form when something changed, so we never wipe what someone is typing.
  const key = JSON.stringify([auction.open, auction.minBid, auction.winner, me]);
  if (key !== lastKey) { lastKey = key; renderBidArea(); }
}

async function refresh() {
  try {
    auction = await api('/api/auction');
    if (session) { try { me = await api('/api/me'); } catch (e) { if (e.status === 401) { keep(null); me = null; } } }
    render();
  } catch { msg('Connection lost. Retrying…'); }
}

setInterval(() => {
  if (!auction) return;
  const left = auction.endsAt - Date.now();
  if (left <= 0 || !auction.open) { $('#countdown').textContent = 'Closed'; return; }
  const d = Math.floor(left / 864e5), h = Math.floor(left / 36e5) % 24, m = Math.floor(left / 6e4) % 60, s = Math.floor(left / 1e3) % 60;
  $('#countdown').textContent = (d ? d + 'd ' : '') + `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}, 1000);
if ($('#bid-area')) { setInterval(refresh, 3000); refresh(); }

// --- sign in ---
$('#login-cancel').onclick = () => $('#login').close();
$('#login-form').onsubmit = async e => {
  e.preventDefault();
  try {
    const r = await api('/api/login', Object.fromEntries(new FormData(e.target)));
    keep(r.token); me = r.me; $('#login').close(); e.target.reset(); $('#login-msg').textContent = ''; render();
  } catch (err) { $('#login-msg').textContent = err.message; }
};

// --- bidder profile: 3 steps (details, signed agreement, ID photos) ---
const reg = $('#reg-form'), steps = [...reg.querySelectorAll('.step')];
const stepNames = ['Your details', 'Bidder agreement', 'Your ID'];
let step = 1, signed = false;
const photos = {};

function showStep(n) {
  step = n;
  steps.forEach(s => s.hidden = +s.dataset.step !== n);
  $('#reg-step-label').textContent = `Step ${n} of 3 · ${stepNames[n - 1]}`;
  $('#reg-back').textContent = n === 1 ? 'Cancel' : 'Back';
  $('#reg-next').textContent = n === 3 ? 'Send for approval' : 'Next';
  $('#reg-msg').textContent = '';
  if (n === 2) sizeSig();
  steps[n - 1].querySelector('input')?.focus();
}
function openRegister() { showStep(1); $('#register').showModal(); }

// Signature pad: draws with mouse, finger or pen.
const sig = $('#sig'), sctx = sig.getContext('2d');
function sizeSig() {
  const w = sig.clientWidth || 300, r = devicePixelRatio || 1;
  if (sig.width === Math.round(w * r)) return;
  sig.width = Math.round(w * r); sig.height = Math.round(150 * r);
  sctx.scale(r, r); sctx.lineWidth = 2.2; sctx.lineCap = sctx.lineJoin = 'round'; sctx.strokeStyle = '#111'; signed = false;
}
let drawing = false;
const pt = e => { const b = sig.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
sig.onpointerdown = e => { drawing = true; sig.setPointerCapture(e.pointerId); sctx.beginPath(); sctx.moveTo(...pt(e)); };
sig.onpointermove = e => { if (!drawing) return; sctx.lineTo(...pt(e)); sctx.stroke(); signed = true; };
sig.onpointerup = sig.onpointercancel = () => drawing = false;
$('#sig-clear').onclick = () => { sctx.clearRect(0, 0, sig.width, sig.height); signed = false; };

// ID photos are shrunk in the browser (max 1600 px JPEG) so they upload quickly on mobile data.
reg.querySelectorAll('.id-pic input').forEach(inp => inp.onchange = async () => {
  const file = inp.files[0]; if (!file) return;
  try {
    const bmp = await createImageBitmap(file), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    photos[inp.name] = c.toDataURL('image/jpeg', 0.8);
    inp.parentElement.querySelector('img').src = photos[inp.name];
    inp.parentElement.classList.add('has');
  } catch { $('#reg-msg').textContent = 'That photo could not be read. Please try another one.'; }
});

$('#reg-back').onclick = () => step === 1 ? $('#register').close() : showStep(step - 1);
reg.onsubmit = async e => {
  e.preventDefault();
  const f = reg, m = $('#reg-msg');
  const bad = [...steps[step - 1].querySelectorAll('input[required]:not([type=file]):not([type=checkbox])')].find(i => !i.value.trim());
  if (bad) { m.textContent = 'Please fill in every field.'; return bad.focus(); }
  if (step === 1) {
    if (f.password.value.length < 8) { m.textContent = 'Choose a password of at least 8 characters.'; return; }
    return showStep(2);
  }
  if (step === 2) {
    if (f.signedName.value.trim().toLowerCase() !== f.name.value.trim().toLowerCase()) { m.textContent = 'Type your full name exactly as in step 1.'; return; }
    if (!signed) { m.textContent = 'Please sign in the signature box.'; return; }
    if (!f.agree.checked) { m.textContent = 'Please tick the box to accept the agreement.'; return; }
    return showStep(3);
  }
  if (!photos.idFront || !photos.idBack) { m.textContent = 'Add a photo of the front and the back of your ID.'; return; }
  const btn = $('#reg-next'); btn.disabled = true; btn.textContent = 'Sending…';
  try {
    const d = Object.fromEntries(new FormData(f));
    const r = await api('/api/register', {
      name: d.name, email: d.email, phone: d.phone, idNumber: d.idNumber, password: d.password,
      signedName: d.signedName, agree: true, agreementVersion: $('#agreement').dataset.version,
      signature: sig.toDataURL('image/png'), idFront: photos.idFront, idBack: photos.idBack,
    });
    keep(r.token); me = r.me; $('#register').close(); f.reset();
    reg.querySelectorAll('.id-pic').forEach(p => { p.classList.remove('has'); p.querySelector('img').removeAttribute('src'); });
    delete photos.idFront; delete photos.idBack; sctx.clearRect(0, 0, sig.width, sig.height); signed = false;
    render(); $('#auction').scrollIntoView({ behavior: calm ? 'auto' : 'smooth' });
  } catch (err) {
    // send them back to the step that holds the problem
    const to = /photo/i.test(err.message) ? 3 : /agreement|signature|exactly as above/i.test(err.message) ? 2 : /email|ID number|cellphone|full name|password/i.test(err.message) ? 1 : step;
    if (to !== step) showStep(to);
    m.textContent = err.message;
  } finally { btn.disabled = false; btn.textContent = step === 3 ? 'Send for approval' : 'Next'; }
};
// ===== NFC round 1 (25 Nov 2026) =====
const rootEl = document.documentElement;

// Loader: lifts once the 3D showroom has drawn its first frame (or after 9 s, or straight away if there is no 3D).
(() => {
  const fill = $('#ld-fill'); let done = false;
  const lift = () => { if (done) return; done = true; if (fill) fill.style.width = '100%'; setTimeout(() => { rootEl.classList.remove('loading'); rootEl.classList.add('loaded'); }, 350); };
  addEventListener('yoda-progress', e => { if (fill) fill.style.width = Math.max(8, Math.round(e.detail * 92)) + '%'; });
  addEventListener('yoda-ready', lift);
  setTimeout(lift, 9000);
})();

// The two cars in the day/night switch: anime-style coupes (ink outline, flat cel shading, window glare, YODA red stripe).
(() => {
  const car = (id, k) => `<svg viewBox="0 0 64 26" aria-hidden="true"><defs>
    <linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${k.top}"/><stop offset="1" stop-color="${k.mid}"/></linearGradient>
    <linearGradient id="w${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${k.glass1}"/><stop offset="1" stop-color="${k.glass2}"/></linearGradient>
    ${k.beam ? `<linearGradient id="b${id}" x1="0" x2="1"><stop offset="0" stop-color="#fff3c8" stop-opacity=".75"/><stop offset="1" stop-color="#fff3c8" stop-opacity="0"/></linearGradient>` : ""}</defs>
    <g class="speed" stroke="${k.ink}" stroke-width=".6" stroke-linecap="round" opacity=".6"><path d="M-10 10h7M-14 14h9M-9 18h6"/></g>
    <ellipse cx="32" cy="24.2" rx="27" ry="1.5" fill="#000" opacity=".28"/>
    ${k.beam ? `<path d="M60.5 14.2 L92 8 L92 22 Z" fill="url(#b${id})"/>` : ""}
    <path d="M3 19.6 C2.4 17 3 15 5.2 14.2 L13.4 12.6 C16.6 9.5 20.4 6.6 25.2 6.1 L37 5.9 C41 6.1 44.2 8.5 47.2 11.3 L55 12.5 C59.2 13.1 61.6 14.7 61.9 17.1 L61.9 19.6 Z" fill="url(#g${id})" stroke="${k.ink}" stroke-width=".8" stroke-linejoin="round"/>
    <path d="M3.4 17.2 L61.6 17.2 L61.6 19.2 L3.4 19.2 Z" fill="${k.shade}"/>
    <path d="M7 14.5 C20 13.4 38 13 54 13.2" fill="none" stroke="${k.hi}" stroke-width=".9" stroke-linecap="round" opacity=".9"/>
    <path d="M17.4 12.3 C19.8 9.7 22.2 7.7 25.6 7.4 L30.6 7.3 L30.6 12.2 Z M32.2 7.3 L36.6 7.4 C39.6 7.7 42.2 9.5 44.6 12 Z" fill="url(#w${id})" stroke="${k.ink}" stroke-width=".55" stroke-linejoin="round"/>
    <path d="M22 11.8 L25.4 7.6 L26.8 7.6 L23.4 11.8 Z M34.6 11.8 L37.6 7.8 L38.4 7.9 L35.4 11.8 Z" fill="#fff" opacity=".55"/>
    <path d="M31.4 12.4 L31.9 18.6 M44.8 12.3 L45.6 17" fill="none" stroke="${k.ink}" stroke-width=".4" opacity=".7"/>
    <path d="M16.2 12.2 l1.6 -1.3 l.9 1.2 Z" fill="${k.mid}" stroke="${k.ink}" stroke-width=".4"/>
    <path d="M6 17.3 L58.5 17.3" stroke="#e3172b" stroke-width="1"/>
    <path d="M58.6 13.3 L61.3 14.2 L60.7 15.4 L58.1 14.7 Z" fill="${k.head}" stroke="${k.ink}" stroke-width=".35"/>
    <path d="M3.1 14.9 L5.4 14.4 L5.4 16 L3.1 16.4 Z" fill="${k.tail}"/>
    ${[15, 50].map(x => `<circle cx="${x}" cy="19.6" r="5.6" fill="${k.arch}"/><g class="wheel"><circle cx="${x}" cy="19.6" r="4.5" fill="#121215"/><circle cx="${x}" cy="19.6" r="2.9" fill="${k.rim}" stroke="${k.rimEdge}" stroke-width=".4"/>${[0, 72, 144, 216, 288].map(a => `<path d="M${x} 19.6 l${(2.6 * Math.cos(a * Math.PI / 180)).toFixed(2)} ${(2.6 * Math.sin(a * Math.PI / 180)).toFixed(2)}" stroke="${k.spoke}" stroke-width=".7" stroke-linecap="round"/>`).join("")}<circle cx="${x}" cy="19.6" r=".8" fill="#e3172b"/></g>`).join("")}
  </svg>`;
  const S = { day: { top: "#ffffff", mid: "#eceef2", shade: "#cdd2da", hi: "#ffffff", ink: "#24242c", glass1: "#3a4a5e", glass2: "#1b222d", head: "#f4f4f4", tail: "#c4101f", arch: "#2a2a30", rim: "#d6d9de", rimEdge: "#8b9099", spoke: "#7d828b" },
    night: { top: "#2a2a35", mid: "#101015", shade: "#060608", hi: "#7f8fc4", ink: "#000", glass1: "#2b3b52", glass2: "#0e1420", head: "#fff6d0", tail: "#ff2b3d", arch: "#000", rim: "#3a3a44", rimEdge: "#9aa0ad", spoke: "#b9bdc6", beam: 1 } };
  document.querySelector("#mode .c-day").innerHTML = car("d", S.day);
  document.querySelector("#mode .c-night").innerHTML = car("n", S.night);
})();

// Day / night switch: the new mode spreads out in a circle from the switch.
(() => {
  const btn = $('#mode'), meta = document.querySelector('meta[name=theme-color]');
  const paint = () => { const n = rootEl.dataset.theme === 'night'; btn.setAttribute('aria-pressed', n); meta.content = n ? '#08080a' : '#f4f3f0'; };
  paint();
  btn.onclick = e => {
    const next = rootEl.dataset.theme === 'night' ? 'day' : 'night';
    const apply = () => { rootEl.dataset.theme = next; paint(); try { localStorage.setItem('yoda-theme', next); } catch {} dispatchEvent(new Event('themechange')); };
    // the old car drives off to the right and the new one drives in from the left (runs in the live new view of the reveal)
    const drive = () => {
      if (calm) return;
      const inCar = btn.querySelector(next === 'night' ? '.c-night' : '.c-day'), outCar = btn.querySelector(next === 'night' ? '.c-day' : '.c-night');
      btn.classList.add('drive');
      outCar.animate([{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(84px)', opacity: 1 }], { duration: 550, easing: 'cubic-bezier(.55,0,.9,.45)' });
      inCar.animate([{ transform: 'translateX(-82px)' }, { transform: 'translateX(1.5px)', offset: .85 }, { transform: 'translateX(0)' }], { duration: 750, delay: 300, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' })
        .finished.then(() => btn.classList.remove('drive'), () => btn.classList.remove('drive'));
    };
    const applyAndDrive = () => { apply(); drive(); };
    if (!document.startViewTransition) return applyAndDrive();
    const x = e.clientX || innerWidth - 120, y = e.clientY || 36, r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(applyAndDrive).ready.then(() => rootEl.animate(
      calm ? { opacity: [0, 1] } : { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: calm ? 300 : 850, easing: 'cubic-bezier(.65,0,.25,1)', pseudoElement: '::view-transition-new(root)' }));
  };
})();

// A ripple where you tap any button.
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('.btn'); if (!b) return;
  const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2, d = document.createElement('span');
  d.className = 'drop'; d.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
  b.append(d); setTimeout(() => d.remove(), 750);
});

// Privacy notice (POPIA).
document.querySelectorAll('[data-privacy]').forEach(b => b.onclick = () => $('#privacy').showModal());
$('#privacy-close').onclick = () => $('#privacy').close();

// Photos on the page turn a little in 3D as they travel through the screen, like the showroom ring.
(() => {
  const els = [...document.querySelectorAll('.gallery .main img')];
  els.forEach(el => el.classList.add('turn'));
  let ticking = false;
  const update = () => {
    ticking = false;
    for (const el of els) {
      const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) continue;
      const p = (r.top + r.height / 2) / innerHeight - .5;     // -0.5 top .. 0.5 bottom
      el.style.transform = `perspective(1100px) rotateY(${(-p * 14).toFixed(2)}deg) rotateX(${(p * 6).toFixed(2)}deg) scale(1.04)`;
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update); update();
})();
