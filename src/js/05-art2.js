/* ---------- 絵(追加分):機内持ち込みのサイズ確認器・忘れ物のアイコン ---------- */
Object.assign(Art, {

  // 横から見た旅客機(右向き。尾翼は上、主翼とエンジンは下)
  plane(fill = '#fff', line = '#1f3a8a', win = line) {
    return `<svg viewBox="0 0 120 50" aria-hidden="true">
      <path d="M17 23 L9 4 L18 4 L32 22 Z" fill="${fill}" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M50 30 L37 44 L46 44 L68 31 Z" fill="${fill}" stroke="${line}" stroke-width="1.6" stroke-linejoin="round" opacity=".9"/>
      <path d="M12 26 Q13 21.5 21 21.5 L97 21.5 Q111 21.5 115 27 Q111 32.5 97 32.5 L21 32.5 Q13 32.5 12 28 Z" fill="${fill}" stroke="${line}" stroke-width="1.6"/>
      <path d="M11 27 L3 30 L12 30.5 L24 28.5 Z" fill="${fill}" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>
      <rect x="46" y="33.5" width="13" height="5.5" rx="2.7" fill="${fill}" stroke="${line}" stroke-width="1.4"/>
      <path d="M30 25.5 H93" stroke="${win}" stroke-width="2.2" stroke-dasharray="2.2 2.6" stroke-linecap="round"/>
      <path d="M103 24.5 Q108 24.5 110.5 26.8" fill="none" stroke="${win}" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  },

  // サイズ確認器。高さ55×幅40cm の枠の前に手荷物を置いた絵。はみ出した部分が枠の外に見える
  sizer(b) {
    const S = 2, x0 = 10, base = 145, fw = 40 * S, fh = 55 * S;
    const w = b.w * S, h = b.h * S, x = x0, y = base - h;
    let bag;
    if (b.kind === 'backpack') {
      bag = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${b.color}"/>
        <rect x="${x + w * 0.18}" y="${y + h * 0.52}" width="${w * 0.64}" height="${h * 0.34}" rx="8" fill="rgba(0,0,0,.18)"/>
        <path d="M${x + w * 0.3} ${y + 6} V${y + h * 0.45} M${x + w * 0.7} ${y + 6} V${y + h * 0.45}" stroke="rgba(255,255,255,.25)" stroke-width="3"/>`;
    } else if (b.kind === 'tote') {
      bag = `<path d="M${x + w * 0.28} ${y + 14} Q${x + w * 0.5} ${y - 2} ${x + w * 0.72} ${y + 14}" fill="none" stroke="${b.color}" stroke-width="4"/>
        <rect x="${x}" y="${y + 12}" width="${w}" height="${h - 12}" rx="4" fill="${b.color}"/>`;
    } else {
      bag = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${b.color}"/>
        <rect x="${x + w * 0.32}" y="${y + 3}" width="${w * 0.36}" height="6" rx="3" fill="rgba(0,0,0,.35)"/>
        <path d="M${x + w * 0.25} ${y + 14} V${base - 10} M${x + w * 0.5} ${y + 14} V${base - 10} M${x + w * 0.75} ${y + 14} V${base - 10}" stroke="rgba(0,0,0,.18)" stroke-width="3"/>
        <circle cx="${x + 9}" cy="${base - 4}" r="3.5" fill="#1d2025"/><circle cx="${x + w - 9}" cy="${base - 4}" r="3.5" fill="#1d2025"/>`;
    }
    const over = b.h > 55 || b.w > 40;
    return `<svg viewBox="0 0 120 152" class="sizer ${over ? 'over' : ''}" aria-hidden="true">
      <rect x="${x0}" y="${base - fh}" width="${fw}" height="${fh}" fill="#e8ecf0"/>
      <path d="M${x0} ${base - fh + 20} H${x0 + fw} M${x0} ${base - fh + 50} H${x0 + fw} M${x0} ${base - fh + 80} H${x0 + fw}" stroke="#d3d9df" stroke-width="1"/>
      ${bag}
      <path d="M${x0 - 2} ${base} V${base - fh - 2} H${x0 + fw + 2} V${base}" fill="none" stroke="#5d6772" stroke-width="4" stroke-linejoin="round"/>
      <rect x="${x0 - 6}" y="${base}" width="${fw + 12}" height="5" rx="2" fill="#5d6772"/>
      <text x="${x0 + fw + 7}" y="${base - fh + 8}" class="sz-t">55</text><text x="${x0 + fw / 2}" y="${base - fh - 6}" class="sz-t" text-anchor="middle">40</text>
    </svg>`;
  },

  // 忘れ物のアイコン(色と特徴も絵に出す)
  lostItem(kind, color, mark) {
    const dark = color === '#f2f2ee' || color === '#e2bd1c' || color === '#f08db5';
    const ln = dark ? '#3b3f45' : 'rgba(255,255,255,.55)', st = color === '#f2f2ee' ? 'stroke="#8d949b" stroke-width="1.5"' : '';
    const shapes = {
      wallet: `<rect x="5" y="11" width="30" height="20" rx="3" fill="${color}" ${st}/><path d="M5 17 H35" stroke="${ln}" stroke-width="1.6"/><circle cx="29" cy="21" r="2.2" fill="${ln}"/>`,
      phone: `<rect x="12" y="3" width="16" height="34" rx="3.5" fill="${color}" ${st}/><rect x="14.5" y="7" width="11" height="23" rx="1" fill="#9fb4c8"/><circle cx="20" cy="33.4" r="1.4" fill="${ln}"/>`,
      umbrella: `<path d="M15 6 Q20 2 25 6 L23 30 H17 Z" fill="${color}" ${st}/><path d="M18 8 L19 29 M22 8 L21 29" stroke="${ln}" stroke-width="1"/><path d="M20 30 V35 Q20 38 17 37" fill="none" stroke="#3b3f45" stroke-width="2.4" stroke-linecap="round"/>`,
      cap: `<path d="M7 26 Q7 9 21 9 Q33 9 33 26 Z" fill="${color}" ${st}/><path d="M5 26 H37 Q36 31 27 30 H7 Z" fill="${color}" ${st}/><circle cx="21" cy="9.5" r="1.6" fill="${ln}"/>`,
      plush: `<circle cx="11" cy="11" r="5" fill="${color}" ${st}/><circle cx="29" cy="11" r="5" fill="${color}" ${st}/><circle cx="20" cy="22" r="13" fill="${color}" ${st}/><circle cx="15.5" cy="20" r="1.6" fill="#22262b"/><circle cx="24.5" cy="20" r="1.6" fill="#22262b"/><ellipse cx="20" cy="26" rx="4" ry="3" fill="rgba(255,255,255,.55)"/>`,
      earphones: `<rect x="8" y="13" width="24" height="17" rx="8" fill="${color}" ${st}/><path d="M8 20 H32" stroke="${ln}" stroke-width="1.4"/><circle cx="14" cy="9" r="3.5" fill="#f2f2ee" stroke="#8d949b"/><circle cx="26" cy="9" r="3.5" fill="#f2f2ee" stroke="#8d949b"/>`,
      keys: `<circle cx="13" cy="14" r="7" fill="none" stroke="#9ba3ab" stroke-width="2.6"/><path d="M18 19 L32 33 M27 28 L30 25 M30 31 L33 28" stroke="${color === '#f2f2ee' ? '#9ba3ab' : color}" stroke-width="3.4" stroke-linecap="round"/>`,
      book: `<rect x="8" y="6" width="24" height="29" rx="2" fill="${color}" ${st}/><path d="M12 6 V35" stroke="${ln}" stroke-width="1.6"/><rect x="16" y="12" width="12" height="4" rx="1" fill="${ln}"/>`,
      scarf: `<path d="M8 9 Q20 3 32 9 L30 17 Q20 12 10 17 Z" fill="${color}" ${st}/><path d="M20 13 L16 33 H23 L25 14" fill="${color}" ${st}/><path d="M16 33 V37 M18 33 V37 M20 33 V37 M22 33 V37" stroke="${color === '#f2f2ee' ? '#8d949b' : color}" stroke-width="1.2"/>`,
      watch: `<rect x="15" y="3" width="10" height="34" rx="3" fill="${color}" ${st}/><circle cx="20" cy="20" r="8.5" fill="#d9dde1" stroke="#5d6772" stroke-width="2"/><path d="M20 20 V15 M20 20 H24" stroke="#22262b" stroke-width="1.5" stroke-linecap="round"/>`,
      glasses: `<rect x="5" y="13" width="30" height="14" rx="7" fill="${color}" ${st}/><path d="M7 20 H33" stroke="${ln}" stroke-width="1.2"/>`,
      pouch: `<path d="M8 13 H32 L34 32 Q34 34 32 34 H8 Q6 34 6 32 Z" fill="${color}" ${st}/><path d="M8 13 H32" stroke="#c9a23a" stroke-width="2.4"/><circle cx="31" cy="13" r="1.8" fill="#c9a23a"/>`,
    };
    const marks = {
      'キーホルダー付き': '<circle cx="34" cy="7" r="3.6" fill="#f2b33d" stroke="#8a5f12" stroke-width="1"/><path d="M31.5 9.5 L28 12" stroke="#8a5f12" stroke-width="1.2"/>',
      '名前のシール付き': '<rect x="22" y="31" width="14" height="6" rx="1" fill="#fff" stroke="#8d949b" stroke-width=".8"/><path d="M24 34 H33" stroke="#555" stroke-width=".8"/>',
      '星の模様': `<path d="M30 25 l1.4 3 3.2.4-2.4 2.2.6 3.2-2.8-1.6-2.8 1.6.6-3.2-2.4-2.2 3.2-.4z" fill="${dark ? '#3b3f45' : '#ffe27a'}"/>`,
      'しま模様': `<path d="M4 12 L14 2 M4 22 L24 2 M4 32 L34 2" stroke="${dark ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.35)'}" stroke-width="2.2" clip-path="url(#lc)"/>`,
      'ステッカー付き': '<circle cx="30" cy="30" r="5" fill="#3cc6e8" stroke="#fff" stroke-width="1.4"/>',
      '無地': '',
    };
    return `<svg viewBox="0 0 40 40" class="lost-ico" aria-hidden="true"><defs><clipPath id="lc"><rect x="4" y="4" width="32" height="32" rx="4"/></clipPath></defs>${shapes[kind] || shapes.pouch}${marks[mark] || ''}</svg>`;
  },
});
