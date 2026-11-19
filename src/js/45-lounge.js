/* ---------- ラウンジ受付(チーフになると加わる仕事) ---------- */
Scenes.lounge = {
  timed: true,
  N: 8,

  // お客様を作る(ひっかけ:期限切れのカード・他人のカード・他社や明日の搭乗券)
  gen(d) {
    const flights = [d.gateFlight, ...d.fillers];
    const out = [];
    for (let i = 0; i < this.N; i++) {
      const f = U.pick(flights);
      const nat = f.ap.intl && U.chance(0.4) ? (f.ap.country || 'US') : 'JP';
      const per = Gen.person(nat);
      const cls = U.chance(0.4) ? 'J' : 'Y';
      const x = U.r(), tier = x < 0.28 ? null : x < 0.44 ? 'SILVER' : x < 0.72 ? 'GOLD' : 'PLATINUM';
      const seat = cls === 'J' ? U.pick(['1A', '1C', '2D', '2F']) : `${U.int(3, 12)}${U.pick(['A', 'B', 'C', 'D', 'E', 'F'])}`;
      const g = {
        id: Gen.uid++, kind: 'pax', ...per, title: per.sex === 'M' ? 'MR' : 'MS', age: U.int(24, 72),
        companions: U.weighted([0, 1, 2], [6, 3.5, 1.3]), cls,
        pass: { family: per.family, given: per.given, title: per.sex === 'M' ? 'MR' : 'MS', flightNo: f.no, dest: f.dest, date: d.date, gate: f.gate, boarding: U.hm(f.dep - 1800), seat, group: Seats.group(seat), priority: false, cls, air: 'TB' },
        card: tier ? { tier, name: `${per.family} ${per.given}`, no: 'TB ' + U.digits(4) + ' ' + U.digits(4), expiry: U.addDays(d.date, U.int(20, 700)) } : null,
      };
      g.compAv = Array.from({ length: g.companions }, () => Gen.avatar(nat, U.chance(0.5) ? 'M' : 'F'));
      const t = U.r();
      if (t < 0.11 && g.card) g.card.expiry = U.addDays(d.date, -U.int(3, 200));
      else if (t < 0.21 && g.card) { const o = Gen.person(nat); g.card.name = `${o.family === per.family ? Gen.tweak(o.family) : o.family} ${o.given}`; }
      else if (t < 0.28) { Object.assign(g.pass, { air: 'HY', airEn: 'HAYATE AIR', flightNo: 'HY ' + U.int(101, 899) }); }
      else if (t < 0.34) g.pass.date = U.addDays(d.date, 1);
      out.push(g);
    }
    return out;
  },

  // 正解(ok / fee / no)と、その理由
  answer(g, d) {
    const nm = `${g.family} ${g.given}`;
    const passOk = g.pass.air === 'TB' && g.pass.date === d.date;
    const cardOk = !!g.card && g.card.expiry >= d.date && g.card.name === nm;
    const tier = cardOk ? g.card.tier : null;
    let why = '';
    if (g.pass.air !== 'TB') why = '他社の搭乗券だった';
    else if (g.pass.date !== d.date) why = '今日の便の搭乗券ではなかった';
    else if (g.card && !cardOk) why = g.card.expiry < d.date ? '会員カードの有効期限が切れていた' : '会員カードの名前が搭乗券と違った(他人のカード)';
    if (!passOk || !(g.cls === 'J' || tier === 'GOLD' || tier === 'PLATINUM')) {
      return { ans: 'no', why: why || (g.card ? 'シルバー会員でエコノミーの方は入れない' : '会員でなくエコノミーの方は入れない') };
    }
    const free = tier === 'PLATINUM' ? 1 : 0;
    if (g.companions > free) return { ans: 'fee', why: free ? 'プラチナ会員の無料は同伴1名まで' : 'お連れの方はラウンジ券(有料)' };
    return { ans: 'ok', why: g.cls === 'J' ? 'ビジネスクラスの方' : `${DATA.tiers[tier].name}会員の方` + (g.companions ? '(同伴1名まで無料)' : '') };
  },

  enter() {
    const d = Game.day;
    this.s = { guests: this.gen(d), idx: 0, cur: null, busy: false, ok: 0, ng: 0, log: [] };
    if (!Store.data.jobSeen.lounge) { Store.data.jobSeen.lounge = true; Store.save(); }
    document.getElementById('app').innerHTML = Hud.frame(`<div class="job-scene">
      <section class="panel job-rules" aria-label="ラウンジのルール">
        <header class="ph"><b>入室のルール</b><small>LOUNGE RULES</small></header>
        <ul class="rule-list">
          <li><b>入れる</b>ビジネス(J)の搭乗券 / ゴールド・プラチナ会員</li>
          <li><b>入れない</b>エコノミーで、シルバー会員か会員でない方</li>
          <li><b>同伴者</b>プラチナ会員は1名まで無料。それ以外は有料</li>
          <li><b>確認</b>TBの今日の便か。カードの名前と有効期限</li>
        </ul>
        <div class="job-prog" id="jprog"></div>
      </section>
      <section class="g-center">
        <div class="g-sign job-sign"><div class="gs-num lounge"><small>LOUNGE</small>TB</div><div class="gs-info"><div class="gs-flight">つばさラウンジ</div><div class="gs-dest">TSUBASA LOUNGE <span>ラウンジ受付</span></div></div></div>
        <div class="reader" id="reader" aria-live="polite"></div>
        <div class="acts g-acts" id="jacts"></div>
        <p class="g-keys">キーボード: <span class="kbd">1</span>ご案内 <span class="kbd">2</span>同伴者は有料 <span class="kbd">3</span>お断り</p>
      </section>
      <section class="panel job-log" aria-label="対応の記録"><header class="ph"><b>対応の記録</b><small>LOG</small></header><ul class="mini-log" id="jlog"></ul></section>
    </div>`);
    this.next();
    Toast.show('ラウンジ受付です。搭乗券と会員カードを見て、入れるかを判断しましょう', 'info', 3800);
  },

  next() {
    const s = this.s;
    s.cur = s.guests[s.idx] || null; s.busy = false;
    if (!s.cur) { this.finish(); return; }
    this.render('in');
  },

  render(anim, outKind, staff) {
    const s = this.s, g = s.cur, el = document.getElementById('reader');
    document.getElementById('jprog').innerHTML = `<div class="g-count"><b>${Math.min(s.idx + 1, this.N)}</b><span>/ ${this.N}人目</span></div><p class="small">正解 ${s.ok} · ミス ${s.ng}</p>`;
    const dis = !g || s.busy ? 'disabled' : '';
    document.getElementById('jacts').innerHTML = `<button class="btn primary" data-act="ok" ${dis}>ご案内する<span class="kbd">1</span></button>
      <button class="btn" data-act="fee" ${dis}>同伴者は有料と案内<span class="kbd">2</span></button>
      <button class="btn danger" data-act="no" ${dis}>お断りする<span class="kbd">3</span></button>`;
    if (!el || !g) return;
    const line = Talk.line({ nat: g.nat, flight: Game.day.gateFlight }, 'lg_' + g.companions);
    const comps = g.compAv.map((av) => `<div class="fig comp">${Art.avatar(av, 'neutral')}</div>`).join('');
    const mood = outKind === 'no' ? 'sad' : outKind ? 'happy' : 'neutral';
    el.innerHTML = `<div class="reader-pax">${Art.figure(g, mood, { extra: comps })}
        ${staff ? `<div class="bubble staff mini"><span class="who">あなた</span>${U.esc(staff)}</div>` : `<div class="bubble mini">${U.esc(line.main)}${line.gloss ? `<small>${U.esc(line.gloss)}</small>` : ''}</div>`}</div>
      <div class="reader-pass lounge-docs ${anim === 'in' ? 'in' : ''} ${outKind ? 'out-hold' : ''}">${Docs.bpass(g.pass)}${g.card ? Docs.memberCard(g.card) : '<div class="doc missing small-doc"><b>会員カードなし</b><small>NO MEMBERSHIP</small></div>'}</div>`;
  },

  onAct(a) { if (a === 'ok' || a === 'fee' || a === 'no') this.decide(a); },
  onKey(e) { const k = e.key; if (k === '1') this.decide('ok'); else if (k === '2') this.decide('fee'); else if (k === '3') this.decide('no'); },

  decide(kind) {
    const s = this.s, g = s.cur, d = Game.day; if (!g || s.busy) return;
    const { ans, why } = this.answer(g, d), ok = kind === ans, pts = ok ? 40 : -80;
    const name = `${g.family} ${g.given}`;
    const labels = { ok: 'ご案内', fee: '同伴者は有料', no: 'お断り' };
    Game.addScore('mid', pts); Game.decision(ok);
    if (ok) { s.ok++; Sfx.good(); Toast.show(`<b>正解</b> ${labels[ans]}(${why}) <span class="pts">${U.signed(pts)}</span>`, 'ok', 2600); }
    else { s.ng++; Game.addSat(-4); Sfx.buzz(); Toast.show(`<b>ミス</b> 正しくは「${labels[ans]}」。${why} <span class="pts">${U.signed(pts)}</span>`, 'bad', 4600); }
    Game.log({ area: 'mid', ok, name, flight: g.pass.flightNo, text: ok ? `${labels[ans]}(${why})` : `「${labels[kind]}」にしたが、正しくは「${labels[ans]}」。${why}`, pts });
    document.getElementById('jlog').insertAdjacentHTML('afterbegin', `<li class="${ok ? 'ok' : 'bad'}"><span>${ok ? 'OK' : 'ミス'}</span>${U.esc(name)} · ${labels[kind]}</li>`);
    s.busy = true;
    this.render(null, kind, DATA.staff.lounge[kind]);
    setTimeout(() => { if (Game.scene !== this) return; s.idx++; this.next(); }, ok ? 650 : 1100);
  },

  update(dt) { Hud.tick(dt, 0); },

  finish() {
    const s = this.s, gf = Game.day.gateFlight;
    Modal.show({
      title: 'ラウンジ受付 終了',
      body: `<div class="sumgrid three"><div><small>正解</small><b>${s.ok}</b></div><div><small>ミス</small><b>${s.ng}</b></div><div><small>ここでの点数</small><b>${U.fmt(Game.day.score.mid)}</b></div></div>
        <p>次は <b>${gf.gate}番搭乗口</b> で <b>${gf.no}</b> の搭乗案内です。</p>`,
      actions: [{ label: `${gf.gate}番搭乗口へ向かう`, cls: 'primary', run: () => Game.go('gate') }],
    });
  },
};
