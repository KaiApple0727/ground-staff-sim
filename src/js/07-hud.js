/* ---------- 画面上部(トップバー・出発案内板・時計) ---------- */
const Hud = {
  lang: 'ja', langT: 0, prev: {}, lastMin: -1, flipAll: false,

  frame(inner) {
    return `<div class="shell">
      ${this.topbar()}
      <div class="boardband">
        <div class="board" id="board" aria-label="出発案内">${this.boardHTML()}</div>
        <div class="clock" id="clock"><div class="led" id="led">${U.hm(Game.day.clock)}</div><div class="cdate">${U.dot(Game.day.date)}</div><div class="cspeed" id="cspeed"></div></div>
      </div>
      <main class="stage" id="stage">${inner}</main>
    </div>`;
  },

  topbar() {
    const d = Game.day, s = Store.data;
    return `<header class="topbar">
      <div class="brand">${Art.logo()}<div><b>${DATA.airline.name}</b><small>${Cloud.name() ? `担当 ${U.esc(Cloud.name())}` : `${DATA.home.full} 旅客サービス`}</small></div></div>
      <div class="tb-stats">
        <div class="stat"><small>勤務</small><b>${d.n}日目</b></div>
        <div class="stat st-rank"><small>ランク</small><b class="rk">${Game.rank().name}</b></div>
        <div class="stat"><small>本日のスコア</small><b id="hud-score">${U.fmt(Game.dayScore())}</b></div>
        <div class="stat combo ${d.combo >= 5 ? 'hot' : ''}" id="hud-combo-wrap"><small>コンボ</small><b id="hud-combo">${d.combo}</b></div>
        <div class="stat"><small>お客様満足度</small><b id="hud-sat">${Math.round(d.sat)}</b><span class="satbar"><i id="hud-satbar" style="width:${d.sat}%"></i></span></div>
      </div>
      <nav class="tb-btns" aria-label="ゲームの操作">
        <button class="btn ghost small tbb" data-act="g:manual" aria-label="マニュアル"><span class="ic" aria-hidden="true">?</span><span class="tx">マニュアル</span></button>
        <button class="btn ghost small tbb" data-act="g:pause" id="pauseBtn" aria-label="一時停止"><span class="ic" aria-hidden="true">II</span><span class="tx">一時停止</span></button>
        <button class="btn ghost small tbb" data-act="g:sound" id="soundBtn" aria-label="音" aria-pressed="${s.settings.sound}"><span class="ic" aria-hidden="true">♪</span><span class="tx">${s.settings.sound ? '音 ON' : '音 OFF'}</span></button>
      </nav>
    </header>`;
  },

  status(f) {
    const c = Game.day.clock;
    const S = (ja, en, k, sh) => ({ ja, en: sh && Fit.narrow ? sh : en, k }); // sh: スマホ用の短い英語表記
    if (f.filler) return S('定刻', 'ON TIME', 'ontime');
    if (f.canceled) return S('欠航', 'CANCELLED', 'cancel');
    if (f.phase === 'departed') return f.delay ? S(`${U.hm(f.actualDep)} 出発`, `DEPARTED ${U.hm(f.actualDep)}`, 'dep', `DEP ${U.hm(f.actualDep)}`) : S('出発済', 'DEPARTED', 'dep');
    if (f.isGate) {
      if (f.phase === 'closed') return S('締切', 'GATE CLOSED', 'closed', 'CLOSED');
      if (f.phase === 'boarding') return c > f.door ? S('遅延', 'DELAYED', 'delay') : S('搭乗中', 'BOARDING', 'board');
    } else {
      if (c >= f.dep) return S('出発済', 'DEPARTED', 'dep');
      if (c >= f.boarding) return S('搭乗中', 'BOARDING', 'board');
    }
    if (c >= f.cutoff) return S('手続終了', 'CHECK-IN CLOSED', 'closed', 'CLOSED');
    if (c >= f.cutoff - 600) return S('まもなく締切', 'FINAL CHECK-IN', 'final', 'CLOSING');
    return S('手続中', 'CHECK-IN', 'open');
  },

  boardHTML() {
    const L = this.lang, d = Game.day;
    const all = [...d.flights, ...d.fillers].sort((a, b) => a.dep - b.dep);
    const rows = all.map((f) => {
      const st = this.status(f);
      const changed = this.prev[f.no] !== st.k; this.prev[f.no] = st.k;
      const fl = this.flipAll ? 'flip' : '';
      return `<div class="brow ${f.filler ? 'filler' : ''} st-${st.k}">
        <span class="cell time">${U.hm(f.dep)}</span>
        <span class="cell fno">${f.color ? `<i class="chip" style="background:${f.color}"></i>` : ''}${f.no}</span>
        <span class="cell dest ${fl}">${L === 'ja' ? f.ap.name : f.ap.en}</span>
        <span class="cell gate">${f.gate}</span>
        <span class="cell st ${changed || this.flipAll ? 'flip' : ''}">${L === 'ja' ? st.ja : st.en}</span>
      </div>`;
    }).join('');
    const H = L === 'ja' ? ['時刻', '便名', '行先', '搭乗口', '備考'] : ['TIME', 'FLIGHT', 'DESTINATION', 'GATE', 'REMARKS'];
    return `<div class="bhead">${H.map((h) => `<span>${h}</span>`).join('')}</div>${rows}`;
  },

  redrawBoard() { const b = document.getElementById('board'); if (b) b.innerHTML = this.boardHTML(); },

  // 時間が進むシーンで毎フレーム呼ぶ
  tick(dt, speed, ff) {
    this.langT += dt;
    let flip = false;
    if (this.langT > 7) { this.langT = 0; this.lang = this.lang === 'ja' ? 'en' : 'ja'; flip = true; }
    const min = Math.floor(Game.day.clock / 60);
    if (min !== this.lastMin || flip) {
      this.lastMin = min;
      this.flipAll = flip; this.redrawBoard(); this.flipAll = false;
      const led = document.getElementById('led'); if (led) led.textContent = U.hm(Game.day.clock);
    }
    const sp = document.getElementById('cspeed');
    if (sp && speed !== undefined) { const t = ff ? '早送り中 ▸▸' : speed ? `時間の速さ ×${speed}` : ''; if (sp.textContent !== t) sp.textContent = t; }
  },

  refreshStats() {
    const d = Game.day; if (!d) return;
    const sc = document.getElementById('hud-score'); if (sc) sc.textContent = U.fmt(Game.dayScore());
    const sa = document.getElementById('hud-sat'); if (sa) sa.textContent = Math.round(d.sat);
    const sb = document.getElementById('hud-satbar'); if (sb) sb.style.width = d.sat + '%';
    const cb = document.getElementById('hud-combo'); if (cb) cb.textContent = d.combo;
    const cw = document.getElementById('hud-combo-wrap'); if (cw) cw.classList.toggle('hot', d.combo >= 5);
  },
};
