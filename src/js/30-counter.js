/* ---------- チェックインカウンター ---------- */
Scenes.counter = {
  timed: true,

  enter() {
    const d = Game.day;
    this.s = { pending: d.pax.slice(), queue: [], cur: null, step: null, nextIn: 0.2, skip: 0, ended: false, cut: new Set(), warned: new Set(), seatSel: null, reasonsOpen: false, qT: 0, served: 0, refused: 0, missed: 0 };
    document.getElementById('app').innerHTML = Hud.frame(`<div class="counter-scene">
      <section class="lobby panel" aria-label="ロビーの列">
        <header class="ph"><b>ロビーの列</b><small>QUEUE</small></header>
        <div class="queue" id="queue"></div>
        <div class="q-meta" id="qmeta"></div>
        <div class="q-actions">
          <button class="btn small" data-act="priority">締切が近い便を先に案内</button>
        </div>
        <div class="legend" id="legend"></div>
      </section>
      <section class="desk-area" aria-label="カウンター">
        <div class="pax-zone" id="paxzone"></div>
        <div class="desk" id="desk"></div>
      </section>
      <section class="terminal panel" id="term" aria-label="チェックイン端末"></section>
    </div>`);
    this.renderQueue(); this.renderIdle();
  },

  /* ===== 時間の進行 ===== */
  update(dt) {
    const d = Game.day, s = this.s, SC = CONFIG.score;
    // だれもカウンターにおらず列も空なら、次のお客様が来るまで一気に時間を進める(待ち時間をなくす)
    const idle = !s.cur && !s.queue.length && s.pending.length > 0;
    if (idle && !s.skip) s.skip = Math.max(d.cfg.speed * 4, (s.pending[0].arrival - d.clock) / 0.4);
    if (!idle) s.skip = 0;
    const speed = s.skip || d.cfg.speed;
    d.clock += dt * speed;
    let changed = false;

    while (s.pending.length && s.pending[0].arrival <= d.clock) { s.queue.push(s.pending.shift()); changed = true; }

    for (const f of d.flights) {
      if (f.canceled) continue;
      // 締切5分前の注意
      if (!s.warned.has(f.no) && d.clock >= f.cutoff - 300 && d.clock < f.cutoff) {
        s.warned.add(f.no);
        const n = s.queue.filter((p) => p.flight === f).length;
        if (n) Toast.show(`<b>${f.no}便 ${f.ap.name}行き</b>の締切まで約5分。列に${n}名並んでいます`, 'info', 4200);
      }
      // 締切
      if (!s.cut.has(f.no) && d.clock >= f.cutoff) {
        s.cut.add(f.no);
        const left = s.queue.filter((p) => p.flight === f && p.arrival <= f.cutoff);
        if (left.length) {
          s.queue = s.queue.filter((p) => !left.includes(p));
          left.forEach((p) => {
            s.missed++;
            Game.addScore('counter', SC.missedQueue); Game.addSat(-8); Game.decision(false);
            Game.log({ area: 'counter', ok: false, name: `${p.family} ${p.given}`, flight: f.no, text: '列で待っている間に手続きの締切を過ぎ、乗り遅れてしまった', pts: SC.missedQueue });
          });
          d.stats.missed = s.missed;
          Toast.show(`<b>${f.no}便の手続きを締め切りました。</b>列にいた${left.length}名が乗り遅れに <span class="pts">${U.signed(SC.missedQueue * left.length)}</span>`, 'bad', 4500);
          Sfx.buzz(); changed = true;
        } else Toast.show(`${f.no}便 ${f.ap.name}行きの手続きを締め切りました`, 'info');
        this.renderLegend();
      }
      if (!f.isGate && f.phase !== 'departed' && d.clock >= f.dep) f.phase = 'departed';
    }

    if (!s.cur && s.queue.length) { s.nextIn -= dt; if (s.nextIn <= 0) this.callNext(); }
    if (!s.ended && !s.cur && !s.queue.length && !s.pending.length) { s.ended = true; setTimeout(() => this.finish(), 500); }

    s.qT += dt;
    if (changed || s.qT > 1) { s.qT = 0; this.renderQueue(); if (!s.cur) this.renderTerm(); }
    Hud.tick(dt, d.cfg.speed, s.skip > 0);
  },

  /* ===== 列 ===== */
  renderQueue() {
    const s = this.s, d = Game.day, q = document.getElementById('queue'); if (!q) return;
    const shown = s.queue.slice(0, 16);
    q.innerHTML = shown.length
      ? shown.map((p) => {
        const mins = (p.flight.cutoff - d.clock) / 60, urgent = !p.flight.canceled && mins >= 0 && mins < 8;
        return `<div class="qp ${urgent ? 'urgent' : ''}" title="${p.flight.no}便 · 待ち${Math.max(0, Math.floor((d.clock - p.arrival) / 60))}分">${Art.mini(p.av, p.flight.color)}<span>${p.flight.num}</span></div>`;
      }).join('') + (s.queue.length > 16 ? `<div class="qmore">+${s.queue.length - 16}</div>` : '')
      : '<p class="q-empty">並んでいるお客様はいません</p>';
    document.getElementById('qmeta').innerHTML = `待ち <b>${s.queue.length}</b>名 · これから来るお客様 ${s.pending.length}名`;
    if (!document.getElementById('legend').innerHTML) this.renderLegend();
  },

  renderLegend() {
    const d = Game.day, el = document.getElementById('legend'); if (!el) return;
    el.innerHTML = '<small class="lg-title">担当する便</small>' + d.flights.map((f) => {
      if (f.canceled) return `<div class="lg-row cxl"><i class="chip" style="background:${f.color}"></i><b>${f.num}</b><span>${f.ap.name}</span><span class="lg-t">欠航 · 振替を受付</span></div>`;
      const cut = d.clock >= f.cutoff;
      return `<div class="lg-row ${cut ? 'cut' : ''}"><i class="chip" style="background:${f.color}"></i><b>${f.num}</b><span>${f.ap.name}</span><span class="lg-t">締切 ${U.hm(f.cutoff)}</span></div>`;
    }).join('');
  },

  priority() {
    const s = this.s, d = Game.day;
    const open = s.queue.filter((p) => !p.flight.canceled && d.clock < p.flight.cutoff);
    if (open.length < 2) { Toast.show('列が短いので、呼び出しは必要ありません', 'info'); return; }
    const soon = Math.min(...open.map((p) => p.flight.cutoff));
    const isU = (p) => !p.flight.canceled && p.flight.cutoff === soon;
    const urgent = s.queue.filter(isU);
    if (s.queue.slice(0, urgent.length).every(isU)) { Toast.show('締切が近い便のお客様は、すでに列の先頭です', 'info'); return; }
    s.queue = [...urgent, ...s.queue.filter((p) => !isU(p))];
    Game.addSat(-2);
    const f = urgent[0].flight;
    Toast.show(`「${f.num}便 ${f.ap.name}行きのお客様、お先にどうぞ」 ${urgent.length}名を先頭に案内しました`, 'info');
    Sfx.chimeShort(); this.renderQueue();
  },

  /* ===== お客様の呼び出し ===== */
  callNext() {
    const s = this.s, d = Game.day;
    const p = s.queue.shift();
    s.cur = p; s.step = 'docs'; s.nextIn = 0.2; s.seatSel = null; s.reasonsOpen = false; s.altSel = null;
    p.res = { pts: 0, bad: [], good: [] };
    p.sel = new Set(); p.tagThrough = false; p.estaShown = false;
    p.startAt = d.clock;
    p.mood = p.late || p.forgot ? 'surprised' : 'neutral';
    p.bs = p.bag ? { weighed: false, asked: false, battery: !!p.bag.battery, revealed: false } : null;
    if (d.clock - p.arrival > 15 * 60) Game.addSat(-4);
    document.getElementById('paxzone').innerHTML = `<div class="pax arrive" id="paxwrap"><div class="pax-fig" id="paxfig">${Art.figure(p, p.mood)}</div><div class="bubbles" id="bubbles"></div></div>`;
    this.talk(null, Talk.greet(p));
    this.renderDocs(); this.renderTerm(); this.renderQueue();
    Sfx.pop();
  },

  renderIdle() {
    const z = document.getElementById('paxzone'), desk = document.getElementById('desk');
    if (z) z.innerHTML = '<div class="pax-empty"><div class="open-sign"><b>チェックイン</b><span>CHECK-IN OPEN</span></div></div>';
    if (desk) desk.innerHTML = '<p class="desk-empty">次のお客様の書類がここに置かれます</p>';
    this.renderTerm();
  },

  talk(staffLine, pax) {
    const b = document.getElementById('bubbles'); if (!b) return;
    let h = '';
    if (staffLine) h += `<div class="bubble staff"><span class="who">あなた</span>${U.esc(staffLine)}</div>`;
    if (pax) h += `<div class="bubble pax ${staffLine ? 'later' : ''}">${U.esc(pax.main)}${pax.gloss ? `<small>${U.esc(pax.gloss)}</small>` : ''}</div>`;
    b.innerHTML = h;
  },

  mood(m) { const p = this.s.cur; if (!p) return; p.mood = m; const fig = document.getElementById('paxfig'); if (fig) fig.innerHTML = Art.figure(p, m); },

  later(ms, fn) { const p = this.s.cur; setTimeout(() => { if (Game.scene === this && this.s.cur === p) fn(); }, ms); },

  /* ===== デスクの上 ===== */
  renderDocs() {
    const p = this.s.cur, desk = document.getElementById('desk'); if (!p || !desk) return;
    const pp = p.flight.intl
      ? (p.passport ? Docs.passport(p.passport, p.av, p.photoAv) : '<div class="doc missing"><b>パスポートの提示なし</b><small>NO PASSPORT</small></div>')
      : '<div class="doc note"><b>国内線</b><small>パスポートの確認は不要</small></div>';
    desk.innerHTML = `<div class="docs">${pp}${Docs.ticket(p)}</div><div class="scale-area"><div id="scale"></div>${this.carryHTML(p)}${p.svc === 'minor' ? Docs.minorForm(p) : ''}</div><div class="printed" id="printed"></div>`;
    this.renderScale(false);
  },

  // 機内持ち込み手荷物(3日目から)。サイズ確認器の絵と、寸法・重さ
  carryHTML(p) {
    if (Game.day.n < 3 || !p.carry || p.rebook) return '';
    const c = p.carry, KN = { roller: 'キャリーケース', backpack: 'リュック', tote: 'トートバッグ' };
    return `<div class="carry-card ${p.carryCheck ? 'checked' : ''} ${c.items.length > 1 ? 'multi' : ''}" id="carry">
      <div class="carry-pics">${c.items.map((b) => Art.sizer(b)).join('')}</div>
      <div class="carry-info"><header><b>機内持ち込み</b><small>高さ×幅×奥行</small></header>
        ${c.items.map((b, i) => `<div class="carry-dim"><small>${KN[b.kind]}${c.items.length > 1 ? ` ${i + 1}` : ''}<span class="hw">(高さ×幅×奥行)</span></small><b>${b.h}×${b.w}×${b.d}<span>cm</span></b></div>`).join('')}
        <div class="carry-foot"><span>身の回り品 <b>${c.personal ? '1個' : 'なし'}</b></span><span>合計 <b>${c.kg.toFixed(1)}kg</b></span></div></div>
      ${p.carryCheck ? '<div class="carry-stamp">お預かり</div>' : ''}</div>`;
  },

  renderScale(anim) {
    const p = this.s.cur, el = document.getElementById('scale'); if (!el) return;
    const on = p && p.bag && p.bs && p.bs.weighed;
    el.innerHTML = `<div class="scale ${on ? 'on' : ''}">
      <div class="belt">${on ? Art.suitcase(p.bag.color) : '<span class="belt-label">手荷物はかり</span>'}</div>
      <div class="led-box"><span class="led-label">WEIGHT</span><span class="led-val" id="ledval">${on && !anim ? p.bag.weight.toFixed(1) : '--.-'}</span><span class="led-unit">kg</span></div>
    </div>`;
    if (on && anim) {
      const target = p.bag.weight, t0 = performance.now(), v = document.getElementById('ledval');
      const step = (t) => {
        if (!v.isConnected) return;
        const k = Math.min(1, (t - t0) / 700);
        v.textContent = k < 1 ? (target * k + (Math.random() - 0.5) * 2 * (1 - k)).toFixed(1) : target.toFixed(1);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  },

  /* ===== 端末 ===== */
  renderTerm() {
    const s = this.s, p = s.cur, t = document.getElementById('term'); if (!t) return;
    const root = document.querySelector('.counter-scene'); if (root) root.dataset.step = p ? s.step : 'idle';
    const steps = p && p.rebook ? [['docs', '書類'], ['rebook', '振替'], ['print', '発券']] : [['docs', '書類'], ['bag', '手荷物'], ['seat', '座席'], ['print', '発券']];
    const idx = s.step === 'bye' ? steps.length : steps.findIndex((x) => x[0] === s.step);
    const head = `<header class="ph"><b>チェックイン端末</b><small>CHECK-IN SYSTEM</small></header>
      <ol class="steps" style="grid-template-columns:repeat(${steps.length},1fr)">${steps.map((x, i) => `<li class="${p && i < idx ? 'done' : p && i === idx ? 'now' : ''}"><span>${i + 1}</span>${x[1]}</li>`).join('')}</ol>`;
    let body;
    if (!p) {
      const next = s.pending[0];
      body = `<div class="term-idle"><p>${s.queue.length ? 'お客様がカウンターに来ます…' : next ? '次のお客様が来るまで早送りしています…' : 'すべてのお客様の対応が終わりました'}</p></div>`;
    } else if (s.step === 'docs') body = this.termDocs(p);
    else if (s.step === 'bag') body = this.termBag(p);
    else if (s.step === 'seat') body = this.termSeat(p);
    else if (s.step === 'print') body = this.termPrint(p);
    else if (s.step === 'rebook') body = this.termRebook(p);
    else body = '<div class="term-idle"><p>お見送り中…</p></div>';
    t.innerHTML = head + `<div class="term-body">${body}</div>`;
  },

  booking(p) {
    const f = p.flight;
    return `<div class="booking"><div class="bk1"><b>${f.no}</b> ${f.ap.name}行き${f.canceled ? ' <span class="pill bad">欠航</span>' : ''}</div>
      <div><small>出発</small>${U.hm(f.dep)}</div><div><small>締切</small><b>${f.canceled ? '—' : U.hm(f.cutoff)}</b></div><div><small>搭乗口</small>${f.gate}</div><div><small>年齢</small>${p.age}歳</div></div>`;
  },

  termDocs(p) {
    const n = Game.day.n;
    const reasons = Object.entries(DATA.reasons).filter(([, r]) => r.day <= n);
    let hint = '';
    if (n <= 2) {
      hint = p.flight.intl
        ? `パスポートとeチケットの<b>名前</b>を1文字ずつ見比べましょう。${n >= 2 ? '<b>有効期限</b>が今日より前でないかも確認。' : ''}`
        : '国内線です。eチケットの<b>便名</b>と<b>搭乗日</b>を確認しましょう。';
    }
    let esta = '';
    if (n >= 5 && p.flight.ap.entry === 'ESTA') {
      if (!p.estaShown) esta = '<div class="acts"><button class="btn" data-act="esta">ESTAを照会する</button></div>';
      else {
        const e = p.esta, ok = p.nat === 'US' || (e && e.status === 'approved');
        const txt = p.nat === 'US' ? '米国籍のため不要' : !e || e.status === 'none' ? '該当する申請がありません' : e.status === 'expired' ? `期限切れ(${e.until.replace(/-/g, '/')} に失効)` : `承認済み(有効期限 ${e.until.replace(/-/g, '/')})`;
        esta = `<div class="sysbox ${ok ? 'ok' : 'ng'}"><small>ESTA照会結果</small>${txt}</div>`;
      }
    }
    return `${this.booking(p)}${hint ? `<p class="hint">${hint}</p>` : ''}${esta}
      <div class="acts">
        <button class="btn primary" data-act="docs-ok">問題なし・手続きを進める</button>
        <button class="btn danger" data-act="docs-refuse" aria-expanded="${this.s.reasonsOpen}">お断りする…</button>
      </div>
      ${this.s.reasonsOpen ? `<div class="reasons" role="group" aria-label="お断りの理由"><small>理由を選んでください</small>${reasons.map(([k, r]) => `<button class="btn reason" data-act="refuse" data-r="${k}">${r.label}</button>`).join('')}</div>` : ''}`;
  },

  // 特別な手配(6日目から)
  svcBox(p) {
    if (Game.day.n < 6) return '';
    return `<div class="svc-box"><small>特別な手配(必要なときだけ)</small><div class="svc-grid">${Object.entries(DATA.svc).map(([k, v]) => `<button class="btn small tog" data-act="svc" data-k="${k}" aria-pressed="${p.sel.has(k)}">${v.label}</button>`).join('')}</div></div>`;
  },

  termBag(p) {
    const n = Game.day.n, bs = p.bs;
    const carry = n >= 3 && p.carry ? `<div class="opt-row"><small>機内持ち込み</small><button class="btn small tog" data-act="carry" aria-pressed="${!!p.carryCheck}">持ち込めない荷物を預かる</button>${n === 3 ? '<span class="mute small">55×40×25cm・合計115cm・10kg・1個まで</span>' : ''}</div>` : '';
    if (!p.bag) return `${this.booking(p)}<p class="sub-h">預けるスーツケースはありません。</p>${carry}${this.svcBox(p)}<div class="acts"><button class="btn primary" data-act="bag-none">座席の指定へ</button></div>`;
    const tag = n >= 7 ? `<div class="opt-row"><small>荷物の行き先</small>
        <button class="btn small tog" data-act="tag" data-v="dest" aria-pressed="${!p.tagThrough}">${p.flight.dest} ${p.flight.ap.name}まで</button>
        <button class="btn small tog" data-act="tag" data-v="conn" aria-pressed="${p.tagThrough}">乗り継ぎ先まで</button></div>` : '';
    return `${this.booking(p)}
      <div class="baginfo"><div><small>無料手荷物</small><b>${p.allowance}kg</b> <span class="mute">${Rules.clsName(p)}</span></div>${n >= 3 ? '<div><small>1個の上限</small><b>32kg</b></div>' : ''}</div>
      <div class="acts">
        <button class="btn" data-act="weigh" ${bs.weighed ? 'disabled' : ''}>${bs.weighed ? '計量済み' : 'はかりに載せる'}</button>
        ${n >= 2 ? `<button class="btn" data-act="ask" ${bs.asked ? 'disabled' : ''}>${bs.asked ? '危険物 確認済み' : '危険物を確認する'}</button>` : ''}
      </div>
      ${bs.revealed && bs.battery ? '<div class="acts"><button class="btn warn" data-act="battery">バッテリーを取り出してもらう</button></div>' : ''}
      ${tag}${carry}${this.svcBox(p)}
      ${bs.weighed
        ? `<div class="acts row3">
          <button class="btn primary" data-act="bag-accept">このまま預かる</button>
          <button class="btn" data-act="bag-fee">超過料金を案内</button>
          ${n >= 3 ? '<button class="btn" data-act="bag-repack">詰め替えを依頼</button>' : ''}</div>`
        : `<p class="hint">まずは重さを量りましょう。${n <= 2 ? `無料は<b>${p.allowance}kg</b>まで。` : ''}</p>`}`;
  },

  termSeat(p) {
    const sel = this.s.seatSel, n = Game.day.n, bud = p.seatReq === 'buddy' && p.buddy && p.buddy.seat ? p.buddy : null;
    const req = p.seatReq === 'buddy' ? (bud ? `${bud.family}さん(${bud.seat})のとなり` : 'なし') : p.seatReq ? DATA.seatReq[p.seatReq] : 'なし';
    return `<div class="seat-meta"><span>クラス <b>${Rules.clsName(p)} (${p.cls})</b></span><span>${p.age}歳</span><span>希望 <b>${req}</b></span></div>
      ${SeatMap.html(p.flight.seats, sel, bud ? bud.seat : null)}
      <div class="seat-legend"><span><i class="lg free"></i>空席</span><span><i class="lg jj"></i>1〜2列 ビジネス</span>${n >= 5 ? '<span><i class="lg xx"></i>8列 非常口</span>' : ''}<span><i class="lg occ"></i>使用中</span></div>
      <div class="acts"><button class="btn primary" data-act="seat-ok" ${sel ? '' : 'disabled'}>${sel ? `${sel} で確定` : '座席を選んでください'}</button></div>`;
  },

  termRebook(p) {
    const f = p.flight, nd = p.rebook, sel = this.s.altSel;
    const want = nd.kind === 'by' ? `${nd.byText}までに着きたい` : nd.kind === 'pm' ? 'お昼過ぎ(12時以降)の出発がいい' : 'いちばん早い便がいい';
    return `${this.booking(p)}
      <div class="seat-meta"><span>お客様の希望 <b>${want}</b></span></div>
      <div class="alts" role="group" aria-label="振替先の便">${f.alts.map((a, i) => `<button class="alt ${sel === i ? 'sel' : ''}" data-act="alt" data-i="${i}" ${a.seats <= 0 ? 'disabled' : ''} aria-pressed="${sel === i}">
        <b>${a.no}</b><span>${a.tomorrow ? '<em>明日</em> ' : ''}${U.hm(a.dep)}発</span><span>${U.hm(a.arr)}着</span><span class="${a.seats <= 0 ? 'full' : ''}">${a.seats <= 0 ? '満席' : `空席 ${a.seats}`}</span></button>`).join('')}</div>
      <div class="acts"><button class="btn primary" data-act="rebook-ok" ${sel === null || sel === undefined ? 'disabled' : ''}>この便に振り替える</button></div>`;
  },

  termPrint(p) {
    if (p.newFlight) {
      const a = p.newFlight;
      return `<div class="print-sum"><div><small>振替先</small><b>${a.no}</b></div><div><small>出発</small><b>${a.tomorrow ? '明日 ' : ''}${U.hm(a.dep)}</b></div><div><small>座席</small><b>${p.seat}</b></div></div>
        <div class="acts"><button class="btn primary big" data-act="print">搭乗券を発行する</button></div>`;
    }
    return `${this.booking(p)}
      <div class="print-sum"><div><small>座席</small><b>${p.seat}</b></div><div><small>グループ</small><b>${Seats.group(p.seat)}</b></div><div><small>手荷物</small><b>${p.bag && p.bagAccepted ? '1個' : 'なし'}</b></div></div>
      <div class="acts"><button class="btn primary big" data-act="print">搭乗券を発行する</button></div>`;
  },

  /* ===== 操作 ===== */
  onAct(a, ds) {
    const s = this.s, p = s.cur;
    if (a === 'priority') { this.priority(); return; }
    if (!p || s.step === 'bye' || s.step === 'wait') return;
    switch (a) {
      case 'docs-ok': if (s.step === 'docs') this.docsOk(); break;
      case 'docs-refuse': s.reasonsOpen = !s.reasonsOpen; this.renderTerm(); break;
      case 'refuse': if (s.step === 'docs') this.refuse(ds.r); break;
      case 'weigh': this.weigh(); break;
      case 'ask': this.ask(); break;
      case 'battery': this.battery(); break;
      case 'bag-accept': this.bagDecide('accept'); break;
      case 'bag-fee': this.bagDecide('fee'); break;
      case 'bag-repack': this.bagDecide('repack'); break;
      case 'bag-none': this.evalSvc(p); this.evalCarry(p); this.toSeat(DATA.staff.noBag); break;
      case 'carry': this.toggleCarry(); break;
      case 'esta': if (!p.estaShown) { p.estaShown = true; this.talk(DATA.staff.estaQ, null); this.renderTerm(); } break;
      case 'svc': this.toggleSvc(ds.k); break;
      case 'tag': p.tagThrough = ds.v === 'conn'; this.renderTerm(); break;
      case 'alt': s.altSel = +ds.i; this.renderTerm(); break;
      case 'rebook-ok': this.rebookOk(); break;
      case 'seat': s.seatSel = ds.seat; this.renderTerm(); break;
      case 'seat-ok': this.seatOk(); break;
      case 'print': this.print(); break;
    }
  },

  docsOk() {
    const p = this.s.cur, d = Game.day, probs = Rules.docProblems(p, d);
    if (probs.length) { p.res.bad.push(DATA.reasons[probs[0]].miss); p.res.pts += CONFIG.score.missDoc; p.docMissed = true; Game.decision(false); d.stats.docMiss = (d.stats.docMiss || 0) + 1; }
    else Game.decision(true);
    this.s.reasonsOpen = false;
    if (p.rebook) { this.s.step = 'rebook'; this.talk(DATA.staff.docsOk, Talk.line(p, 'need_' + p.rebook.kind)); this.renderTerm(); return; }
    this.s.step = 'bag';
    this.talk(DATA.staff.docsOk, Talk.line(p, p.bag ? 'bagYes' : 'bagNo'));
    this.renderTerm(); this.renderScale(false);
  },

  toggleSvc(k) {
    const p = this.s.cur; if (!DATA.svc[k]) return;
    if (p.sel.has(k)) p.sel.delete(k); else { p.sel.add(k); this.talk(DATA.staff.svcDone[k], null); }
    this.renderTerm();
  },

  // 特別な手配の採点(手荷物の画面を出るときに1回)
  evalSvc(p) {
    if (p.svcEvaluated || Game.day.n < 6) return;
    p.svcEvaluated = true;
    const SC = CONFIG.score, need = new Set(Rules.svcNeeded(p));
    for (const k of Object.keys(DATA.svc)) {
      const want = need.has(k), got = p.sel.has(k);
      if (want && got) { p.res.good.push(DATA.svc[k].done); p.res.pts += SC.svcRight; Game.decision(true); }
      else if (want) { p.res.bad.push(DATA.svc[k].miss); p.res.pts += SC.svcMiss; Game.decision(false); }
      else if (got) { p.res.bad.push(`必要のない「${DATA.svc[k].label}」をしてしまった`); p.res.pts += SC.svcExtra; Game.decision(false); }
    }
  },

  // 機内持ち込み手荷物を預かりに回す(押すたびに切り替え)
  toggleCarry() {
    const p = this.s.cur; if (!p || !p.carry || this.s.step !== 'bag') return;
    p.carryCheck = !p.carryCheck;
    if (p.carryCheck) { this.talk(DATA.staff.carry, null); Sfx.pop(); }
    const el = document.getElementById('carry'); if (el) el.outerHTML = this.carryHTML(p);
    this.renderTerm();
  },

  // 機内持ち込み手荷物の採点(3日目から。手荷物の画面を出るときに1回)
  evalCarry(p) {
    if (p.carryEvaluated || Game.day.n < 3 || !p.carry) return;
    p.carryEvaluated = true;
    const SC = CONFIG.score, prob = Rules.carryProblem(p);
    if (prob && p.carryCheck) { p.res.good.push(`持ち込めない手荷物をお預かりした(${prob})`); p.res.pts += SC.carryRight; Game.decision(true); }
    else if (prob) { p.res.bad.push(`${prob}のに、そのまま機内に持ち込ませた`); p.res.pts += SC.carryMiss; Game.decision(false); }
    else if (p.carryCheck) { p.res.bad.push('機内に持ち込める手荷物まで預からせてしまった'); p.res.pts += SC.carryExtra; Game.decision(false); Game.addSat(-4); }
  },

  // 荷物の行き先の採点(7日目から)
  evalTag(p) {
    if (Game.day.n < 7 || !p.bag) return;
    const SC = CONFIG.score;
    if (p.conn && p.tagThrough) { p.res.good.push(`荷物を乗り継ぎ先の${DATA.cities[p.conn.dest].name}まで通した`); p.res.pts += SC.tagRight; Game.decision(true); }
    else if (p.conn) { p.res.bad.push('乗り継ぎ先まで荷物を通さなかった(到着地で預け直しになる)'); p.res.pts += SC.tagWrong; Game.decision(false); }
    else if (p.tagThrough) { p.res.bad.push('乗り継ぎがないのに、荷物を乗り継ぎ先までにしてしまった'); p.res.pts += SC.tagWrong; Game.decision(false); }
  },

  rebookOk() {
    const s = this.s, p = s.cur, f = p.flight, SC = CONFIG.score;
    const a = f.alts[s.altSel]; if (!a || a.seats <= 0) return;
    const best = Rules.bestAlt(f.alts, p.rebook) || Rules.bestAlt(f.alts, { kind: 'any' });
    const fits = Rules.altFits(a, p.rebook);
    const when = `${a.tomorrow ? '明日の' : ''}${U.hm(a.dep)}発 ${a.no}`;
    const st = Game.day.stats; st.rebooked = (st.rebooked || 0) + 1; if (a !== best) st.rebookNotBest = (st.rebookNotBest || 0) + 1;
    if (a === best) { p.res.good.push(`希望に合ういちばん早い便(${when})に振り替えた`); p.res.pts += SC.rebookBest; Game.decision(true); this.mood('happy'); }
    else if (fits) { p.res.partial = `希望には合っていたが、もっと早い ${best.no}(${U.hm(best.dep)}発)があった`; p.res.pts += SC.rebookOk; Game.decision(true); }
    else { p.res.bad.push(`お客様の希望に合わない便(${when})に振り替えた`); p.res.pts += SC.rebookBad; Game.decision(false); Game.addSat(-8); this.mood('upset'); }
    a.seats--;
    p.newFlight = a; p.seat = Seats.takeRandom(new Set(), 'Y');
    s.step = 'print';
    this.talk(Talk.fill(DATA.staff.rebook, { flight: a.no.replace('TB ', ''), dep: (a.tomorrow ? '明日の' : '') + U.hm(a.dep) }), null);
    this.renderTerm();
  },

  refuse(r) {
    const p = this.s.cur, d = Game.day, SC = CONFIG.score, probs = Rules.docProblems(p, d);
    this.s.reasonsOpen = false;
    if (!probs.length) {
      p.res.pts += SC.wrongRefuse; p.res.bad.push('問題のないお客様をお断りしてしまった');
      Game.decision(false); Game.addSat(-12); this.mood('upset');
      this.talk(DATA.staff.refuse[r], Talk.line(p, 'refusedAngry'));
    } else if (probs.includes(r)) {
      p.res.pts += SC.refuseRight; p.res.good.push(`正しくお断り(${DATA.reasons[r].label})`);
      Game.decision(true); this.mood('sad');
      this.talk(DATA.staff.refuse[r], Talk.line(p, 'refusedOk'));
    } else {
      p.res.pts += SC.refuseWrongReason; p.res.partial = `お断りは正解。ただし理由は「${DATA.reasons[probs[0]].label}」`;
      Game.decision(true); this.mood('sad');
      this.talk(DATA.staff.refuse[r], Talk.line(p, 'refusedOk'));
    }
    this.s.refused++;
    this.finishPax('refused');
  },

  weigh() {
    const p = this.s.cur; if (!p.bs || p.bs.weighed) return;
    p.bs.weighed = true;
    this.talk(DATA.staff.weigh, null);
    Sfx.thunk(); this.renderScale(true); this.renderTerm();
  },

  ask() {
    const p = this.s.cur; if (!p.bs || p.bs.asked) return;
    p.bs.asked = true;
    if (p.bs.battery) { p.bs.revealed = true; this.mood('surprised'); this.talk(DATA.staff.ask, Talk.line(p, 'dangerBattery')); }
    else this.talk(DATA.staff.ask, Talk.line(p, 'dangerNone'));
    this.renderTerm();
  },

  battery() {
    const p = this.s.cur; if (!p.bs || !p.bs.battery) return;
    p.bs.battery = false;
    p.res.pts += CONFIG.score.batteryCaught; p.res.good.push('モバイルバッテリーを見つけて取り出してもらった');
    Game.decision(true); this.mood('neutral');
    this.talk(DATA.staff.batteryOut, Talk.line(p, 'batteryOut'));
    this.renderTerm();
  },

  bagDecide(kind) {
    const p = this.s.cur, b = p.bag, bs = p.bs, SC = CONFIG.score;
    if (!b || !bs.weighed) return;
    const need = Rules.bagNeed(b.weight, p.allowance);
    const bad = (msg) => { p.res.bad.push(msg); p.res.pts += SC.bagMistake; Game.decision(false); };

    if (kind === 'repack') {
      if (need === 'repack') { p.res.good.push('32kgを超える荷物を詰め替えてもらった'); p.res.pts += SC.repackRight; Game.decision(true); }
      else if (need === 'fee') { Game.addSat(-3); Game.decision(true); }
      else { bad('重さに問題のない荷物を詰め替えさせてしまった'); Game.addSat(-6); this.mood('upset'); }
      b.weight = U.r1(U.float(Math.max(8, p.allowance - 9), p.allowance - 0.5));
      bs.weighed = false;
      this.talk(DATA.staff.repack, Talk.line(p, 'repack'));
      this.renderScale(false); this.renderTerm();
      return;
    }

    let reply = null;
    if (kind === 'fee') {
      if (need === 'fee') { p.res.good.push('超過料金を正しく案内した'); p.res.pts += SC.feeRight; Game.decision(true); reply = Talk.line(p, 'feeOk'); }
      else if (need === 'ok') { bad('重さが範囲内なのに超過料金を取ってしまった'); Game.addSat(-8); this.mood('upset'); reply = Talk.line(p, 'feeAngry'); }
      else bad('32kgを超える荷物を預かってしまった');
    } else {
      if (need === 'ok') Game.decision(true);
      else if (need === 'fee') bad(`無料の${p.allowance}kgを超えていたのに超過料金をいただかなかった`);
      else bad('32kgを超える荷物を預かってしまった');
    }
    if (bs.battery) bad('モバイルバッテリーが入ったまま預かってしまった');
    p.bagAccepted = true;
    this.evalTag(p); this.evalSvc(p); this.evalCarry(p);
    this.toSeat(kind === 'fee' ? DATA.staff.fee : DATA.staff.accept, reply);
  },

  // 座席の指定へ。直前のやりとり(係員のセリフ・お客様の返事)と座席の希望を一度に表示する
  toSeat(staffLine, reply) {
    const p = this.s.cur;
    this.s.step = 'seat'; this.s.seatSel = null;
    const line = Talk.line(p, p.seatReq ? 'seat_' + p.seatReq : 'seatNone');
    if (reply) { line.main = reply.main + ' ' + line.main; if (reply.gloss || line.gloss) line.gloss = [reply.gloss, line.gloss].filter(Boolean).join(' '); }
    this.talk(staffLine || null, line);
    this.renderTerm();
  },

  seatOk() {
    const s = this.s, p = s.cur, f = p.flight, seat = s.seatSel, SC = CONFIG.score;
    if (!seat || f.seats.has(seat)) return;
    const bud = p.seatReq === 'buddy' && p.buddy && p.buddy.seat ? p.buddy : null;
    const couldMeet = p.seatReq === 'buddy' ? !!bud && Seats.neighbors(bud.seat).some((x) => !f.seats.has(x) && Seats.clsOf(x) === p.cls) : p.seatReq ? Seats.anyFree(f.seats, p.cls, p.seatReq) : true;
    f.seats.add(seat); p.seat = seat;
    let reply = null;
    if (Seats.clsOf(seat) !== p.cls) {
      p.res.bad.push(p.cls === 'Y' ? 'エコノミーのお客様をビジネス席(1〜2列)にしてしまった' : 'ビジネスのお客様をエコノミー席にしてしまった');
      p.res.pts += SC.seatClass; Game.decision(false);
      if (p.cls === 'J') { Game.addSat(-10); this.mood('upset'); }
    } else if (Seats.isExit(seat) && !Rules.exitOk(p)) {
      const why = p.age < 15 ? `${p.age}歳` : p.infant ? '赤ちゃん連れ' : p.svc === 'wheelchair' ? '車いす' : 'ひとり旅のお子さま';
      p.res.bad.push(`非常口座席に、条件に合わないお客様(${why})を座らせてしまった`); p.res.pts += SC.exitBad; Game.decision(false);
    } else if (p.seatReq === 'exit' && !Rules.exitOk(p)) {
      p.res.good.push('条件に合わないため、非常口座席はご遠慮いただいた'); p.res.pts += SC.exitDeclined; Game.decision(true);
      s.seatSel = null; s.step = 'print';
      this.talk(DATA.staff.exitNo, Talk.line(p, 'exitNoOk'));
      this.renderTerm();
      return;
    } else if (p.seatReq === 'buddy') {
      if (!bud) Game.decision(true);
      else if (Seats.adjacent(seat, bud.seat)) { Game.day.stats.buddyMet = (Game.day.stats.buddyMet || 0) + 1; p.res.good.push(`お友だちの${bud.family}さんのとなりの席にした`); p.res.pts += SC.seatMet; Game.addSat(2); Game.decision(true); this.mood('happy'); }
      else if (couldMeet) { p.res.bad.push(`${bud.family}さんのとなりが空いていたのに、離れた席にした`); p.res.pts += SC.seatUnmet; Game.addSat(-5); Game.decision(false); reply = Talk.line(p, 'seatUnmet'); Game.day.stats.buddyMiss = (Game.day.stats.buddyMiss || 0) + 1; }
      else Game.decision(true);
    } else if (p.seatReq) {
      const label = DATA.seatReq[p.seatReq];
      if (Seats.matches(seat, p.seatReq)) { p.res.good.push(`ご希望の${label}の席にした`); p.res.pts += SC.seatMet; Game.addSat(2); Game.decision(true); this.mood('happy'); }
      else if (couldMeet) { p.res.bad.push(`${label}の空席があったのに、希望と違う席にした`); p.res.pts += SC.seatUnmet; Game.addSat(-5); Game.decision(false); reply = Talk.line(p, 'seatUnmet'); }
      else Game.decision(true);
    } else Game.decision(true);
    s.seatSel = null; s.step = 'print';
    this.talk(Talk.fill(DATA.staff.seat, { seat }), reply);
    this.renderTerm();
  },

  print() {
    const p = this.s.cur, f = p.flight, d = Game.day;
    if (this.s.step !== 'print') return;
    // 車いす・ひとり旅は手配していれば事前改札。赤ちゃん連れは自動で事前改札
    const priority = !!(p.infant || (p.svc && DATA.svc[p.svc] && DATA.svc[p.svc].priority && p.sel.has(p.svc)));
    const a = p.newFlight;
    const bp = a
      ? { family: p.ticket.family, given: p.ticket.given, title: p.ticket.title, flightNo: a.no, dest: f.dest, date: a.tomorrow ? U.addDays(d.date, 1) : d.date, gate: a.gate, boarding: U.hm(a.dep - 30 * 60), seat: p.seat, group: Seats.group(p.seat), priority: false }
      : { family: p.ticket.family, given: p.ticket.given, title: p.ticket.title, flightNo: f.no, dest: f.dest, date: d.date, gate: f.gate, boarding: U.hm(f.boarding), seat: p.seat, group: Seats.group(p.seat), priority, cls: p.cls };
    const pr = document.getElementById('printed');
    if (pr) pr.innerHTML = Docs.bpass(bp, 'printing') + (p.bag && p.bagAccepted ? Docs.bagtag(p, d.date, p.tagThrough) : '');
    Sfx.print();
    if (!a) (d.checked[f.no] = d.checked[f.no] || []).push({ nat: p.nat, sex: p.sex, family: p.ticket.family, given: p.ticket.given, title: p.ticket.title, av: p.av, seat: p.seat, cls: p.cls, hasBag: !!(p.bag && p.bagAccepted), priority, svc: p.svc || null, infant: !!p.infant, age: p.age });
    if (!p.docMissed) p.res.pts += CONFIG.score.serve;
    if (d.clock - p.startAt < 150 && !p.res.bad.length) p.res.pts += CONFIG.score.fast;
    this.talk(a ? 'こちらが新しい搭乗券です。ご迷惑をおかけして申し訳ございません。' : Talk.fill(DATA.staff.print, { gate: f.gate, board: U.hm(f.boarding) }), Talk.line(p, 'thanks'));
    if (!p.res.bad.length) this.mood('happy');
    this.s.served++;
    this.finishPax('served');
  },

  finishPax(outcome) {
    const s = this.s, p = s.cur;
    s.step = 'bye';
    Game.addScore('counter', p.res.pts);
    const ok = !p.res.bad.length;
    const text = ok ? (p.res.partial || p.res.good.join(' / ') || (outcome === 'served' ? '問題なく手続き完了' : 'お断り')) : p.res.bad.join(' / ');
    Game.log({ area: 'counter', ok: ok ? (p.res.partial ? 'partial' : true) : false, name: `${p.family} ${p.given}`, flight: p.flight.no, text, pts: p.res.pts });
    if (ok) { Toast.show(`<b>${p.res.partial ? 'おおむね正解' : '対応完了'}</b> ${p.res.partial || p.res.good[0] || ''} <span class="pts">${U.signed(p.res.pts)}</span>`, p.res.partial ? 'info' : 'ok'); Sfx.good(); }
    else { Toast.show(`<b>ミス</b> ${p.res.bad[0]} <span class="pts">${U.signed(p.res.pts)}</span>`, 'bad', 4600); Sfx.buzz(); }
    this.renderTerm();
    setTimeout(() => {
      if (Game.scene !== this || s.cur !== p) return;
      const w = document.getElementById('paxwrap'); if (w) w.classList.add('leaving');
      setTimeout(() => { if (Game.scene !== this || s.cur !== p) return; s.cur = null; s.step = null; s.nextIn = 0.05; this.renderIdle(); this.renderQueue(); }, 280);
    }, outcome === 'served' ? 950 : 850);
  },

  finish() {
    const s = this.s, d = Game.day, gf = d.gateFlight;
    if (Game.scene !== this) return;
    Modal.show({
      title: 'カウンター業務 終了',
      body: `<div class="sumgrid"><div><small>手続き完了</small><b>${s.served}名</b></div><div><small>お断り</small><b>${s.refused}名</b></div><div><small>乗り遅れ</small><b>${s.missed}名</b></div><div><small>ここまでのスコア</small><b>${U.fmt(d.score.counter)}</b></div></div>
        ${d.mid ? `<p>次は <b>${DATA.jobs[d.mid].name}</b>。そのあと ${gf.gate}番搭乗口で ${gf.no} の搭乗案内です。</p>` : `<p>次は <b>${gf.gate}番搭乗口</b> で <b>${gf.no} ${gf.ap.name}行き</b> の搭乗案内です。搭乗開始 ${U.hm(Math.max(gf.boarding, d.clock))}、ドアクローズ ${U.hm(gf.door)}。</p>`}`,
      actions: [{ label: d.mid ? `${DATA.jobs[d.mid].name}へ` : `${gf.gate}番搭乗口へ向かう`, cls: 'primary', run: () => Game.go(d.mid || 'gate') }],
    });
  },
};
