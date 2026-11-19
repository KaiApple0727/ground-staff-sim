/* ---------- 画面サイズ合わせ ----------
   横向き(PC・iPadなど):高さ740pxの横長の画面を、端末の画面に収まるよう丸ごと拡大縮小する。
                        横幅は縦横比に合わせて 1180〜1600px の間で広げるので、余白がほとんど出ない。
   縦向き(スマホなど):body に phone クラスを付け、幅420px(タブレットの縦向きは640px)の
                        縦長レイアウトに切り替える。高さは画面いっぱい。 */
const Fit = {
  H: 740, minW: 1180, maxW: 1600, mode: 'wide', narrow: false,
  apply() {
    const app = document.getElementById('app'); if (!app) return;
    const de = document.documentElement, vw = de.clientWidth || window.innerWidth;
    const vh = de.clientHeight || window.innerHeight;
    if (!vw || !vh) return;
    const portrait = vh > vw * 1.05;
    let W, H, k;
    if (portrait) { W = vw < 600 ? 420 : 640; k = vw / W; H = Math.round(vh / k); }
    else { W = Math.round(U.clamp((vw / vh) * this.H, this.minW, this.maxW)); H = this.H; k = Math.min(vw / W, vh / H); }
    const narrow = portrait && W < 500, redraw = narrow !== this.narrow;
    this.mode = portrait ? 'phone' : 'wide'; this.narrow = narrow;
    document.body.classList.toggle('phone', portrait);
    document.body.classList.toggle('phone-land', !portrait && Math.min(vw, vh) < 520);
    app.style.width = W + 'px';
    app.style.height = H + 'px';
    app.style.transform = `translate(-50%, -50%) scale(${k})`;
    if (redraw && typeof Game !== 'undefined' && Game.day) Hud.redrawBoard();
  },
  init() {
    this.apply();
    window.addEventListener('resize', () => this.apply());
    window.addEventListener('orientationchange', () => setTimeout(() => this.apply(), 250));
  },
};
