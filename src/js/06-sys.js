/* ---------- セーブ ---------- */
const Store = {
  data: null,
  def() { return { v: 1, day: 1, total: 0, best: {}, medals: {}, bestDay: null, jobSeen: {}, stats: this.defStats(), modes: {}, owner: null, settings: { sound: true, speech: false, hideAcct: false, anim: true } }; },
  // これまでの統計(勤務を終えるたびに足していく)
  defStats() { return { shifts: 0, minutes: 0, counterPax: 0, boarded: 0, onTime: 0, dec: 0, good: 0, mistakes: 0, maxCombo: 0, stars3: 0, jobs: {} }; },
  load(snap) {
    let d = null;
    try { const raw = localStorage.getItem(CONFIG.saveKey); if (raw) d = JSON.parse(raw); } catch (e) { d = null; }
    if (!d && snap && snap.v) d = snap;
    const def = this.def();
    this.data = Object.assign(def, d || {});
    this.data.settings = Object.assign(this.def().settings, (d && d.settings) || {});
    this.data.best = this.data.best || {};
    this.data.medals = this.data.medals || {}; this.data.jobSeen = this.data.jobSeen || {};
    this.data.stats = Object.assign(this.defStats(), this.data.stats || {});
    this.data.modes = this.data.modes || {};
  },
  save() {
    this.saveLocal();
    if (typeof Cloud !== 'undefined' && Cloud.user) Cloud.push();   // ログイン中はクラウドにも
  },
  saveLocal() { try { localStorage.setItem(CONFIG.saveKey, JSON.stringify(this.data)); } catch (e) { /* 保存できない環境でも遊べる */ } },
  // 1日の勤務を統計に足す
  addShift(d) {
    const st = this.data.stats, log = d.log || [];
    st.shifts++;
    st.minutes += d.startedAt ? Math.min(90, Math.max(0, (Date.now() - d.startedAt) / 60000)) : 0;
    st.counterPax += log.filter((l) => l.area === 'counter').length;
    st.boarded += (d.gateStats && d.gateStats.boarded) || 0;
    if (d.onTime) st.onTime++;
    st.dec += d.dec || 0; st.good += d.good || 0;
    st.mistakes += log.filter((l) => l.ok === false).length;
    st.maxCombo = Math.max(st.maxCombo, d.maxCombo || 0);
    if (d.stars === 3) st.stars3++;
    if (d.mid) {
      const mid = log.filter((l) => l.area === 'mid'), j = st.jobs[d.mid] = st.jobs[d.mid] || { n: 0, ok: 0, days: 0 };
      j.n += mid.length; j.ok += mid.filter((l) => l.ok === true).length; j.days++;
    }
  },
  // クラウドに送る分(音などの設定は端末ごと)
  cloudData() { const d = this.data; return { v: d.v, day: d.day, total: d.total, best: d.best, medals: d.medals, bestDay: d.bestDay, jobSeen: d.jobSeen, stats: d.stats, modes: d.modes }; },
  // 別の端末の記録と合わせる(日ごとの最高点・メダル・進んだ日数は、よいほうを残す)
  merge(o) {
    if (!o) return false;
    const d = this.data; let changed = false;
    if ((o.day || 1) > d.day) { d.day = o.day; changed = true; }
    for (const [n, b] of Object.entries(o.best || {})) {
      const a = d.best[n];
      if (!a || (b.score || 0) > (a.score || 0)) { d.best[n] = { score: b.score || 0, stars: Math.max(b.stars || 0, a ? a.stars || 0 : 0) }; changed = true; }
      else if ((b.stars || 0) > (a.stars || 0)) { a.stars = b.stars; changed = true; }
    }
    for (const [n, list] of Object.entries(o.medals || {})) {
      const had = new Set(d.medals[n] || []), before = had.size;
      for (const x of list || []) had.add(x);
      if (had.size !== before) { d.medals[n] = [...had]; changed = true; }
    }
    if (o.bestDay && (!d.bestDay || o.bestDay.score > d.bestDay.score)) { d.bestDay = { score: o.bestDay.score, n: o.bestDay.n }; changed = true; }
    for (const k of Object.keys(o.jobSeen || {})) if (!d.jobSeen[k]) { d.jobSeen[k] = true; changed = true; }
    // チャレンジモードの記録は、それぞれ大きいほう
    for (const [k, v] of Object.entries(o.modes || {})) {
      const x = d.modes[k] = d.modes[k] || {};
      for (const f of ['best', 'stage', 'score', 'plays']) if ((v[f] || 0) > (x[f] || 0)) { x[f] = v[f]; changed = true; }
    }
    // 1日の最高点は、日ごとの最高点からも確かめる
    for (const [n, b] of Object.entries(d.best)) if (!d.bestDay || (b.score || 0) > d.bestDay.score) { d.bestDay = { score: b.score || 0, n: +n }; changed = true; }
    // 統計は、大きいほうを残す(同じ記録を何度合わせても増えすぎないように)
    if (o.stats) {
      const a = d.stats, b = o.stats;
      for (const [k, v] of Object.entries(b)) if (typeof v === 'number' && v > (a[k] || 0)) { a[k] = v; changed = true; }
      for (const [job, v] of Object.entries(b.jobs || {})) {
        const x = a.jobs[job] = a.jobs[job] || { n: 0, ok: 0, days: 0 };
        for (const k of ['n', 'ok', 'days']) if ((v[k] || 0) > x[k]) { x[k] = v[k]; changed = true; }
      }
    }
    this.recalcTotal();
    return changed;
  },
  reset() { const s = this.data.settings; this.data = this.def(); this.data.settings = s; this.save(); },
  recalcTotal() {
    this.data.total = Object.values(this.data.best).reduce((s, b) => s + Math.max(0, b.score || 0), 0);
    for (const [n, b] of Object.entries(this.data.best)) if (!this.data.bestDay || (b.score || 0) > this.data.bestDay.score) this.data.bestDay = { score: b.score || 0, n: +n };
  },
};

/* ---------- 効果音(Web Audio で合成) ---------- */
const Sfx = {
  ctx: null,
  ensure() {
    if (!this.ctx) { try { const C = window.AudioContext || window.webkitAudioContext; if (C) this.ctx = new C(); } catch (e) { this.ctx = null; } }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  },
  tone(freq, dur, o = {}) {
    if (!Store.data.settings.sound || !this.ctx) return;
    try {
      const c = this.ctx, t0 = c.currentTime + (o.at || 0);
      const osc = c.createOscillator(), g = c.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(o.vol || 0.1, t0 + (o.attack || 0.01));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(c.destination);
      osc.start(t0); osc.stop(t0 + dur + 0.05);
    } catch (e) { /* 音が出せなくても続行 */ }
  },
  chime() { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 1.5, { vol: 0.08, at: i * 0.36, attack: 0.02 })); },
  chimeEnd() { [1568, 1175, 988, 784].forEach((f, i) => this.tone(f, 1.5, { vol: 0.08, at: i * 0.36, attack: 0.02 })); },
  chimeShort() { this.tone(988, 0.9, { vol: 0.07 }); this.tone(784, 1.1, { vol: 0.07, at: 0.32 }); },
  beep() { this.tone(1760, 0.09, { type: 'square', vol: 0.04 }); },
  good() { this.tone(880, 0.12, { type: 'triangle', vol: 0.09 }); this.tone(1320, 0.2, { type: 'triangle', vol: 0.08, at: 0.09 }); },
  buzz() { this.tone(150, 0.32, { type: 'sawtooth', vol: 0.05 }); this.tone(112, 0.32, { type: 'sawtooth', vol: 0.04, at: 0.05 }); },
  pop() { this.tone(660, 0.07, { type: 'triangle', vol: 0.05 }); },
  print() { for (let i = 0; i < 9; i++) this.tone(300 + (i % 3) * 60, 0.05, { type: 'square', vol: 0.022, at: i * 0.09 }); },
  thunk() { this.tone(90, 0.2, { vol: 0.18 }); },
};

/* ---------- アナウンス読み上げ(端末の音声) ---------- */
const Speech = {
  say(text) {
    if (!Store.data.settings.speech) return;
    try {
      const s = window.speechSynthesis; if (!s) return;
      s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP'; u.rate = 1.05;
      s.speak(u);
    } catch (e) { /* 読み上げに対応していない環境 */ }
  },
};

/* ---------- 通知 ---------- */
const Toast = {
  show(html, kind = 'info', ms = 3400) {
    const root = document.getElementById('toasts'); if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast ' + kind; el.innerHTML = html;
    root.appendChild(el);
    while (root.children.length > 3) root.firstChild.remove();
    setTimeout(() => el.classList.add('out'), ms);
    setTimeout(() => el.remove(), ms + 400);
  },
};

/* ---------- ダイアログ ---------- */
const Modal = {
  cb: [], open: false, soft: false,
  // soft: 外側(暗いところ)を押すか Esc で閉じられる。ゲームの進行に必要なお知らせには付けない
  show({ title, body, actions, wide, soft }) {
    this.cb = actions.map((a) => a.run); this.soft = !!soft;
    const root = document.getElementById('modal-root');
    root.innerHTML = `<div class="modal-back"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="m-title">
      <h2 id="m-title">${title}</h2><div class="modal-body">${body}</div>
      <div class="modal-actions">${actions.map((a, i) => `<button class="btn ${a.cls || ''}" data-mact="${i}">${a.label}</button>`).join('')}</div></div></div>`;
    this.open = true;
    if (soft) {
      // 押し始めも外側だったときだけ閉じる(画像の範囲を決めるドラッグが外にはみ出しても閉じない)
      const back = root.querySelector('.modal-back');
      back.addEventListener('pointerdown', (e) => { this._down = e.target === back; });
      back.addEventListener('click', (e) => { if (e.target === back && this._down) this.close(); this._down = false; });
    }
    const btns = root.querySelectorAll('[data-mact]');
    // 入力欄で Enter を押したら、いちばん右のボタン(決定)を押したことにする
    root.querySelectorAll('input:not([type="file"])').forEach((inp) => inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); this.act(btns.length - 1); } }));
    if (btns.length) btns[btns.length - 1].focus({ preventScroll: true });   // 長い中身でも上から見えるように
  },
  close() { document.getElementById('modal-root').innerHTML = ''; this.open = false; this.soft = false; },
  // ボタンを押したとき、モーダルの中の入力欄(name 付き)の値をまとめて渡す
  act(i) {
    const f = this.cb[i], vals = {};
    document.querySelectorAll('#modal-root [name]').forEach((x) => { vals[x.name] = x.value; });
    this.cb = []; this.close(); if (f) f(vals);
  },
};

/* ---------- 業務マニュアル ---------- */
const Manual = {
  open: false,
  show() {
    const n = Game.day ? Game.day.n : Store.data.day;
    const secs = DATA.manual.map((sec) => {
      const items = sec.items.filter((it) => it.day <= n && (!it.job || Progress.unlocked(it.job)));
      const locked = sec.items.length - items.length;
      if (!items.length) return '';
      return `<section class="msec"><h3>${sec.title}</h3>${items.map((it) => `<div class="mitem"><b>${it.t}${it.day === n && n > 1 ? '<span class="new">NEW</span>' : ''}</b><p>${it.b}</p></div>`).join('')}
        ${locked && !sec.items[0].job ? `<p class="locked">勤務を続けると、ルールがあと${locked}件追加されます。</p>` : ''}</section>`;
    }).join('');
    document.getElementById('manual-root').innerHTML = `<div class="mback" data-act="g:manual-close"></div>
      <aside class="msheet" role="dialog" aria-modal="true" aria-label="業務マニュアル">
        <header><div><b>業務マニュアル</b><small>${n}日目時点 · 開いている間は時間が止まります</small></div><button class="btn ghost small" data-act="g:manual-close">閉じる</button></header>
        <div class="mbody">${secs}</div></aside>`;
    this.open = true;
  },
  hide() { document.getElementById('manual-root').innerHTML = ''; this.open = false; },
  newItems(n) { return DATA.manual.flatMap((s) => s.items.filter((i) => i.day === n && !i.job).map((i) => ({ ...i, sec: s.title }))); },
  jobItems(job) { return DATA.manual.flatMap((s) => s.items.filter((i) => i.job === job).map((i) => ({ ...i, sec: s.title }))); },
};

/* ---------- セリフ ---------- */
const Talk = {
  speaksJa(p) { return p.nat === 'JP'; },
  vars(p) {
    const f = p.flight, cap = (s) => s.split(' ').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
    const c = p.conn ? DATA.cities[p.conn.dest] : null;
    return { flight: f.no.replace(' ', ''), num: f.num, dest: f.ap.name, destEn: cap(f.ap.en), conn: c ? c.name : '', connEn: c ? cap(c.en) : '', by: p.rebook && p.rebook.byText ? p.rebook.byText : '', buddy: p.buddy ? p.buddy.family : '' };
  },
  join(a, b) { return { main: a.main + ' ' + b.main, gloss: [a.gloss, b.gloss].filter(Boolean).join(' ') || undefined }; },
  fill(s, v) { return s.replace(/\{(\w+)\}/g, (_, k) => (v[k] !== undefined ? v[k] : '')); },
  line(p, key) {
    const L = DATA.lines[key], v = this.vars(p);
    if (this.speaksJa(p)) return { main: this.fill(U.pick(L.ja), v) };
    const [en, ja] = U.pick(L.en);
    return { main: this.fill(en, v), gloss: this.fill(ja, v) };
  },
  greet(p) {
    if (p.rebook) return this.join(this.line(p, 'rebook'), this.line(p, 'need_' + p.rebook.kind));
    if (p.school) return this.line(p, p.school);
    if (p.late) return this.line(p, 'late');
    if (p.forgot) return this.line(p, 'forgot');
    let g = this.line(p, p.svc ? 'svc_' + p.svc : 'greet');
    if (p.infant) g = this.join(g, this.line(p, 'infant'));
    if (p.conn) g = this.join(g, this.line(p, 'conn'));
    if (p.passport && this.speaksJa(p) && !p.svc) g.main += ' パスポートはこちらです。';
    return g;
  },
};
