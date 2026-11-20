/* ---------- プレイヤーのアイコン(用意した絵から選ぶ / 画像をアイコンにする) ----------
   保存する値は「絵の名前(plane など)」か「画像の data URL(128×128 の JPEG)」。
   ランキングでほかの人のアイコンを表示するときも、この形のものだけを出す */
const UIcon = {
  P: {
    cloud: { name: 'くも', bg: '#4a90d9', g: '<path d="M22 43h21a8 8 0 0 0 1-16 11 11 0 0 0-21-2 8.5 8.5 0 0 0-1 18z" fill="#fff"/>' },
    plane: { name: 'ひこうき', bg: '#1f3a8a', g: '<path d="M32 11c1.8 0 3 2 3 4.4V27l15 9.5v5l-15-4.6V47l5 3.8V55l-8-2.2-8 2.2v-4.2l5-3.8v-9.9l-15 4.6v-5L29 27V15.4c0-2.4 1.2-4.4 3-4.4z" fill="#fff"/>' },
    tower: { name: '管制塔', bg: '#23946c', g: '<path d="M31 11h2v8h-2z" fill="#fff"/><path d="M19 20h26l-3.5 10h-19z" fill="#fff"/><path d="M22.5 22h19l-1.6 5H24.1z" fill="#23946c"/><path d="M27 31h10l3.5 21h-17z" fill="#fff"/>' },
    suitcase: { name: 'スーツケース', bg: '#d9622b', g: '<path d="M27 23v-4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4" fill="none" stroke="#fff" stroke-width="3"/><rect x="17" y="23" width="30" height="26" rx="4" fill="#fff"/><path d="M25 26v20M39 26v20" stroke="#d9622b" stroke-width="2.4"/>' },
    ticket: { name: 'チケット', bg: '#8b52c9', g: '<path d="M13 22h38v7a3.5 3.5 0 0 0 0 7v7H13v-7a3.5 3.5 0 0 0 0-7z" fill="#fff"/><path d="M38 24v18" stroke="#8b52c9" stroke-width="2" stroke-dasharray="3 3"/><path d="M19 29h13M19 34h9" stroke="#8b52c9" stroke-width="2.4" stroke-linecap="round"/>' },
    globe: { name: '地球', bg: '#2f8a9e', g: '<circle cx="32" cy="32" r="15" fill="none" stroke="#fff" stroke-width="3"/><ellipse cx="32" cy="32" rx="6.5" ry="15" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M17 32h30M19.5 24h25M19.5 40h25" stroke="#fff" stroke-width="2.2"/>' },
    cap: { name: '係員の帽子', bg: '#2b3340', g: '<path d="M14 37c0-10 8-17 18-17s18 7 18 17z" fill="#fff"/><path d="M11 38h42v4H11z" fill="#ffb41f"/><circle cx="32" cy="29" r="4" fill="#ffb41f"/>' },
    headset: { name: 'ヘッドセット', bg: '#c23f78', g: '<path d="M18 37v-5a14 14 0 0 1 28 0v5" fill="none" stroke="#fff" stroke-width="3.2"/><rect x="14" y="34" width="8" height="12" rx="3" fill="#fff"/><rect x="42" y="34" width="8" height="12" rx="3" fill="#fff"/><path d="M46 46c0 4-4 6-9 6" fill="none" stroke="#fff" stroke-width="2.4"/><circle cx="35" cy="52" r="2.6" fill="#fff"/>' },
    star: { name: 'ほし', bg: '#e0a400', g: '<path d="M32 13l5.6 11.6 12.7 1.8-9.2 9 2.2 12.7L32 42.1l-11.3 6 2.2-12.7-9.2-9 12.7-1.8z" fill="#fff"/>' },
    sun: { name: 'たいよう', bg: '#f08c00', g: '<circle cx="32" cy="32" r="8.5" fill="#fff"/><path d="M32 13v7M32 44v7M13 32h7M44 32h7M18.6 18.6l5 5M40.4 40.4l5 5M18.6 45.4l5-5M40.4 23.6l5-5" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>' },
    bird: { name: 'ことり', bg: '#c62f2f', g: '<path d="M19 37l-9-6 2 10z" fill="#fff"/><ellipse cx="31" cy="38" rx="14" ry="10" fill="#fff"/><circle cx="43" cy="29" r="7.5" fill="#fff"/><path d="M50 27l7 2.5-7 2.5z" fill="#ffb41f"/><circle cx="45" cy="27.5" r="1.5" fill="#2b3340"/><path d="M22 36c5-11 13-13 19-10-3 8-10 11-19 10z" fill="#f4b9b6"/>' },
    compass: { name: 'コンパス', bg: '#5d6772', g: '<circle cx="32" cy="32" r="16" fill="none" stroke="#fff" stroke-width="3"/><path d="M32 18l5 14h-10z" fill="#ff8f80"/><path d="M32 46l-5-14h10z" fill="#fff"/><circle cx="32" cy="32" r="2.2" fill="#5d6772"/>' },
  },
  DEF: 'cloud',
  ids() { return Object.keys(this.P); },

  // 表示してよい値か(ほかの人のランキングの値もここで確かめる)
  valid(v) {
    if (typeof v !== 'string') return false;
    if (this.P[v]) return true;
    return v.length <= 40000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(v);
  },

  html(v, size = '') {
    const cls = `uicon ${size}`;
    if (typeof v === 'string' && v.startsWith('data:') && this.valid(v)) return `<img class="${cls}" src="${v}" alt="" draggable="false">`;
    const p = this.P[v] || this.P[this.DEF];
    return `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="${p.bg}"/>${p.g}</svg>`;
  },

  // 画像を、まん中の正方形で切り抜いて 128×128 の JPEG にする(ランキングに出せる小ささ)
  fromFile(file) {
    return new Promise((resolve) => {
      if (!file || !/^image\//.test(file.type || 'image/')) { resolve(null); return; }
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        try {
          const S = 128, c = document.createElement('canvas'), g = c.getContext('2d');
          c.width = c.height = S;
          const w = img.naturalWidth, h = img.naturalHeight, m = Math.min(w, h);
          g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
          g.drawImage(img, (w - m) / 2, (h - m) / 2, m, m, 0, 0, S, S);
          let q = 0.86, out = c.toDataURL('image/jpeg', q);
          while (out.length > 30000 && q > 0.45) { q -= 0.12; out = c.toDataURL('image/jpeg', q); }
          resolve(this.valid(out) ? out : null);
        } catch (e) { resolve(null); }
        URL.revokeObjectURL(url);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  },
};
