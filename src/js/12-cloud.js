/* ---------- ログイン(Googleアカウント)・クラウド保存・ランキング ----------
   Firebase Authentication と Cloud Firestore を使う。FIREBASE_CONFIG が null なら何もしない(今までどおり遊べる)。
   Firestore のデータ
     saves/{uid}   : { data: 進み具合, name, updatedAt }        … 本人だけが読み書きできる
     ranking/{uid} : { name, total, best, day, updatedAt }       … だれでも見られる。書けるのは本人だけ
   ログインしていない人の記録は、今までどおりこの端末(localStorage)だけに残る */
const Cloud = {
  SDK: 'https://www.gstatic.com/firebasejs/13.2.0/',
  config: (typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG) || null,
  fb: null,            // { auth, db, A: firebase/auth, F: firebase/firestore }
  user: null,          // { uid, name }
  status: 'off',       // off / loading / out / in / saving / saved / error
  NAME_MAX: 10,

  enabled() { return !!(this.config && this.config.apiKey); },

  // Firebase の部品を読み込む(必要になったときに1回だけ)
  load() {
    if (this.fb) return Promise.resolve(this.fb);
    if (!this._loading) {
      this._loading = Promise.all(['app', 'auth', 'firestore'].map((m) => import(`${this.SDK}firebase-${m}.js`)))
        .then(([app, A, F]) => {
          const a = app.initializeApp(this.config);
          this.fb = { auth: A.getAuth(a), db: F.getFirestore(a), A, F };
          return this.fb;
        })
        .catch((e) => { this._loading = null; throw e; });
    }
    return this._loading;
  },

  async init() {
    if (!this.enabled()) return;
    this.status = 'loading'; this.refresh();
    try { await this.load(); } catch (e) { console.warn(e); this.status = 'error'; this.refresh(); return; }
    this.watch();
  },

  // ログイン状態の変化を受け取る(1回だけ登録)
  watch() {
    if (this._watching || !this.fb) return;
    this._watching = true;
    const { auth, A } = this.fb;
    A.onAuthStateChanged(auth, (u) => { this.onUser(u).catch((e) => { console.warn(e); this.status = 'error'; this.refresh(); }); });
  },

  // LINE などアプリの中のブラウザでは、Googleがログインを受け付けない
  inAppBrowser() { return /\bLine\/|FBAN|FBAV|Instagram|MicroMessenger|; wv\)/i.test(navigator.userAgent || ''); },

  async login(force) {
    if (!this.enabled()) return;
    if (this.inAppBrowser() && !force) {
      Modal.show({
        title: 'このブラウザではログインできないかもしれません',
        body: '<p>LINEなど、アプリの中で開いたページでは、Googleのログインが使えないことがあります。</p><p>右上などのメニューから<b>「Safariで開く」「ブラウザで開く」</b>を選んで、開き直してください。</p>',
        actions: [{ label: 'それでも試す', cls: 'ghost', run: () => this.login(true) }, { label: 'わかった', cls: 'primary' }],
      });
      return;
    }
    try {
      const { auth, A } = await this.load();
      this.watch();
      const p = new A.GoogleAuthProvider();
      p.setCustomParameters({ prompt: 'select_account' });
      await A.signInWithPopup(auth, p);   // 結果は onAuthStateChanged で受け取る
    } catch (e) {
      const code = (e && e.code) || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      const msg = {
        'auth/popup-blocked': 'ログインの画面がブロックされました。ブラウザの設定で、このサイトのポップアップを許可してください。',
        'auth/unauthorized-domain': 'このURLはFirebaseで許可されていません(Authentication の「承認済みドメイン」を確認してください)。',
        'auth/network-request-failed': 'インターネットにつながっていないようです。',
      }[code] || `ログインできませんでした${code ? `(${code})` : ''}。`;
      Toast.show(msg, 'bad', 5200);
    }
  },

  async logout() {
    if (!this.fb) return;
    clearTimeout(this._t);
    this.user = null; this.status = 'out';     // 先に外して、リセットした記録をクラウドに送らないようにする
    try { await this.fb.A.signOut(this.fb.auth); } catch (e) { console.warn(e); }
    Store.reset();
    this.refresh(true);
    Toast.show('ログアウトしました。この端末の記録は最初の状態に戻りました', 'info', 4200);
  },

  async onUser(u) {
    if (!u) {
      const was = !!this.user;
      if (was) { this.user = null; Store.reset(); }
      this.status = 'out'; this.refresh(was); return;
    }
    if (this.user && this.user.uid === u.uid) return;
    this.user = { uid: u.uid, name: null }; this.status = 'loading'; this.refresh();
    const { db, F } = this.fb;
    const snap = await F.getDoc(F.doc(db, 'saves', u.uid));
    const cloud = snap.exists() ? snap.data() : null;
    const d = Store.data;
    // この端末の記録が別のアカウントのものなら混ぜない。ログインしていないときの記録なら、アカウントに引き継ぐ
    if (d.owner && d.owner !== u.uid) Store.reset();
    if (cloud && cloud.data) Store.merge(cloud.data);
    Store.data.owner = u.uid;
    this.user.name = (cloud && cloud.name) || null;
    this.status = 'in';
    if (!this.user.name) this.askName(true);
    else { Store.save(); Toast.show(`${U.esc(this.user.name)}さん、ログインしました。どの端末でも続きから遊べます`, 'ok', 3600); }
    this.refresh(true);
  },

  cleanName(s) {
    const t = Array.from(String(s || '').replace(/[<>&"'\u0000-\u001f]/g, '').trim()).slice(0, this.NAME_MAX).join('');
    return t || null;
  },

  askName(first) {
    const cur = (this.user && this.user.name) || `スタッフ${U.digits(3)}`;
    Modal.show({
      title: first ? 'ランキングに出す名前を決めましょう' : '名前を変える',
      body: `<p>ランキングやゲームの中で表示される名前です(${this.NAME_MAX}文字まで)。<b>本名ではなく、ニックネーム</b>がおすすめです。あとから変えられます。</p>
        <input class="name-input" name="name" maxlength="${this.NAME_MAX}" value="${U.esc(cur)}" autocomplete="off" aria-label="表示する名前">`,
      actions: [...(first ? [] : [{ label: 'やめる', cls: 'ghost' }]), { label: 'この名前にする', cls: 'primary', run: (v) => this.setName((v && v.name) || cur) }],
    });
  },

  setName(n) {
    if (!this.user) return;
    this.user.name = this.cleanName(n) || this.user.name || `スタッフ${U.digits(3)}`;
    Store.save();
    this.refresh(true);
    Toast.show(`「${U.esc(this.user.name)}」でランキングに参加します`, 'ok', 3000);
  },

  // 記録をクラウドへ(連続で保存されても1回にまとめる)
  push() {
    if (!this.user) return;
    clearTimeout(this._t);
    this._t = setTimeout(() => this.flush(), 1200);
    if (this.status !== 'loading') { this.status = 'saving'; this.refresh(); }
  },

  async flush() {
    if (!this.user || !this.user.name || !this.fb) return;
    const { db, F } = this.fb, d = Store.data, uid = this.user.uid, name = this.user.name;
    try {
      await F.setDoc(F.doc(db, 'saves', uid), { data: JSON.parse(JSON.stringify(Store.cloudData())), name, updatedAt: F.serverTimestamp() });
      await F.setDoc(F.doc(db, 'ranking', uid), {
        name, total: Math.max(0, Math.round(d.total || 0)), best: Math.max(0, Math.round((d.bestDay && d.bestDay.score) || 0)), day: Math.round(d.day || 1), updatedAt: F.serverTimestamp(),
      });
      if (this.user && this.user.uid === uid) this.status = 'saved';
    } catch (e) {
      console.warn(e); this.status = 'error';
      clearTimeout(this._retry); this._retry = setTimeout(() => this.push(), 20000);   // しばらくしてからやり直す
    }
    this.refresh();
  },

  /* ===== ランキング ===== */
  showRanking() {
    Modal.show({
      title: 'ランキング',
      body: `<div class="rk-tabs" role="tablist"><button class="rk-tab" role="tab" data-act="g:rank-total" aria-selected="true">累計の点数</button><button class="rk-tab" role="tab" data-act="g:rank-best" aria-selected="false">1日の最高点</button></div>
        <ol class="rk-list" id="rklist"><li class="rk-msg">読み込み中…</li></ol>
        ${this.user ? '' : '<p class="small mute">ログインすると、あなたの記録もランキングにのります。</p>'}`,
      actions: [{ label: '閉じる', cls: 'primary' }],
    });
    this.loadRanking('total');
  },

  async loadRanking(kind) {
    document.querySelectorAll('.rk-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.act === `g:rank-${kind}`)));
    const el = () => document.getElementById('rklist');
    if (el()) el().innerHTML = '<li class="rk-msg">読み込み中…</li>';
    try {
      const { db, F } = await this.load();
      const snap = await F.getDocs(F.query(F.collection(db, 'ranking'), F.orderBy(kind, 'desc'), F.limit(30)));
      const rows = []; snap.forEach((doc) => rows.push({ uid: doc.id, ...doc.data() }));
      if (!el()) return;
      el().innerHTML = rows.length ? rows.map((r, i) => `<li class="${this.user && r.uid === this.user.uid ? 'me' : ''}">
          <span class="rk-no">${i + 1}</span><span class="rk-name">${U.esc(r.name || '名無し')}${this.user && r.uid === this.user.uid ? ' <em>あなた</em>' : ''}</span>
          <span class="rk-day">${r.day || 1}日目</span><b class="rk-val">${U.fmt(r[kind] || 0)}<small>点</small></b></li>`).join('')
        : '<li class="rk-msg">まだだれもいません。1日目をクリアすると、ここにのります。</li>';
    } catch (e) {
      console.warn(e);
      if (el()) el().innerHTML = '<li class="rk-msg">ランキングを読み込めませんでした。インターネットにつながっているか確かめてください。</li>';
    }
  },

  /* ===== 表示 ===== */
  name() { return this.user && this.user.name ? this.user.name : ''; },

  // タイトル画面の右上(ランキング・ログイン)
  topHTML() {
    if (!this.enabled()) return '';
    return `<div class="t-top" id="ttop"><button class="btn small t-top-btn" data-act="g:ranking"><span aria-hidden="true">🏆</span>ランキング</button>
      ${this.user ? `<span class="t-top-me" title="ログイン中"><span class="acct-ic sm" aria-hidden="true">☁</span>${U.esc(this.user.name || '…')}</span>`
        : `<button class="btn small t-top-btn google" data-act="g:login"><span class="g-ic" aria-hidden="true">G</span>ログイン</button>`}</div>`;
  },

  // タイトル画面の「アカウント」欄。ログイン前は案内(×で隠せる)、ログイン中はプロフィール
  boxHTML() {
    if (!this.enabled()) return '';
    const st = { loading: 'ログインを確認中…', saving: '保存中…', saved: 'クラウドに保存済み', in: 'クラウドに保存済み', error: '保存できませんでした(あとで自動でやり直します)' }[this.status] || '';
    const hide = !this.user && Store.data.settings.hideAcct;
    if (hide) return '<div id="acct" hidden></div>';
    const x = '<button class="acct-x" data-act="g:acct-hide" aria-label="この案内を閉じる" title="閉じる(右上のボタンからいつでもログインできます)">×</button>';
    if (this.status === 'error' && !this.fb) return `<div class="acct" id="acct">${x}<p class="small mute">ログイン機能につながりません。インターネットの接続を確かめてください(ログインしなくても遊べます)。</p><div class="acct-btns"><button class="btn small" data-act="g:cloud-retry">もう一度つなぐ</button></div></div>`;
    if (this.user) {
      const s = Store.data;
      return `<div class="acct in" id="acct"><div class="acct-who"><span class="acct-ic" aria-hidden="true">☁</span><div><small class="acct-lbl">プロフィール</small><b>${U.esc(this.user.name || '…')}</b>さん<small class="${this.status === 'error' ? 'bad' : 'ok'}">${st}</small></div></div>
        <dl class="acct-stats"><div><dt>ランク</dt><dd>${Game.rank(s.total).name}</dd></div><div><dt>累計</dt><dd>${U.fmt(s.total)}点</dd></div><div><dt>1日の最高</dt><dd>${s.bestDay ? U.fmt(s.bestDay.score) + '点' : '—'}</dd></div></dl>
        <div class="acct-btns"><button class="btn small ghost" data-act="g:rename">名前を変える</button><button class="btn small ghost" data-act="g:logout">ログアウト</button></div></div>`;
    }
    if (this.status === 'loading') return `<div class="acct" id="acct">${x}<p class="small mute">${st}</p></div>`;
    return `<div class="acct" id="acct">${x}<p>ログインすると、<b>どの端末でも続きから</b>遊べて、<b>ランキング</b>にも参加できます。</p>
      <div class="acct-btns"><button class="btn google" data-act="g:login"><span class="g-ic" aria-hidden="true">G</span>Googleでログイン</button></div></div>`;
  },

  // 状態が変わったら、タイトル画面なら描き直す(記録が変わったときは画面ごと)
  refresh(all) {
    if (typeof Game === 'undefined' || Game.scene !== Scenes.title) return;
    if (all && !Modal.open) { Scenes.title.enter(); return; }
    const box = document.getElementById('acct');
    if (box) box.outerHTML = this.boxHTML();
    const top = document.getElementById('ttop');
    if (top) top.outerHTML = this.topHTML();
    const ver = document.getElementById('tver'); if (ver) ver.textContent = Scenes.title.verText();
  },
};
