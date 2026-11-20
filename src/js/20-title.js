/* ---------- タイトル ---------- */
Scenes.title = {
  enter() {
    const s = Store.data, r = Game.rank(s.total), first = s.day === 1 && !Object.keys(s.best).length;
    const demo = [
      ['07:30', 'TB 301', '福岡', '3', '搭乗中', 'board'],
      ['08:20', 'TB 701', 'ソウル(仁川)', '21', '手続中', 'open'],
      ['08:50', 'TB 741', 'ホノルル', '25', '手続中', 'open'],
      ['09:40', 'TB 761', 'シンガポール', '24', '定刻', 'ontime'],
    ];
    document.getElementById('app').innerHTML = `<div class="title-screen">
      <section class="t-board" id="tboard">
        <div class="t-kicker">${Flap.word('DEPARTURES 出発')}</div>
        <h1 class="t-main" aria-label="グランドスタッフ シミュレーター">${Flap.word('グランドスタッフ')}</h1>
        <div class="t-sub">${Flap.word('SIMULATOR')}</div>
        <div class="t-rows board">${demo.map((d) => `<div class="brow st-${d[5]}"><span class="cell time">${d[0]}</span><span class="cell fno">${d[1]}</span><span class="cell dest">${d[2]}</span><span class="cell gate">${d[3]}</span><span class="cell st">${d[4]}</span></div>`).join('')}</div>
      </section>
      <section class="t-panel ${Cloud.enabled() ? 'has-top' : ''}">
        ${Cloud.topHTML()}
        <div class="brand dark">${Art.logo()}<div><b>${DATA.airline.name}</b><small>${DATA.home.full} 旅客サービス</small></div></div>
        <p class="lede">あなたは空港の地上係員。チェックインカウンターで書類と荷物を確かめ、搭乗ゲートで順番どおりにご案内して、今日のフライトを定刻で送り出しましょう。</p>
        <ol class="howto">
          <li><b>書類を見比べる</b><span>パスポートとeチケットの名前・期限・日付</span></li>
          <li><b>荷物と座席</b><span>重さ、危険物、お客様の希望の席</span></li>
          <li><b>搭乗ゲート</b><span>グループ順に案内し、別の便のお客様を見抜く</span></li>
        </ol>
        <div class="t-status"><span>${s.day}日目</span><span>${r.name}</span><span>累計 ${U.fmt(s.total)}点</span><span>メダル ${Goals.medalCount()}個</span>${s.bestDay ? `<span>1日の最高 ${U.fmt(s.bestDay.score)}点</span>` : ''}</div>
        ${Cloud.boxHTML()}
        ${(() => { const nu = Progress.nextUnlock(s.total); return nu ? `<p class="t-hint">次の昇進「${nu.name}」(あと${U.fmt(nu.min - s.total)}点)で、新しい仕事<b>「${DATA.jobs[nu.unlock].name}」</b>が加わります。</p>` : ''; })()}
        <div class="t-actions">
          <button class="btn primary big" data-act="start">${first ? '勤務を始める' : `${s.day}日目の勤務へ`}</button>
          <button class="btn" data-act="g:manual">業務マニュアル</button>
        </div>
        ${s.day > 1 ? `<div class="t-days" role="group" aria-label="これまでの日をもう一度遊ぶ"><small>これまでの日をもう一度(★はその日の最高評価)</small>
          <div class="t-days-row" id="tdays">${Array.from({ length: s.day - 1 }, (_, i) => i + 1).map((n) => {
            const b = s.best[n], ev = Progress.eventFor(n);
            return `<button class="btn small dayb" data-act="pick" data-n="${n}" title="${n}日目${ev ? ' ' + DATA.events[ev].name : ''}">${n}${ev ? '<i>特</i>' : ''}<span class="st">${b ? '★'.repeat(b.stars) : '—'}</span></button>`;
          }).join('')}</div></div>` : ''}
        <div class="t-opts">
          <button class="btn ghost small" data-act="speech" aria-pressed="${s.settings.speech}">アナウンス読み上げ: ${s.settings.speech ? 'ON' : 'OFF'}</button>
          ${first ? '' : '<button class="btn ghost small" data-act="reset">最初からやり直す</button>'}
        </div>
        <p class="t-ver" id="tver">${this.verText()}</p>
      </section>
    </div>`;
    Flap.run(document.getElementById('tboard'));
    const row = document.getElementById('tdays'); if (row) row.scrollLeft = row.scrollWidth;   // 最近の日が見えるように
  },
  verText() { return `v${CONFIG.version} · ${Cloud.user ? '進み具合はクラウドにも保存されます' : '進み具合はこのブラウザに保存されます'}`; },
  onAct(a, ds) {
    if (a === 'start') Game.startDay(Store.data.day);
    else if (a === 'pick') { const n = +ds.n; if (n >= 1 && n < Store.data.day) Game.startDay(n); }   // クリアした日だけ
    else if (a === 'speech') { const st = Store.data.settings; st.speech = !st.speech; Store.save(); this.enter(); }
    else if (a === 'reset') {
      Modal.show({ soft: true,
        title: '最初からやり直しますか?', body: '<p>勤務日数・スコア・ランクがすべてリセットされます。</p>',
        actions: [{ label: 'やめる', cls: 'ghost' }, { label: 'リセットする', cls: 'danger', run: () => { Store.reset(); this.enter(); } }],
      });
    }
  },
};

/* ---------- 勤務前のブリーフィング ---------- */
Scenes.briefing = {
  enter() {
    const d = Game.day, gf = d.gateFlight, items = Manual.newItems(d.n);
    const events = [];
    d.flights.filter((f) => f.canceled).forEach((cf) => events.push(`<p><b>欠航</b> ${cf.no} ${cf.ap.name}行きは${d.event === 'typhoon' ? '台風のため' : '機材故障のため'}欠航。振替のお客様がカウンターに来ます。</p>`));
    if (d.cfg.gate.overbook) events.push(`<p><b>予約超過</b> ${gf.no} は予約が座席より多い見込みです(オーバーブッキング)。</p>`);
    const newJob = d.mid && !Store.data.jobSeen[d.mid];
    // 新しい仕事のルールと、今日から加わるルールは分けて見せる
    const card = (it) => `<div class="rule"><small>${it.sec}</small><b>${it.t}</b><p>${it.b}</p></div>`;
    const dayTitle = d.n === 1 ? 'まず覚えること' : '今日から加わるルール';
    const groups = [];
    if (newJob) groups.push([`新しい仕事「${DATA.jobs[d.mid].name}」のルール`, Manual.jobItems(d.mid)]);
    if (items.length) groups.push([dayTitle, items]);
    const heading = groups.length === 1 ? groups[0][0] : groups.length ? '今日おぼえること' : dayTitle;
    const rules = !groups.length ? '<p class="mute">新しいルールはありません。これまでのルールをすべて使います。</p>'
      : groups.length === 1 ? groups[0][1].map(card).join('')
      : groups.map(([t, list]) => `<h4 class="rules-h">${t}</h4>${list.map(card).join('')}`).join('');
    document.getElementById('app').innerHTML = Hud.frame(`<div class="brief">
      <section class="panel b-main">
        <p class="eyebrow">本日の勤務 · ${U.jp(d.date)}${Cloud.name() ? ` · 担当 ${U.esc(Cloud.name())}` : ''}</p>
        ${d.event ? `<div class="ev-banner"><small>特別な日 SPECIAL DAY</small><b>${DATA.events[d.event].name}</b></div>` : ''}
        <h2>${d.cfg.title}</h2>
        <p class="b-lede">${d.cfg.brief}</p>
        <ol class="b-tasks">
          <li><span class="b-time">${U.hm(d.start)}〜</span><div><b>チェックインカウンター</b><small>${d.flights.map((f) => `<i class="chip" style="background:${f.color}"></i>${f.no} ${f.ap.name}${f.canceled ? '(欠航)' : ''}`).join('　')}</small></div></li>
          ${d.mid ? `<li class="job"><span class="b-time">次に</span><div><b>${DATA.jobs[d.mid].name}${newJob ? ' <span class="pill ok">新しい仕事</span>' : ''}</b><small>${DATA.jobs[d.mid].desc}</small></div></li>` : ''}
          <li><span class="b-time">${U.hm(gf.boarding)}〜</span><div><b>${gf.gate}番搭乗口</b><small>${gf.no} ${gf.ap.name}行きの搭乗案内(出発 ${U.hm(gf.dep)})</small></div></li>
        </ol>
        ${events.length ? `<div class="b-events"><small>今日の出来事</small>${events.join('')}</div>` : ''}
        <div class="b-actions"><button class="btn primary big" data-act="open">カウンターを開ける</button><button class="btn ghost" data-act="back">タイトルへ</button></div>
      </section>
      <section class="panel b-rules">
        <div class="b-goals"><small>今日の目標(達成するとメダル)</small><ul>${d.goals.map((id) => `<li><span class="medal" aria-hidden="true"></span>${U.esc(Goals.label(id, d))}</li>`).join('')}</ul></div>
        <h3>${heading}</h3>
        <div class="rules">${rules}</div>
        <button class="btn ghost small" data-act="g:manual">マニュアルをすべて見る</button>
      </section>
    </div>`);
  },
  update(dt) { Hud.tick(dt); },
  onAct(a) { if (a === 'open') Game.go('counter'); if (a === 'back') Game.go('title'); },
};
