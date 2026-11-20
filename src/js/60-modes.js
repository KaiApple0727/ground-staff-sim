/* ---------- 30日目をクリアすると解禁:エンドレスモードと、ミスするまで続くモード ----------
   どちらも「ステージ」(1日分の勤務:カウンター → 仕事 → 搭乗ゲート)を続けて遊ぶ。
   ステージ k は 30+k 日目の内容で、ステージが進むほど時間の進みが速くなる。
   ふつうの勤務(日ごとの最高点・メダル・累計)には入らない。記録は Store.data.modes に残す */
const Modes = {
  KINDS: {
    endless: { name: 'エンドレスモード', short: 'エンドレス', desc: 'ステージが終わらずに続きます。ステージが進むほど、時間の進みが速くなります。どこまで点数をのばせるか挑戦しましょう。やめたいときは、ステージの終わりにやめられます。' },
    sudden: { name: 'ミスするまで続くモード', short: 'ノーミス', desc: '1回でもミスをしたら、その場で終わりです(△は続けられます)。何回続けて正解できるか挑戦しましょう。' },
  },
  unlocked() { return Store.data.day > 30 || !!Store.data.best[30]; },
  rec(kind) { return Object.assign({ best: 0, stage: 0, score: 0, plays: 0 }, (Store.data.modes || {})[kind] || {}); },

  // タイトルから:説明と記録を見せてから始める
  ask(kind) {
    const K = this.KINDS[kind]; if (!K) return;
    if (!this.unlocked()) { Sfx.buzz(); Toast.show('30日目をクリアすると解禁されます', 'info', 3000); return; }
    const r = this.rec(kind);
    Modal.show({ soft: true,
      title: K.name,
      body: `<p>${K.desc}</p>
        <div class="mode-rec"><div><small>${kind === 'sudden' ? '最高 連続正解' : '最高スコア'}</small><b>${r.best ? (kind === 'sudden' ? `${U.fmt(r.best)}回` : `${U.fmt(r.best)}点`) : '—'}</b></div>
          <div><small>最高ステージ</small><b>${r.stage ? `ステージ${r.stage}` : '—'}</b></div><div><small>遊んだ回数</small><b>${r.plays}回</b></div></div>`,
      actions: [{ label: 'やめる', cls: 'ghost' }, { label: 'はじめる', cls: 'primary', run: () => this.start(kind) }],
    });
  },

  start(kind) {
    Game.run = { kind, stage: 0, score: 0, good: 0, dec: 0, over: false, failText: '', prevBest: this.rec(kind).best };
    this.next();
  },

  next() {
    const r = Game.run; if (!r) return;
    r.stage++;
    Game.startDay(30 + r.stage);
    const c = Game.day.cfg;
    c.speed = Math.round((c.speed || 10) * this.speedUp(r.stage) * 10) / 10;   // ステージが進むほど速く
    if (Game.scene === Scenes.briefing) Scenes.briefing.enter();               // 速さを変えたので描き直す
  },
  speedUp(stage) { return Math.min(1.6, 1 + (stage - 1) * 0.05); },

  // ステージ(1日分)を終えたとき(結果の画面から1回だけ)
  stageDone(d) {
    const r = Game.run; if (!r || d.runCounted) return;
    d.runCounted = true;
    r.score += Game.dayScore(); r.good += d.good; r.dec += d.dec;
    Store.addShift(d);
    this.record(false);
  },

  // いまのカウンターのお客様で、最後に記録されたミス(ミスの理由を見せるため)
  lastBad() {
    try { const p = Game.scene === Scenes.counter && Scenes.counter.s.cur; return p && p.res && p.res.bad.length ? p.res.bad[p.res.bad.length - 1] : ''; } catch (e) { return ''; }
  },

  // ミスしたとき(ミスするまで続くモードだけ)。少し間をおいて、何がミスだったかを見せてから終わる
  fail(text) {
    const r = Game.run; if (!r || r.kind !== 'sudden') return;
    if (text && !r.failText) r.failText = text;
    if (r.over) return;
    r.over = true;
    Sfx.buzz();
    setTimeout(() => { if (Game.run === r) Game.go('runover'); }, 1300);
  },

  // 記録を残す(終わったとき・やめたときは plays を1つ増やす)
  record(end) {
    const r = Game.run; if (!r) return null;
    const d = Game.day, live = !d || d.runCounted ? 0 : 1;   // 途中のステージの分も数える
    const good = r.good + (live && d ? d.good : 0), score = r.score + (live && d ? Game.dayScore() : 0);
    const cleared = r.stage - (d && d.runCounted ? 0 : 1);
    const m = Store.data.modes = Store.data.modes || {}, cur = this.rec(r.kind);
    const val = r.kind === 'sudden' ? good : score;
    const out = { val, good, score, cleared, newBest: val > (r.prevBest || 0) };
    m[r.kind] = { best: Math.max(cur.best, val), stage: Math.max(cur.stage, cleared), score: Math.max(cur.score, score), plays: cur.plays + (end ? 1 : 0) };
    if (end) Store.save(); else Store.saveLocal();
    return out;
  },

  // 自分でやめる(エンドレス、またはノーミスの途中で)
  quit() {
    if (!Game.run) return;
    const r = Game.run, res = this.record(true);
    Game.run = null;
    this.summary(r, res, false);
  },

  summary(r, res, failed) {
    const K = this.KINDS[r.kind];
    Modal.show({
      title: failed ? 'ゲームオーバー' : `${K.name} 終了`,
      body: `<div class="mode-rec big"><div><small>${r.kind === 'sudden' ? '連続正解' : 'スコア'}</small><b>${r.kind === 'sudden' ? `${U.fmt(res.good)}回` : `${U.fmt(res.score)}点`}</b></div>
          <div><small>クリアしたステージ</small><b>${res.cleared}</b></div>${r.kind === 'sudden' ? `<div><small>スコア</small><b>${U.fmt(res.score)}点</b></div>` : ''}</div>
        ${res.newBest ? '<p class="pill ok">自己ベスト更新!</p>' : ''}`,
      actions: [{ label: 'タイトルへ', cls: 'ghost', run: () => Game.go('title') }, { label: 'もう一度', cls: 'primary', run: () => this.start(r.kind) }],
    });
  },

  // タイトル画面のモードの欄
  titleHTML() {
    const un = this.unlocked();
    return `<div class="t-modes" role="group" aria-label="チャレンジモード"><small>${un ? 'チャレンジモード' : 'チャレンジモード(30日目をクリアすると解禁)'}</small><div class="t-modes-row">
      ${Object.entries(this.KINDS).map(([k, K]) => {
        const r = this.rec(k);
        const sub = !un ? '30日目をクリアで解禁' : r.best ? (k === 'sudden' ? `最高 連続${U.fmt(r.best)}回` : `最高 ${U.fmt(r.best)}点`) : (k === 'sudden' ? '1回ミスしたら終わり' : '終わりのない勤務');
        return `<button class="mode-btn ${un ? '' : 'locked'}" data-act="g:mode" data-k="${k}" ${un ? '' : 'aria-disabled="true"'}>${un ? '' : Scenes.title.lock()}<b>${K.name}</b><small>${sub}</small></button>`;
      }).join('')}</div></div>`;
  },
};

/* ミスで終わったときの画面 */
Scenes.runover = {
  enter() {
    const r = Game.run; if (!r) { Game.go('title'); return; }
    const res = Modes.record(true);
    document.getElementById('app').innerHTML = Hud.frame(`<div class="runover"><section class="panel ro-box">
      <p class="eyebrow">ミスするまで続くモード</p><h2>ゲームオーバー</h2>
      <p class="ro-why">${r.failText ? U.esc(r.failText) : 'ミスをしてしまいました'}</p>
      <div class="mode-rec big"><div><small>連続正解</small><b>${U.fmt(res.good)}回</b></div><div><small>クリアしたステージ</small><b>${res.cleared}</b></div><div><small>スコア</small><b>${U.fmt(res.score)}点</b></div></div>
      ${res.newBest ? '<p><span class="pill ok">自己ベスト更新!</span></p>' : `<p class="mute small">自己ベスト 連続${U.fmt(Modes.rec('sudden').best)}回</p>`}
      <div class="r-actions"><button class="btn primary big" data-act="again">もう一度</button><button class="btn ghost" data-act="title">タイトルへ</button></div>
    </section></div>`);
    Game.run = null;   // 上のバーに「ノーミス ステージ○」を出してから終わりにする
  },
  update(dt) { Hud.tick(dt, 0); },
  onAct(a) { if (a === 'again') Modes.start('sudden'); else if (a === 'title') Game.go('title'); },
};
