/* ---------- 座席 ---------- */
const Seats = {
  J: { rows: [1, 2], cols: ['A', 'C', 'D', 'F'] },
  Y: { rows: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12], cols: ['A', 'B', 'C', 'D', 'E', 'F'] },
  create() {
    const occ = new Set();
    for (const cls of ['J', 'Y']) for (const s of this.all(cls)) if (U.chance(0.45)) occ.add(s);
    return occ;
  },
  all(cls) { const d = this[cls], out = []; for (const r of d.rows) for (const c of d.cols) out.push(r + c); return out; },
  row(seat) { return parseInt(seat, 10); },
  col(seat) { return seat.slice(-1); },
  clsOf(seat) { return this.row(seat) <= 2 ? 'J' : 'Y'; },
  group(seat) { const r = this.row(seat); return r <= 2 ? 1 : r >= 8 ? 2 : 3; },
  isExit(seat) { return this.row(seat) === DATA.exitRow; },
  // 通路をはさまない、となりの席
  neighbors(seat) {
    const r = this.row(seat), c = this.col(seat);
    const map = r <= 2 ? { A: ['C'], C: ['A'], D: ['F'], F: ['D'] } : { A: ['B'], B: ['A', 'C'], C: ['B'], D: ['E'], E: ['D', 'F'], F: ['E'] };
    return (map[c] || []).map((x) => r + x);
  },
  adjacent(a, b) { return this.neighbors(a).includes(b); },
  matches(seat, req) {
    if (!req) return true;
    const c = this.col(seat);
    if (req === 'window') return c === 'A' || c === 'F';
    if (req === 'aisle') return c === 'C' || c === 'D';
    if (req === 'front') return this.row(seat) <= 5;
    if (req === 'exit') return this.isExit(seat);
    return true;
  },
  anyFree(occ, cls, req) { return this.all(cls).some((s) => !occ.has(s) && this.matches(s, req)); },
  takeRandom(occ, cls, avoid) {
    const free = this.all(cls).filter((s) => !occ.has(s) && !(avoid && avoid(s)));
    const s = free.length ? U.pick(free) : (cls === 'J' ? '2C' : '12B');
    occ.add(s);
    return s;
  },
};

/* ---------- トラブル(問題)の定義 ----------
   day   : 出てくるようになる勤務日
   can   : このお客様に起こせるか
   apply : お客様のデータをどう変えるか
   新しいトラブルはここに足すだけで、生成と判定に組み込まれる */
const ISSUES = {
  name_mismatch: {
    day: 1, can: (p) => !!p.passport,
    apply(p) {
      const t = p.ticket, mode = U.int(0, 2);
      if (mode === 0) { let g; do { g = U.pick(DATA.names[p.nat][p.sex]); } while (g === p.given); t.given = g; }
      else if (mode === 1) t.family = Gen.tweak(p.family);
      else t.given = Gen.tweak(p.given);
    },
  },
  overweight: {
    day: 1, can: (p) => p.allowance < 31,
    apply(p) { if (!p.bag) p.bag = Gen.bag(p.allowance); p.bag.weight = U.r1(U.float(p.allowance + 0.6, Math.min(31.8, p.allowance + 8))); },
  },
  passport_short: {
    day: 4, can: (p) => !!p.passport && !!p.flight.ap.passportMonths,
    apply(p, ctx) { p.passport.expiry = U.addDays(U.addMonths(ctx.date, p.flight.ap.passportMonths), -U.int(12, 140)); },
  },
  expired: {
    day: 2, can: (p) => !!p.passport,
    apply(p, ctx) { p.passport.expiry = U.addDays(ctx.date, -U.int(2, 300)); },
  },
  battery: {
    day: 2, can: () => true,
    apply(p) { if (!p.bag) p.bag = Gen.bag(p.allowance); p.bag.battery = true; },
  },
  wrong_date: {
    day: 3, can: () => true,
    apply(p, ctx) { p.ticket.date = U.addDays(ctx.date, U.pick([1, 1, 1, 2, -1, 7])); },
  },
  late: {
    day: 3, can: () => true,
    apply(p) { p.arrival = p.flight.cutoff + U.int(60, 400); p.late = true; },
  },
  too_heavy: {
    day: 3, can: () => true,
    apply(p) { if (!p.bag) p.bag = Gen.bag(p.allowance); p.bag.weight = U.r1(U.float(32.4, 38)); },
  },
  // 機内に持ち込めない手荷物(大きすぎる・3辺の合計オーバー・重すぎる・2個ある)
  carry_big: {
    day: 3, can: (p) => !!p.carry && !p.rebook,
    apply(p) {
      const c = p.carry, b = c.items[0], mode = U.pick(['size', 'size', 'sum', 'heavy', 'many']);
      if (mode === 'size') {
        const dim = U.pick(['h', 'h', 'w', 'd']);
        if (dim === 'h') b.h = U.int(56, 61); else if (dim === 'w') b.w = U.int(41, 45); else b.d = U.int(26, 30);
        if (b.kind === 'tote' && dim === 'h') b.kind = 'roller';
      } else if (mode === 'sum') {
        // 1辺ずつは制限内なのに、3辺の合計だけが115cmを超える
        b.kind = 'roller'; b.h = U.int(54, 55); b.w = U.int(38, 40); b.d = U.int(116 - b.h - b.w, 25);
      } else if (mode === 'heavy') c.kg = U.r1(U.float(10.6, 14.5));
      else c.items.push(Gen.carryItem('backpack', true));
    },
  },
  no_passport: {
    day: 4, can: (p) => p.flight.intl,
    apply(p) { p.passport = null; p.forgot = true; },
  },
  photo_mismatch: {
    day: 5, can: (p) => !!p.passport,
    apply(p) { p.photoAv = Gen.otherFace(p.av, p.nat, p.sex); },
  },
  no_esta: {
    day: 5, can: (p) => p.flight.ap.entry === 'ESTA' && p.nat !== 'US',
    apply(p, ctx) { p.esta = U.chance(0.5) ? { status: 'none' } : { status: 'expired', until: U.addDays(ctx.date, -U.int(5, 200)) }; },
  },
};

/* ---------- 判定ルール ---------- */
const Rules = {
  applyIssue(p, key, ctx) { ISSUES[key].apply(p, ctx); p.issue = key; },
  // 書類の問題をすべて洗い出す(issue のラベルではなく、データそのものから判定する)
  docProblems(p, ctx) {
    const out = [];
    if (p.arrival > p.flight.cutoff) out.push('closed');
    if (p.ticket.date !== ctx.date) out.push('date');
    if (p.flight.intl) {
      if (!p.passport) out.push('no_passport');
      else {
        const pp = p.passport;
        if (pp.family !== p.ticket.family || pp.given !== p.ticket.given) out.push('name');
        const months = p.flight.ap.passportMonths || 0;
        const need = months ? U.addMonths(ctx.date, months) : ctx.date;
        if (pp.expiry < need) out.push('expired');
        if (p.photoAv) out.push('photo');
      }
      if (p.flight.ap.entry === 'ESTA' && p.nat !== 'US' && (!p.esta || p.esta.status !== 'approved')) out.push('entry');
    }
    if (p.svc === 'minor' && p.minorForm !== 'ok') out.push('minor');
    if (p.flight.canceled) return out.filter((k) => k !== 'closed');
    return out;
  },
  // 非常口座席に座れるか(15歳以上・車いす/ひとり旅のお子さま/赤ちゃん連れでない)
  exitOk(p) { return p.age >= 15 && !p.infant && p.svc !== 'wheelchair' && p.svc !== 'minor'; },
  // 必要な特別手配
  svcNeeded(p) { return p.svc && DATA.svc[p.svc] ? [p.svc] : []; },
  // 振替便が希望に合うか
  altFits(a, need) {
    if (a.seats <= 0) return false;
    if (need.kind === 'by') return !a.tomorrow && a.arr <= need.by;
    if (need.kind === 'pm') return !a.tomorrow && a.dep >= U.t('12:00');
    return true;
  },
  // 希望に合う中でいちばん早い便
  bestAlt(alts, need) {
    const ok = alts.filter((a) => this.altFits(a, need)).sort((x, y) => (x.tomorrow - y.tomorrow) || (x.dep - y.dep));
    return ok[0] || null;
  },
  // 機内持ち込み手荷物の問題(なければ null)。高さ55・幅40・奥行25cm、3辺の合計115cm、合計10kg、手荷物1個まで
  carryProblem(p) {
    const c = p.carry; if (!c) return null;
    if (c.items.length > 1) return `手荷物が${c.items.length}個あった(持ち込めるのは手荷物1個と身の回り品1個まで)`;
    const b = c.items[0], sum = b.h + b.w + b.d;
    if (b.h > 55 || b.w > 40 || b.d > 25) return `手荷物が${b.h}×${b.w}×${b.d}cmで、55×40×25cmを超えていた`;
    if (sum > 115) return `手荷物の3辺の合計が${sum}cmで、115cmを超えていた`;
    if (c.kg > 10) return `持ち込む荷物が合わせて${c.kg.toFixed(1)}kgで、10kgを超えていた`;
    return null;
  },
  bagNeed(weight, allowance) {
    if (weight > DATA.rules.maxPiece) return 'repack';
    if (weight > allowance) return 'fee';
    return 'ok';
  },
  clsName(p) { return DATA.cls[p.cls][p.flight.intl ? 'intl' : 'dom']; },
};
