/* ---------- 予約カウンター(グランドスタッフに昇進すると加わる仕事) ----------
   お客様の希望(日付・人数・時間・運賃)を聞いて、検索結果の表から正しい便と運賃を選ぶ */
Scenes.reserve = {
  timed: true,
  N: 6,
  FARES: [
    { k: 'flex', name: 'フレックス', note: '変更できる', ahead: 0 },
    { k: 'value', name: 'バリュー', note: '3日前まで', ahead: 3 },
    { k: 'super', name: 'スーパーバリュー', note: '21日前まで', ahead: 21 },
  ],
  BASE: { FUK: 41000, OKA: 44000, CTS: 39000, ITM: 26000, KOJ: 40000 },
  NUM: { FUK: 300, OKA: 100, CTS: 200, ITM: 400, KOJ: 500 },
  SLOTS: ['07:05', '08:40', '10:15', '11:50', '13:30', '15:10', '17:20', '19:05'],
  TIME: {
    any: { text: '', memo: '指定なし', ok: () => true },
    am: { text: '午前中に出発する便で。', memo: '午前中に出発(12時より前)', ok: (f) => f.dep < U.t('12:00') },
    pm: { text: 'お昼過ぎの出発がいいです。', memo: '12時以降に出発', ok: (f) => f.dep >= U.t('12:00') },
    eve: { text: '仕事のあとなので、17時以降の出発で。', memo: '17時以降に出発', ok: (f) => f.dep >= U.t('17:00') },
    by: { text: '', memo: '', ok: (f, q) => f.arr <= q.by },
  },
  PREF: {
    cheap: { text: 'できるだけ安くお願いします。', memo: 'できるだけ安く' },
    flex: { text: '予定が変わるかもしれないので、あとで変更できるきっぷがいいです。', memo: 'あとで変更できる運賃' },
    early: { text: 'できるだけ早く着きたいです。', memo: '到着がいちばん早い便' },
  },

  /* ===== 問題づくり ===== */
  // 1日ぶんの時刻表と運賃・残席
  table(dest, date, k) {
    const block = (DATA.blockMin[dest] || 100) * 60, base = this.BASE[dest] || 35000;
    const idx = U.shuffle(this.SLOTS.map((_, i) => i)).slice(0, 5).sort((a, b) => a - b);
    return idx.map((si, i) => {
      const dep = U.t(this.SLOTS[si]), hour = Math.floor(dep / 3600);
      const peak = hour < 9 || hour >= 17 ? 1.12 : hour >= 11 && hour < 15 ? 0.94 : 1;
      const flex = Math.round(base * peak * U.float(0.97, 1.05) / 100) * 100 + i * 30;
      const value = Math.round(flex * U.float(0.56, 0.66) / 100) * 100 + i * 20;
      const sup = Math.round(flex * U.float(0.36, 0.44) / 100) * 100 + i * 10;
      // 残席は「安い運賃ほど少ない」入れ子(フレックスの残席がその便の空席)
      const all = U.weighted([0, U.int(1, 3), U.int(4, 8), U.int(9, 20)], [1, 3, 3, 3]);
      const sv = Math.min(all, U.weighted([0, 1, 2, U.int(3, 6)], [3, 2, 2, 2]));
      const sp = Math.min(sv, U.weighted([0, 1, 2, U.int(3, 5)], [4, 2, 2, 1]));
      return {
        no: `TB ${this.NUM[dest] + 11 + si * 2}`, dep, arr: dep + block,
        fares: {
          flex: { price: flex, seats: all, open: true },
          value: { price: value, seats: sv, open: k >= 3 },
          super: { price: sup, seats: sp, open: k >= 21 },
        },
      };
    });
  },

  // 条件に合う運賃か
  fits(q, di, f, r) {
    const c = f.fares[r];
    return di === q.di && c.open && c.seats >= q.n && this.TIME[q.time].ok(f, q) && (q.pref !== 'flex' || r === 'flex');
  },

  // 正解(なければ null)
  solve(q) {
    const cand = [];
    q.days[q.di].flights.forEach((f, fi) => { for (const F of this.FARES) if (this.fits(q, q.di, f, F.k)) cand.push({ fi, r: F.k, f, price: f.fares[F.k].price }); });
    if (!cand.length) return null;
    if (q.pref === 'early') cand.sort((a, b) => (a.f.arr - b.f.arr) || (a.price - b.price));
    else cand.sort((a, b) => a.price - b.price);
    if (cand.length > 1 && q.pref !== 'early' && cand[0].price === cand[1].price) return 'tie';
    return { di: q.di, fi: cand[0].fi, r: cand[0].r };
  },

  gen(d) {
    const dests = Object.keys(this.BASE), out = [];
    for (let i = 0; i < this.N; i++) {
      const wantNone = i > 0 && U.chance(0.17);
      let q = null;
      for (let tries = 0; tries < 80; tries++) {
        const dest = U.pick(dests), k = U.chance(0.55) ? U.int(22, 45) : U.int(2, 20);
        const di = U.int(0, 2), date = U.addDays(d.date, k);
        const dates = [-1, 0, 1].map((x) => U.addDays(date, x - (di - 1)));
        const c = {
          dest, date, di, n: U.weighted([1, 2, 3, 4], [4, 3.5, 1.5, 1]),
          time: U.weighted(['any', 'am', 'pm', 'eve', 'by'], [2.5, 2, 2, 1.5, 2]),
          pref: U.weighted(['cheap', 'flex', 'early'], [5.5, 2, 2.5]),
          days: dates.map((dt) => ({ date: dt, flights: this.table(dest, dt, Math.round((U.D(dt) - U.D(d.date)) / 864e5)) })),
        };
        if (c.time === 'by') {
          const arrs = c.days[c.di].flights.map((f) => f.arr).sort((a, b) => a - b);
          c.by = Math.ceil((arrs[U.int(1, 3)] + 600) / 1800) * 1800;
        }
        const ans = this.solve(c);
        if (ans === 'tie') continue;
        if (wantNone ? ans !== null : ans === null) continue;
        // 条件を見落とすと間違えるような問題を多めにする
        if (ans && tries < 40) {
          const naive = this.naive(c);
          if (naive && naive.fi === ans.fi && naive.r === ans.r && U.chance(0.7)) continue;
        }
        q = c; q.ans = ans; break;
      }
      if (!q) continue;
      const per = Gen.person('JP');
      out.push({ ...per, id: Gen.uid++, kind: 'pax', title: per.sex === 'M' ? 'MR' : 'MS', age: U.int(22, 74), q, tab: 0, sel: null });
    }
    return out;
  },

  // 日付だけ合わせて、いちばん安い運賃を選んだ場合(条件の見落とし)
  naive(q) {
    let best = null;
    q.days[q.di].flights.forEach((f, fi) => { for (const F of this.FARES) { const c = f.fares[F.k]; if (c.open && c.seats > 0 && (!best || c.price < best.price)) best = { fi, r: F.k, price: c.price }; } });
    return best;
  },

  /* ===== 表示 ===== */
  timeText(q) { return q.time === 'by' ? `${U.hm(q.by)}までに着きたいです。` : this.TIME[q.time].text; },
  timeMemo(q) { return q.time === 'by' ? `${U.hm(q.by)}までに到着` : this.TIME[q.time].memo; },

  enter() {
    const d = Game.day;
    this.s = { guests: this.gen(d), idx: 0, cur: null, busy: false, ok: 0, ng: 0 };
    if (!Store.data.jobSeen.reserve) { Store.data.jobSeen.reserve = true; Store.save(); }
    document.getElementById('app').innerHTML = Hud.frame(`<div class="job-scene reserve-scene">
      <section class="panel job-rules" aria-label="予約のルール">
        <header class="ph"><b>予約のルール</b><small>RESERVATIONS</small></header>
        <ul class="rule-list">
          <li><b>日付</b>タブをお客様の日付に合わせる</li>
          <li><b>人数</b>運賃の残席が人数分あること</li>
          <li><b>時間</b>出発・到着時刻の希望に合う便</li>
          <li><b>安く</b>条件に合う中でいちばん安い運賃</li>
          <li><b>変更できる</b>フレックスでいちばん安いもの</li>
          <li><b>早く着く</b>到着がいちばん早い便の最安運賃</li>
          <li><b>合う便がない</b>「便がない」と伝える</li>
        </ul>
        <div class="job-prog" id="jprog"></div>
      </section>
      <section class="g-center">
        <div class="g-sign job-sign"><div class="gs-num reserve"><small>DESK</small>予</div><div class="gs-info"><div class="gs-flight">予約カウンター</div><div class="gs-dest">RESERVATIONS <span>今日は${U.jpShort(d.date)}</span></div></div></div>
        <div class="reader rs-reader" id="reader" aria-live="polite"></div>
        <div class="acts g-acts" id="jacts"></div>
      </section>
      <section class="panel job-log" aria-label="対応の記録"><header class="ph"><b>対応の記録</b><small>LOG</small></header><ul class="mini-log" id="jlog"></ul></section>
    </div>`);
    this.next();
    Toast.show('予約カウンターです。お客様の希望に合う便と運賃を探しましょう', 'info', 3800);
  },

  next() {
    const s = this.s;
    s.cur = s.guests[s.idx] || null; s.busy = false;
    if (!s.cur) { this.finish(); return; }
    this.render();
  },

  render(outKind, staff) {
    const s = this.s, g = s.cur, el = document.getElementById('reader'), N = s.guests.length;
    document.getElementById('jprog').innerHTML = `<div class="g-count"><b>${Math.min(s.idx + 1, N)}</b><span>/ ${N}人目</span></div><p class="small">正解 ${s.ok} · ミス ${s.ng}</p>`;
    if (!el || !g) return;
    const q = g.q, day = q.days[g.tab], dis = s.busy ? 'disabled' : '';
    const selF = g.sel ? q.days[g.sel.di].flights[g.sel.fi] : null;
    document.getElementById('jacts').innerHTML = `<button class="btn primary" data-act="book" ${g.sel && !s.busy ? '' : 'disabled'}>${g.sel ? `${selF.no} ${this.FARES.find((F) => F.k === g.sel.r).name}で予約` : '便と運賃を選んでください'}</button>
      <button class="btn danger" data-act="none" ${dis}>ご希望の便がないと伝える</button>`;
    const dest = DATA.airports[q.dest].name;
    const mood = outKind === 'bad' ? 'sad' : outKind ? 'happy' : 'neutral';
    const bubble = staff ? `<div class="bubble staff mini"><span class="who">あなた</span>${U.esc(staff)}</div>`
      : `<div class="bubble mini">${U.esc(`${U.jpShort(q.date)}に${dest.replace(/\(.*\)/, '')}まで、${q.n}人分の予約をお願いします。`)}</div>`;
    const cell = (f, fi, F) => {
      const c = f.fares[F.k], on = g.sel && g.sel.di === g.tab && g.sel.fi === fi && g.sel.r === F.k;
      if (!c.open) return '<td><span class="rs-cell off">受付終了</span></td>';
      if (c.seats <= 0) return '<td><span class="rs-cell off">満席</span></td>';
      return `<td><button class="rs-cell ${on ? 'sel' : ''}" data-act="cell" data-fi="${fi}" data-r="${F.k}" aria-pressed="${on}" ${dis}><b>¥${U.fmt(c.price)}</b><small>残${c.seats >= 9 ? '9+' : c.seats}</small></button></td>`;
    };
    el.innerHTML = `<div class="rs-left">
        <div class="reader-pax">${Art.figure(g, mood)}${bubble}</div>
        <dl class="rs-memo"><div><dt>行き先</dt><dd>${dest}</dd></div><div><dt>日付</dt><dd>${U.jpShort(q.date)}</dd></div><div><dt>人数</dt><dd>大人${q.n}名</dd></div><div><dt>時間</dt><dd>${this.timeMemo(q)}</dd></div><div><dt>希望</dt><dd>${this.PREF[q.pref].memo}</dd></div></dl>
      </div>
      <div class="rs-right">
        <div class="rs-tabs" role="tablist">${q.days.map((x, i) => `<button class="rs-tab" role="tab" data-act="tab" data-i="${i}" aria-selected="${i === g.tab}" ${dis}>${U.jpShort(x.date)}</button>`).join('')}</div>
        <p class="rs-head">${DATA.home.name} → ${dest} · ${U.jpShort(day.date)} · 大人1名の運賃</p>
        <table class="rs-table"><thead><tr><th>便</th><th>時刻</th>${this.FARES.map((F) => `<th>${F.name}<small>${F.note}</small></th>`).join('')}</tr></thead>
          <tbody>${day.flights.map((f, fi) => `<tr><td><b>${f.no}</b></td><td class="rs-time">${U.hm(f.dep)}<small>→${U.hm(f.arr)}</small></td>${this.FARES.map((F) => cell(f, fi, F)).join('')}</tr>`).join('')}</tbody></table>
      </div>`;
  },

  onAct(a, ds) {
    const s = this.s, g = s.cur; if (!g || s.busy) return;
    if (a === 'tab') { g.tab = +ds.i; this.render(); }
    else if (a === 'cell') { g.sel = { di: g.tab, fi: +ds.fi, r: ds.r }; Sfx.pop(); this.render(); }
    else if (a === 'book' && g.sel) this.decide('book');
    else if (a === 'none') this.decide('none');
  },
  onKey(e) { if (e.key === 'Enter' && this.s.cur && this.s.cur.sel) this.decide('book'); },

  // 選んだ運賃がなぜ違うのか
  whyWrong(q, sel) {
    const f = q.days[sel.di].flights[sel.fi], c = f.fares[sel.r];
    if (sel.di !== q.di) return `日付が違った(${U.jpShort(q.days[sel.di].date)}を予約した)`;
    if (!this.TIME[q.time].ok(f, q)) return `時間の希望(${this.timeMemo(q)})に合わない便だった`;
    if (c.seats < q.n) return `その運賃の残席が${q.n}名分なかった`;
    if (q.pref === 'flex' && sel.r !== 'flex') return '変更できない運賃だった';
    return q.pref === 'early' ? 'もっと早く着く便・安い運賃があった' : 'もっと安い運賃があった';
  },
  ansText(q) {
    const a = q.ans; if (!a) return '';
    const f = q.days[a.di].flights[a.fi], F = this.FARES.find((x) => x.k === a.r);
    return `${U.jpShort(q.days[a.di].date)} ${f.no}(${U.hm(f.dep)}発) ${F.name} ¥${U.fmt(f.fares[a.r].price)}`;
  },

  decide(kind) {
    const s = this.s, g = s.cur; if (!g || s.busy) return;
    const q = g.q, a = q.ans;
    let ok, why;
    if (kind === 'none') { ok = !a; why = ok ? '条件に合う便がなかった' : `予約できる便があった。正しくは ${this.ansText(q)}`; }
    else {
      ok = !!a && g.sel.di === a.di && g.sel.fi === a.fi && g.sel.r === a.r;
      why = ok ? this.ansText(q) : `${this.whyWrong(q, g.sel)}。${a ? `正しくは ${this.ansText(q)}` : '条件に合う便はなかった'}`;
    }
    const pts = ok ? 50 : -80, name = `${g.family} ${g.given}`, label = kind === 'none' ? '便がないと案内' : '予約';
    Game.addScore('mid', pts); Game.decision(ok);
    if (ok) { s.ok++; Sfx.good(); Toast.show(`<b>正解</b> ${U.esc(why)} <span class="pts">${U.signed(pts)}</span>`, 'ok', 2600); }
    else { s.ng++; Game.addSat(-4); Sfx.buzz(); Toast.show(`<b>ミス</b> ${U.esc(why)} <span class="pts">${U.signed(pts)}</span>`, 'bad', 5200); }
    Game.log({ area: 'mid', ok, name, flight: DATA.airports[q.dest].name.replace(/\(.*\)/, '') + '行き', text: ok ? `${label}(${why})` : why, pts });
    document.getElementById('jlog').insertAdjacentHTML('afterbegin', `<li class="${ok ? 'ok' : 'bad'}"><span>${ok ? 'OK' : 'ミス'}</span>${U.esc(name)} · ${label}</li>`);
    s.busy = true;
    this.render(ok ? 'good' : 'bad', kind === 'none' ? DATA.staff.reserve.none : DATA.staff.reserve.ok);
    setTimeout(() => { if (Game.scene !== this) return; s.idx++; this.next(); }, ok ? 700 : 1300);
  },

  update(dt) { Hud.tick(dt, 0); },

  finish() {
    const s = this.s, gf = Game.day.gateFlight;
    Modal.show({
      title: '予約カウンター 終了',
      body: `<div class="sumgrid three"><div><small>正解</small><b>${s.ok}</b></div><div><small>ミス</small><b>${s.ng}</b></div><div><small>ここでの点数</small><b>${U.fmt(Game.day.score.mid)}</b></div></div>
        <p>次は <b>${gf.gate}番搭乗口</b> で <b>${gf.no}</b> の搭乗案内です。</p>`,
      actions: [{ label: `${gf.gate}番搭乗口へ向かう`, cls: 'primary', run: () => Game.go('gate') }],
    });
  },
};
