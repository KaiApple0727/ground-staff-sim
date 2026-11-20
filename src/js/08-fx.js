/* ---------- アニメーション(演出) ----------
   点数のポップアップ・正解/ミスの光・コンボ・出発する飛行機・紙ふぶき・数字のカウントアップ・画面の切り替え。
   どれもゲームを待たせない(操作はすぐできる)。タイトルの「アニメーション: OFF」か、
   端末の「視差効果を減らす」設定のときは出さない */
const FX = {
  on() {
    if (Store.data && Store.data.settings.anim === false) return false;
    try { return !window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return true; }
  },
  app() { return document.getElementById('app'); },

  // 画面(#app)の中の座標。#app は拡大・縮小されているので、その分を戻す
  pos(el) {
    const app = this.app(), a = app.getBoundingClientRect(), k = a.width / app.offsetWidth || 1, r = el.getBoundingClientRect();
    return { x: (r.left + r.width / 2 - a.left) / k, y: (r.top + r.height / 2 - a.top) / k, w: r.width / k, h: r.height / k };
  },
  add(cls, html, style, ms) {
    const app = this.app(); if (!app) return null;
    const el = document.createElement('div');
    el.className = `fx ${cls}`; el.innerHTML = html || ''; el.setAttribute('aria-hidden', 'true');
    Object.assign(el.style, style || {});
    app.appendChild(el);
    setTimeout(() => el.remove(), ms || 1200);
    return el;
  },
  // 同じアニメーションを、もう一度最初から
  replay(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); },

  // 上の「本日のスコア」から、点数が浮かび上がる
  points(pts) {
    if (!pts || !this.on()) return;
    const sc = document.getElementById('hud-score'); if (!sc || !sc.offsetParent) return;
    const p = this.pos(sc);
    this.add(`fx-pts ${pts < 0 ? 'neg' : ''}`, U.signed(pts), { left: `${p.x}px`, top: `${p.y + p.h / 2}px` }, 1000);
    this.replay(sc, 'bump');
  },

  // 正解・ミスのとき、画面のふちが一瞬光る
  flash(ok) {
    if (!this.on()) return;
    const app = this.app(); if (!app) return;
    app.classList.remove('fx-good', 'fx-bad'); void app.offsetWidth; app.classList.add(ok ? 'fx-good' : 'fx-bad');
    clearTimeout(this._fl); this._fl = setTimeout(() => app.classList.remove('fx-good', 'fx-bad'), 420);
  },

  // コンボが 5・10・15… になったとき
  combo(n) {
    if (!this.on() || n < 5 || n % 5) return;
    const st = document.getElementById('stage'); const p = st ? this.pos(st) : { x: 640, y: 300, h: 0 };
    this.add(`fx-combo ${n >= 20 ? 'big' : ''}`, `<b>${n}</b><span>COMBO!</span>`, { left: `${p.x}px`, top: `${p.y - p.h * 0.18}px` }, 1000);
    this.replay(document.getElementById('hud-combo-wrap'), 'bump');
  },

  // 搭乗ゲートを締め切ったとき、飛行機が飛び立つ
  takeoff() {
    if (!this.on()) return;
    const st = document.getElementById('stage'); if (!st) return;
    const p = this.pos(st);
    this.add('fx-plane', Art.plane('#fff', '#1f3a8a'),
      { left: `${p.x - p.w / 2}px`, top: `${p.y + p.h * 0.25}px`, '--fx-w': `${p.w}px`, '--fx-h': `${p.h}px` }, 2300);
  },

  // 紙ふぶき(自己ベスト・昇進・解禁など)
  confetti(n = 46) {
    if (!this.on()) return;
    const app = this.app(); if (!app) return;
    const W = app.offsetWidth, colors = ['#ffb41f', '#1f3a8a', '#23946c', '#d9622b', '#c23f78', '#4a90d9', '#ffffff'];
    const box = this.add('fx-confetti', '', {}, 2600);
    if (!box) return;
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i');
      c.style.left = `${Math.random() * W}px`;
      c.style.background = colors[i % colors.length];
      c.style.setProperty('--dx', `${(Math.random() - 0.5) * 160}px`);
      c.style.setProperty('--rot', `${(Math.random() * 2 - 1) * 720}deg`);
      c.style.animationDelay = `${Math.random() * 0.45}s`;
      c.style.animationDuration = `${1.5 + Math.random() * 0.8}s`;
      if (i % 3 === 0) { c.style.width = '6px'; c.style.height = '12px'; }
      box.appendChild(c);
    }
  },

  // 数字を 0 から数え上げる(結果の画面のスコアなど)
  countUp(el, to, ms = 800) {
    if (!el) return;
    if (!this.on()) { el.textContent = U.fmt(to); return; }
    const t0 = performance.now();
    const step = (t) => {
      if (!el.isConnected) return;
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = U.fmt(Math.round(to * e));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },

  // 画面が切り替わったとき、中身がふわっと入ってくる
  enter() {
    if (!this.on()) return;
    const el = document.querySelector('#app .stage') || document.querySelector('#app > :not(.fx)');
    this.replay(el, 'scene-in');
  },

  // 設定(タイトルのボタン)に合わせて、body に印を付ける(CSS のアニメーションも止める)
  apply() { document.body.classList.toggle('no-anim', !this.on()); },
};
