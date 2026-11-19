/* ---------- 汎用ヘルパー ---------- */
const $ = (sel) => document.querySelector(sel);

const U = {
  _rng: Math.random,
  // 再現できる乱数(mulberry32)
  seed(s) {
    let a = s >>> 0;
    this._rng = function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  r() { return this._rng(); },
  int(a, b) { return a + Math.floor(this.r() * (b - a + 1)); },
  float(a, b) { return a + this.r() * (b - a); },
  pick(arr) { return arr[Math.floor(this.r() * arr.length)]; },
  chance(p) { return this.r() < p; },
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  },
  weighted(items, weights) {
    const sum = weights.reduce((s, w) => s + w, 0);
    let x = this.r() * sum;
    for (let i = 0; i < items.length; i++) { x -= weights[i]; if (x <= 0) return items[i]; }
    return items[items.length - 1];
  },
  r1(x) { return Math.round(x * 10) / 10; },
  clamp(x, a, b) { return Math.max(a, Math.min(b, x)); },
  pad(n) { return String(n).padStart(2, '0'); },
  // 時刻は「0時からの秒数」で持つ
  t(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 3600 + m * 60; },
  hm(sec) { sec = Math.floor(sec); return this.pad(Math.floor(sec / 3600) % 24) + ':' + this.pad(Math.floor(sec / 60) % 60); },
  esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  fmt(n) { return Math.round(n).toLocaleString('ja-JP'); },
  signed(n) { return (n > 0 ? '+' : '') + Math.round(n).toLocaleString('ja-JP'); },
  // 日付は 'YYYY-MM-DD' の文字列で持つ(文字列のまま大小比較できる)
  D(iso) { return new Date(iso + 'T00:00:00Z'); },
  iso(d) { return d.toISOString().slice(0, 10); },
  addDays(iso, n) { const d = this.D(iso); d.setUTCDate(d.getUTCDate() + n); return this.iso(d); },
  addMonths(iso, n) {
    const d = this.D(iso), day = d.getUTCDate();
    d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, last));
    return this.iso(d);
  },
  WD: ['日', '月', '火', '水', '木', '金', '土'],
  WDE: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  MON: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
  jp(iso) { const d = this.D(iso); return `${d.getUTCFullYear()}年${this.pad(d.getUTCMonth() + 1)}月${this.pad(d.getUTCDate())}日(${this.WD[d.getUTCDay()]})`; },
  jpShort(iso) { const d = this.D(iso); return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日(${this.WD[d.getUTCDay()]})`; },
  dot(iso) { const d = this.D(iso); return `${d.getUTCFullYear()}.${this.pad(d.getUTCMonth() + 1)}.${this.pad(d.getUTCDate())} ${this.WDE[d.getUTCDay()]}`; },
  pp(iso) { const d = this.D(iso); return `${this.pad(d.getUTCDate())} ${this.MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; },
  tkt(iso) { const d = this.D(iso); return `${this.pad(d.getUTCDate())}${this.MON[d.getUTCMonth()]}`; },
  code(len, set = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789') { let s = ''; for (let i = 0; i < len; i++) s += set[Math.floor(this.r() * set.length)]; return s; },
  digits(n) { let s = ''; for (let i = 0; i < n; i++) s += Math.floor(this.r() * 10); return s; },
  hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
};
