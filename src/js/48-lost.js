/* ---------- 忘れ物センター(中堅スタッフに昇進すると加わる仕事) ----------
   お客様の話(品物・色・特徴・場所・時刻)と、見つかった物の記録を見比べて、持ち主の物を探す。
   保管場所が当空港ならお渡し、ほかの空港なら取り寄せ、どれも違えば「届いていない」 */
Scenes.lost = {
  timed: true,
  N: 6,
  KINDS: { wallet: '財布', phone: 'スマートフォン', umbrella: '折りたたみ傘', cap: '帽子', plush: 'ぬいぐるみ', earphones: 'イヤホン', keys: '鍵', book: '本', scarf: 'マフラー', watch: '腕時計', glasses: 'メガネケース', pouch: 'ポーチ' },
  COLORS: { 黒: '#24272b', 紺: '#1f3260', 茶色: '#7a4a25', 赤: '#c8342f', 白: '#f2f2ee', 灰色: '#8b9096', ピンク: '#f08db5', 緑: '#2f8a4e', 黄色: '#e2bd1c' },
  SIMILAR: { 黒: ['紺', '灰色'], 紺: ['黒', '緑'], 茶色: ['黒', '赤'], 赤: ['ピンク', '茶色'], 白: ['灰色', '黄色'], 灰色: ['白', '黒'], ピンク: ['赤', '白'], 緑: ['紺', '黄色'], 黄色: ['白', '茶色'] },
  MARKS: { 'キーホルダー付き': 'キーホルダーが付いています。', '名前のシール付き': '名前のシールが貼ってあります。', '星の模様': '星の模様が入っています。', 'しま模様': 'しま模様です。', 'ステッカー付き': 'ステッカーが貼ってあります。', '無地': '模様のない、無地のものです。' },
  SPOTS: ['保安検査場', '出発ロビーのベンチ', '到着ロビー', '2階のトイレ', 'ラウンジ', 'カフェの前'],

  /* ===== 問題づくり ===== */
  // 時刻は「今日の0時からの分」。マイナスは昨日
  tm(t) { const d = t < 0 ? '昨日' : '今日'; const x = ((t % 1440) + 1440) % 1440; return `${d} ${U.pad(Math.floor(x / 60))}:${U.pad(x % 60)}`; },
  whenText(t) { const x = ((t % 1440) + 1440) % 1440, h = Math.floor(x / 60); return t < 0 ? (h >= 17 ? `昨日の夜${h}時ごろ` : `昨日の${h}時ごろ`) : `今朝${h}時ごろ`; },

  gen(d) {
    const now = Math.floor(d.clock / 60), out = [], doms = Object.keys(DATA.airports).filter((k) => !DATA.airports[k].intl);
    const kinds = Object.keys(this.KINDS), colors = Object.keys(this.COLORS), marks = Object.keys(this.MARKS);
    for (let i = 0; i < this.N; i++) {
      const kind = U.pick(kinds), color = U.pick(colors), mark = U.pick(marks);
      const onBoard = U.chance(0.55), exists = i === 0 || !U.chance(0.2);
      const r = { kind, color, mark };
      let send = false;
      if (onBoard) {
        send = exists && U.chance(0.4);
        const from = U.pick(doms), num = 300 + U.int(1, 40) * 2;
        r.place = `TB ${num} 機内 ${U.int(3, 12)}${U.pick(['A', 'B', 'C', 'D', 'E', 'F'])}`;
        r.t = send ? -U.int(150, 420) : U.chance(0.4) ? -U.int(180, 400) : U.int(Math.min(360, now - 90), now - 50);
        r.from = DATA.airports[from].name.replace(/\(.*\)/, ''); r.flightNo = `TB ${num}`; r.seat = r.place.split(' ').pop();
        r.next = U.pick(doms.filter((x) => x !== from));
      } else {
        r.place = U.pick(this.SPOTS);
        r.t = U.chance(0.35) ? -U.int(120, 420) : U.int(Math.min(360, now - 100), now - 40);
      }
      // 見つかった物の記録
      const rec = (o) => ({ no: 'L-' + U.digits(4), kind, color, mark, place: r.place, store: 'here', ...o });
      const okT = () => r.t + (onBoard ? U.int(12, 45) : U.int(5, 35));
      const target = exists ? rec({ found: send ? r.t + U.int(160, 260) : okT(), store: send ? r.next : 'here' }) : null;
      const near = [
        () => rec({ mark: U.pick(marks.filter((m) => m !== mark)), found: okT() }),
        () => rec({ color: U.pick(this.SIMILAR[color]), found: okT() }),
        () => rec({ place: onBoard ? (U.chance(0.5) ? `TB ${+r.flightNo.slice(3) + U.pick([-2, 2, 20])} 機内 ${r.seat}` : `${r.flightNo} 機内 ${Seats.row(r.seat) + U.pick([-2, 1, 10])}${Seats.col(r.seat)}`) : U.pick(this.SPOTS.filter((x) => x !== r.place)), found: okT() }),
        () => rec({ found: r.t - U.int(60, 300) }),
      ];
      const recs = U.shuffle(near).slice(0, exists ? 3 : 4).map((f) => f());
      recs.push(rec({ kind: U.pick(kinds.filter((k) => k !== kind)), color: U.pick(colors), mark: U.pick(marks), found: okT() }));
      if (target) recs.push(target);
      for (const x of recs) { if (x.found > now - 3) x.found = now - U.int(3, 12); if (x.store !== 'here' && x.found <= r.t) x.found = r.t + 180; }
      const per = Gen.person(U.chance(0.15) ? U.pick(['US', 'KR', 'TW']) : 'JP');
      out.push({ ...per, id: Gen.uid++, kind: 'pax', title: per.sex === 'M' ? 'MR' : 'MS', age: U.int(10, 76), r, onBoard, recs: U.shuffle(recs), target, sel: null });
    }
    return out;
  },

  // 記録がお客様の物か(違えば、その理由)
  mismatch(g, x) {
    const r = g.r, tol = g.onBoard ? 0 : 15;
    if (x.kind !== r.kind) return `品物が違った(${this.KINDS[x.kind]})`;
    if (x.color !== r.color) return `色が違った(${x.color})`;
    if (x.mark !== r.mark) return `特徴が違った(${x.mark})`;
    if (x.place !== r.place) return `見つかった場所が違った(${x.place})`;
    if (x.found < r.t - tol) return `お客様がそこにいた時刻より前(${this.tm(x.found)})に見つかった物だった`;
    return null;
  },

  /* ===== 表示 ===== */
  enter() {
    this.s = { guests: this.gen(Game.day), idx: 0, cur: null, busy: false, ok: 0, ng: 0 };
    if (!Store.data.jobSeen.lost) { Store.data.jobSeen.lost = true; Store.save(); }
    document.getElementById('app').innerHTML = Hud.frame(`<div class="job-scene lost-scene">
      <section class="panel job-rules" aria-label="忘れ物の探し方">
        <header class="ph"><b>探し方</b><small>LOST &amp; FOUND</small></header>
        <ul class="rule-list">
          <li><b>見比べる</b>品物・色・特徴・見つかった場所が、すべて合う物</li>
          <li><b>時刻</b>お客様がそこにいた時刻より前に見つかった物は違う</li>
          <li><b>当空港で保管</b>選んで「お渡しする」</li>
          <li><b>ほかの空港で保管</b>選んで「取り寄せを手配」</li>
          <li><b>どれも違う</b>「届いていない」</li>
        </ul>
        <div class="job-prog" id="jprog"></div>
      </section>
      <section class="g-center">
        <div class="g-sign job-sign"><div class="gs-num lost"><small>DESK</small>?</div><div class="gs-info"><div class="gs-flight">忘れ物センター</div><div class="gs-dest">LOST &amp; FOUND <span>ただいま ${U.hm(Game.day.clock)}</span></div></div></div>
        <div class="reader lf-reader" id="reader" aria-live="polite"></div>
        <div class="acts g-acts" id="jacts"></div>
      </section>
      <section class="panel job-log" aria-label="対応の記録"><header class="ph"><b>対応の記録</b><small>LOG</small></header><ul class="mini-log" id="jlog"></ul></section>
    </div>`);
    this.next();
    Toast.show('忘れ物センターです。お客様の話と記録を見比べて、持ち主の物を探しましょう', 'info', 3800);
  },

  next() {
    const s = this.s;
    s.cur = s.guests[s.idx] || null; s.busy = false;
    if (!s.cur) { this.finish(); return; }
    this.render();
  },

  say(g) {
    const r = g.r, what = `${r.color}の${this.KINDS[r.kind]}`;
    const where = g.onBoard ? `${this.whenText(r.t)}に${r.from}から着いた${r.flightNo}便の機内、${r.seat}の座席に${what}を忘れてしまいました。` : `${this.whenText(r.t)}、${r.place}で${what}をなくしてしまいました。`;
    return where + this.MARKS[r.mark];
  },

  render(outKind, staff) {
    const s = this.s, g = s.cur, el = document.getElementById('reader'), N = s.guests.length;
    document.getElementById('jprog').innerHTML = `<div class="g-count"><b>${Math.min(s.idx + 1, N)}</b><span>/ ${N}人目</span></div><p class="small">正解 ${s.ok} · ミス ${s.ng}</p>`;
    if (!el || !g) return;
    const r = g.r, dis = s.busy ? 'disabled' : '', has = g.sel !== null && !s.busy;
    document.getElementById('jacts').innerHTML = `<button class="btn primary" data-act="here" ${has ? '' : 'disabled'}>お渡しする</button>
      <button class="btn" data-act="send" ${has ? '' : 'disabled'}>取り寄せを手配</button>
      <button class="btn danger" data-act="none" ${dis}>届いていない</button>`;
    const mood = outKind === 'bad' ? 'sad' : outKind ? 'happy' : 'neutral';
    const bubble = staff ? `<div class="bubble staff mini"><span class="who">あなた</span>${U.esc(staff)}</div>` : `<div class="bubble mini">${U.esc(this.say(g))}</div>`;
    el.innerHTML = `<div class="rs-left">
        <div class="reader-pax">${Art.figure(g, mood)}${bubble}</div>
        <dl class="rs-memo"><div><dt>品物</dt><dd>${this.KINDS[r.kind]}</dd></div><div><dt>色</dt><dd>${r.color}</dd></div><div><dt>特徴</dt><dd>${r.mark}</dd></div>
          <div><dt>場所</dt><dd>${g.onBoard ? `${r.flightNo}便 機内 ${r.seat}` : r.place}</dd></div><div><dt>時刻</dt><dd>${g.onBoard ? `${this.tm(r.t)} 着` : `${this.tm(r.t).split(' ')[0]} ${this.whenText(r.t).replace(/^(昨日の夜|昨日の|今朝)/, '')}`}</dd></div></dl>
      </div>
      <div class="rs-right">
        <p class="rs-head">見つかった物の記録(${g.recs.length}件)· 記録を選んでからボタンを押す</p>
        <div class="lf-list" role="group" aria-label="見つかった物">${g.recs.map((x, i) => `<button class="lf-rec ${g.sel === i ? 'sel' : ''}" data-act="rec" data-i="${i}" aria-pressed="${g.sel === i}" ${dis}>
          ${Art.lostItem(x.kind, this.COLORS[x.color], x.mark)}
          <span class="lf-main"><b>${this.KINDS[x.kind]}</b> · ${x.color} · ${x.mark}</span>
          <span class="lf-sub">${U.esc(x.place)} · ${this.tm(x.found)} 発見</span>
          <span class="lf-store ${x.store === 'here' ? '' : 'away'}">${x.store === 'here' ? '当空港で保管' : `${DATA.airports[x.store].name.replace(/\(.*\)/, '')}空港で保管`}</span>
          <span class="lf-no">${x.no}</span></button>`).join('')}</div>
      </div>`;
  },

  onAct(a, ds) {
    const s = this.s, g = s.cur; if (!g || s.busy) return;
    if (a === 'rec') { g.sel = +ds.i; Sfx.pop(); this.render(); }
    else if ((a === 'here' || a === 'send') && g.sel !== null) this.decide(a);
    else if (a === 'none') this.decide('none');
  },

  answer(g) { return !g.target ? 'none' : g.target.store === 'here' ? 'here' : 'send'; },

  decide(kind) {
    const s = this.s, g = s.cur; if (!g || s.busy) return;
    const ans = this.answer(g), t = g.target, x = kind === 'none' ? null : g.recs[g.sel];
    const where = t && t.store !== 'here' ? `${DATA.airports[t.store].name.replace(/\(.*\)/, '')}空港` : '';
    const right = t ? `正しくは ${t.no}(${ans === 'here' ? '当空港でお渡し' : `${where}から取り寄せ`})` : 'お客様の物は、まだ届いていなかった';
    let ok = false, why;
    if (kind === 'none') { ok = ans === 'none'; why = ok ? '似た物はあったが、お客様の物はまだ届いていなかった' : `お客様の物が届いていた。${right}`; }
    else if (x !== t) { why = `${x.no}は${this.mismatch(g, x) || 'お客様の物ではなかった'}。${right}`; }
    else if (kind !== ans) { why = ans === 'here' ? `${t.no}は当空港で保管している。その場でお渡しできた` : `${t.no}は${where}で保管している。取り寄せが必要だった`; }
    else { ok = true; why = ans === 'here' ? `${t.no}をお渡しした` : `${where}で保管している${t.no}の取り寄せを手配した`; }
    const pts = ok ? 50 : -80, name = `${g.family} ${g.given}`, label = { here: 'お渡し', send: '取り寄せ', none: '届いていない' }[kind];
    Game.addScore('mid', pts); Game.decision(ok);
    if (ok) { s.ok++; Sfx.good(); Toast.show(`<b>正解</b> ${U.esc(why)} <span class="pts">${U.signed(pts)}</span>`, 'ok', 2600); }
    else { s.ng++; Game.addSat(-4); Sfx.buzz(); Toast.show(`<b>ミス</b> ${U.esc(why)} <span class="pts">${U.signed(pts)}</span>`, 'bad', 5200); }
    Game.log({ area: 'mid', ok, name, flight: `${g.r.color}の${this.KINDS[g.r.kind]}`, text: why, pts });
    document.getElementById('jlog').insertAdjacentHTML('afterbegin', `<li class="${ok ? 'ok' : 'bad'}"><span>${ok ? 'OK' : 'ミス'}</span>${U.esc(name)} · ${label}</li>`);
    s.busy = true;
    const staff = kind === 'send' ? Talk.fill(DATA.staff.lost.send, { place: x && x.store !== 'here' ? `${DATA.airports[x.store].name.replace(/\(.*\)/, '')}空港` : 'ほかの空港' }) : DATA.staff.lost[kind];
    this.render(ok ? 'good' : 'bad', staff);
    setTimeout(() => { if (Game.scene !== this) return; s.idx++; this.next(); }, ok ? 700 : 1300);
  },

  update(dt) { Hud.tick(dt, 0); },

  finish() {
    const s = this.s, gf = Game.day.gateFlight;
    Modal.show({
      title: '忘れ物センター 終了',
      body: `<div class="sumgrid three"><div><small>正解</small><b>${s.ok}</b></div><div><small>ミス</small><b>${s.ng}</b></div><div><small>ここでの点数</small><b>${U.fmt(Game.day.score.mid)}</b></div></div>
        <p>次は <b>${gf.gate}番搭乗口</b> で <b>${gf.no}</b> の搭乗案内です。</p>`,
      actions: [{ label: `${gf.gate}番搭乗口へ向かう`, cls: 'primary', run: () => Game.go('gate') }],
    });
  },
};
