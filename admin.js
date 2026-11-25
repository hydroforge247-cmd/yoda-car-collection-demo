// YODA admin: approve bidders (with their ID photos and signed agreement), run the auction, see bids.
const $ = s => document.querySelector(s);
const rand = n => 'R' + Number(n).toLocaleString('en-ZA');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const when = t => t ? new Date(t).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }) : '';
let tok = null; try { tok = sessionStorage.getItem('yoda-admin'); } catch {}
let state = null;

async function api(path, body) {
  const r = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({ error: 'Something went wrong.' }));
  if (r.status === 401 && tok) { signOut(); throw new Error('Please sign in again.'); }
  if (!r.ok) throw new Error(d.error);
  return d;
}
const say = (t, ok) => { const m = $('#msg'); m.textContent = t || ''; m.className = 'msg' + (ok ? ' ok' : ''); };

function signOut() { tok = null; try { sessionStorage.removeItem('yoda-admin'); } catch {} show(); }
function show() { $('#login').hidden = !!tok; $('#panel').hidden = $('#out').hidden = !tok; if (tok) load(); }

$('#login').onsubmit = async e => {
  e.preventDefault();
  try { tok = (await api('/api/admin/login', { password: e.target.password.value })).token; try { sessionStorage.setItem('yoda-admin', tok); } catch {} e.target.reset(); show(); }
  catch (err) { $('#login-msg').textContent = err.message; }
};
$('#out').onclick = signOut;

function card(b) {
  const pending = b.status === 'pending-review';
  return `<article class="bidder" data-id="${b.id}">
    <header><h3>${esc(b.name)} <span class="muted small">· Bidder #${b.number}</span></h3><span class="st ${b.status}">${b.status.replace('-', ' ')}</span></header>
    <dl>
      <div><dt>Email</dt><dd><a href="mailto:${esc(b.email)}">${esc(b.email)}</a></dd></div>
      <div><dt>Cellphone</dt><dd><a href="tel:${esc(b.phone)}">${esc(b.phone)}</a></dd></div>
      <div><dt>SA ID number</dt><dd>${esc(b.idNumber)}</dd></div>
      <div><dt>Registered</dt><dd>${when(b.createdAt)}</dd></div>
      <div><dt>Agreement signed</dt><dd>${esc(b.agreement?.signedName)} · ${when(b.agreement?.signedAt)}<br><span class="muted small">version ${esc(b.agreement?.version)}${b.agreement?.ip ? ' · IP ' + esc(b.agreement.ip) : ''}</span></dd></div>
      ${b.limit ? `<div><dt>Bidding limit</dt><dd>${rand(b.limit)}</dd></div>` : ''}
    </dl>
    <div class="files">${b.idPhotosDeleted ? '<p class="muted small">ID photos deleted on rejection.</p>' : '<button class="btn glass small" data-files>Show ID photos and signature</button>'}</div>
    <div class="acts">
      ${b.status !== 'approved' ? `<input name="limit" type="number" min="0" step="1000" placeholder="Limit R (optional)" aria-label="Bidding limit in rand"><button class="btn small" data-act="approve">Approve</button>` : ''}
      ${pending ? '<button class="btn glass small" data-act="reject">Reject and delete ID photos</button>' : ''}
      ${b.status === 'approved' ? '<button class="btn glass small" data-act="suspend">Suspend</button>' : ''}
    </div>
  </article>`;
}

function render() {
  const s = state, a = s.auction, pend = s.bidders.filter(b => b.status === 'pending-review');
  $('#pending-count').textContent = pend.length;
  $('#pending').innerHTML = pend.length ? pend.map(card).join('') : '<p class="muted">Nobody is waiting for approval.</p>';
  $('#all').innerHTML = s.bidders.filter(b => b.status !== 'pending-review').map(card).join('') || '<p class="muted">No other bidders yet.</p>';
  $('#bids').innerHTML = s.bids.length ? s.bids.map(x => `<tr><td>${esc(x.alias)}</td><td>${esc(x.name)}</td><td>${rand(x.amount)}</td><td>${when(x.at)}</td></tr>`).join('') : '<tr><td colspan="4" class="muted">No bids yet.</td></tr>';
  $('#auction-state').textContent = (a.open ? 'Open' : 'Closed') + ` · ends ${when(a.endsAt)}` + (s.winner ? ` · winner ${s.winner.name} (${s.winner.email}, ${s.winner.phone}) at ${rand(s.winner.amount)}` : '');
  const f = $('#auction');
  if (!f.contains(document.activeElement)) {   // don't overwrite what the admin is typing
    f.car.value = a.car; f.startBid.value = a.startBid; f.increment.value = a.increment; f.reserve.value = a.reserve;
    const d = new Date(a.endsAt); f.endsAt.value = new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  }
}

async function load() { try { state = await api('/api/admin/state'); render(); } catch (err) { say(err.message); } }
setInterval(() => { if (tok && !document.hidden && !document.querySelector('.files img')) load(); }, 15000);

document.addEventListener('click', async e => {
  const art = e.target.closest('.bidder[data-id]'); if (!art) return;
  const id = art.dataset.id;
  if (e.target.matches('[data-files]')) {
    const box = e.target.parentElement; box.innerHTML = '<p class="muted small">Loading…</p>';
    const parts = await Promise.all(['front', 'back', 'signature'].map(k => api(`/api/admin/file?id=${encodeURIComponent(id)}&kind=${k}`).then(d => d.data, () => null)));
    box.innerHTML = parts.map((src, i) => src ? `<img src="${src}" alt="${['ID front', 'ID back', 'Signature'][i]}">` : '').join('') || '<p class="muted small">No files.</p>';
  } else if (e.target.closest('.files img')) {
    $('#viewer-img').src = e.target.src; $('#viewer').showModal();
  } else if (e.target.dataset.act) {
    const act = e.target.dataset.act, name = art.querySelector('h3').firstChild.textContent.trim();
    if (act === 'reject' && !confirm(`Reject ${name}? Their ID photos will be deleted. This cannot be undone.`)) return;
    if (act === 'suspend' && !confirm(`Suspend ${name}? They will not be able to bid.`)) return;
    try { await api('/api/admin/bidder', { id, action: act, limit: art.querySelector('[name=limit]')?.value }); say(`${name}: ${act === 'approve' ? 'approved' : act + 'ed'}.`, true); load(); }
    catch (err) { say(err.message); }
  }
});
$('#viewer').onclick = () => $('#viewer').close();

const saveAuction = async (body, done) => { try { await api('/api/admin/auction', body); say(done, true); load(); } catch (err) { say(err.message); } };
$('#auction').onsubmit = e => {
  e.preventDefault(); const f = e.target;
  saveAuction({ car: f.car.value, startBid: f.startBid.value, increment: f.increment.value, reserve: f.reserve.value, endsAt: new Date(f.endsAt.value).toISOString() }, 'Auction saved.');
};
$('#close-now').onclick = () => confirm('Close the auction now?') && saveAuction({ close: true }, 'Auction closed.');
$('#reopen').onclick = () => saveAuction({ reopen: true }, 'Auction reopened.');
$('#new-auction').onclick = () => confirm('Start a new auction? All current bids are cleared.') && saveAuction({ newAuction: true }, 'New auction started. Set the car and dates, then save.');

show();
