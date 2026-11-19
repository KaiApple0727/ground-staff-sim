/* ---------- 搭乗ゲート ---------- */
Scenes.gate = {
  timed: true,

  enter() {
    const d = Game.day, f = d.gateFlight;
    d.clock = Math.max(d.clock, f.boarding);
    f.phase = 'boarding';
    const man = Gen.gateManifest(d);
    const ev = Gen.gateEvents(d, man);
    if (ev.newGate) f.gate = ev.newGate;   // 搭乗券は前の番号のまま
    this.s = {
      f, list: man.list, wrongs: man.wrongs, call: -1, line: [], cur: null, curVol: null, nextFeed: 0, curIn: 0, waiting: false, closed: false,
      finalAt: null, extraDelay: 0, announce: '', busy: false, doorWarned: false, scanned: 0, stT: 0,
      ev, ob: ev.ob || null, removed: ev.removed || null,
    };
    const s = this.s;
    for (const g of s.list) if (g.state === 'away' && g.arriveAt !== null && g.arriveAt <= d.clock) g.state = 'lounge';
    if (ev.newGate) s.announce = `搭乗口変更のお知らせです。つばさ航空${f.num}便、${f.ap.name}行きは、${ev.oldGate}番から${ev.newGate}番搭乗口に変更となりました。`;
    document.getElementById('app').innerHTML = Hud.frame(`<div class="gate-scene">
      <section class="panel g-status" id="gstatus" aria-label="搭乗状況"></section>
      <section class="g-center">
        <div class="g-sign" id="gsign"></div>
        <div class="reader" id="reader" aria-live="polite"></div>
        <div class="acts g-acts" id="gacts"></div>
        <p class="g-keys" id="gkeys"></p>
      </section>
      <section class="panel g-ann" id="gann" aria-label="アナウンス"></section>
    </div>`);
    this.renderAll();
    const notes = [];
    if (ev.newGate) notes.push(`<li><b>搭乗口変更</b> ${f.no}便は ${ev.oldGate}番 → <b>${ev.newGate}番</b> に変わりました。${d.n === 6 ? 'お客様の搭乗券には変更前の番号が書かれています。通してよいかは<b>便名</b>で決めましょう。' : ''}</li>`);
    if (s.removed) notes.push('<li><b>機材変更</b> 小さい飛行機に変わり、<b>11・12列の座席がなくなりました</b>。その列の搭乗券は「座席を変更して通す」。</li>');
    if (s.ob) notes.push(`<li><b>オーバーブッキング</b> 予約が座席より<b>${s.ob.need}名分</b>多くなっています。搭乗を始める前に、便を変えてくれるお客様を募りましょう。</li>`);
    if (notes.length) {
      Sfx.chimeShort();
      Modal.show({ title: `${f.gate}番搭乗口からのお知らせ`, body: `<ul class="notice-list">${notes.join('')}</ul>`, actions: [{ label: 'わかりました', cls: 'primary' }] });
    } else Toast.show(`${f.gate}番搭乗口に着きました。まずは「事前改札」のアナウンスから始めましょう`, 'info', 4200);
  },

  // まだ搭乗の対象になっているお客様(振替に協力した人・お断りした人を除く)
  act() { return this.s.list.filter((g) => g.state !== 'rebooked' && g.state !== 'denied'); },
  obActive() { const ob = this.s.ob; return !!(ob && !ob.done); },

  update(dt) {
    const d = Game.day, s = this.s, f = s.f;
    for (const x of d.flights) if (!x.isGate && !x.canceled && x.phase !== 'departed' && d.clock >= x.dep) x.phase = 'departed';
    if (s.closed) { Hud.tick(dt, 0); return; }
    // 最終案内のあと、遅れているお客様を待つだけの時間は早送りする
    s.waiting = s.call >= 4 && !s.cur && !s.line.length && !s.list.some((g) => g.state === 'lounge') && !s.wrongs.some((w) => w.state === 'lounge');
    const speed = CONFIG.gateSpeed * (s.waiting ? 6 : 1);
    d.clock += dt * speed;
    let ch = false;

    for (const g of s.list) if (g.state === 'away' && g.arriveAt !== null && g.arriveAt <= d.clock) { g.state = 'lounge'; ch = true; }
    for (const w of s.wrongs) if (w.state === 'away' && w.spawnAt <= d.clock) w.state = 'lounge';

    // オーバーブッキング:協力を申し出たお客様が順に来る
    if (this.obActive() && s.ob.announced && !s.cur && !s.busy) {
      const c = s.ob.cands.shift();
      if (c) { s.cur = c.g; s.curVol = c; this.renderReader('in'); this.renderActs(); }
      else this.finishOb();
    }

    // 列が空になったら、すぐ次のお客様が並ぶ
    if (s.call >= 0 && (d.clock >= s.nextFeed || (!s.line.length && !s.cur))) {
      const c = this.pickNext();
      if (c) { c.state = 'line'; s.line.push(c); ch = true; }
      s.nextFeed = d.clock + U.int(3, 6);
    }
    if (!s.cur && s.line.length && !s.busy) {
      s.curIn -= dt;
      if (s.curIn <= 0) { s.cur = s.line.shift(); this.renderReader('in'); this.renderActs(); ch = true; }
    }
    if (!s.doorWarned && d.clock >= f.door) {
      s.doorWarned = true;
      Toast.show('<b>ドアクローズの時刻です。</b>これ以降は遅延になります。急いで搭乗を締め切りましょう', 'bad', 5000);
      Sfx.buzz();
    }
    if (ch) { this.renderStatus(); this.renderAnn(); }
    s.stT += dt;
    if (s.stT > 0.5) { s.stT = 0; this.renderSign(); this.renderAnnButtons(); }
    Hud.tick(dt, CONFIG.gateSpeed, s.waiting);
  },

  // 次に列に加わるお客様を選ぶ
  pickNext() {
    const s = this.s, items = [], w = [];
    for (const g of s.list) {
      if (g.state !== 'lounge') continue;
      if (g.group <= s.call) { items.push(g); w.push(3); }
      else if (g.impatient && !g.heldOnce) { items.push(g); w.push(1.1); }
    }
    for (const x of s.wrongs) if (x.state === 'lounge') { items.push(x); w.push(1.3); }
    return items.length ? U.weighted(items, w) : null;
  },

  eligibleWaiting() {
    const s = this.s;
    return s.list.some((g) => (g.state === 'lounge' || g.state === 'line') && g.group <= s.call) || (s.cur && s.cur.kind === 'pax' && !s.curVol && s.cur.group <= s.call);
  },
  canCall() { const s = this.s; return !s.closed && !this.obActive() && s.call < 4 && (s.call < 0 || !this.eligibleWaiting()); },
  canClose() { const s = this.s; return !s.closed && s.call >= 4 && !s.cur && !s.line.length; },
  isDisplaced(g) { const s = this.s; return !!(s.removed && g.kind === 'pax' && s.removed.includes(Seats.row(g.seat))); },

  /* ===== 表示 ===== */
  renderAll() { this.renderSign(); this.renderStatus(); this.renderReader(); this.renderActs(); this.renderAnn(); },

  renderSign() {
    const s = this.s, f = s.f, d = Game.day, el = document.getElementById('gsign'); if (!el) return;
    const left = Math.ceil((f.door - d.clock) / 60);
    const call = s.closed ? '締切' : this.obActive() ? '協力者募集' : s.call < 0 ? '準備中' : DATA.calls[s.call].label;
    const evs = [];
    if (s.ev.newGate) evs.push(`<span class="ev">搭乗口変更 ${s.ev.oldGate}→${s.ev.newGate}</span>`);
    if (s.removed) evs.push('<span class="ev">機材変更:11・12列なし</span>');
    el.innerHTML = `<div class="gs-num"><small>搭乗口 GATE</small>${f.gate}</div>
      <div class="gs-info"><div class="gs-flight">${f.no}</div><div class="gs-dest">${f.ap.name} <span>${f.ap.en}</span></div>
        <div class="gs-time">出発 ${U.hm(f.dep)} · ドアクローズ ${U.hm(f.door)} ${s.closed ? '' : left > 0 ? `<b>あと${left}分</b>` : `<b class="late">${-left}分超過</b>`}</div>
        ${evs.length ? `<div class="gs-ev">${evs.join('')}</div>` : ''}</div>
      <div class="gs-call"><small>案内中</small><b>${call}</b></div>`;
  },

  renderStatus() {
    const s = this.s, el = document.getElementById('gstatus'); if (!el) return;
    const pax = this.act(), boarded = pax.filter((g) => g.state === 'boarded').length;
    const rows = [0, 1, 2, 3].map((gr) => {
      const all = pax.filter((g) => g.group === gr);
      const on = all.filter((g) => g.state === 'boarded').length;
      const here = all.filter((g) => g.state === 'lounge' || g.state === 'line').length;
      const away = all.filter((g) => g.state === 'away').length;
      return `<tr class="${gr <= s.call ? 'called' : ''}"><td>${gr === 0 ? '事前改札' : 'グループ' + gr}</td><td>${on}/${all.length}</td><td>${here}</td><td>${away}</td></tr>`;
    }).join('');
    const missing = pax.filter((g) => g.state === 'away');
    const reb = s.list.filter((g) => g.state === 'rebooked').length, den = s.list.filter((g) => g.state === 'denied').length;
    el.innerHTML = `<header class="ph"><b>搭乗状況</b><small>BOARDING</small></header>
      <div class="g-count"><b>${boarded}</b><span>/ ${pax.length}名 搭乗済み</span></div>
      <div class="g-progress"><i style="width:${(boarded / Math.max(1, pax.length)) * 100}%"></i></div>
      <table class="gtable"><thead><tr><th></th><th>搭乗</th><th>ゲート前</th><th>未到着</th></tr></thead><tbody>${rows}</tbody></table>
      ${reb || den ? `<p class="g-line small">振替に協力 ${reb}名${den ? ` · 搭乗お断り ${den}名` : ''}</p>` : ''}
      <p class="g-line">列に並んでいる人: <b>${s.line.length + (s.cur && !s.curVol ? 1 : 0)}</b>名</p>
      <h4 class="sub-h">まだ来ていないお客様</h4>
      ${missing.length ? `<ul class="missing-list">${missing.slice(0, 4).map((g) => `<li><span>${U.esc(g.family)} ${U.esc(g.given)}</span><span class="mono">${g.seat}</span>${g.hasBag ? '<span class="pill warn">荷物あり</span>' : '<span class="pill">荷物なし</span>'}</li>`).join('')}</ul>${missing.length > 4 ? `<p class="mute small">ほか ${missing.length - 4}名</p>` : ''}` : '<p class="mute small">全員ゲートに来ています</p>'}`;
  },

  passData(g) { return { family: g.family, given: g.given, title: g.title, flightNo: g.flightNo, dest: g.dest, date: g.date, gate: g.gate, boarding: g.boarding, seat: g.seat, group: g.group, priority: g.priority, cls: g.cls || Seats.clsOf(g.seat) }; },

  renderReader(anim, outKind, staff) {
    const s = this.s, el = document.getElementById('reader'); if (!el) return;
    const g = s.cur;
    if (!g) {
      let title, sub = '';
      if (s.closed) title = '搭乗を締め切りました';
      else if (this.obActive()) { title = '搭乗の前に、協力者の募集'; sub = '右の「協力のお願いをアナウンス」を押すと、便の変更に協力してくれるお客様が来ます'; }
      else if (s.call < 0) { title = '搭乗を始めましょう'; sub = '右の「事前改札」をアナウンスすると、お客様が並び始めます'; }
      else if (s.waiting) { title = '最終案内のあと'; sub = 'まだ来ていないお客様を待っています(早送り中)。待つのをやめるなら「搭乗締切」'; }
      else { title = '次のお客様を呼んでいます'; sub = s.line.length ? '' : this.canCall() ? '案内中のグループは全員通りました。次のグループをアナウンスしましょう' : ''; }
      el.innerHTML = `<div class="reader-empty"><b>${title}</b><span>${sub}</span></div>`;
      return;
    }
    const mood = outKind === 'hold' || outKind === 'no' ? 'sad' : outKind === 'redirect' ? 'surprised' : outKind ? 'happy' : 'neutral';
    let bubble = '';
    if (staff) bubble = `<div class="bubble staff mini"><span class="who">あなた</span>${U.esc(staff)}</div>`;
    else if (s.curVol) { const l = Talk.line({ nat: g.nat, flight: s.f }, 'vol_' + s.curVol.kind); bubble = `<div class="bubble mini">${U.esc(l.main)}${l.gloss ? `<small>${U.esc(l.gloss)}</small>` : ''}</div>`; }
    el.innerHTML = `<div class="reader-pax">${Art.figure(g, mood, { noEscort: true })}${bubble}</div>
      <div class="reader-pass ${anim === 'in' ? 'in' : ''} ${outKind ? 'out-' + (outKind === 'scan' || outKind === 'reseat' ? 'scan' : 'hold') : ''}">${s.curVol ? '<div class="vol-tag">協力のお申し出</div>' : ''}${Docs.bpass(this.passData(g))}</div>`;
  },

  renderActs() {
    const s = this.s, el = document.getElementById('gacts'), keys = document.getElementById('gkeys'); if (!el) return;
    const dis = !s.cur || s.busy || s.closed ? 'disabled' : '';
    if (s.curVol || this.obActive()) {
      el.innerHTML = `<button class="btn primary" data-act="vol-today" ${dis}>後続便でお願い<span class="kbd">1</span></button>
        <button class="btn" data-act="vol-next" ${dis}>翌日の便でお願い<span class="kbd">2</span></button>
        <button class="btn danger" data-act="vol-no" ${dis}>今回は見送る<span class="kbd">3</span></button>`;
      if (keys) keys.innerHTML = 'キーボード: <span class="kbd">1</span>後続便 <span class="kbd">2</span>翌日の便 <span class="kbd">3</span>見送る <span class="kbd">A</span>アナウンス';
      return;
    }
    el.innerHTML = `<button class="btn primary" data-act="scan" ${dis}>通す(スキャン)<span class="kbd">1</span></button>
      <button class="btn" data-act="hold" ${dis}>お待ちいただく<span class="kbd">2</span></button>
      <button class="btn danger" data-act="redirect" ${dis}>ゲート違いを案内<span class="kbd">3</span></button>
      ${s.removed ? `<button class="btn warn" data-act="reseat" ${dis}>座席を変更して通す<span class="kbd">4</span></button>` : ''}`;
    if (keys) keys.innerHTML = `キーボード: <span class="kbd">1</span>通す <span class="kbd">2</span>待ってもらう <span class="kbd">3</span>ゲート違い ${s.removed ? '<span class="kbd">4</span>座席変更 ' : ''}<span class="kbd">A</span>アナウンス`;
  },

  renderAnn() {
    const s = this.s, el = document.getElementById('gann'); if (!el) return;
    const ob = s.ob;
    const obBox = ob ? `<div class="ob-box ${ob.done ? 'done' : ''}">
        <div class="ob-head"><b>オーバーブッキング</b><span>協力 <b>${ob.got}</b> / ${ob.need}名</span></div>
        ${ob.done ? '' : `<p>予約が座席より${ob.need}名分多い${s.removed ? '(機材変更のため)' : ''}。便を変えてくれる方を募ります。</p>
        <p class="small mute">後続便 ${ob.later.no} ${U.hm(ob.later.dep)}発=1万円 / 翌日=2万円+宿泊</p>`}</div>` : '';
    el.innerHTML = `<header class="ph"><b>アナウンス</b><small>ANNOUNCEMENT</small></header>${obBox}
      ${this.obActive() ? '<p class="calls-wait">搭乗の案内(事前改札〜最終案内)は、協力者の募集が終わってから</p>' : `<ol class="calls">${DATA.calls.map((c, i) => `<li class="${i <= s.call ? 'done' : i === s.call + 1 && !s.closed && !this.obActive() ? 'next' : ''}"><span class="cn">${i === 0 ? '0' : i === 4 ? '!' : i}</span><b>${c.label}</b><small>${c.sub}</small></li>`).join('')}</ol>`}
      <div id="annbtns"></div>
      <div class="ann-text">${s.announce ? `<span class="chime">ピンポーン</span>${U.esc(s.announce)}` : '<span class="mute">アナウンスはまだありません</span>'}</div>`;
    this.renderAnnButtons();
  },

  renderAnnButtons() {
    const s = this.s, el = document.getElementById('annbtns'); if (!el) return;
    let h;
    if (this.obActive() && !s.ob.announced) h = '<button class="btn primary" data-act="ob-ann">協力のお願いをアナウンス<span class="kbd">A</span></button>';
    else if (this.obActive()) h = `<p class="hint">協力を申し出たお客様に対応しています(残り${s.ob.cands.length + (s.curVol ? 1 : 0)}名)</p>`;
    else {
      const cc = this.canCall(), cl = this.canClose();
      const next = s.call < 4 ? DATA.calls[s.call + 1] : null;
      let why = '';
      if (!s.closed && next && !cc) why = '案内中のグループのお客様が全員通ると、次を案内できます';
      if (!s.closed && s.call >= 4 && !cl) why = '列のお客様の対応が終わると締め切れます';
      h = `${next && !s.closed ? `<button class="btn primary" data-act="call" ${cc ? '' : 'disabled'}>「${next.label}」をアナウンス<span class="kbd">A</span></button>` : ''}
        ${s.call >= 4 && !s.closed ? `<button class="btn danger big" data-act="close" ${cl ? '' : 'disabled'}>搭乗締切(ドアクローズ)</button>` : ''}
        ${why ? `<p class="hint">${why}</p>` : ''}`;
    }
    if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h; }
  },

  /* ===== 操作 ===== */
  onAct(a) {
    if (a === 'call') this.callNext();
    else if (a === 'ob-ann') this.obAnnounce();
    else if (a === 'close') this.tryClose();
    else if (a === 'vol-today') this.volDecide('today');
    else if (a === 'vol-next') this.volDecide('next');
    else if (a === 'vol-no') this.volDecide('no');
    else if (a === 'scan' || a === 'hold' || a === 'redirect' || a === 'reseat') this.decide(a);
  },
  onKey(e) {
    const k = e.key.toLowerCase(), s = this.s;
    if (s.curVol) {
      if (k === '1') this.volDecide('today'); else if (k === '2') this.volDecide('next'); else if (k === '3') this.volDecide('no');
      return;
    }
    if (k === '1') this.decide('scan');
    else if (k === '2') this.decide('hold');
    else if (k === '3') this.decide('redirect');
    else if (k === '4' && s.removed) this.decide('reseat');
    else if (k === 'a') { if (this.obActive() && !s.ob.announced) this.obAnnounce(); else if (this.canCall()) this.callNext(); }
  },

  callNext() {
    const s = this.s, d = Game.day, f = s.f;
    if (!this.canCall()) return;
    s.call++;
    const c = DATA.calls[s.call];
    s.announce = Talk.fill(c.ann, { num: f.num, dest: f.ap.name, gate: f.gate });
    Sfx.chime(); Speech.say(s.announce);
    if (s.call === 4) {
      s.finalAt = d.clock;
      // 来ていないお客様は、最終案内から1分半以内に急いで来る(来ない人を除く)
      for (const g of s.list) if (g.state === 'away' && !g.neverShow) g.arriveAt = Math.min(g.arriveAt === null ? Infinity : g.arriveAt, d.clock + U.int(20, 90));
    }
    s.nextFeed = d.clock;
    this.renderAll();
  },

  /* ----- オーバーブッキング ----- */
  obAnnounce() {
    const s = this.s, f = s.f;
    if (!this.obActive() || s.ob.announced) return;
    s.ob.announced = true;
    s.announce = `つばさ航空${f.num}便、${f.ap.name}行きは、ご予約が座席数を上回っております。後の便へのご変更にご協力いただけるお客様は、搭乗口の係員までお申し出ください。協力金をご用意しております。`;
    Sfx.chime(); Speech.say(s.announce);
    this.renderAll();
  },

  volDecide(kind) {
    const s = this.s, c = s.curVol, ob = s.ob, SC = CONFIG.score;
    if (!c || s.busy) return;
    const g = c.g, full = ob.got >= ob.need, name = `${g.family} ${g.given}`;
    let pts = 0, ok = true, msg = '', good = '', staff;
    if (kind === 'no') {
      staff = DATA.staff.obAsk.no;
      if (c.kind === 'connect') { good = '乗り継ぎがあるお客様には、便の変更をお願いしなかった'; pts = SC.obDecline; }
      else if (full) { good = '必要な人数がそろっていたので、見送った'; pts = SC.obDecline; }
    } else {
      const today = kind === 'today';
      staff = today ? Talk.fill(DATA.staff.obAsk.today, { flight: ob.later.no.replace('TB ', '') }) : DATA.staff.obAsk.next;
      if (c.kind === 'connect') { ok = false; pts = SC.obBad; msg = '乗り継ぎがあるお客様に便の変更をお願いしてしまった(乗り継ぎに間に合わなくなる)'; g.state = 'rebooked'; ob.got++; }
      else if (full) { ok = false; pts = SC.obExtra; msg = '必要な人数より多く、便の変更をお願いしてしまった'; g.state = 'rebooked'; ob.got++; }
      else if (c.kind === 'today' && !today) { ok = false; pts = -30; msg = '今日中に着きたいお客様に翌日の便をお願いして、断られた'; }
      else {
        g.state = 'rebooked'; ob.got++;
        if (today) { good = `${ob.later.no}便への振り替えに協力していただいた(協力金1万円)`; pts = SC.obBest; }
        else { good = '翌日の便への振り替えに協力していただいた(協力金2万円と宿泊費)'; pts = c.kind === 'any' ? SC.obOk : SC.obBest; }
      }
    }
    Game.addScore('gate', pts); Game.decision(ok);
    if (!ok) { Game.log({ area: 'gate', ok: false, name, flight: s.f.no, text: msg, pts }); Toast.show(`<b>ミス</b> ${msg} <span class="pts">${U.signed(pts)}</span>`, 'bad', 4600); Sfx.buzz(); }
    else if (good) { Game.log({ area: 'gate', ok: true, name, flight: s.f.no, text: good, pts }); Toast.show(`<b>正解</b> ${good} <span class="pts">${U.signed(pts)}</span>`, 'ok'); Sfx.good(); }
    s.busy = true;
    this.renderReader(null, kind === 'no' ? 'no' : 'scan', staff); this.renderActs();
    setTimeout(() => {
      if (Game.scene !== this) return;
      s.cur = null; s.curVol = null; s.busy = false;
      this.renderAll();
    }, 650);
  },

  finishOb() {
    const s = this.s, ob = s.ob, SC = CONFIG.score;
    ob.done = true;
    const short = ob.need - ob.got;
    if (short > 0) {
      const pool = U.shuffle(this.act().filter((g) => g.state === 'lounge' && !g.priority));
      pool.slice(0, short).forEach((g) => {
        g.state = 'denied';
        Game.addScore('gate', SC.obShort); Game.decision(false); Game.addSat(-12);
        Game.log({ area: 'gate', ok: false, name: `${g.family} ${g.given}`, flight: s.f.no, text: '協力者が足りず、このお客様の搭乗をお断りすることになった', pts: SC.obShort });
      });
      Toast.show(`<b>協力者が${short}名足りませんでした。</b>${short}名のお客様の搭乗をお断りします <span class="pts">${U.signed(SC.obShort * short)}</span>`, 'bad', 5000);
      Sfx.buzz();
    } else Toast.show('必要な人数の協力者が見つかりました。「事前改札」から搭乗を始めましょう', 'ok', 4200);
    this.renderAll();
  },

  /* ----- 搭乗券の確認 ----- */
  decide(kind) {
    const s = this.s, g = s.cur, SC = CONFIG.score;
    if (!g || s.busy || s.closed || s.curVol) return;
    if (kind === 'reseat' && !s.removed) return;
    const valid = g.kind === 'pax', allowed = valid && g.group <= s.call, displaced = this.isDisplaced(g);
    const gl = g.group === 0 ? '事前改札' : `グループ${g.group}`;
    let pts = 0, ok = true, msg = '', good = '', staff = '';
    if (kind === 'scan' || kind === 'reseat') {
      staff = DATA.staff.gScan;
      if (!valid) { pts = SC.gWrongBoard; ok = false; msg = `別の便(${g.flightNo})のお客様を通してしまった。降りてもらうため出発が遅れる`; s.extraDelay += 4 * 60; g.state = 'gone'; }
      else if (!allowed) { pts = SC.gEarlyBoard; ok = false; msg = `まだ案内していない${gl}のお客様を通した`; g.state = 'boarded'; }
      else if (kind === 'reseat' && displaced) {
        const used = new Set(s.list.map((x) => x.seat));
        const free = Seats.all('Y').filter((x) => Seats.row(x) <= 10 && !Seats.isExit(x) && !used.has(x));   // 非常口座席は条件確認が必要なので使わない
        const old = g.seat; g.seat = free.length ? U.pick(free) : '10C';
        pts = SC.gReseat; good = `なくなった${old}の座席を${g.seat}に変更して通した`; staff = Talk.fill(DATA.staff.gReseat, { seat: g.seat }); g.state = 'boarded'; s.scanned++;
      } else if (kind === 'reseat') { pts = SC.gReseatExtra; ok = false; msg = '座席を変える必要のないお客様の座席を変更してしまった'; g.state = 'boarded'; }
      else if (displaced) { pts = SC.gReseatMiss; ok = false; msg = `なくなった座席(${g.seat})のまま通してしまった。機内に座る席がない`; g.state = 'boarded'; }
      else { pts = SC.gBoard; g.state = 'boarded'; s.scanned++; }
    } else if (kind === 'hold') {
      if (!valid) { staff = 'もう少々お待ちください。'; pts = SC.gWrongWait; ok = false; msg = `別の便(${g.flightNo})だと気づかず、待たせてしまった`; g.state = 'gone'; }
      else if (!allowed) { staff = Talk.fill(DATA.staff.gHold, { g: g.group }); pts = SC.gHold; g.state = 'lounge'; g.heldOnce = true; good = `${gl}のお客様に、順番まで待っていただいた`; }
      else { staff = 'もう少々お待ちください。'; pts = SC.gWrongHold; ok = false; msg = `案内中の${gl}のお客様を待たせてしまった`; g.state = 'lounge'; g.heldOnce = true; Game.addSat(-3); }
    } else {
      staff = Talk.fill(DATA.staff.gRedirect, { flight: s.f.num, gate: g.gate });
      if (!valid) { pts = SC.gRedirect; g.state = 'gone'; good = `${g.flightNo}便のお客様を${g.gate}番搭乗口へご案内`; }
      else { pts = SC.gWrongRedirect; ok = false; msg = s.ev.newGate && g.gate === s.ev.oldGate ? '搭乗口変更前の番号を見て、この便のお客様を別のゲートへ行かせてしまった' : 'この便のお客様を別のゲートへ行かせてしまった'; g.state = 'away'; g.arriveAt = Game.day.clock + 6 * 60; Game.addSat(-6); staff = 'こちらは別の便の搭乗口です…。'; }
    }
    Game.addScore('gate', pts); Game.decision(ok);
    const name = `${g.family} ${g.given}`;
    if (!ok) { Game.log({ area: 'gate', ok: false, name, flight: g.flightNo, text: msg, pts }); Toast.show(`<b>ミス</b> ${msg} <span class="pts">${U.signed(pts)}</span>`, 'bad', 4600); Sfx.buzz(); }
    else if (good) { Game.log({ area: 'gate', ok: true, name, flight: g.flightNo, text: good, pts }); Toast.show(`<b>正解</b> ${good} <span class="pts">${U.signed(pts)}</span>`, 'ok'); Sfx.good(); }
    else Sfx.beep();
    s.busy = true;
    this.renderReader(null, kind, staff); this.renderActs();
    setTimeout(() => {
      if (Game.scene !== this) return;
      s.cur = null; s.busy = false; s.curIn = 0.04;
      this.renderReader(); this.renderActs(); this.renderStatus(); this.renderAnnButtons(); this.renderSign();
    }, ok && kind === 'scan' ? 230 : 480);
  },

  tryClose() {
    const s = this.s;
    if (!this.canClose()) return;
    const missing = this.act().filter((g) => g.state === 'away' || g.state === 'lounge');
    if (!missing.length) { this.close([]); return; }
    const since = s.finalAt !== null ? Math.floor((Game.day.clock - s.finalAt) / 60) : 0;
    Modal.show({
      title: `まだ${missing.length}名のお客様が来ていません`,
      body: `<ul class="missing-list">${missing.map((g) => `<li><span>${U.esc(g.family)} ${U.esc(g.given)}</span><span class="mono">${g.seat}</span>${g.hasBag ? '<span class="pill warn">預け荷物あり</span>' : '<span class="pill">荷物なし</span>'}</li>`).join('')}</ul>
        <p>最終案内から約${since}分。もうすぐ来るかもしれません。締め切ると、預け荷物があるお客様の分は荷物の取り降ろしで出発が遅れます。</p>`,
      actions: [{ label: 'もう少し待つ', cls: 'ghost' }, { label: '搭乗を締め切る', cls: 'danger', run: () => this.close(missing) }],
    });
  },

  close(missing) {
    const s = this.s, d = Game.day, f = s.f, SC = CONFIG.score;
    s.closed = true; s.waiting = false; f.phase = 'closed';
    let offload = 0;
    for (const g of missing) {
      const name = `${g.family} ${g.given}`;
      if (g.neverShow) {
        Game.addScore('gate', SC.gNoShowHandled); Game.decision(true);
        if (g.hasBag) offload += DATA.rules.offloadMin;
        Game.log({ area: 'gate', ok: true, name, flight: f.no, text: `最後まで来なかったため締め切った${g.hasBag ? '(預け荷物を取り降ろし)' : ''}`, pts: SC.gNoShowHandled });
      } else {
        Game.addScore('gate', SC.gLeftBehind); Game.decision(false); Game.addSat(-10);
        Game.log({ area: 'gate', ok: false, name, flight: f.no, text: 'もうすぐ来るところだったのに、置いて締め切ってしまった', pts: SC.gLeftBehind });
      }
    }
    const lateMin = Math.ceil((Math.max(0, d.clock - f.door) + s.extraDelay) / 60);
    f.delay = lateMin + offload;
    f.actualDep = f.dep + f.delay * 60;
    const act = this.act();
    d.stats.scanned = s.scanned;
    d.gateStats = { boarded: act.filter((g) => g.state === 'boarded').length, total: act.length, lateMin, offload, closeAt: d.clock };
    if (lateMin === 0) { Game.addScore('gate', SC.gOnTime); Game.decision(true); Game.log({ area: 'gate', ok: true, name: '—', flight: f.no, text: `${U.hm(d.clock)} にドアクローズ。定刻どおり`, pts: SC.gOnTime }); }
    else { const pts = lateMin * SC.gDelayPerMin; Game.addScore('gate', pts); Game.decision(false); Game.log({ area: 'gate', ok: false, name: '—', flight: f.no, text: `ドアクローズが${lateMin}分遅れた`, pts }); }
    d.onTime = lateMin === 0;
    s.announce = `${f.num}便、${f.ap.name}行きの搭乗手続きを締め切りました。`;
    Sfx.chimeEnd();
    this.renderAll();
    setTimeout(() => {
      if (Game.scene !== this) return;
      f.phase = 'departed'; Hud.redrawBoard();
      Modal.show({
        title: `${f.no}便 出発`,
        body: f.delay
          ? `<p><b>${U.hm(f.actualDep)}</b> に出発しました(定刻 ${U.hm(f.dep)})。</p><p>${lateMin ? `ドアクローズの遅れ ${lateMin}分` : ''}${lateMin && offload ? '、' : ''}${offload ? `手荷物の取り降ろし ${offload}分(やむを得ない遅れ)` : ''}</p>`
          : `<p>${U.hm(f.dep)} 定刻で出発しました。おつかれさまでした。</p>`,
        actions: [{ label: '今日の結果を見る', cls: 'primary', run: () => Game.go('result') }],
      });
    }, 1100);
  },
};
