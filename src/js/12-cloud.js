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
    this.user.icon = cloud && UIcon.valid(cloud.icon) ? cloud.icon : null;
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
      const snap = await F.getDoc(F.doc(db, 'saves', uid));
      if (snap.exists() && snap.data().data && Store.merge(snap.data().data)) Store.saveLocal();
      if (!this.user || this.user.uid !== uid) return;
      const icon = UIcon.valid(this.user.icon) ? this.user.icon : null;
      await F.setDoc(F.doc(db, 'saves', uid), { data: JSON.parse(JSON.stringify(Store.cloudData())), name, ...(icon ? { icon } : {}), updatedAt: F.serverTimestamp() });
      const row = { name, total: Math.max(0, Math.round(d.total || 0)), best: Math.max(0, Math.round((d.bestDay && d.bestDay.score) || 0)), day: Math.round(d.day || 1), updatedAt: F.serverTimestamp() };
      // Firestore のルールが古いと、icon や pub(公開する記録)を受け付けない。そのときは項目を減らしてランキングだけでも更新する
      const tries = [{ ...row, ...(icon ? { icon } : {}), pub: this.pubStats() }, ...(icon ? [{ ...row, icon }] : []), row];
      for (let i = 0; i < tries.length; i++) {
        try { await F.setDoc(F.doc(db, 'ranking', uid), tries[i]); this.oldRules = i > 0; break; }
        catch (e) { if ((e && e.code) !== 'permission-denied' || i === tries.length - 1) throw e; }
      }
      if (this.oldRules && !this._ruleWarned) { this._ruleWarned = true; Toast.show('アイコンや記録をランキングに出すには、Firestore のルールの更新が必要です', 'info', 5000); }
      if (this.user && this.user.uid === uid) this.status = 'saved';
    } catch (e) {
      console.warn(e); this.status = 'error';
      clearTimeout(this._retry); this._retry = setTimeout(() => this.push(), 20000);   // しばらくしてからやり直す
    }
    this.refresh();
  },

  /* ===== プロフィール(右上の名前から)と、これまでの統計 ===== */
  showProfile() {
    if (!this.user) return;
    const s = Store.data, st = s.stats, r = Game.rank(s.total), nx = Game.nextRank(s.total);
    const bests = Object.entries(s.best).map(([n, b]) => ({ n: +n, ...b })).sort((a, b) => a.n - b.n);
    const stars = bests.reduce((x, b) => x + (b.stars || 0), 0), medals = Goals.medalCount();
    const hm = (m) => (m >= 60 ? `${Math.floor(m / 60)}時間${Math.round(m % 60)}分` : `${Math.round(m)}分`);
    const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');
    const tile = (label, val, sub) => `<div class="pf-tile"><small>${label}</small><b>${val}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
    const max = Math.max(1, ...bests.map((b) => b.score));
    const jobs = Object.keys(DATA.jobs).filter((j) => st.jobs[j] && st.jobs[j].days);
    const status = { saving: '保存中…', error: '保存できませんでした(あとで自動でやり直します)' }[this.status] || 'クラウドに保存済み';
    Modal.show({
      title: 'プロフィール',
      wide: true,
      body: `<div class="pf-head"><button class="pf-icon" data-act="g:icon" aria-label="アイコンを変える">${UIcon.html(this.user.icon, 'lg')}<span>変える</span></button>
          <div class="pf-who"><b>${U.esc(this.user.name)}</b>さん<small class="${this.status === 'error' ? 'bad' : 'ok'}">${status}</small></div>
          <div class="pf-rank"><small>ランク</small><b>${r.name}</b><span>${nx ? `次の「${nx.name}」まで あと${U.fmt(nx.min - s.total)}点` : '最高ランクです'}</span></div></div>
        <h3 class="pf-h">これまでの統計</h3>
        ${st.shifts ? '' : '<p class="small mute">勤務を終えるごとに、ここに記録がたまっていきます(この機能を入れる前の勤務は、点数と★・メダルだけ反映されています)。</p>'}
        <div class="pf-grid">
          ${tile('進んだ日', `${s.day - 1}<small>日目までクリア</small>`)}
          ${tile('累計の点数', `${U.fmt(s.total)}<small>点</small>`)}
          ${tile('1日の最高点', s.bestDay ? `${U.fmt(s.bestDay.score)}<small>点</small>` : '—', s.bestDay ? `${s.bestDay.n}日目` : '')}
          ${tile('メダル', `${medals}<small>個</small>`, bests.length ? `${bests.length * 3}個中` : '')}
          ${tile('★の数', `${stars}<small>個</small>`, `★3つの勤務 ${st.stars3}回`)}
          ${tile('勤務した回数', `${st.shifts}<small>回</small>`, st.minutes ? `合計 ${hm(st.minutes)}` : '')}
          ${tile('判断の正確さ', pct(st.good, st.dec), st.dec ? `${U.fmt(st.dec)}回中 ${U.fmt(st.good)}回正解` : '')}
          ${tile('最大コンボ', `${st.maxCombo}`)}
          ${tile('カウンターの対応', `${U.fmt(st.counterPax)}<small>人</small>`)}
          ${tile('搭乗ゲートの案内', `${U.fmt(st.boarded)}<small>人</small>`)}
          ${tile('定刻出発', `${st.onTime}<small>回</small>`, st.shifts ? `定刻率 ${pct(st.onTime, st.shifts)}` : '')}
          ${tile('ミス', `${U.fmt(st.mistakes)}<small>回</small>`)}
        </div>
        ${jobs.length ? `<h3 class="pf-h">仕事ごと</h3><table class="pf-jobs"><tr><th>仕事</th><th>担当した日</th><th>対応</th><th>正解率</th></tr>
          ${jobs.map((j) => { const x = st.jobs[j]; return `<tr><td>${DATA.jobs[j].name}</td><td>${x.days}日</td><td>${x.n}件</td><td>${pct(x.ok, x.n)}</td></tr>`; }).join('')}</table>` : ''}
        ${bests.length ? `<h3 class="pf-h">日ごとの最高点</h3><div class="pf-bars" role="img" aria-label="日ごとの最高点のグラフ">${bests.map((b) => `<div class="pf-bar" title="${b.n}日目 ${U.fmt(b.score)}点"><i style="height:${Math.max(3, (Math.max(0, b.score) / max) * 100)}%"></i><span>${b.n}</span></div>`).join('')}</div>` : ''}
        ${this.oldRules ? '<p class="small warn-note">アイコンや記録をランキングに出すには、Firestore のルールの更新が必要です。</p>' : ''}`,
      actions: [{ label: 'アイコンを変える', cls: 'ghost', run: () => this.showIconPicker() }, { label: '名前を変える', cls: 'ghost', run: () => this.askName(false) }, { label: 'ログアウト', cls: 'ghost', run: () => Game.globalAct('logout') }, { label: '閉じる', cls: 'primary' }],
    });
  },

  /* ===== アイコンを変える ===== */
  showIconPicker(keep) {
    if (!this.user) return;
    if (!keep || !UIcon.valid(this._pend)) this._pend = UIcon.valid(this.user.icon) ? this.user.icon : UIcon.DEF;
    const custom = this._pend.startsWith('data:');
    Modal.show({
      title: 'アイコンを変える',
      body: `<div class="ic-top"><div class="ic-prev" id="icprev">${UIcon.html(this._pend, 'xl')}</div>
          <div><p class="small">好きな絵を選ぶか、写真などの画像を選んでください。画像は、まん中の正方形が使われます。</p>
          <div class="ic-btns"><label class="btn ic-file"><input type="file" accept="image/*" id="icfile">画像から選ぶ</label>${custom && Cropper.img ? '<button class="btn" data-act="g:icon-crop">範囲を変える</button>' : ''}</div></div></div>
        <div class="ic-grid" role="group" aria-label="アイコンの絵">${UIcon.ids().map((id) => `<button class="ic-opt ${!custom && id === this._pend ? 'sel' : ''}" data-act="g:icon-pick" data-id="${id}" aria-pressed="${!custom && id === this._pend}" title="${UIcon.P[id].name}">${UIcon.html(id)}</button>`).join('')}</div>
        <p class="small mute">アイコンはランキングで、ほかの人にも見えます。人に見せてよい画像を選んでください。</p>`,
      actions: [{ label: 'やめる', cls: 'ghost', run: () => this.showProfile() }, { label: 'このアイコンにする', cls: 'primary', run: () => this.setIcon(this._pend) }],
    });
    const f = document.getElementById('icfile');
    if (f) f.addEventListener('change', () => this.pickFile(f.files && f.files[0]));
  },

  pickIcon(id) {
    if (!UIcon.P[id]) return;
    this._pend = id; Sfx.pop();
    this.showPend();
  },

  // 画像を選んだら、どこを使うかを決める画面へ
  async pickFile(file) {
    if (!file) return;
    if (!(await Cropper.load(file))) { Toast.show('この画像は使えませんでした。ほかの画像(JPEG・PNG)を選んでください', 'bad', 4200); return; }
    this.showCropper();
  },

  showCropper() {
    if (!Cropper.img) return;
    Modal.show({
      title: 'アイコンにする範囲を決める',
      body: Cropper.html(),
      actions: [{ label: 'もどる', cls: 'ghost', run: () => this.showIconPicker(true) }, {
        label: 'この範囲にする', cls: 'primary',
        run: () => {
          const url = Cropper.result();
          if (url) this._pend = url; else Toast.show('うまく切り取れませんでした。ほかの画像を試してください', 'bad', 4000);
          this.showIconPicker(true);
        },
      }],
    });
    Cropper.bind();
  },

  showPend() {
    const p = document.getElementById('icprev'); if (p) p.innerHTML = UIcon.html(this._pend, 'xl');
    document.querySelectorAll('.ic-opt').forEach((b) => { const on = b.dataset.id === this._pend; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', String(on)); });
  },

  setIcon(v) {
    if (!this.user || !UIcon.valid(v)) return;
    this.user.icon = v;
    Store.save();
    this.refresh(true);
    Toast.show('アイコンを変えました', 'ok', 2400);
    this.showProfile();
  },

  /* ===== ランキング ===== */
  showRanking(kind = 'total') {
    Modal.show({
      title: 'ランキング',
      body: `<div class="rk-tabs" role="tablist"><button class="rk-tab" role="tab" data-act="g:rank-total" aria-selected="${kind === 'total'}">累計の点数</button><button class="rk-tab" role="tab" data-act="g:rank-best" aria-selected="${kind === 'best'}">1日の最高点</button></div>
        <ol class="rk-list" id="rklist"><li class="rk-msg">読み込み中…</li></ol>
        <p class="small mute">${this.user ? '' : 'ログインすると、あなたの記録もランキングにのります。'}アイコンか名前を押すと、その人のプロフィールが見られます。</p>`,
      actions: [{ label: '閉じる', cls: 'primary' }],
    });
    this.loadRanking(kind);
  },

  // ランキングで公開する記録(くわしい統計は本人だけが見られる場所にある)
  pubStats() {
    const s = Store.data, st = s.stats || {};
    const stars = Object.values(s.best).reduce((x, b) => x + (b.stars || 0), 0);
    const n = (v) => Math.max(0, Math.round(v || 0));
    return { medals: n(Goals.medalCount()), stars: n(stars), stars3: n(st.stars3), shifts: n(st.shifts), acc: st.dec ? n((st.good / st.dec) * 100) : -1, combo: n(st.maxCombo), onTime: n(st.onTime), pax: n((st.counterPax || 0) + (st.boarded || 0)) };
  },

  tile(label, val, sub) { return `<div class="pf-tile"><small>${label}</small><b>${val}</b>${sub ? `<span>${sub}</span>` : ''}</div>`; },

  // ほかの人のプロフィール(ランキングのアイコン・名前から)
  showUser(uid) {
    const r = (this._rows || []).find((x) => x.uid === uid); if (!r) return;
    if (this.user && uid === this.user.uid) { this.showProfile(); return; }
    const n = (v) => (Number.isFinite(+v) ? Math.max(0, Math.round(+v)) : 0);
    const p = r.pub && typeof r.pub === 'object' ? r.pub : null, total = n(r.total), day = Math.max(1, n(r.day));
    const rank = Game.rank(total);
    Modal.show({
      title: 'プロフィール',
      wide: true,
      body: `<div class="pf-head">${UIcon.html(UIcon.valid(r.icon) ? r.icon : UIcon.DEF, 'lg')}
          <div class="pf-who"><b>${U.esc(r.name || '名無し')}</b>さん</div>
          <div class="pf-rank"><small>ランク</small><b>${rank.name}</b></div></div>
        <h3 class="pf-h">これまでの記録</h3>
        <div class="pf-grid">
          ${this.tile('進んだ日', `${day - 1}<small>日目までクリア</small>`)}
          ${this.tile('累計の点数', `${U.fmt(total)}<small>点</small>`)}
          ${this.tile('1日の最高点', `${U.fmt(n(r.best))}<small>点</small>`)}
          ${p ? `${this.tile('メダル', `${n(p.medals)}<small>個</small>`)}
            ${this.tile('★の数', `${n(p.stars)}<small>個</small>`, `★3つの勤務 ${n(p.stars3)}回`)}
            ${this.tile('勤務した回数', `${n(p.shifts)}<small>回</small>`)}
            ${this.tile('判断の正確さ', +p.acc >= 0 ? `${n(p.acc)}%` : '—')}
            ${this.tile('最大コンボ', `${n(p.combo)}`)}
            ${this.tile('定刻出発', `${n(p.onTime)}<small>回</small>`)}
            ${this.tile('対応したお客様', `${U.fmt(n(p.pax))}<small>人</small>`)}` : ''}
        </div>
        ${p ? '' : '<p class="small mute">くわしい記録は、この人が次に遊んだあとに表示されます。</p>'}`,
      actions: [{ label: 'ランキングにもどる', cls: 'ghost', run: () => this.showRanking(this._rkKind) }, { label: '閉じる', cls: 'primary' }],
    });
  },

  async loadRanking(kind) {
    document.querySelectorAll('.rk-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.act === `g:rank-${kind}`)));
    const el = () => document.getElementById('rklist');
    if (el()) el().innerHTML = '<li class="rk-msg">読み込み中…</li>';
    try {
      const { db, F } = await this.load();
      const snap = await F.getDocs(F.query(F.collection(db, 'ranking'), F.orderBy(kind, 'desc'), F.limit(30)));
      const rows = []; snap.forEach((doc) => rows.push({ uid: doc.id, ...doc.data() }));
      this._rows = rows; this._rkKind = kind;
      if (!el()) return;
      el().innerHTML = rows.length ? rows.map((r, i) => `<li class="${this.user && r.uid === this.user.uid ? 'me' : ''}">
          <span class="rk-no">${i + 1}</span><button class="rk-who" data-act="g:rank-user" data-uid="${U.esc(r.uid)}" aria-label="${U.esc(r.name || '名無し')}さんのプロフィール">${UIcon.html(this.user && r.uid === this.user.uid ? this.user.icon : UIcon.valid(r.icon) ? r.icon : UIcon.DEF, 'sm')}<span class="rk-name">${U.esc(r.name || '名無し')}${this.user && r.uid === this.user.uid ? ' <em>あなた</em>' : ''}</span></button>
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
      ${this.user ? `<button class="t-top-me" data-act="g:profile" aria-label="プロフィールと統計を見る">${UIcon.html(this.user.icon, 'sm')}<span class="t-top-nm">${U.esc(this.user.name || '…')}</span><span class="t-top-st ${this.status === 'error' ? 'bad' : ''}" aria-hidden="true">${this.status === 'saving' ? '…' : this.status === 'error' ? '!' : ''}</span></button>`
        : `<button class="btn small t-top-btn google" data-act="g:login"><span class="g-ic" aria-hidden="true">G</span>ログイン</button>`}</div>`;
  },

  // タイトル画面の「アカウント」欄。ログイン前は案内(×で隠せる)、ログイン中はプロフィール
  boxHTML() {
    if (!this.enabled()) return '';
    const st = { loading: 'ログインを確認中…', saving: '保存中…', saved: 'クラウドに保存済み', in: 'クラウドに保存済み', error: '保存できませんでした(あとで自動でやり直します)' }[this.status] || '';
    const hide = !!this.user || Store.data.settings.hideAcct;
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
