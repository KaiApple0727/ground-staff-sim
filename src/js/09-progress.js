/* ---------- 長く遊ぶための仕組み(昇進・特別な日・目標) ---------- */
const Progress = {
  // 昇進して解放された仕事か
  unlocked(job, total = Store.data.total) { return DATA.ranks.some((r) => r.unlock === job && total >= r.min); },
  // その日、カウンターとゲートの間に入る仕事(解放された仕事を日替わりで)
  midFor(n) {
    const un = Object.keys(DATA.jobs).filter((j) => this.unlocked(j));
    return un.length ? un[n % un.length] : null;
  },
  // 特別な日:9日目から3日ごと
  eventFor(n) {
    if (n < 9 || (n - 9) % 3) return null;
    const o = DATA.eventOrder;
    return o[((n - 9) / 3) % o.length];
  },
  nextEvent(n) { for (let k = n + 1; k <= n + 3; k++) if (this.eventFor(k)) return k; return null; },
  // 次の昇進で増える仕事
  nextUnlock(total = Store.data.total) { return DATA.ranks.find((r) => r.unlock && total < r.min) || null; },
};

/* 毎日の目標(3つ)。達成するとメダルがもらえる */
const Goals = {
  pool: {
    score: { label: (d) => `${U.fmt(d.target)}点以上`, check: (d) => Game.dayScore() >= d.target },
    nomiss: { ok: (d) => d.n >= 2, label: 'ミス0回で1日を終える', check: (d) => !d.log.some((l) => l.ok === false) },
    acc95: { label: '判断の正確さ95%以上', check: (d) => d.dec > 0 && d.good / d.dec >= 0.95 },
    sat90: { label: 'お客様満足度90以上', check: (d) => d.sat >= 90 },
    ontime: { label: '定刻に出発させる', check: (d) => !!d.onTime },
    nomissed: { label: 'カウンターの乗り遅れ0名', check: (d) => !d.stats.missed },
    combo15: { label: 'コンボ15以上', check: (d) => d.maxCombo >= 15 },
    combo25: { ok: (d) => d.n >= 5, label: 'コンボ25以上', check: (d) => d.maxCombo >= 25 },
    counterPerfect: { label: 'カウンターでミス0', check: (d) => !d.log.some((l) => l.area === 'counter' && l.ok === false) },
    gatePerfect: { label: '搭乗ゲートでミス0', check: (d) => !d.log.some((l) => l.area === 'gate' && l.ok === false) },
    midPerfect: { ok: (d) => !!d.mid, label: (d) => `${DATA.jobs[d.mid].name}でミス0`, check: (d) => !d.log.some((l) => l.area === 'mid' && l.ok === false) },
    // 特別な日の目標(その日は必ず入る)
    ev_school: { ok: () => false, label: 'お友だちのとなりの希望をすべてかなえる', check: (d) => d.stats.buddyMet > 0 && !d.stats.buddyMiss },
    ev_typhoon: { ok: () => false, label: '振替をすべて「いちばんよい便」にする', check: (d) => d.stats.rebooked > 0 && !d.stats.rebookNotBest },
    ev_rush: { ok: () => false, label: '大混雑でも乗り遅れ0名', check: (d) => !d.stats.missed },
    ev_inbound: { ok: () => false, label: 'パスポート・ESTAの見逃し0', check: (d) => !d.stats.docMiss },
  },
  rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  },
  forDay(d) {
    d.target = Math.round((1300 + Math.min(d.n, 16) * 70 + (d.mid ? 250 : 0)) / 100) * 100;
    const r = this.rng(U.hash('goals-' + d.n));
    const ids = Object.keys(this.pool).filter((k) => k !== 'score' && !k.startsWith('ev_') && (!this.pool[k].ok || this.pool[k].ok(d)));
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    return d.event ? ['score', 'ev_' + d.event, ids[0]] : ['score', ids[0], ids[1]];
  },
  label(id, d) { const L = this.pool[id].label; return typeof L === 'function' ? L(d) : L; },
  check(id, d) { try { return !!this.pool[id].check(d); } catch (e) { return false; } },
  medalCount() { return Object.values(Store.data.medals || {}).reduce((s, a) => s + a.length, 0); },
};
