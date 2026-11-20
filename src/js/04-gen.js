/* ---------- お客様・フライト・1日の生成 ---------- */
const Gen = {
  uid: 1,

  person(nat) {
    const pool = DATA.names[nat] || DATA.names.JP;
    const sex = U.chance(0.5) ? 'M' : 'F';
    return { nat, sex, family: U.pick(pool.family), given: U.pick(pool[sex]), av: this.avatar(nat, sex) };
  },

  avatar(nat, sex) {
    const asian = ['JP', 'KR', 'TW', 'SG'].includes(nat);
    const skins = asian ? ['#f3d2b5', '#ecc6a3', '#e2b48e', '#f6dcc6'] : ['#f3d2b5', '#e8bf9a', '#c99470', '#9a6542', '#6e4630', '#f6dcc6'];
    const hairs = asian ? ['#1e1a17', '#2b221c', '#3f2d22', '#5a3f2b'] : ['#1e1a17', '#4a3326', '#7a5534', '#b8893f', '#d9b56c', '#8a8580'];
    const cloths = ['#2f5d8a', '#8a3b3b', '#3b7a5a', '#555c66', '#c08a2d', '#6b4f8f', '#1f2a44', '#b85c7a', '#d6dade', '#4f7c8a'];
    const styles = sex === 'M' ? ['short', 'short', 'buzz', 'cap', 'short'] : ['long', 'bob', 'bun', 'long', 'short'];
    return {
      skin: U.pick(skins), hair: U.pick(hairs), style: U.pick(styles), cloth: U.pick(cloths),
      cap: U.pick(['#c0392b', '#1f3a8a', '#2d6a4f', '#333a42']), glasses: U.chance(0.25),
    };
  },

  // パスポート用の「別人」の顔(髪型かメガネを含めて2か所以上ちがう)
  otherFace(av, nat, sex) {
    let o = null;
    for (let i = 0; i < 40; i++) {
      o = this.avatar(nat, sex);
      const diff = (o.style !== av.style) + (o.hair !== av.hair) + (o.glasses !== av.glasses) + (o.skin !== av.skin);
      if (diff >= 2 && (o.style !== av.style || o.glasses !== av.glasses)) break;
    }
    if (o.style === av.style && o.glasses === av.glasses) o.glasses = !av.glasses;
    return o;
  },

  setAge(p, age, date) {
    p.age = age;
    if (p.passport) p.passport.birth = U.addDays(U.addMonths(date, -12 * age), -U.int(1, 360));
  },

  // 1文字だけ違う名前を作る(SATO → SATOU / SETO など)
  tweak(name) {
    const V = 'AEIOU';
    if (/O$/.test(name) && U.chance(0.6)) return name + 'U';
    const idx = [...name].map((c, i) => (V.includes(c) ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) return name + 'A';
    const i = U.pick(idx);
    let c; do { c = U.pick([...V]); } while (c === name[i]);
    return name.slice(0, i) + c + name.slice(i + 1);
  },

  passportNo(nat) {
    if (nat === 'JP') return U.code(2, 'ABCDEFGHJKLMNPRSTUVWXYZ') + U.digits(7);
    if (nat === 'KR') return 'M' + U.digits(8);
    return U.digits(9);
  },

  // 機内持ち込み手荷物(ふつうは制限内。ぎりぎりのものも混ぜる)
  carryItem(kind, small) {
    kind = kind || U.weighted(['roller', 'backpack', 'tote'], [5, 3.5, 1.5]);
    const tight = !small && U.chance(0.35);
    let h, w, d;
    if (kind === 'roller') { h = tight ? 55 : U.int(46, 55); w = U.int(34, 40); d = U.int(20, 25); }
    else if (kind === 'backpack') { h = U.int(40, small ? 46 : 52); w = U.int(28, 36); d = U.int(14, 23); }
    else { h = U.int(30, 40); w = U.int(36, 40); d = U.int(12, 18); }
    while (h + w + d > 115) { if (d > 18) d--; else w--; }
    return { kind, h, w, d, color: U.pick(['#2c3e57', '#3c3f44', '#7d2f2f', '#2f6a4f', '#6b5b95', '#a87a2e', '#4a6b8a']) };
  },
  carry() {
    if (!U.chance(0.85)) return null;
    return { items: [this.carryItem()], personal: U.chance(0.55), kg: U.r1(U.chance(0.25) ? U.float(9.2, 10) : U.float(2.5, 9)) };
  },
  bag(allowance) {
    return { weight: U.r1(U.float(Math.max(5, allowance - 11), allowance - 0.4)), battery: false, color: U.pick(['#c0392b', '#2f6fdb', '#2b2f36', '#e0a526', '#6a8f3a', '#8b52c9', '#9aa4ad']) };
  },

  natFor(f, foreign) {
    if (foreign) {
      if (!U.chance(foreign)) return 'JP';
      return f.intl ? U.pick([f.ap.country || 'US', 'US', 'AU', 'GB', 'KR', 'TW', 'SG']) : U.pick(['US', 'AU', 'GB', 'KR', 'TW']);
    }
    if (f.intl) { const x = U.r(); return x < 0.55 ? 'JP' : x < 0.85 ? (f.ap.country || 'US') : U.pick(['US', 'AU', 'GB']); }
    return U.chance(0.1) ? U.pick(['US', 'KR', 'TW', 'AU']) : 'JP';
  },

  makeFlight(f, date, i) {
    const ap = DATA.airports[f.dest], dep = U.t(f.dep), intl = !!ap.intl, R = DATA.rules;
    return {
      num: f.no, no: DATA.airline.code + ' ' + f.no, dest: f.dest, ap, intl, dep, date,
      cutoff: dep - R.cutoff[intl ? 'intl' : 'dom'] * 60,
      boarding: dep - R.boardingStart * 60,
      door: dep - R.doorClose * 60,
      gate: f.gate, color: DATA.flightColors[i % DATA.flightColors.length],
      seats: Seats.create(), phase: 'checkin', delay: 0, actualDep: null,
    };
  },

  // 案内板をにぎやかにする、あとの時間の便(担当外)
  fillers(flights) {
    const used = new Set(flights.map((f) => f.dest));
    const pool = U.shuffle(Object.keys(DATA.airports).filter((k) => !used.has(k)));
    const times = [['09:05', '09:40'], ['10:15', '10:50']];
    return pool.slice(0, Math.max(1, 4 - flights.length)).map((k, i) => {
      const ap = DATA.airports[k], num = String((ap.intl ? 750 : 600) + U.int(1, 40) * 2 + 1);
      return { filler: true, no: 'TB ' + num, num, dest: k, ap, dep: U.t(U.pick(times[i])), gate: String(ap.intl ? U.int(21, 29) : U.int(1, 9)) };
    });
  },

  // 5日目以降の勤務日を自動生成
  procCfg(n) {
    const domK = ['FUK', 'OKA', 'CTS', 'ITM', 'KOJ'], intlK = ['ICN', 'TPE', 'HNL', 'SIN'];
    const NUM = { FUK: 300, OKA: 100, CTS: 200, ITM: 400, KOJ: 500, ICN: 700, TPE: 730, HNL: 740, SIN: 760 };
    const ev = Progress.eventFor(n);
    const d1 = U.pick(domK);
    let d2, d3;
    if (U.chance(0.5)) { d2 = U.pick(intlK); d3 = U.pick(domK.concat(intlK).filter((k) => k !== d1 && k !== d2)); }
    else { d2 = U.pick(domK.filter((k) => k !== d1)); d3 = U.pick(intlK); }
    if (ev === 'typhoon') { d2 = U.pick(domK.filter((k) => k !== d1)); d3 = U.pick(domK.concat(intlK).filter((k) => k !== d1 && k !== d2)); }
    if (ev === 'school') { d3 = U.pick(domK.filter((k) => k !== d1 && k !== d2)); }
    if (ev === 'inbound') { d2 = U.pick(intlK.filter((k) => k !== 'HNL')); d3 = 'HNL'; }
    const gD = U.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]), gI = U.shuffle([21, 22, 23, 24, 25, 26, 27, 28]);
    const mk = (dest, t) => ({ no: String(NUM[dest] + U.int(0, 9) * 2 + 1), dest, dep: t, gate: String(DATA.airports[dest].intl ? gI.pop() : gD.pop()) });
    const k = n - 8;
    const flights = [mk(d1, U.pick(['07:20', '07:25', '07:30', '07:35'])), mk(d2, U.pick(['07:55', '08:00', '08:05', '08:10'])), mk(d3, U.pick(['08:35', '08:40', '08:45', '08:50']))];
    const ob = !ev && U.chance(0.35) ? U.int(1, 2) : 0;
    const cfg = {
      title: `${n}日目`, start: '06:30', speed: Math.min(12, 10 + Math.floor(k / 2)),
      pax: Math.min(13, 10 + Math.floor(k / 3)), gatePax: Math.min(20, 16 + Math.floor(k / 2)), issueRate: 0.45,
      exitReq: 0.2, teen: 0.08, svcRate: 0.15, connRate: 0.2,
      brief: 'これまでのすべてのルールで勤務します。欠航やオーバーブッキングなど、予定外の出来事が起きる日もあります。',
      flights, cancel: U.chance(0.3) ? flights[0].no : undefined,
      gate: { wrong: U.int(2, 3), early: 0.25, noShow: 1, noShowBag: 0.6, latecomers: 2, sameDest: 0.4, gateChange: U.chance(0.3), overbook: ob, equip: ob > 0 && U.chance(0.5) },
    };
    if (ev) {
      const E = DATA.events[ev];
      cfg.event = ev; cfg.title = `${n}日目 ${E.name}`; cfg.brief = E.brief; cfg.cancel = undefined;
      if (ev === 'typhoon') { cfg.cancel = [flights[0].no, flights[1].no]; cfg.pax = 12; }
      if (ev === 'rush') { cfg.pax = 16; cfg.gatePax = 22; cfg.bagRate = 0.95; cfg.issueRate = 0.4; }
      if (ev === 'school') { cfg.school = { flight: flights[2].no, size: 7 }; cfg.pax = Math.max(6, cfg.pax - 4); }
      if (ev === 'inbound') { cfg.foreign = 0.75; cfg.issueRate = 0.55; }
    }
    return cfg;
  },

  passenger(ctx, f) {
    const nat = this.natFor(f, ctx.cfg.foreign), per = this.person(nat);
    const cls = U.chance(0.15) ? 'J' : 'Y';
    const allowance = DATA.rules.allowance[f.intl ? 'intl' : 'dom'][cls];
    const p = {
      id: this.uid++, ...per, cls, flight: f, allowance,
      ticket: { family: per.family, given: per.given, title: per.sex === 'M' ? 'MR' : 'MS', pnr: U.code(6), date: ctx.date },
      passport: f.intl ? { family: per.family, given: per.given, nat, no: this.passportNo(nat), birth: U.addDays('1955-01-01', U.int(0, 18500)), expiry: U.addDays(ctx.date, U.int(250, 3500)) } : null,
      bag: U.chance(ctx.cfg.bagRate || (f.intl ? 0.85 : 0.65)) ? this.bag(allowance) : null,
      seatReq: ctx.cfg.exitReq && U.chance(ctx.cfg.exitReq) ? 'exit' : U.pick([null, null, 'window', 'aisle', 'front']),
      esta: f.ap.entry === 'ESTA' && nat !== 'US' ? { status: 'approved', until: U.addDays(ctx.date, U.int(30, 700)) } : null,
      arrival: 0, issue: null, carry: this.carry(),
    };
    this.setAge(p, U.int(19, 78), ctx.date);
    if (cls === 'J' && (p.seatReq === 'front' || p.seatReq === 'exit')) p.seatReq = null; // J は前方。非常口はエコノミーの8列目
    return p;
  },

  // 特別なお客様にする
  applySvc(p, t, ctx) {
    if (t === 'infant') { p.infant = true; this.setAge(p, U.int(26, 41), ctx.date); if (U.chance(0.45) && p.cls === 'Y') p.seatReq = 'exit'; return; }
    p.svc = t;
    if (t === 'wheelchair') { this.setAge(p, U.int(64, 88), ctx.date); p.seatReq = p.cls === 'Y' ? U.pick([null, 'aisle', 'exit']) : null; }
    if (t === 'fragile') this.setAge(p, U.int(19, 45), ctx.date);
    if (t === 'minor') {
      this.setAge(p, U.int(6, 11), ctx.date);
      p.cls = 'Y'; p.allowance = DATA.rules.allowance[p.flight.intl ? 'intl' : 'dom'].Y;
      p.ticket.title = p.sex === 'M' ? 'MSTR' : 'MISS';
      p.minorForm = U.chance(0.6) ? 'ok' : U.pick(['none', 'blank']);
      p.guardian = this.avatar(p.nat, U.chance(0.5) ? 'F' : 'M');
      const pool = DATA.names[p.nat] || DATA.names.JP;
      p.pickup = { name: `${p.family} ${U.pick(pool.F)}`, rel: '祖母', tel: `090-${U.digits(4)}-${U.digits(4)}` };
      p.seatReq = U.pick([null, 'window']);
      if (p.bag && p.bag.weight > p.allowance) p.bag.weight = U.r1(p.allowance - 3);
    }
  },

  // 欠航した便の振替先
  alts(cf) {
    const block = (DATA.blockMin[cf.dest] || 120) * 60;
    const times = U.shuffle(['10:10', '11:40', '13:20', '15:00', '16:50', '18:30']).slice(0, 3).sort();
    const seats = U.shuffle([0, U.int(1, 2), U.int(2, 4)]);
    const list = times.map((t, i) => { const dep = U.t(t); return { no: 'TB ' + (Number(cf.num) + 2 * (i + 1)), dep, arr: dep + block, seats: seats[i], tomorrow: false, gate: String(U.int(1, 9)) }; });
    list.push({ no: cf.no, dep: cf.dep, arr: cf.dep + block, seats: 40, tomorrow: true, gate: cf.gate });
    return list;
  },

  rebookNeed(cf) {
    const today = cf.alts.filter((a) => !a.tomorrow && a.seats > 0);
    const kind = U.pick(['any', 'by', 'pm']);
    if (kind === 'by' && today.length) { const a = U.pick(today); const by = Math.ceil((a.arr + U.int(0, 40) * 60) / 1800) * 1800; return { kind, by, byText: U.hm(by) }; }
    if (kind === 'pm' && today.some((a) => a.dep >= U.t('12:00'))) return { kind };
    return { kind: 'any' };
  },

  day(n) {
    U.seed((Date.now() ^ Math.imul(n, 2654435761)) >>> 0);
    const cfg = DATA.days[n - 1] || this.procCfg(n);
    const date = U.addDays(CONFIG.startDate, n - 1);
    const flights = cfg.flights.map((f, i) => this.makeFlight(f, date, i));
    const gateFlight = flights.reduce((a, b) => (b.dep > a.dep ? b : a));
    gateFlight.isGate = true;
    const ctx = { n, cfg, date, start: U.t(cfg.start), flights, fillers: this.fillers(flights), gateFlight, pax: [] };

    // お客様(どの便にも最低1人)
    // 欠航(その便のお客様は振替に来る)
    for (const no of [].concat(cfg.cancel || [])) {
      const cf = flights.find((f) => f.num === no && !f.isGate);
      if (cf) { cf.canceled = true; cf.phase = 'canceled'; cf.alts = this.alts(cf); }
    }
    ctx.event = cfg.event || null;
    const pax = flights.map((f) => this.passenger(ctx, f));
    const weights = flights.map((f) => (f === gateFlight ? 1.6 : f.canceled ? 1.3 : 1));
    while (pax.length < cfg.pax) pax.push(this.passenger(ctx, U.weighted(flights, weights)));
    pax.forEach((p) => {
      const lo = ctx.start + 45, hi = Math.max(lo + 60, p.flight.cutoff - 240); p.arrival = U.int(lo, hi);
      if (p.flight.canceled) { p.rebook = this.rebookNeed(p.flight); p.bag = null; p.seatReq = null; p.issue = 'rebook'; }
    });

    // 修学旅行の団体(先生のあとに生徒が続けて来る)
    if (cfg.school) {
      const f = flights.find((x) => x.num === cfg.school.flight) || gateFlight;
      const t0 = U.int(ctx.start + 90, Math.max(ctx.start + 120, f.cutoff - 25 * 60));
      const mkJP = (p) => {
        const per = this.person('JP');
        Object.assign(p, { nat: 'JP', sex: per.sex, family: per.family, given: per.given, av: per.av, passport: null, esta: null, cls: 'Y', allowance: DATA.rules.allowance[f.intl ? 'intl' : 'dom'].Y });
        Object.assign(p.ticket, { family: per.family, given: per.given, title: per.sex === 'M' ? 'MR' : 'MS' });
      };
      const teacher = this.passenger(ctx, f); mkJP(teacher); this.setAge(teacher, U.int(32, 55), ctx.date);
      Object.assign(teacher, { school: 'teacher', issue: 'school', seatReq: null, arrival: t0 });
      pax.push(teacher);
      let prev = null;
      for (let i = 0; i < cfg.school.size; i++) {
        const st = this.passenger(ctx, f); mkJP(st); this.setAge(st, U.chance(0.65) ? 14 : 15, ctx.date);
        Object.assign(st, { school: 'student', issue: 'school', seatReq: prev ? 'buddy' : 'window', buddy: prev, arrival: t0 + 30 + i * 20 });
        st.bag = U.chance(0.7) ? { weight: U.r1(U.float(5, 12)), battery: false, color: U.pick(['#2f6fdb', '#c0392b', '#2b2f36', '#e0a526']) } : null;
        pax.push(st); prev = st;
      }
    }
    // トラブル:その日に初登場するものは必ず1回出す
    const avail = Object.keys(ISSUES).filter((k) => ISSUES[k].day <= n);
    const fresh = avail.filter((k) => ISSUES[k].day === n);
    const order = U.shuffle(pax);
    for (const k of fresh) { const p = order.find((q) => !q.issue && ISSUES[k].can(q, ctx)); if (p) Rules.applyIssue(p, k, ctx); }
    for (const p of order) {
      if (p.issue || !U.chance(cfg.issueRate)) continue;
      const ks = U.shuffle(avail).filter((k) => ISSUES[k].can(p, ctx));
      if (ks.length) Rules.applyIssue(p, ks[0], ctx);
    }
    // サポートが必要なお客様(6日目は全種類を1回ずつ)
    if (cfg.svcRate) {
      const types = ['wheelchair', 'minor', 'pet', 'fragile', 'infant'];
      const fits = (p, t) => (t === 'pet' ? !p.flight.intl : true);
      const cand = U.shuffle(pax.filter((p) => !p.issue));
      if (n === 6) { for (const t of types) { const p = cand.find((q) => !q.svc && !q.infant && fits(q, t)); if (p) this.applySvc(p, t, ctx); } }
      else for (const p of cand) if (U.chance(cfg.svcRate)) this.applySvc(p, U.pick(types.filter((t) => fits(p, t))), ctx);
    }
    // 12〜14歳のお客様(非常口座席には座れない)
    if (cfg.teen) for (const p of pax) if (!p.issue && !p.svc && !p.infant && U.chance(cfg.teen)) { this.setAge(p, U.int(12, 14), ctx.date); if (p.cls === 'Y' && U.chance(0.55)) p.seatReq = 'exit'; }
    // 乗り継ぎのお客様
    if (cfg.connRate) for (const p of pax) {
      const ow = DATA.onward[p.flight.dest];
      if (!ow || p.rebook || p.svc === 'minor' || !U.chance(cfg.connRate)) continue;
      const dest = U.pick(ow);
      p.conn = { dest, no: 'TB ' + (900 + U.int(1, 49) * 2 + 1), dep: U.hm(p.flight.dep + U.int(5, 8) * 3600) };
      if (!p.bag) p.bag = this.bag(p.allowance);
    }
    pax.sort((a, b) => a.arrival - b.arrival);
    ctx.pax = pax;
    return ctx;
  },

  /* ---------- 搭乗ゲートの乗客名簿 ---------- */
  gp(f, c, fromCounter) {
    return {
      id: this.uid++, kind: 'pax', nat: c.nat, sex: c.sex, family: c.family, given: c.given, title: c.title, av: c.av,
      flightNo: f.no, dest: f.dest, date: f.date, gate: f.gate, boarding: U.hm(f.boarding),
      seat: c.seat, cls: c.cls, group: c.priority ? 0 : Seats.group(c.seat), priority: !!c.priority, hasBag: !!c.hasBag, fromCounter,
      svc: c.svc || null, infant: !!c.infant, age: c.age || U.int(20, 75),
      state: null, arriveAt: null, neverShow: false, impatient: false, heldOnce: false,
    };
  },

  intruder(ctx, f) {
    const sameDest = U.chance(ctx.cfg.gate.sameDest || 0);
    const dest = sameDest ? f.dest : U.pick(Object.keys(DATA.airports).filter((k) => k !== f.dest && !!DATA.airports[k].intl === f.intl));
    const num = String(Number(f.num) + U.pick([2, 4, 6, 8, 10]));
    const gate = String(Math.max(1, Number(f.gate) + U.pick([1, 3, -1])));   // +2 は搭乗口変更先なので使わない
    const per = this.person(f.intl ? U.pick(['JP', 'JP', 'US', DATA.airports[dest].country || 'JP']) : 'JP');
    const dep = f.dep + U.pick([20, 35, 50]) * 60;
    const seat = `${U.int(3, 12)}${U.pick(['A', 'B', 'C', 'D', 'E', 'F'])}`;
    return {
      id: this.uid++, kind: 'wrong', ...per, title: per.sex === 'M' ? 'MR' : 'MS',
      flightNo: 'TB ' + num, dest, gate, date: f.date, seat, group: Seats.group(seat), priority: false, boarding: U.hm(dep - 30 * 60),
      spawnAt: f.boarding + U.int(60, 12 * 60), state: 'away',
    };
  },

  gateManifest(ctx) {
    const f = ctx.gateFlight, g = ctx.cfg.gate;
    const list = (ctx.checked[f.no] || []).map((c) => this.gp(f, c, true));
    const total = Math.max(ctx.cfg.gatePax, list.length + 4);
    while (list.length < total) {
      const per = this.person(this.natFor(f, ctx.cfg.foreign)), cls = U.chance(0.15) ? 'J' : 'Y';
      list.push(this.gp(f, { ...per, title: per.sex === 'M' ? 'MR' : 'MS', cls, seat: Seats.takeRandom(f.seats, cls), hasBag: U.chance(0.6) }, false));
    }
    const fillers = U.shuffle(list.filter((x) => !x.fromCounter));
    const pri = Math.max(0, U.int(1, 2) - list.filter((x) => x.priority).length);
    fillers.slice(0, pri).forEach((x) => { x.priority = true; x.group = 0; if (U.chance(0.5)) { x.svc = 'wheelchair'; x.age = U.int(65, 85); } else { x.infant = true; x.age = U.int(26, 40); } });
    const pool = fillers.filter((x) => !x.priority);
    let k = 0;
    for (let i = 0; i < g.noShow && k < pool.length; i++, k++) { const x = pool[k]; x.state = 'away'; x.neverShow = true; x.hasBag = U.chance(g.noShowBag); }
    for (let i = 0; i < g.latecomers && k < pool.length; i++, k++) { pool[k].state = 'away'; }
    for (const x of list) {
      if (x.state) continue;
      if (U.chance(0.22)) { x.state = 'away'; x.arriveAt = f.boarding + U.int(40, 7 * 60); } else x.state = 'lounge';
      if (x.group >= 2 && U.chance(g.early)) x.impatient = true;
    }
    const wrongs = [];
    for (let i = 0; i < g.wrong; i++) wrongs.push(this.intruder(ctx, f));
    return { list, wrongs };
  },

  // 搭乗口で起きる出来事(搭乗口変更・機材変更・オーバーブッキング)
  gateEvents(ctx, man) {
    const f = ctx.gateFlight, g = ctx.cfg.gate, ev = {};
    if (g.gateChange) { ev.oldGate = f.gate; ev.newGate = String(Number(f.gate) + 2); }
    if (g.equip) {
      ev.removed = [11, 12];
      let shown = man.list.filter((x) => Seats.row(x.seat) >= 11);
      const pool = U.shuffle(man.list.filter((x) => !x.fromCounter && !x.priority && x.cls === 'Y' && Seats.row(x.seat) < 11));
      while (shown.length < 2 && pool.length) {
        const x = pool.pop();
        const free = ['11A', '11B', '11C', '11D', '11E', '11F', '12A', '12B', '12C', '12D', '12E', '12F'].filter((s) => !man.list.some((y) => y.seat === s));
        x.seat = U.pick(free); x.group = 2; shown = man.list.filter((y) => Seats.row(y.seat) >= 11);
      }
    }
    if (g.overbook) {
      const need = g.overbook;
      const later = { no: 'TB ' + (Number(f.num) + 2), dep: f.dep + U.int(3, 5) * 3600 };
      const pool = U.shuffle(man.list.filter((x) => x.state === 'lounge' && !x.priority && !x.neverShow));
      const n = Math.min(pool.length, need + U.int(2, 3));
      const cands = pool.slice(0, n).map((x, i) => ({ g: x, kind: i < need ? U.pick(['any', 'today']) : U.pick(['connect', 'connect', 'today', 'any']) }));
      ev.ob = { need, later, cands: U.shuffle(cands), got: 0, announced: false, done: false };
    }
    return ev;
  },
};
