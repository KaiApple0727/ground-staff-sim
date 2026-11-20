/* ---------- ゲーム全体の進行 ---------- */
const Scenes = {};   // シーン(画面)の登録先。Scenes.xxx = { enter, update, onAct, onKey, timed }

const Game = {
  day: null, scene: null, paused: false, last: 0,

  boot(snap) {
    Store.load(snap);
    Fit.init();
    if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => Store.data);
    document.addEventListener('click', (e) => this.onClick(e));
    document.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.scene && this.scene.timed) this.setPause(true); });
    this.go('title');
    Cloud.init();
    requestAnimationFrame((t) => this.loop(t));
  },

  go(id, arg) {
    if (this.scene && this.scene.exit) this.scene.exit();
    this.setPause(false);
    Modal.close();
    this.scene = Scenes[id];
    this.scene.enter(arg);
  },

  loop(t) {
    const dt = this.last ? Math.min(0.1, (t - this.last) / 1000) : 0;
    this.last = t;
    if (!this.paused && !Modal.open && !Manual.open && this.scene && this.scene.update) {
      try { this.scene.update(dt); } catch (err) { console.error(err); }
    }
    requestAnimationFrame((tt) => this.loop(tt));
  },

  onClick(e) {
    const m = e.target.closest('[data-mact]');
    if (m) { Sfx.ensure(); Modal.act(+m.dataset.mact); return; }
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    Sfx.ensure();
    const act = el.dataset.act;
    if (act.startsWith('g:')) { this.globalAct(act.slice(2), el.dataset); return; }
    if (this.scene && this.scene.onAct) this.scene.onAct(act, el.dataset, el);
  },

  onKey(e) {
    if (e.key === 'Escape' && Manual.open) { Manual.hide(); return; }
    if (e.key === 'Escape' && Modal.open && Modal.soft) { Modal.close(); return; }
    if (Modal.open || Manual.open || this.paused) return;
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (this.scene && this.scene.onKey) this.scene.onKey(e);
  },

  globalAct(a, ds = {}) {
    if (a === 'manual') { Manual.open ? Manual.hide() : Manual.show(); }
    else if (a === 'manual-close') Manual.hide();
    else if (a === 'pause') this.setPause(!this.paused);
    else if (a === 'login') Cloud.login();
    else if (a === 'cloud-retry') Cloud.init();
    else if (a === 'acct-hide') { Store.data.settings.hideAcct = true; Store.save(); Cloud.refresh(); Toast.show('案内を閉じました。ログインは右上のボタンからできます', 'info', 3200); }
    else if (a === 'ranking') Cloud.showRanking();
    else if (a === 'rank-total' || a === 'rank-best') Cloud.loadRanking(a.slice(5));
    else if (a === 'rank-user') Cloud.showUser(ds.uid);
    else if (a === 'rename') Cloud.askName(false);
    else if (a === 'profile') Cloud.showProfile();
    else if (a === 'icon') Cloud.showIconPicker();
    else if (a === 'icon-pick') Cloud.pickIcon(ds.id);
    else if (a === 'icon-crop') Cloud.showCropper();
    else if (a === 'logout') {
      Modal.show({ soft: true,
        title: 'ログアウトしますか?',
        body: '<p>ログアウトすると、<b>この端末の記録は最初の状態に戻ります</b>。記録はクラウドに残っているので、もう一度ログインすれば続きから遊べます。</p>',
        actions: [{ label: 'やめる', cls: 'ghost' }, { label: 'ログアウトする', cls: 'danger', run: () => Cloud.logout() }],
      });
    }
    else if (a === 'rotate-ok') { const h = document.getElementById('rotate-hint'); if (h) h.hidden = true; }
    else if (a === 'sound') {
      const s = Store.data.settings; s.sound = !s.sound; Store.save();
      const b = document.getElementById('soundBtn'); if (b) { (b.querySelector('.tx') || b).textContent = s.sound ? '音 ON' : '音 OFF'; b.setAttribute('aria-pressed', s.sound); }
    }
  },

  setPause(v) {
    this.paused = !!(v && this.scene && this.scene.timed);
    const ov = document.getElementById('pause-ov'); if (ov) ov.hidden = !this.paused;
    const b = document.getElementById('pauseBtn');
    if (b) { (b.querySelector('.tx') || b).textContent = this.paused ? '再開' : '一時停止'; const ic = b.querySelector('.ic'); if (ic) ic.textContent = this.paused ? '▶' : 'II'; }
  },

  startDay(n) {
    this.day = Gen.day(n);
    Object.assign(this.day, { clock: this.day.start, sat: 100, score: { counter: 0, mid: 0, gate: 0, combo: 0 }, dec: 0, good: 0, combo: 0, maxCombo: 0, log: [], checked: {}, stats: {} });
    this.day.mid = Progress.midFor(n);
    this.day.startedAt = Date.now();
    this.day.goals = Goals.forDay(this.day);
    Hud.prev = {}; Hud.lastMin = -1;
    this.go('briefing');
  },

  addScore(part, pts) { this.day.score[part] += pts; Hud.refreshStats(); },
  addSat(d) { this.day.sat = U.clamp(this.day.sat + d, 0, 100); Hud.refreshStats(); },
  // 判断の記録。正解が続くとコンボになり、5連続からボーナス点(コンボ数の半分、1回につき最大10点)
  decision(ok) {
    const d = this.day; d.dec++;
    if (ok) {
      d.good++; d.combo++; d.maxCombo = Math.max(d.maxCombo, d.combo);
      if (d.combo >= 5) d.score.combo += Math.min(10, Math.floor(d.combo / 2));
    } else d.combo = 0;
    Hud.refreshStats();
  },
  log(entry) { this.day.log.push(entry); },
  dayScore() { const s = this.day && this.day.score; return s ? s.counter + s.mid + s.gate + s.combo : 0; },
  rank(total = Store.data.total) { let r = DATA.ranks[0]; for (const x of DATA.ranks) if (total >= x.min) r = x; return r; },
  nextRank(total = Store.data.total) { return DATA.ranks.find((x) => x.min > total) || null; },
};
