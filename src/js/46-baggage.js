/* ---------- 手荷物の仕分け(スーパーバイザーになると加わる仕事) ---------- */
Scenes.baggage = {
  timed: true,
  N: 18,

  gen(d) {
    const flights = d.flights.filter((f) => !f.canceled);
    const hubs = flights.filter((f) => DATA.onward[f.dest]);
    const here = new Set(flights.map((f) => f.dest));
    const others = Object.keys(DATA.airports).filter((k) => !here.has(k));
    const out = [];
    for (let i = 0; i < this.N; i++) {
      const r = U.r(), f = U.pick(flights);
      const b = { id: i, color: U.pick(['#c0392b', '#2f6fdb', '#2b2f36', '#e0a526', '#6a8f3a', '#8b52c9', '#9aa4ad', '#d06a2b']), name: U.pick(DATA.names.JP.family), priority: U.chance(0.15), fragile: U.chance(0.1) };
      if (r < 0.08) b.kind = 'notag';
      else if (r < 0.16) Object.assign(b, { kind: 'xray', f });
      else if (r < 0.22 && others.length) { const k = U.pick(others); Object.assign(b, { kind: 'other', tag: { no: 'TB ' + (Number(f.num) + U.pick([12, 24, 36])), dest: k } }); }
      else if (r < 0.36 && hubs.length) { const h = U.pick(hubs); Object.assign(b, { kind: 'through', f: h, final: U.pick(DATA.onward[h.dest]) }); }
      else Object.assign(b, { kind: 'normal', f });
      out.push(b);
    }
    return out;
  },

  // 正しい行き先(便名 / office / inspect)
  cart(b) { return b.kind === 'notag' || b.kind === 'other' ? 'office' : b.kind === 'xray' ? 'inspect' : b.f.no; },
  why(b) {
    return { notag: 'タグが取れている荷物は事務所へ', other: 'この空港で担当していない便のタグは事務所へ', xray: 'X線で要確認の荷物は検査へ', through: `乗り継ぎ(${b.final} via ${b.f && b.f.dest})は ${b.f && b.f.no} のカートへ`, normal: `${b.f && b.f.no} のカートへ` }[b.kind];
  },

  enter() {
    const d = Game.day;
    const flights = d.flights.filter((f) => !f.canceled);
    this.s = { bags: this.gen(d), idx: 0, t: 0, limit: 6, busy: false, ok: 0, ng: 0, flights };
    if (!Store.data.jobSeen.baggage) { Store.data.jobSeen.baggage = true; Store.save(); }
    document.getElementById('app').innerHTML = Hud.frame(`<div class="job-scene">
      <section class="panel job-rules" aria-label="仕分けのルール">
        <header class="ph"><b>仕分けのルール</b><small>RULES</small></header>
        <ul class="rule-list">
          <li><b>ふつう</b>タグの便名のカートへ</li>
          <li><b>乗り継ぎ</b>大きな行き先ではなく「via」と便名を見る</li>
          <li><b>事務所</b>タグが取れている / 担当していない便</li>
          <li><b>検査</b>X線で「要確認」</li>
          <li><b>時間</b>バーがなくなると荷物が流れていってしまう</li>
        </ul>
        <div class="job-prog" id="jprog"></div>
      </section>
      <section class="g-center">
        <div class="g-sign job-sign"><div class="gs-num bag"><small>BAGGAGE</small>BHS</div><div class="gs-info"><div class="gs-flight">手荷物仕分け場</div><div class="gs-dest">BAGGAGE MAKE-UP <span>手荷物の仕分け</span></div></div></div>
        <div class="reader bag-zone" id="belt" aria-live="polite"></div>
        <div class="carts" id="carts"></div>
        <p class="g-keys">キーボード: ${flights.map((f, i) => `<span class="kbd">${i + 1}</span>${f.no}`).join(' ')} <span class="kbd">${flights.length + 1}</span>事務所 <span class="kbd">${flights.length + 2}</span>検査</p>
      </section>
      <section class="panel job-log" aria-label="仕分けの記録"><header class="ph"><b>仕分けの記録</b><small>LOG</small></header><ul class="mini-log" id="jlog"></ul></section>
    </div>`);
    this.renderCarts(); this.renderBelt();
    Toast.show('手荷物の仕分けです。タグを見て、正しいカートへ', 'info', 3600);
  },

  renderCarts() {
    const s = this.s, el = document.getElementById('carts');
    el.innerHTML = s.flights.map((f, i) => `<button class="cart" data-act="to" data-c="${f.no}" style="--c:${f.color}"><span class="kbd">${i + 1}</span><b>${f.no}</b><small>${f.dest} ${f.ap.name}</small></button>`).join('')
      + `<button class="cart office" data-act="to" data-c="office"><span class="kbd">${s.flights.length + 1}</span><b>事務所</b><small>タグなし・担当外</small></button>`
      + `<button class="cart inspect" data-act="to" data-c="inspect"><span class="kbd">${s.flights.length + 2}</span><b>検査</b><small>X線 要確認</small></button>`;
  },

  tag(b) {
    if (b.kind === 'notag') return '<div class="btag torn"><span>タグが取れている</span></div>';
    const no = b.kind === 'other' ? b.tag.no : b.f.no;
    const dest = b.kind === 'other' ? b.tag.dest : b.kind === 'through' ? b.final : b.f.dest;
    return `<div class="btag"><div class="bt-dest">${dest}</div>${b.kind === 'through' ? `<div class="bt-via">via ${b.f.dest}</div>` : ''}<div class="bt-info">${no} / ${U.esc(b.name)}</div>${Art.barcode('b' + b.id + no, 100, 20)}
      ${b.priority ? '<span class="bt-pri">PRIORITY</span>' : ''}${b.fragile ? '<span class="bt-fra">FRAGILE</span>' : ''}</div>`;
  },

  renderBelt(outCls) {
    const s = this.s, el = document.getElementById('belt'), b = s.bags[s.idx];
    document.getElementById('jprog').innerHTML = `<div class="g-count"><b>${Math.min(s.idx + 1, this.N)}</b><span>/ ${this.N}個</span></div><p class="small">正解 ${s.ok} · ミス ${s.ng}</p>`;
    if (!el) return;
    if (!b) { el.innerHTML = '<div class="reader-empty"><b>すべて仕分けました</b></div>'; return; }
    const upcoming = s.bags.slice(s.idx + 1, s.idx + 6).map((x) => `<div class="mini-bag">${Art.suitcase(x.color)}</div>`).join('');
    el.innerHTML = `<div class="belt-line"><div class="belt-strip">${upcoming}</div><small>次の荷物</small></div>
      <div class="bigbag ${outCls || 'in'}">${Art.suitcase(b.color)}${this.tag(b)}${b.kind === 'xray' ? '<div class="xray">X線 要確認<small>リチウム電池の疑い</small></div>' : ''}</div>
      <div class="timer"><i id="tbar" style="width:100%"></i></div>`;
  },

  onAct(a, ds) { if (a === 'to') this.sort(ds.c); },
  onKey(e) {
    const n = +e.key, s = this.s; if (!n) return;
    if (n <= s.flights.length) this.sort(s.flights[n - 1].no);
    else if (n === s.flights.length + 1) this.sort('office');
    else if (n === s.flights.length + 2) this.sort('inspect');
  },

  sort(to, timeout) {
    const s = this.s, b = s.bags[s.idx]; if (!b || s.busy) return;
    const right = this.cart(b), ok = !timeout && to === right;
    const pts = ok ? 20 : timeout ? -40 : -60;
    Game.addScore('mid', pts); Game.decision(ok);
    const where = right === 'office' ? '事務所' : right === 'inspect' ? '検査' : right;
    if (ok) { s.ok++; Sfx.beep(); }
    else {
      s.ng++; Sfx.buzz();
      const msg = timeout ? `間に合わず荷物が流れていった(正しくは ${where})` : `${to === 'office' ? '事務所' : to === 'inspect' ? '検査' : to} に入れたが、正しくは ${where}。${this.why(b)}`;
      Toast.show(`<b>ミス</b> ${msg} <span class="pts">${U.signed(pts)}</span>`, 'bad', 3600);
      Game.log({ area: 'mid', ok: false, name: `${b.name}様の荷物`, flight: b.f ? b.f.no : '—', text: msg, pts });
    }
    document.getElementById('jlog').insertAdjacentHTML('afterbegin', `<li class="${ok ? 'ok' : 'bad'}"><span>${ok ? 'OK' : 'ミス'}</span>${b.kind === 'notag' ? 'タグなし' : this.tag(b).match(/bt-dest">(\w+)/)[1]} → ${timeout ? '流れた' : to === 'office' ? '事務所' : to === 'inspect' ? '検査' : to}</li>`);
    s.busy = true;
    this.renderBelt(ok ? 'out-ok' : 'out-ng');
    setTimeout(() => {
      if (Game.scene !== this) return;
      s.idx++; s.t = 0; s.busy = false;
      s.limit = Math.max(3.2, 6 - s.idx * 0.17);   // だんだん速くなる
      if (s.idx >= this.N) this.finish(); else this.renderBelt();
    }, 260);
  },

  update(dt) {
    const s = this.s;
    Hud.tick(dt, 0);
    if (s.busy || s.idx >= this.N) return;
    s.t += dt;
    const bar = document.getElementById('tbar');
    if (bar) { const k = Math.max(0, 1 - s.t / s.limit); bar.style.width = (k * 100) + '%'; bar.classList.toggle('low', k < 0.3); }
    if (s.t >= s.limit) this.sort(null, true);
  },

  finish() {
    const s = this.s, gf = Game.day.gateFlight;
    if (Modal.open) return;
    const acc = Math.round((s.ok / this.N) * 100);
    Modal.show({
      title: '手荷物の仕分け 終了',
      body: `<div class="sumgrid three"><div><small>正しく仕分け</small><b>${s.ok}/${this.N}</b></div><div><small>正確さ</small><b>${acc}%</b></div><div><small>ここでの点数</small><b>${U.fmt(Game.day.score.mid)}</b></div></div>
        <p>次は <b>${gf.gate}番搭乗口</b> で <b>${gf.no}</b> の搭乗案内です。</p>`,
      actions: [{ label: `${gf.gate}番搭乗口へ向かう`, cls: 'primary', run: () => Game.go('gate') }],
    });
  },
};
