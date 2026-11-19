/* ---------- 絵(SVG)と書類 ---------- */
const Art = {
  avatar(av, mood = 'neutral', opts = {}) {
    const { skin, hair, style, cloth, glasses } = av;
    const back = {
      long: `<path d="M31 58 Q30 24 60 24 Q90 24 89 58 L92 106 Q60 114 28 106 Z" fill="${hair}"/>`,
      bob: `<path d="M32 58 Q31 25 60 25 Q89 25 88 58 L89 86 Q60 92 31 86 Z" fill="${hair}"/>`,
    }[style] || '';
    const front = {
      short: `<path d="M34 57 Q33 29 60 29 Q87 29 86 57 Q82 41 60 39 Q41 40 34 57 Z" fill="${hair}"/>`,
      buzz: `<path d="M36 50 Q38 31 60 31 Q82 31 84 50 Q74 38 60 37 Q46 38 36 50 Z" fill="${hair}"/>`,
      long: `<path d="M35 60 Q33 30 60 30 Q87 30 85 60 Q80 41 64 40 Q49 47 35 60 Z" fill="${hair}"/>`,
      bob: `<path d="M34 54 Q35 30 60 30 Q85 30 86 54 Q72 45 60 46 Q46 45 34 54 Z" fill="${hair}"/>`,
      bun: `<circle cx="60" cy="25" r="10" fill="${hair}"/><path d="M34 57 Q33 31 60 31 Q87 31 86 57 Q80 42 60 41 Q40 42 34 57 Z" fill="${hair}"/>`,
      cap: `<path d="M33 50 Q34 25 60 25 Q86 25 87 50 Z" fill="${av.cap}"/><path d="M56 47 L100 50 Q97 57 60 54 Z" fill="${av.cap}"/>`,
    }[style] || '';
    const brows = mood === 'upset'
      ? '<path d="M45 52 L56 55 M75 52 L64 55" stroke="#2a201b" stroke-width="2.2" stroke-linecap="round"/>'
      : mood === 'sad'
        ? '<path d="M45 55 L55 52 M75 55 L65 52" stroke="#2a201b" stroke-width="2" stroke-linecap="round"/>'
        : '<path d="M46 52 Q51 50 56 52 M64 52 Q69 50 74 52" stroke="#2a201b" stroke-width="2" fill="none" stroke-linecap="round"/>';
    const mouth = {
      happy: '<path d="M51 70 Q60 79 69 70" stroke="#6b2b22" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
      upset: '<path d="M52 76 Q60 69 68 76" stroke="#6b2b22" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
      sad: '<path d="M53 75 Q60 71 67 75" stroke="#6b2b22" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
      surprised: '<ellipse cx="60" cy="73" rx="3.6" ry="4.4" fill="#6b2b22"/>',
    }[mood] || '<path d="M54 72 L66 72" stroke="#6b2b22" stroke-width="2.4" stroke-linecap="round"/>';
    const cheeks = mood === 'happy' ? '<circle cx="44" cy="67" r="4" fill="#e8806d" opacity=".35"/><circle cx="76" cy="67" r="4" fill="#e8806d" opacity=".35"/>' : '';
    const gl = glasses ? '<g stroke="#23272c" stroke-width="2" fill="none"><circle cx="51" cy="60" r="6.5"/><circle cx="69" cy="60" r="6.5"/><path d="M57.5 60 L62.5 60"/></g>' : '';
    const baby = opts.baby ? `<path d="M40 128 Q42 104 62 103 Q84 104 84 124 Q70 134 40 128 Z" fill="#f4e3c8"/><circle cx="66" cy="104" r="9.5" fill="${skin}"/><path d="M58 101 Q66 92 74 101" fill="#4a3326"/><circle cx="63" cy="105" r="1.2" fill="#222"/><circle cx="69" cy="105" r="1.2" fill="#222"/>` : '';
    const vb = opts.crop ? '24 18 72 86' : '0 0 120 140';
    return `<svg viewBox="${vb}" class="av" aria-hidden="true" preserveAspectRatio="xMidYMid slice">${back}
      <path d="M16 142 Q16 104 44 97 L76 97 Q104 104 104 142 Z" fill="${cloth}"/>
      <path d="M50 97 L60 111 L70 97 Z" fill="#fff" opacity=".8"/>
      <rect x="52" y="78" width="16" height="22" rx="6" fill="${skin}"/>
      <ellipse cx="60" cy="58" rx="25" ry="27" fill="${skin}"/>
      ${front}
      <circle cx="51" cy="60" r="2.6" fill="#1b1b1b"/><circle cx="69" cy="60" r="2.6" fill="#1b1b1b"/>
      ${brows}${mouth}${cheeks}${gl}${baby}</svg>`;
  },
  // お客様の全身(車いす・お子さまと保護者・ペット・ギター・赤ちゃん)
  figure(p, mood = 'neutral', opts = {}) {
    const parts = [];
    if (p.svc === 'minor' && p.guardian && !opts.noEscort) parts.push(`<div class="fig adult">${this.avatar(p.guardian, 'neutral')}</div>`);
    const age = p.age || 30, size = age < 12 ? 'child' : age < 15 ? 'teen' : '';
    parts.push(`<div class="fig main ${size} ${p.svc === 'wheelchair' ? 'wc' : ''}">${this.avatar(p.av, mood, { baby: p.infant })}${p.svc === 'wheelchair' ? this.wheelchair() : ''}</div>`);
    if (p.svc === 'pet') parts.push(`<div class="fig prop">${this.crate()}</div>`);
    if (p.svc === 'fragile') parts.push(`<div class="fig prop tall">${this.guitar()}</div>`);
    return `<div class="figs">${parts.join('')}${opts.extra || ''}</div>`;
  },
  wheelchair() {
    return '<svg viewBox="0 0 80 60" class="wheelchair" aria-hidden="true"><path d="M8 6 L18 6 L24 34 L62 34" stroke="#2b2f36" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="30" cy="40" r="17" fill="none" stroke="#2b2f36" stroke-width="4"/><path d="M30 23 V57 M13 40 H47 M18 28 L42 52 M42 28 L18 52" stroke="#6b737c" stroke-width="1.5"/><circle cx="64" cy="52" r="5" fill="none" stroke="#2b2f36" stroke-width="3"/></svg>';
  },
  crate() {
    return '<svg viewBox="0 0 70 56" class="crate" aria-hidden="true"><rect x="3" y="8" width="64" height="44" rx="7" fill="#9aa4ad"/><rect x="3" y="8" width="64" height="44" rx="7" fill="none" stroke="#5d666f" stroke-width="2"/><rect x="24" y="2" width="22" height="8" rx="3" fill="#5d666f"/><rect x="12" y="18" width="30" height="26" rx="4" fill="#2b2f36"/><path d="M18 18 V44 M24 18 V44 M30 18 V44 M36 18 V44" stroke="#9aa4ad" stroke-width="2"/><path d="M20 26 L24 21 L27 27 Z M31 27 L34 21 L38 26 Z" fill="#c08a4a"/><circle cx="25" cy="31" r="1.6" fill="#fff"/><circle cx="33" cy="31" r="1.6" fill="#fff"/><circle cx="54" cy="30" r="3" fill="#5d666f"/></svg>';
  },
  guitar() {
    return '<svg viewBox="0 0 40 110" class="guitar" aria-hidden="true"><path d="M14 4 H26 V40 Q36 46 35 62 Q34 74 30 78 Q38 88 34 100 Q30 108 20 108 Q10 108 6 100 Q2 88 10 78 Q6 74 5 62 Q4 46 14 40 Z" fill="#2b2f36"/><path d="M17 8 H23 V40" stroke="#555d66" stroke-width="2" fill="none"/><rect x="13" y="58" width="14" height="6" rx="2" fill="#555d66"/></svg>';
  },
  mini(av, color) {
    return `<svg viewBox="0 0 20 30" aria-hidden="true"><circle cx="10" cy="7" r="5.2" fill="${av.skin}"/><path d="M5 5.5 Q5 1.5 10 1.5 Q15 1.5 15 5.5 Q12 3.8 10 3.8 Q8 3.8 5 5.5Z" fill="${av.hair}"/><path d="M2 30 Q2 14 10 14 Q18 14 18 30Z" fill="${color}"/></svg>`;
  },
  suitcase(color) {
    return `<svg viewBox="0 0 80 92" class="suitcase" aria-hidden="true"><rect x="29" y="2" width="22" height="14" rx="5" fill="none" stroke="#2b2f36" stroke-width="4"/>
      <rect x="8" y="13" width="64" height="70" rx="9" fill="${color}"/><path d="M24 20 V77 M40 20 V77 M56 20 V77" stroke="rgba(0,0,0,.18)" stroke-width="3"/>
      <rect x="8" y="13" width="64" height="70" rx="9" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
      <circle cx="20" cy="87" r="4.5" fill="#22262b"/><circle cx="60" cy="87" r="4.5" fill="#22262b"/></svg>`;
  },
  barcode(str, w = 180, h = 36) {
    let x = 0, hs = U.hash(str) || 7;
    const bars = [];
    for (let i = 0; i < 52; i++) {
      hs = Math.imul(hs ^ (hs >>> 13), 1274126177) >>> 0;
      const bw = 1 + (hs % 3);
      if (i % 2 === 0) bars.push(`<rect x="${x}" y="0" width="${bw}" height="${h}"/>`);
      x += bw;
    }
    return `<svg viewBox="0 0 ${x} ${h}" preserveAspectRatio="none" class="barcode" style="width:${w}px;height:${h}px" aria-hidden="true">${bars.join('')}</svg>`;
  },
  logo() {
    return '<svg viewBox="0 0 40 40" class="logo" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#1f3a8a"/><path d="M6 26 Q16 13 35 9 Q24 17 20 28 Q13 25 6 26 Z" fill="#ffb41f"/><path d="M10 30 Q19 25 31 23" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  },
  star(on) { return `<svg viewBox="0 0 24 24" class="star ${on ? 'on' : ''}" aria-hidden="true"><path d="M12 2.5 L14.9 8.6 L21.5 9.4 L16.6 14 L17.9 20.6 L12 17.3 L6.1 20.6 L7.4 14 L2.5 9.4 L9.1 8.6 Z"/></svg>`; },
};

const Docs = {
  passport(pp, av, photoAv) {
    const c = DATA.countries[pp.nat] || DATA.countries.JP;
    const mrzName = (pp.family + '<<' + pp.given).replace(/[ -]/g, '<');
    const mrz1 = ('P<' + c.code + mrzName).padEnd(44, '<').slice(0, 44);
    const mrz2 = (pp.no + '<' + c.code + pp.birth.replace(/-/g, '').slice(2) + '<' + pp.expiry.replace(/-/g, '').slice(2)).padEnd(44, '<').slice(0, 44);
    return `<article class="doc passport" aria-label="パスポート">
      <header><span>PASSPORT · 旅券</span><span>${c.code}</span></header>
      <div class="pp-main">
        <div class="pp-photo">${Art.avatar({ ...(photoAv || av), cloth: '#5f6873' }, 'neutral', { crop: true })}</div>
        <dl class="pp-fields">
          <div><dt>姓 SURNAME</dt><dd class="nm">${U.esc(pp.family)}</dd></div>
          <div><dt>名 GIVEN NAMES</dt><dd class="nm">${U.esc(pp.given)}</dd></div>
          <div><dt>国籍 NATIONALITY</dt><dd>${c.en}</dd></div>
          <div class="two"><div><dt>生年月日 BIRTH</dt><dd>${U.pp(pp.birth)}</dd></div><div><dt>有効期限 EXPIRY</dt><dd class="exp">${U.pp(pp.expiry)}</dd></div></div>
          <div><dt>旅券番号 No.</dt><dd class="mono">${pp.no}</dd></div>
        </dl>
      </div>
      <div class="mrz">${U.esc(mrz1)}<br>${U.esc(mrz2)}</div>
    </article>`;
  },
  ticket(p) {
    const f = p.flight, t = p.ticket, c = p.conn;
    return `<article class="doc ticket ${f.canceled ? 'cxl' : ''}" aria-label="eチケット控え">
      <header><span class="tk-air">${Art.logo()}${DATA.airline.name}</span><span class="tk-title">eチケットお客様控え<small>E-TICKET RECEIPT</small></span></header>
      ${f.canceled ? '<div class="stamp">欠航 CANCELLED</div>' : ''}
      <dl class="tk-grid">
        <div class="wide"><dt>お名前 NAME</dt><dd class="big">${U.esc(t.family)}/${U.esc(t.given)} ${t.title}${p.infant ? ' <span class="inf">+幼児 INF</span>' : ''}</dd></div>
        <div><dt>便名 FLIGHT</dt><dd>${f.no}</dd></div>
        <div><dt>搭乗日 DATE</dt><dd>${U.jp(t.date)}</dd></div>
        <div class="wide"><dt>区間 ROUTE</dt><dd>${c ? `${DATA.home.code} → ${f.dest} ${f.ap.name} → <span class="conn">${c.dest} ${DATA.cities[c.dest].name}<small>(乗り継ぎ ${c.no} ${c.dep}発)</small></span>` : `${DATA.home.code} ${DATA.home.name} → ${f.dest} ${f.ap.name}`}</dd></div>
        <div><dt>出発 DEPARTURE</dt><dd>${U.hm(f.dep)}</dd></div>
        <div><dt>クラス CLASS</dt><dd>${Rules.clsName(p)} (${p.cls})</dd></div>
        <div><dt>無料手荷物 BAGGAGE</dt><dd>${p.allowance}kg</dd></div>
        <div><dt>予約番号 PNR</dt><dd class="mono">${t.pnr}</dd></div>
      </dl>
    </article>`;
  },
  bpass(d, cls = '') {
    const grp = d.priority ? 0 : d.group;
    return `<article class="doc bpass ${cls}" aria-label="搭乗券">
      <div class="bp-main">
        <header class="${d.airEn ? 'other' : ''}">${d.airEn ? '<span class="logo-other" aria-hidden="true"></span>' : Art.logo()}<b>${d.airEn || DATA.airline.en}</b><span>搭乗券 BOARDING PASS</span></header>
        <div class="bp-name">${U.esc(d.family)}/${U.esc(d.given)} ${d.title}</div>
        <div class="bp-route"><span><small>FROM</small>${DATA.home.code}</span><span class="arrow">→</span><span><small>TO</small>${d.dest}</span><span class="bp-city">${DATA.airports[d.dest].name}</span>${d.cls ? `<span class="bp-cls ${d.cls === 'J' ? 'j' : ''}">${d.cls === 'J' ? 'BUSINESS (J)' : 'ECONOMY (Y)'}</span>` : ''}</div>
        <dl class="bp-grid">
          <div><dt>便名 FLIGHT</dt><dd>${d.flightNo}</dd></div>
          <div><dt>日付 DATE</dt><dd>${U.tkt(d.date)}</dd></div>
          <div><dt>搭乗口 GATE</dt><dd>${d.gate}</dd></div>
          <div><dt>搭乗開始 BOARDING</dt><dd>${d.boarding}</dd></div>
          <div><dt>座席 SEAT</dt><dd>${d.seat}</dd></div>
          <div class="grp"><dt>グループ GROUP</dt><dd>${grp}</dd></div>
        </dl>
        ${d.priority ? '<div class="bp-flag">事前改札 PRIORITY</div>' : ''}
      </div>
      <div class="bp-stub"><small>FLIGHT</small><b>${d.flightNo}</b><small>SEAT</small><b>${d.seat}</b><small>GROUP</small><b>${grp}</b>${Art.barcode(d.family + d.seat + d.flightNo, 86, 28)}</div>
    </article>`;
  },
  minorForm(p) {
    if (p.minorForm === 'none') return '<div class="doc missing small-doc"><b>申込書の提示なし</b><small>お子さまのひとり旅</small></div>';
    const pk = p.minorForm === 'ok' ? p.pickup : null;
    return `<article class="doc umform" aria-label="ひとり旅サポート申込書">
      <header>ひとり旅サポート申込書 <small>UNACCOMPANIED MINOR</small></header>
      <dl>
        <div><dt>お子さま</dt><dd>${U.esc(p.ticket.family)} ${U.esc(p.ticket.given)}(${p.age}歳)</dd></div>
        <div><dt>到着地でのお迎えの方</dt><dd class="${pk ? '' : 'blank'}">${pk ? `${U.esc(pk.name)}(${pk.rel}) ${pk.tel}` : '(未記入)'}</dd></div>
      </dl>
    </article>`;
  },
  memberCard(c) {
    const t = DATA.tiers[c.tier];
    return `<article class="doc mcard t-${c.tier.toLowerCase()}" aria-label="会員カード">
      <div class="mc-top"><span>TSUBASA CLUB</span><b>${c.tier}</b></div>
      <div class="mc-name">${U.esc(c.name)}</div>
      <div class="mc-bot"><span class="mono">${c.no}</span><span>有効期限 <b>${c.expiry.slice(0, 7).replace('-', '/')}</b></span></div>
      <small class="mc-ja">${t.name}会員</small>
    </article>`;
  },
  bagtag(p, date, through) {
    const f = p.flight, dest = through && p.conn ? p.conn.dest : f.dest;
    return `<article class="doc bagtag" aria-label="手荷物タグ">
      <div class="bt-dest">${dest}</div>
      <div class="bt-city">${through && p.conn ? `${DATA.cities[dest].en} <b>via ${f.dest}</b>` : f.ap.en}</div>
      <div class="bt-info">${f.no} / ${U.tkt(date)}<br>${U.esc(p.ticket.family)}</div>
      ${Art.barcode('tag' + p.id + f.no, 96, 26)}
      <div class="bt-no">TB ${String(482000 + p.id * 37).slice(-6)}</div>
    </article>`;
  },
};

const SeatMap = {
  html(occ, sel, mark) {
    const cols = ['A', 'B', 'C', 'D', 'E', 'F'], ex = DATA.exitRow;
    let h = '<div class="sm-h"></div>' + cols.map((c, i) => (i === 3 ? '<div class="sm-aisle"></div>' : '') + `<div class="sm-h">${c}</div>`).join('');
    for (let r = 1; r <= 12; r++) {
      if (r === 3) h += '<div class="sm-break" aria-hidden="true"></div>';
      h += `<div class="sm-r ${r === ex ? 'ex' : ''}" ${r === ex ? 'title="非常口座席"' : ''}>${r === ex ? `<span>EXIT</span>${r}` : r}</div>`;
      cols.forEach((c, i) => {
        if (i === 3) h += '<div class="sm-aisle"></div>';
        const seat = r + c;
        if (r <= 2 && (c === 'B' || c === 'E')) { h += '<div class="sm-blank"></div>'; return; }
        const isOcc = occ.has(seat), isSel = sel === seat;
        const kind = r <= 2 ? 'j' : r === ex ? 'x' : '';
        const label = `${seat}${r === ex ? ' 非常口座席' : ''}${c === 'A' || c === 'F' ? ' 窓側' : c === 'C' || c === 'D' ? ' 通路側' : ''}${isOcc ? ' 使用中' : ''}`;
        const isMark = mark === seat;
        h += `<button class="seat ${kind} ${isOcc ? 'occ' : ''} ${isSel ? 'sel' : ''} ${isMark ? 'mark' : ''}" ${isOcc ? 'disabled' : `data-act="seat" data-seat="${seat}"`} aria-label="${label}${isMark ? ' お友だちの席' : ''}" aria-pressed="${isSel}">${isMark ? '★' : isOcc ? '' : c}</button>`;
      });
    }
    return `<div class="seatmap">${h}</div>`;
  },
};

/* 出発案内板のパタパタ文字(タイトル画面) */
const Flap = {
  CH: 'アイウエオカキクケコサシスセソタチツテトナニヌネノABCDEFGHJKLMNPRSTUVWXYZ0123456789',
  word(text, cls = '') {
    return `<span class="flaps ${cls}">${[...text].map((c) => (c === ' ' ? '<span class="flap gap"> </span>' : `<span class="flap" data-c="${U.esc(c)}">${U.esc(c)}</span>`)).join('')}</span>`;
  },
  run(root) {
    if (!root || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    [...root.querySelectorAll('.flap[data-c]')].forEach((el, i) => {
      let n = 5 + (i % 7) + Math.floor(Math.random() * 4);
      const tick = () => {
        if (!el.isConnected) return;
        el.classList.remove('spin'); void el.offsetWidth; el.classList.add('spin');
        if (n-- <= 0) { el.textContent = el.dataset.c; return; }
        el.textContent = this.CH[Math.floor(Math.random() * this.CH.length)];
        setTimeout(tick, 65);
      };
      setTimeout(tick, i * 35);
    });
  },
};
