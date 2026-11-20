/* ---------- 1日の結果 ---------- */
Scenes.result = {
  enter() {
    if (Game.run) { this.enterRun(); return; }
    const d = Game.day, sd = Store.data, score = Game.dayScore();
    const acc = d.dec ? d.good / d.dec : 1;
    const stars = acc >= 0.95 && d.onTime && d.sat >= 80 ? 3 : acc >= 0.8 ? 2 : 1;
    const rankBefore = Game.rank(sd.total);
    const goals = d.goals.map((id) => ({ id, label: Goals.label(id, d), done: Goals.check(id, d) }));
    if (!d.saved) {
      d.saved = true;
      const wasModes = Modes.unlocked();
      const prev = sd.best[d.n];
      sd.best[d.n] = { score: Math.max(prev ? prev.score : -Infinity, score), stars: Math.max(prev ? prev.stars : 0, stars) };
      sd.day = Math.max(sd.day, d.n + 1);
      // メダル(目標の達成)は日ごとに集める。前に取ったものは消えない
      const had = new Set(sd.medals[d.n] || []);
      d.newMedals = goals.filter((g) => g.done && !had.has(g.id)).length;
      goals.forEach((g) => { if (g.done) had.add(g.id); });
      sd.medals[d.n] = [...had];
      d.recordBest = !sd.bestDay || score > sd.bestDay.score;
      if (d.recordBest) sd.bestDay = { score, n: d.n };
      d.stars = stars; Store.addShift(d);
      Store.recalcTotal(); Store.save();
      const after = Game.rank(sd.total);
      d.rankUp = after.name !== rankBefore.name ? after : null;
      d.newBest = !prev || score > prev.score;
      d.modesUnlocked = !wasModes && Modes.unlocked();
    }
    const r = Game.rank(sd.total), nx = Game.nextRank(sd.total);
    const prog = nx ? ((sd.total - r.min) / (nx.min - r.min)) * 100 : 100;
    const gs = d.gateStats || { boarded: 0, total: 0, lateMin: 0, offload: 0 };
    const verdict = stars === 3 ? 'すばらしい勤務でした' : stars === 2 ? 'よい勤務でした' : 'ミスを見直して、もう一度挑戦しましょう';
    const mark = (ok) => (ok === true ? '<span class="pill ok">OK</span>' : ok === 'partial' ? '<span class="pill warn">△</span>' : '<span class="pill bad">ミス</span>');
    const logs = (area) => d.log.filter((l) => l.area === area);
    const list = (arr) => (arr.length ? `<ul class="loglist">${arr.map((l) => `<li>${mark(l.ok)}<div><b>${U.esc(l.name)}</b> <small>${l.flight}</small><p>${U.esc(l.text)}</p></div><span class="lp ${l.pts < 0 ? 'neg' : ''}">${U.signed(l.pts)}</span></li>`).join('')}</ul>` : '<p class="mute">記録はありません</p>');
    const mistakes = d.log.filter((l) => l.ok === false).length;
    const ne = Progress.nextEvent(d.n);
    const parts = [['カウンター', d.score.counter]];
    if (d.mid) parts.push([DATA.jobs[d.mid].name, d.score.mid]);
    parts.push(['ゲート', d.score.gate], ['コンボ', d.score.combo]);

    document.getElementById('app').innerHTML = Hud.frame(`<div class="result">
      <div class="r-left">
        <section class="panel r-head">
          <div class="r-stars" aria-label="星${stars}つ">${[1, 2, 3].map((i) => Art.star(i <= stars)).join('')}</div>
          <div class="r-title"><p class="eyebrow">${U.jp(d.date)} · ${d.cfg.title}${Cloud.name() ? ` · ${U.esc(Cloud.name())}さん` : ''}</p><h2>${verdict}</h2>
            ${d.recordBest ? '<span class="pill ok">1日の最高記録を更新!</span>' : d.newBest ? '<span class="pill ok">この日の自己ベスト</span>' : ''}</div>
          <div class="r-score"><small>本日のスコア</small><b>${U.fmt(score)}</b></div>
        </section>
        <section class="metrics">
          <div class="metric"><small>判断の正確さ</small><b>${Math.round(acc * 100)}%</b><span>ミス ${mistakes}件</span></div>
          <div class="metric"><small>お客様満足度</small><b>${Math.round(d.sat)}</b><span>100点満点</span></div>
          <div class="metric"><small>${d.gateFlight.no} の出発</small><b>${d.onTime ? '定刻' : `${gs.lateMin}分遅れ`}</b><span>${gs.offload ? `荷物の取り降ろし ${gs.offload}分` : `搭乗 ${gs.boarded}/${gs.total}名`}</span></div>
          <div class="metric"><small>最大コンボ</small><b>${d.maxCombo}</b><span>ボーナス ${U.fmt(d.score.combo)}点</span></div>
        </section>
        <section class="panel r-goals">
          <div class="rg-head"><b>今日の目標</b><span>メダル ${goals.filter((g) => g.done).length}/3${d.newMedals ? ` · 新しく${d.newMedals}個` : ''}</span></div>
          <ul>${goals.map((g) => `<li class="${g.done ? 'done' : ''}"><span class="medal" aria-hidden="true"></span>${U.esc(g.label)}<em>${g.done ? '達成' : '未達成'}</em></li>`).join('')}</ul>
        </section>
        <section class="panel r-rank">
          <div><small>ランク</small><b>${r.name}</b>${d.rankUp ? '<span class="pill ok">昇進!</span>' : ''}<span class="mute small"> 累計 ${U.fmt(sd.total)}点 · メダル ${Goals.medalCount()}個</span></div>
          <div class="rk-bar"><i style="width:${U.clamp(prog, 0, 100)}%"></i></div>
          <p class="mute small">${nx ? `次の「${nx.name}」まで あと${U.fmt(nx.min - sd.total)}点${nx.unlock ? `(${DATA.jobs[nx.unlock].name}の仕事が加わります)` : ''}` : '最高ランクです'}${ne ? ` · ${ne}日目は特別な日` : ''}</p>
        </section>
        <div class="r-actions">
          <button class="btn primary big" data-act="next">${d.n + 1}日目の勤務へ</button>
          <button class="btn" data-act="retry">この日をやり直す</button>
          <button class="btn ghost" data-act="title">タイトルへ</button>
          ${Cloud.user ? '<button class="btn ghost" data-act="g:ranking">ランキング</button>' : ''}
        </div>
      </div>
      <div class="panel r-logs">
        <p class="r-parts">${parts.map(([k, v]) => `<span>${k} <b>${U.fmt(v)}</b></span>`).join('<i>+</i>')}</p>
        <section><h3>チェックインカウンター</h3>${list(logs('counter'))}</section>
        ${d.mid ? `<section><h3>${DATA.jobs[d.mid].name}</h3>${list(logs('mid'))}</section>` : ''}
        <section><h3>${d.gateFlight.gate}番搭乗口</h3><p class="mute small">問題なく通したお客様 ${d.stats.scanned || 0}名(個別の記録は省略)</p>${list(logs('gate'))}</section>
      </div>
    </div>`);
    if (d.rankUp && !d.rankShown) {
      d.rankShown = true;
      const job = d.rankUp.unlock ? DATA.jobs[d.rankUp.unlock] : null;
      Sfx.chime();
      Modal.show({
        title: `昇進しました!「${d.rankUp.name}」`,
        body: job ? `<p>新しい仕事<b>「${job.name}」</b>が、次の勤務からカウンターと搭乗ゲートの間に加わります。</p><p class="mute">${job.desc} ルールはマニュアルにも追加されました。</p>` : '<p>これからもこの調子でがんばりましょう。</p>',
        actions: [{ label: 'やった!', cls: 'primary', run: () => this.showUnlock(d) }],
      });
    } else this.showUnlock(d);
  },

  // 30日目をクリアしたとき:チャレンジモードの解禁
  showUnlock(d) {
    if (!d.modesUnlocked || d.modesShown) return;
    d.modesShown = true;
    Sfx.chime();
    Modal.show({
      title: 'チャレンジモードが解禁されました!',
      body: `<p>30日目のクリア、おめでとうございます。タイトル画面から、2つのモードが遊べるようになりました。</p>
        <ul class="unlock-list"><li><b>${Modes.KINDS.endless.name}</b>:終わりのない勤務で、どこまで点数をのばせるか</li><li><b>${Modes.KINDS.sudden.name}</b>:1回ミスしたら終わり。何回続けて正解できるか</li></ul>`,
      actions: [{ label: 'やった!', cls: 'primary' }],
    });
  },

  // チャレンジモードのステージの結果
  enterRun() {
    const d = Game.day, r = Game.run, K = Modes.KINDS[r.kind], score = Game.dayScore();
    Modes.stageDone(d);
    const acc = d.dec ? d.good / d.dec : 1, mistakes = d.log.filter((l) => l.ok === false).length;
    const mark = (ok) => (ok === true ? '<span class="pill ok">OK</span>' : ok === 'partial' ? '<span class="pill warn">△</span>' : '<span class="pill bad">ミス</span>');
    const list = (arr) => (arr.length ? `<ul class="loglist">${arr.map((l) => `<li>${mark(l.ok)}<div><b>${U.esc(l.name)}</b> <small>${l.flight}</small><p>${U.esc(l.text)}</p></div><span class="lp ${l.pts < 0 ? 'neg' : ''}">${U.signed(l.pts)}</span></li>`).join('')}</ul>` : '<p class="mute">記録はありません</p>');
    const logs = (area) => d.log.filter((l) => l.area === area);
    const best = Modes.rec(r.kind).best, sudden = r.kind === 'sudden';
    document.getElementById('app').innerHTML = Hud.frame(`<div class="result run">
      <div class="r-left">
        <section class="panel r-head">
          <div class="r-title"><p class="eyebrow">${K.name}</p><h2>ステージ${r.stage} クリア!</h2>${sudden ? '<span class="pill ok">ノーミス継続中</span>' : ''}</div>
          <div class="r-score"><small>このステージ</small><b>${U.fmt(score)}</b></div>
        </section>
        <section class="metrics">
          <div class="metric"><small>${sudden ? '連続正解' : '合計スコア'}</small><b>${sudden ? `${U.fmt(r.good)}回` : U.fmt(r.score)}</b><span>${sudden ? `合計 ${U.fmt(r.score)}点` : `判断の正確さ ${Math.round(acc * 100)}%`}</span></div>
          <div class="metric"><small>クリアしたステージ</small><b>${r.stage}</b><span>次は 時間の速さ ×${Math.round((d.cfg.speed / Modes.speedUp(r.stage)) * Modes.speedUp(r.stage + 1) * 10) / 10}</span></div>
          <div class="metric"><small>自己ベスト</small><b>${sudden ? `${U.fmt(best)}回` : U.fmt(best)}</b><span>${(sudden ? r.good : r.score) >= best && best > 0 ? '更新中!' : ''}</span></div>
          <div class="metric"><small>最大コンボ</small><b>${d.maxCombo}</b><span>${sudden ? '' : `ミス ${mistakes}件`}</span></div>
        </section>
        <div class="r-actions">
          <button class="btn primary big" data-act="run-next">ステージ${r.stage + 1}へ</button>
          <button class="btn ghost" data-act="run-quit">ここでやめる</button>
        </div>
      </div>
      <div class="panel r-logs">
        <section><h3>チェックインカウンター</h3>${list(logs('counter'))}</section>
        ${d.mid ? `<section><h3>${DATA.jobs[d.mid].name}</h3>${list(logs('mid'))}</section>` : ''}
        <section><h3>${d.gateFlight.gate}番搭乗口</h3>${list(logs('gate'))}</section>
      </div>
    </div>`);
  },
  update(dt) { Hud.tick(dt, 0); },
  onAct(a) {
    if (a === 'run-next') { Modes.next(); return; }
    if (a === 'run-quit') { Modes.quit(); return; }
    const n = Game.day.n;
    if (a === 'next') Game.startDay(n + 1);
    else if (a === 'retry') Game.startDay(n);
    else if (a === 'title') Game.go('title');
  },
};
