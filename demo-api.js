/* YODA demo mode (GitHub Pages copy only, never on the live site).
   Answers every /api/ call inside the browser from localStorage, so the client can try the whole flow on their phone:
   sign up -> admin approves -> bid. Nothing leaves the device. Seeded with made-up bidders and sample ID cards. */
(() => {
  const KEY = 'yoda-demo-db', now = () => Date.now(), DAY = 864e5;
  const tok = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

  // Sample "ID card" and signature images, drawn on the spot (clearly marked as demo specimens).
  function idCard(name, side) {
    const c = document.createElement('canvas'); c.width = 640; c.height = 404; const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 640, 404); bg.addColorStop(0, '#dfe9df'); bg.addColorStop(1, '#c9d8cf');
    g.fillStyle = bg; g.fillRect(0, 0, 640, 404);
    g.fillStyle = '#2f5d46'; g.fillRect(0, 0, 640, 54);
    g.fillStyle = '#fff'; g.font = 'bold 24px sans-serif'; g.fillText(side === 'front' ? 'SAMPLE IDENTITY CARD' : 'SAMPLE IDENTITY CARD · BACK', 22, 36);
    g.fillStyle = '#33433b'; g.font = '20px sans-serif';
    if (side === 'front') {
      g.fillStyle = '#a9b8af'; g.fillRect(28, 80, 170, 210); g.fillStyle = '#8d9d93';
      g.beginPath(); g.arc(113, 160, 42, 0, 7); g.fill(); g.beginPath(); g.ellipse(113, 280, 70, 60, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#33433b';
      [['Surname', name.split(' ').slice(-1)[0]], ['Names', name.split(' ').slice(0, -1).join(' ')], ['Sex', '—'], ['Date of birth', '01 JAN 1985'], ['Identity number', 'DEMO ONLY']]
        .forEach(([k, v], i) => { g.font = '15px sans-serif'; g.fillText(k, 225, 96 + i * 52); g.font = 'bold 21px sans-serif'; g.fillText(v, 225, 120 + i * 52); });
    } else {
      for (let i = 0; i < 46; i++) { g.fillStyle = i % 3 ? '#33433b' : '#6d7d73'; g.fillRect(40 + i * 12, 90, i % 4 ? 5 : 9, 110); }
      g.font = '18px monospace'; g.fillText('IDZAF<<DEMO<<SPECIMEN<<<<<<<<<<<', 40, 260); g.fillText('8501010<<DEMO<<<<<<<<<<<<<<<<<<', 40, 292);
    }
    g.save(); g.translate(320, 230); g.rotate(-.32); g.fillStyle = 'rgba(227,23,43,.55)'; g.font = 'bold 64px sans-serif'; g.textAlign = 'center';
    g.fillText('DEMO SPECIMEN', 0, 20); g.restore();
    return c.toDataURL('image/jpeg', .8);
  }
  function signature(name) {
    const c = document.createElement('canvas'); c.width = 600; c.height = 180; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 600, 180); g.fillStyle = '#111'; g.font = 'italic 56px "Segoe Script", "Brush Script MT", cursive';
    g.fillText(name, 40, 112); return c.toDataURL('image/png');
  }

  function seed() {
    const t = now(), people = [
      ['Johan van der Merwe', 'approved', 6], ['Thandi Nkosi', 'approved', 4], ['Pieter Botha', 'pending-review', .2], ['Ayesha Patel', 'pending-review', .05],
    ];
    const bidders = {};
    people.forEach(([name, status, daysAgo], i) => {
      const id = 'demo' + (i + 1);
      bidders[id] = {
        id, number: i + 1, name, email: name.toLowerCase().split(' ')[0] + '@example.com', phone: `082 000 000${i + 1}`,
        idNumber: '850101 •••• ••• (demo)', password: 'demo1234', status, limit: null, createdAt: t - daysAgo * DAY, sample: true,
        agreement: { version: '2026-11-25-v1', signedName: name, signedAt: t - daysAgo * DAY + 120000, ip: '102.65.0.' + (10 + i) },
        ...(status === 'approved' ? { approvedAt: t - (daysAgo - .5) * DAY } : {}),
      };
    });
    return {
      bidders, sessions: {}, admin: {}, files: {},
      auction: { car: '2011 Chevrolet Spark', startBid: 20000, increment: 500, reserve: 0, endsAt: t + 5 * DAY + 3 * 3600e3, closedBy: null,
        bids: [{ bidderId: 'demo1', amount: 20000, at: t - 2 * DAY }, { bidderId: 'demo2', amount: 21500, at: t - 1.4 * DAY }, { bidderId: 'demo1', amount: 22000, at: t - .6 * DAY }] },
    };
  }
  let db; try { db = JSON.parse(localStorage.getItem(KEY)); } catch {}
  if (!db) db = seed();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { alert('This phone has run out of demo storage. Tap "Reset demo" at the bottom.'); } };
  save();

  const a = () => db.auction, top = () => a().bids[a().bids.length - 1] || null;
  const open = () => !a().closedBy && now() < a().endsAt;
  const minBid = () => top() ? top().amount + a().increment : a().startBid;
  const alias = id => 'Bidder #' + db.bidders[id].number;
  const pubAuction = () => ({
    car: a().car, startBid: a().startBid, increment: a().increment, endsAt: a().endsAt, open: open(), minBid: minBid(),
    current: top() ? top().amount : null, hasReserve: a().reserve > 0, reserveMet: !!top() && top().amount >= a().reserve,
    bids: a().bids.slice().reverse().map(b => ({ bidder: alias(b.bidderId), amount: b.amount, at: b.at })),
    winner: !open() && top() ? alias(top().bidderId) : null, closedBy: a().closedBy,
  });
  const pubMe = b => ({ name: b.name, number: b.number, status: b.status, limit: b.limit, leading: !!top() && top().bidderId === b.id });
  const adminB = b => ({ ...b, password: undefined, sample: undefined });

  function route(method, path, q, body, bearer) {
    const me = db.sessions[bearer] && db.bidders[db.sessions[bearer]], isAdmin = !!db.admin[bearer];
    const k = method + ' ' + path;
    if (k === 'GET /api/auction') return [200, pubAuction()];
    if (k === 'POST /api/register') {
      const name = String(body.name || '').trim(), email = String(body.email || '').trim().toLowerCase();
      if (name.length < 3) return [400, { error: 'Enter your full name.' }];
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return [400, { error: 'Enter a valid email address.' }];
      if (!/^\d{13}$/.test(String(body.idNumber || '').trim())) return [400, { error: 'That is not a valid South African ID number.' }];
      if (String(body.password || '').length < 8) return [400, { error: 'Choose a password of at least 8 characters.' }];
      if (String(body.signedName || '').trim().toLowerCase() !== name.toLowerCase()) return [400, { error: 'Type your full name exactly as above to sign.' }];
      if (Object.values(db.bidders).some(b => b.email === email)) return [409, { error: 'A profile with that email or ID number already exists. Sign in instead.' }];
      const id = 'u' + tok().slice(0, 10), b = {
        id, number: Object.keys(db.bidders).length + 1, name, email, phone: String(body.phone || ''), idNumber: String(body.idNumber).trim(),
        password: body.password, status: 'pending-review', limit: null, createdAt: now(),
        agreement: { version: body.agreementVersion, signedName: body.signedName, signedAt: now(), ip: 'this phone' },
      };
      db.files[id] = { front: body.idFront, back: body.idBack, signature: body.signature };
      db.bidders[id] = b; const t = tok(); db.sessions[t] = id; save();
      return [200, { token: t, me: pubMe(b) }];
    }
    if (k === 'POST /api/login') {
      const b = Object.values(db.bidders).find(x => x.email === String(body.email || '').trim().toLowerCase());
      if (!b || b.password !== body.password) return [401, { error: 'Wrong email or password.' }];
      const t = tok(); db.sessions[t] = b.id; save(); return [200, { token: t, me: pubMe(b) }];
    }
    if (k === 'POST /api/logout') { delete db.sessions[bearer]; save(); return [200, { ok: true }]; }
    if (k === 'GET /api/me') return me ? [200, pubMe(me)] : [401, { error: 'Please sign in.' }];
    if (k === 'POST /api/bid') {
      if (!me) return [401, { error: 'Please sign in first.' }];
      const amount = Number(body.amount);
      if (!open()) return [400, { error: 'This auction has closed.' }];
      if (me.status !== 'approved') return [400, { error: 'Your profile must be approved before you can bid.' }];
      if (!Number.isInteger(amount) || amount < minBid()) return [400, { error: `The minimum bid is R${minBid().toLocaleString('en-ZA')}.` }];
      if (me.limit && amount > me.limit) return [400, { error: `That is above your bidding limit of R${me.limit.toLocaleString('en-ZA')}.` }];
      if (top() && top().bidderId === me.id) return [400, { error: 'You are already the highest bidder.' }];
      a().bids.push({ bidderId: me.id, amount, at: now() });
      if (a().endsAt - now() < 120000) a().endsAt = now() + 120000;
      save(); return [200, pubAuction()];
    }
    if (k === 'POST /api/admin/login') {
      if (!String(body.password || '').trim()) return [401, { error: 'Type any password (this is a demo).' }];
      const t = tok(); db.admin[t] = 1; save(); return [200, { token: t }];
    }
    if (path.startsWith('/api/admin/') && !isAdmin) return [401, { error: 'Admin only.' }];
    if (k === 'GET /api/admin/state') {
      const t = top();
      return [200, {
        auction: { ...a(), open: open(), bids: undefined },
        bids: a().bids.slice().reverse().map(x => ({ ...x, name: db.bidders[x.bidderId].name, alias: alias(x.bidderId) })),
        bidders: Object.values(db.bidders).map(adminB).sort((x, y) => y.createdAt - x.createdAt),
        winner: !open() && t ? { ...adminB(db.bidders[t.bidderId]), amount: t.amount } : null,
      }];
    }
    if (k === 'GET /api/admin/file') {
      const b = db.bidders[q.get('id')], kind = q.get('kind');
      if (!b) return [404, { error: 'Not found.' }];
      if (b.idPhotosDeleted && kind !== 'signature') return [404, { error: 'This file has been deleted.' }];
      const data = b.sample ? (kind === 'signature' ? signature(b.name) : idCard(b.name, kind)) : db.files[b.id]?.[kind];
      return data ? [200, { data }] : [404, { error: 'Not found.' }];
    }
    if (k === 'POST /api/admin/bidder') {
      const b = db.bidders[body.id]; if (!b) return [404, { error: 'No such bidder.' }];
      if (body.action === 'approve') { b.status = 'approved'; b.limit = parseInt(body.limit) || null; b.approvedAt = now(); }
      else if (body.action === 'reject') { b.status = 'rejected'; b.limit = null; b.idPhotosDeleted = now(); if (db.files[b.id]) { delete db.files[b.id].front; delete db.files[b.id].back; } }
      else if (body.action === 'suspend') b.status = 'suspended';
      else return [400, { error: 'Unknown action.' }];
      save(); return [200, { ok: true }];
    }
    if (k === 'POST /api/admin/auction') {
      const x = a();
      if (body.newAuction) { x.bids = []; x.closedBy = null; }
      if (body.car !== undefined) x.car = String(body.car).trim() || x.car;
      for (const f of ['startBid', 'increment', 'reserve']) if (body[f] !== undefined) x[f] = Math.max(f === 'increment' ? 1 : 0, parseInt(body[f]) || 0);
      if (body.endsAt && !isNaN(Date.parse(body.endsAt))) x.endsAt = Date.parse(body.endsAt);
      if (body.reopen) x.closedBy = null;
      if (body.close) x.closedBy = 'seller';
      save(); return [200, { ok: true }];
    }
    return [404, { error: 'Not found.' }];
  }

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    const i = url.pathname.indexOf('/api/');
    if (i < 0) return realFetch(input, init);
    let body = {}; try { body = init.body ? JSON.parse(init.body) : {}; } catch {}
    const bearer = String((init.headers || {}).Authorization || '').replace('Bearer ', '');
    await new Promise(r => setTimeout(r, 120));   // feel like a network
    const [status, out] = route((init.method || 'GET').toUpperCase(), url.pathname.slice(i), url.searchParams, body, bearer);
    return new Response(JSON.stringify(out), { status, headers: { 'Content-Type': 'application/json' } });
  };

  // A small, clear demo strip at the bottom of every page.
  addEventListener('DOMContentLoaded', () => {
    const admin = /admin\.html$/.test(location.pathname);
    const bar = document.createElement('div');
    bar.className = 'demo-bar';
    bar.innerHTML = `<b>Demo</b> · Nothing you type leaves this phone, so use made-up details. ${admin ? 'Admin password: type anything.' : '<a href="admin.html">Open the admin section</a>'} · <button type="button">Reset demo</button>`;
    bar.querySelector('button').onclick = () => { if (confirm('Reset the demo to the start?')) { localStorage.removeItem(KEY); localStorage.removeItem('yoda-token'); sessionStorage.clear(); location.reload(); } };
    document.body.appendChild(bar);
    const s = document.createElement('style');
    s.textContent = '.demo-bar{position:fixed;left:8px;right:8px;bottom:8px;z-index:50;padding:9px 14px;border-radius:12px;background:rgba(227,23,43,.94);color:#fff;font:13px/1.4 Barlow,system-ui,sans-serif;text-align:center;box-shadow:0 6px 24px rgba(0,0,0,.35)}.demo-bar a,.demo-bar button{color:#fff;font:inherit;font-weight:700;text-decoration:underline;background:none;border:0;padding:0;cursor:pointer}body{padding-bottom:64px}';
    document.head.appendChild(s);
  });
})();
