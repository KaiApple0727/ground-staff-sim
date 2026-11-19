/* ---------- ゲームのデータ(ここを増やすとゲームが広がる) ---------- */
const DATA = {
  airline: { name: 'つばさ航空', en: 'TSUBASA AIRLINES', code: 'TB' },
  home: { code: 'MNT', name: 'みなと', full: 'みなと国際空港' },

  airports: {
    FUK: { name: '福岡', en: 'FUKUOKA', intl: false },
    OKA: { name: '那覇', en: 'NAHA', intl: false },
    CTS: { name: '札幌(新千歳)', en: 'SAPPORO', intl: false },
    ITM: { name: '大阪(伊丹)', en: 'OSAKA', intl: false },
    KOJ: { name: '鹿児島', en: 'KAGOSHIMA', intl: false },
    ICN: { name: 'ソウル(仁川)', en: 'SEOUL', intl: true, country: 'KR' },
    TPE: { name: '台北(桃園)', en: 'TAIPEI', intl: true, country: 'TW' },
    HNL: { name: 'ホノルル', en: 'HONOLULU', intl: true, country: 'US', entry: 'ESTA' },   // アメリカ入国にはESTA(米国籍は不要)
    SIN: { name: 'シンガポール', en: 'SINGAPORE', intl: true, country: 'SG', passportMonths: 6 },
  },

  // 乗り継ぎ先(到着地からさらに先へ行くお客様)
  onward: { ICN: ['HKG', 'BKK'], TPE: ['HKG', 'BKK'], SIN: ['SYD', 'CDG'], HNL: ['LAX'] },
  cities: {
    HKG: { name: '香港', en: 'HONG KONG' }, BKK: { name: 'バンコク', en: 'BANGKOK' }, SYD: { name: 'シドニー', en: 'SYDNEY' },
    CDG: { name: 'パリ', en: 'PARIS' }, LAX: { name: 'ロサンゼルス', en: 'LOS ANGELES' },
  },
  // 国内線の飛行時間(分)。振替便の到着時刻の計算に使う
  blockMin: { FUK: 110, OKA: 150, CTS: 100, ITM: 75, KOJ: 110 },

  // 特別な手配(手荷物の画面で選ぶ)
  svc: {
    wheelchair: { label: '車いすを手配', done: '車いすを手配した', miss: '車いすの手配を忘れた', priority: true },
    minor: { label: 'ひとり旅サポートを手配', done: 'お子さまのひとり旅サポートを手配した', miss: 'お子さまのひとり旅サポートを手配しなかった', priority: true },
    pet: { label: 'ペットを貨物室で預かる', done: 'ペットを貨物室でお預かりした', miss: 'ペットの受付をしなかった' },
    fragile: { label: '壊れ物タグを付ける', done: '楽器に壊れ物タグを付けた', miss: '楽器に壊れ物タグを付けなかった' },
  },

  countries: {
    JP: { code: 'JPN', en: 'JAPAN' },
    KR: { code: 'KOR', en: 'REPUBLIC OF KOREA' },
    TW: { code: 'TWN', en: 'TAIWAN' },
    US: { code: 'USA', en: 'UNITED STATES OF AMERICA' },
    SG: { code: 'SGP', en: 'SINGAPORE' },
    AU: { code: 'AUS', en: 'AUSTRALIA' },
    GB: { code: 'GBR', en: 'UNITED KINGDOM' },
  },

  names: {
    JP: {
      family: ['SATO', 'SUZUKI', 'TAKAHASHI', 'TANAKA', 'WATANABE', 'ITO', 'YAMAMOTO', 'NAKAMURA', 'KOBAYASHI', 'KATO', 'YOSHIDA', 'YAMADA', 'SASAKI', 'MATSUMOTO', 'INOUE', 'KIMURA', 'HAYASHI', 'SHIMIZU', 'MORI', 'IKEDA', 'HASHIMOTO', 'ISHIKAWA', 'OGAWA', 'FUJITA', 'OKADA', 'KONDO', 'ENDO', 'AOKI'],
      M: ['HARUTO', 'REN', 'SOTA', 'YUTO', 'KAITO', 'TAKUMI', 'DAIKI', 'SHOTA', 'KENJI', 'HIROSHI', 'TARO', 'RYOTA', 'NAOKI', 'KAZUYA', 'MINATO', 'RIKU'],
      F: ['YUI', 'HINA', 'SAKURA', 'AOI', 'MIO', 'RIN', 'YUKI', 'AYAKA', 'MISAKI', 'NANAMI', 'HARUKA', 'EMI', 'KAORI', 'MAI', 'TSUMUGI', 'MOMOKA'],
    },
    KR: { family: ['KIM', 'LEE', 'PARK', 'CHOI', 'JUNG', 'KANG', 'YOON', 'HAN'], M: ['MINJUN', 'JIHOO', 'DOYUN', 'SEOJUN', 'HYUNWOO'], F: ['SEOYEON', 'HAEUN', 'JIWOO', 'SUBIN', 'YEJIN'] },
    TW: { family: ['CHEN', 'LIN', 'HUANG', 'CHANG', 'WANG', 'WU', 'TSAI'], M: ['CHIH-HAO', 'CHUN-HUNG', 'YU-CHENG', 'WEI-LUN'], F: ['YU-HSUAN', 'PEI-SHAN', 'HSIN-YI', 'YA-TING'] },
    US: { family: ['SMITH', 'JOHNSON', 'BROWN', 'MILLER', 'DAVIS', 'GARCIA', 'WILSON'], M: ['JAMES', 'LIAM', 'NOAH', 'ETHAN', 'LUCAS'], F: ['EMMA', 'OLIVIA', 'AVA', 'CHLOE', 'GRACE'] },
    SG: { family: ['TAN', 'LIM', 'NG', 'WONG', 'GOH'], M: ['WEI MING', 'JUN JIE', 'KAI XIANG'], F: ['HUI LING', 'XIN YI', 'MEI LIN'] },
    AU: { family: ['TAYLOR', 'WHITE', 'MARTIN', 'THOMPSON', 'KELLY'], M: ['JACK', 'OLIVER', 'HARRY', 'LEO'], F: ['CHARLOTTE', 'ISLA', 'RUBY', 'MIA'] },
    GB: { family: ['JONES', 'EVANS', 'WRIGHT', 'HUGHES', 'CLARKE'], M: ['GEORGE', 'ARTHUR', 'OSCAR', 'HENRY'], F: ['AMELIA', 'LILY', 'FREYA', 'ELSIE'] },
  },

  rules: {
    cutoff: { dom: 30, intl: 60 },                               // 手続き締切(出発の何分前)
    allowance: { dom: { Y: 20, J: 30 }, intl: { Y: 23, J: 32 } }, // 無料手荷物(kg)
    maxPiece: 32,                                                 // 1個の上限(kg)
    boardingStart: 30, doorClose: 10, offloadMin: 6,              // 搭乗開始・ドアクローズ(出発の何分前)、荷物取り降ろし(分)
  },

  cls: { Y: { dom: '普通席', intl: 'エコノミー' }, J: { dom: '上級席', intl: 'ビジネス' } },
  seatReq: { window: '窓側', aisle: '通路側', front: '前の方', exit: '非常口座席' },
  exitRow: 8,   // 非常口座席の列
  flightColors: ['#2f6fdb', '#d9622b', '#23946c', '#8b52c9', '#c23f78'],

  // ランク(累計 = 各日の自己ベストの合計)。unlock = 昇進すると増える仕事
  ranks: [
    { min: 0, name: '研修生', en: 'TRAINEE' },
    { min: 1500, name: 'グランドスタッフ', en: 'GROUND STAFF' },
    { min: 5000, name: '中堅スタッフ', en: 'SENIOR STAFF' },
    { min: 12000, name: 'チーフ', en: 'CHIEF', unlock: 'lounge' },
    { min: 20000, name: 'スーパーバイザー', en: 'SUPERVISOR', unlock: 'baggage' },
    { min: 30000, name: '旅客サービス責任者', en: 'DUTY MANAGER' },
    { min: 45000, name: '空港所長', en: 'AIRPORT MANAGER' },
  ],

  // 昇進で増える仕事(カウンターと搭乗ゲートの間に入る)
  jobs: {
    lounge: { name: 'ラウンジ受付', en: 'LOUNGE', desc: '搭乗券と会員カードを見て、ラウンジに入れるかを判断します。' },
    baggage: { name: '手荷物の仕分け', en: 'BAGGAGE', desc: '流れてくる荷物のタグを見て、正しい便のカートへ仕分けます。' },
  },

  // 特別な日(9日目から3日ごと)
  events: {
    school: { name: '修学旅行', en: 'SCHOOL TRIP', brief: '中学生の修学旅行の団体が来ます。「お友だちのとなりがいい」という生徒が多いので、席をうまく並べましょう。15歳未満の生徒は非常口座席に座れません。' },
    typhoon: { name: '台風接近', en: 'TYPHOON', brief: '台風が近づいています。国内線が2便欠航し、振替のお客様がたくさん来ます。空席は振り替えるたびに減っていきます。' },
    rush: { name: '年末年始の大混雑', en: 'HOLIDAY RUSH', brief: '帰省ラッシュで、お客様がいつもの1.5倍。列が長くなります。締切が近い便のお客様を先に案内して、乗り遅れを出さないように。' },
    inbound: { name: '海外からのお客様の日', en: 'INBOUND', brief: '海外からのお客様がとても多い日。英語でのやりとりが増え、パスポートやESTAの確認も増えます。' },
  },
  eventOrder: ['school', 'typhoon', 'rush', 'inbound'],

  // ラウンジの会員ランク
  tiers: {
    PLATINUM: { name: 'プラチナ', color: '#2b3340' },
    GOLD: { name: 'ゴールド', color: '#b8902e' },
    SILVER: { name: 'シルバー', color: '#8d969f' },
  },

  // お断りの理由(day = 使えるようになる勤務日)
  reasons: {
    name: { day: 1, label: '名前がパスポートと違う', miss: 'eチケットとパスポートの名前が違うのに見逃した' },
    photo: { day: 5, label: '写真が本人と違う', miss: 'パスポートの写真が別人なのに見逃した' },
    expired: { day: 2, label: 'パスポートの期限が足りない', miss: 'パスポートの有効期限が足りないのに見逃した' },
    no_passport: { day: 4, label: 'パスポートがない', miss: 'パスポートがないのに受け付けてしまった' },
    entry: { day: 5, label: 'ESTAの承認がない', miss: 'アメリカ入国に必要なESTAがないのに受け付けた' },
    minor: { day: 6, label: 'ひとり旅の申込書が不十分', miss: 'お子さまのひとり旅の申込書が足りないのに受け付けた' },
    date: { day: 3, label: '予約日が今日ではない', miss: '別の日の予約なのに受け付けてしまった' },
    closed: { day: 1, label: '手続きの締切後', miss: '締切後に来たお客様を受け付けてしまった' },
  },

  // 搭乗ゲートのアナウンス(順番どおりに案内する)
  calls: [
    { label: '事前改札', sub: 'お手伝いが必要なお客様', ann: 'ただいまより、つばさ航空{num}便、{dest}行きの事前改札を行います。お手伝いが必要なお客様、小さなお子様連れのお客様からご案内いたします。' },
    { label: 'グループ1', sub: 'ビジネス・上級席', ann: 'つばさ航空{num}便、{dest}行き、グループ1のお客様をご案内いたします。' },
    { label: 'グループ2', sub: '後方 8〜12列', ann: '続きまして、グループ2のお客様をご案内いたします。' },
    { label: 'グループ3', sub: '前方 3〜7列', ann: '続きまして、グループ3のお客様をご案内いたします。まだご搭乗でないすべてのお客様も、どうぞお進みください。' },
    { label: '最終案内', sub: 'まだ来ていないお客様を呼ぶ', ann: 'つばさ航空{num}便、{dest}行きは、まもなく出発いたします。ご搭乗のお客様は、お急ぎ{gate}番搭乗口までお越しください。' },
  ],

  // 勤務日の設定。5日目以降は Gen.procCfg() で自動生成
  days: [
    {
      title: '研修初日', start: '06:30', speed: 6, pax: 6, gatePax: 12, issueRate: 0.4,
      brief: 'はじめての勤務です。カウンターで福岡行きとソウル行きの手続きをして、そのあとソウル行きの搭乗ゲートを担当します。迷ったら右上の「マニュアル」を開きましょう(開いている間は時間が止まります)。',
      flights: [{ no: '301', dest: 'FUK', dep: '07:30', gate: '3' }, { no: '701', dest: 'ICN', dep: '08:20', gate: '21' }],
      gate: { wrong: 1, early: 0.12, noShow: 0, noShowBag: 0, latecomers: 1, sameDest: 0 },
    },
    {
      title: '2日目', start: '06:30', speed: 7, pax: 7, gatePax: 14, issueRate: 0.45,
      brief: '那覇行きと台北行き。今日から、パスポートの有効期限と、預け荷物の危険物(モバイルバッテリー)の確認が加わります。',
      flights: [{ no: '101', dest: 'OKA', dep: '07:40', gate: '5' }, { no: '731', dest: 'TPE', dep: '08:30', gate: '23' }],
      gate: { wrong: 2, early: 0.18, noShow: 1, noShowBag: 0, latecomers: 1, sameDest: 0 },
    },
    {
      title: '3日目', start: '06:20', speed: 9, pax: 8, gatePax: 15, issueRate: 0.5,
      brief: '朝一番のソウル行きは締切が早いので要注意。今日から、予約の日付・締切後に来たお客様・32kgを超える荷物にも気をつけます。',
      flights: [{ no: '711', dest: 'ICN', dep: '07:40', gate: '22' }, { no: '201', dest: 'CTS', dep: '07:30', gate: '2' }, { no: '107', dest: 'OKA', dep: '08:10', gate: '6' }],
      gate: { wrong: 2, early: 0.2, noShow: 1, noShowBag: 0, latecomers: 2, sameDest: 0.3 },
    },
    {
      title: '4日目', start: '06:30', speed: 10, pax: 9, gatePax: 16, issueRate: 0.5,
      brief: '国際線が2便。シンガポール行きはパスポートの残り期間に条件があります。来ないお客様が荷物を預けていたら、取り降ろしが必要です。',
      flights: [{ no: '401', dest: 'ITM', dep: '07:30', gate: '4' }, { no: '761', dest: 'SIN', dep: '08:00', gate: '24' }, { no: '741', dest: 'HNL', dep: '08:50', gate: '25' }],
      gate: { wrong: 2, early: 0.22, noShow: 1, noShowBag: 1, latecomers: 2, sameDest: 0.4 },
    },
    {
      title: '5日目', start: '06:30', speed: 10, pax: 9, gatePax: 16, issueRate: 0.45, exitReq: 0.3, teen: 0.12,
      brief: 'ホノルル行きを担当します。アメリカに入るにはESTA(電子渡航認証)が必要です。パスポートの写真がご本人か、非常口座席に座ってよい方かも確かめましょう。',
      flights: [{ no: '501', dest: 'KOJ', dep: '07:30', gate: '7' }, { no: '713', dest: 'ICN', dep: '08:00', gate: '22' }, { no: '743', dest: 'HNL', dep: '08:50', gate: '26' }],
      gate: { wrong: 2, early: 0.22, noShow: 1, noShowBag: 0.5, latecomers: 2, sameDest: 0.4 },
    },
    {
      title: '6日目', start: '06:30', speed: 10, pax: 10, gatePax: 16, issueRate: 0.35, exitReq: 0.25, teen: 0.08, svcRate: 0.3,
      brief: 'サポートが必要なお客様の日。車いすの方、ひとりで乗るお子さま、ペット連れ、楽器を預ける方、赤ちゃん連れの方が来ます。手荷物の画面で「特別な手配」を忘れずに。',
      flights: [{ no: '203', dest: 'CTS', dep: '07:30', gate: '2' }, { no: '733', dest: 'TPE', dep: '08:00', gate: '23' }, { no: '109', dest: 'OKA', dep: '08:30', gate: '5' }],
      gate: { wrong: 2, early: 0.22, noShow: 1, noShowBag: 0.5, latecomers: 2, sameDest: 0.4, gateChange: true },
    },
    {
      title: '7日目', start: '06:30', speed: 10, pax: 10, gatePax: 16, issueRate: 0.35, exitReq: 0.2, teen: 0.08, svcRate: 0.15, connRate: 0.35,
      brief: '朝の福岡行きが機材故障で欠航になりました。振替のお客様が来るので、希望に合う便を選びます。国際線では乗り継ぎのお客様の荷物の行き先にも注意。',
      flights: [{ no: '303', dest: 'FUK', dep: '07:40', gate: '3' }, { no: '763', dest: 'SIN', dep: '08:10', gate: '24' }, { no: '715', dest: 'ICN', dep: '08:40', gate: '21' }],
      cancel: '303',
      gate: { wrong: 2, early: 0.22, noShow: 1, noShowBag: 0.6, latecomers: 2, sameDest: 0.4 },
    },
    {
      title: '8日目', start: '06:30', speed: 10, pax: 10, gatePax: 16, issueRate: 0.35, exitReq: 0.2, teen: 0.08, svcRate: 0.15, connRate: 0.25,
      brief: '札幌行きの予約が座席より多い日(オーバーブッキング)。搭乗口では機材変更も起きます。便を変えてくれるお客様を探し、座席の変更も行いましょう。',
      flights: [{ no: '403', dest: 'ITM', dep: '07:30', gate: '4' }, { no: '735', dest: 'TPE', dep: '08:00', gate: '23' }, { no: '205', dest: 'CTS', dep: '08:40', gate: '2' }],
      gate: { wrong: 2, early: 0.22, noShow: 1, noShowBag: 0.6, latecomers: 2, sameDest: 0.4, overbook: 2, equip: true },
    },
  ],

  // 業務マニュアル(day = 追加される勤務日)
  manual: [
    {
      title: '書類の確認', items: [
        { day: 1, t: '国際線は名前を照合', b: 'パスポートとeチケットの<b>姓・名が1文字でも違えば</b>お断りします。「SATO」と「SATOU」も別人の扱いです。' },
        { day: 1, t: '国内線は身分証不要', b: '国内線はパスポートの確認はいりません。eチケットの便と日付を見ます。' },
        { day: 1, t: '手続きの締切', b: '国内線は出発の<b>30分前</b>、国際線は出発の<b>60分前</b>に締め切ります。締切を過ぎてから来たお客様はお断りします。列に並んでいる間に締切を過ぎるとそのお客様は乗り遅れてしまうので、締切が近い便は「先に案内」しましょう。' },
        { day: 2, t: 'パスポートの有効期限', b: '有効期限が<b>今日より前</b>なら期限切れです。お断りします。' },
        { day: 3, t: '予約の日付', b: 'eチケットの搭乗日が<b>今日</b>でなければお断りして、予約変更カウンターへご案内します。' },
        { day: 4, t: 'パスポートの提示がない', b: '国際線でパスポートを持っていなければお断りします。' },
        { day: 4, t: 'シンガポールは残り6か月', b: 'シンガポール行きは、パスポートの有効期限が<b>今日から6か月以上</b>残っていないと搭乗できません。' },
        { day: 5, t: 'パスポートの写真', b: 'カウンターにいるお客様と、パスポートの写真を見比べます。髪型・髪の色・メガネなどが<b>2か所以上違えば別人</b>としてお断りします。' },
        { day: 5, t: 'アメリカ行きはESTA', b: 'ホノルル(アメリカ)行きは、<b>米国籍以外のお客様にESTA(電子渡航認証)</b>が必要です。端末の「ESTAを照会」で確かめ、承認がない・期限切れならお断りします。' },
        { day: 6, t: 'お子さまのひとり旅', b: '6〜11歳のお子さまがひとりで乗るときは、<b>申込書に到着地でのお迎えの方</b>が書いてあることが必要です。申込書がない・お迎えの欄が空ならお断りします。' },
      ],
    },
    {
      title: '手荷物', items: [
        { day: 1, t: '無料で預けられる重さ', b: '<table class="mtable"><tr><th></th><th>エコノミー・普通席(Y)</th><th>ビジネス・上級席(J)</th></tr><tr><th>国内線</th><td>20kg</td><td>30kg</td></tr><tr><th>国際線</th><td>23kg</td><td>32kg</td></tr></table>eチケットにも書いてあります。超えていたら「超過料金を案内」します。' },
        { day: 2, t: '危険物の確認', b: '預かる前に<b>必ず「危険物を確認する」</b>。モバイルバッテリーは預け荷物に入れられないので、取り出して機内に持ち込んでもらいます。' },
        { day: 3, t: '1個32kgまで', b: '32kgを超える荷物はお預かりできません。「詰め替えを依頼」して、もう一度量ります。' },
        { day: 7, t: '乗り継ぎ(スルーチェックイン)', b: 'eチケットに乗り継ぎ便が書いてあるお客様は、荷物の行き先を<b>「乗り継ぎ先まで」</b>にします。到着地で受け取って預け直さなくてすみます。' },
      ],
    },
    {
      title: '座席', items: [
        { day: 1, t: 'クラスと座席', b: 'ビジネス・上級席(J)は<b>1〜2列目</b>、エコノミー・普通席(Y)は<b>3列目から後ろ</b>です。' },
        { day: 1, t: 'お客様の希望', b: '窓側 = A・F、通路側 = C・D、前の方 = 3〜5列目。合う空席があれば希望に合わせます。' },
        { day: 5, t: '非常口座席(8列目)', b: '座れるのは<b>15歳以上</b>で、緊急時に脱出を手伝える方だけ。<b>車いすの方・ひとり旅のお子さま・赤ちゃん連れの方</b>は座れません。希望されても、条件に合わなければ別の席にします(本物の航空会社のルールがモデル)。年齢は端末に出ます。' },
      ],
    },
    {
      title: 'サポートが必要なお客様', items: [
        { day: 6, t: '車いす', b: '「車いすを手配」。搭乗口までご案内し、事前改札(グループ0)で先に乗っていただきます。' },
        { day: 6, t: 'ひとりで乗るお子さま', b: '申込書を確かめてから「ひとり旅サポートを手配」。係員が付き添い、事前改札で乗ります。' },
        { day: 6, t: 'ペット', b: '国内線では「ペットを貨物室で預かる」。ふつうの荷物としては扱いません。' },
        { day: 6, t: '楽器などの壊れ物', b: '「壊れ物タグを付ける」をしてから預かります。' },
        { day: 6, t: '赤ちゃん連れ', b: '特別な手配は不要ですが、事前改札で乗り、非常口座席には座れません。' },
        { day: 6, t: '必要のない手配はしない', b: '必要のないお客様に手配をすると、ほかのお客様のための係員や車いすが足りなくなります。' },
      ],
    },
    {
      title: '搭乗ゲート', items: [
        { day: 1, t: 'グループの決まり', b: '0 = 事前改札(お手伝いが必要なお客様) / 1 = ビジネス・上級席 / 2 = 後方8〜12列 / 3 = 前方3〜7列。' },
        { day: 1, t: '通してよい搭乗券', b: '<b>便名がこの搭乗口の便</b>で、<b>グループ番号が案内中の番号以下</b>なら通します。番号が大きければ「お待ちいただく」、便名が違えば「ゲート違いを案内」。同じ行き先でも便名が違えば別の便です。' },
        { day: 1, t: '次のグループの案内', b: '案内中のグループのお客様がいなくなると、次のグループを案内できます。' },
        { day: 1, t: 'ドアクローズ', b: '出発の<b>10分前</b>までに「搭乗締切」をすると定刻出発です。全グループを案内したら「最終案内」で、まだ来ていないお客様を呼びます。' },
        { day: 2, t: '来ないお客様', b: '最終案内からゲーム内で<b>3分ほど</b>待っても来なければ、締め切ってかまいません。もうすぐ来るお客様を置いていくとクレームになります。' },
        { day: 4, t: '手荷物の取り降ろし', b: '来なかったお客様が荷物を預けていた場合、安全のため荷物を降ろします。そのぶん出発が遅れますが、やむを得ない遅れとして扱います。' },
      ],
    },
    {
      title: 'ラウンジ受付', items: [
        { day: 1, job: 'lounge', t: '入れる人', b: '<b>ビジネス(J)の搭乗券</b>の方、または<b>ゴールド・プラチナ会員</b>の方。シルバー会員とエコノミーだけの方は入れません。' },
        { day: 1, job: 'lounge', t: '同伴者', b: '<b>プラチナ会員は1名まで無料</b>。それ以外は、同伴者は有料(ラウンジ券)です。同伴者がいて無料の範囲を超えるときは「同伴者は有料と案内」。' },
        { day: 1, job: 'lounge', t: '確かめること', b: '搭乗券が<b>つばさ航空(TB)の今日の便</b>か。会員カードの<b>名前が搭乗券と同じ</b>で、<b>有効期限</b>が切れていないか。使えないカードは「会員でない」として扱います。' },
      ],
    },
    {
      title: '手荷物の仕分け', items: [
        { day: 1, job: 'baggage', t: '仕分けのしかた', b: 'タグの<b>便名</b>を見て、その便のカートへ。時間内に仕分けないと、荷物が流れていってしまいます。' },
        { day: 1, job: 'baggage', t: '乗り継ぎのタグ', b: '大きく書かれた行き先が乗り継ぎ先(例:BKK)でも、<b>「via ICN」と便名</b>を見て、その便のカートへ入れます。' },
        { day: 1, job: 'baggage', t: '事務所・検査へ', b: 'タグが取れている、この空港の担当にない便のタグ → <b>事務所</b>。X線で「要確認」の荷物 → <b>検査</b>。' },
      ],
    },
    {
      title: '予定外の出来事', items: [
        { day: 6, t: '搭乗口の変更', b: '搭乗口が変わっても、お客様の搭乗券には<b>前の番号のまま</b>のことがあります。通してよいかは<b>便名</b>で決めます。' },
        { day: 7, t: '欠航と振替', b: '欠航した便のお客様には、ほかの便を選びます。<b>お客様の希望に合う中で、いちばん早い便</b>が正解。満席の便は選べません。' },
        { day: 8, t: '機材変更', b: '小さい飛行機に変わると、11・12列がなくなります。その列の搭乗券は「座席を変更して通す」。' },
        { day: 8, t: 'オーバーブッキング', b: '予約が座席より多いときは、便を変えてくれる方を募ります。協力金は<b>今日の後続便なら1万円、翌日の便なら2万円と宿泊費</b>(日本の大手航空会社の仕組みがモデル)。乗り継ぎがある方にはお願いしません。今日中に着きたい方には後続便を。必要な人数より多くお願いしないこと。足りなければ、だれかの搭乗をお断りすることになります。' },
      ],
    },
  ],

  // お客様のセリフ。ja = 日本語のお客様、en = [英語, 日本語訳]
  lines: {
    greet: {
      ja: ['おはようございます。{dest}行き、{num}便でお願いします。', '{num}便の手続きをお願いします。', '{dest}までです。よろしくお願いします。'],
      en: [['Good morning. Flight {flight} to {destEn}, please.', 'おはようございます。{dest}行き{num}便です。'], ["Hi! I'm checking in for {destEn}.", '{dest}行きの手続きをお願いします。']],
    },
    late: { ja: ['すみません、まだ間に合いますか!?', 'はぁ、はぁ…{num}便、まだ大丈夫ですよね?'], en: [['Sorry, am I too late?!', 'すみません、間に合いますか?']] },
    forgot: { ja: ['あっ…パスポート、家に置いてきちゃったみたいで。でも乗れますよね?'], en: [["Oh no, I left my passport at the hotel. Can I still fly?", 'パスポートをホテルに忘れました。乗れますか?']] },
    refusedOk: { ja: ['そうですか…わかりました。', 'えっ…確認してみます。'], en: [['Oh… I understand.', 'そうですか…わかりました。']] },
    refusedAngry: { ja: ['えっ、どうしてですか!? 何も問題ないはずです!'], en: [["What? There's nothing wrong with my documents!", 'え? 書類に問題はないはずです!']] },
    bagYes: { ja: ['スーツケースを1つ預けます。', 'この荷物をお願いします。'], en: [['One suitcase to check, please.', 'スーツケースを1つ預けます。']] },
    bagNo: { ja: ['預ける荷物はありません。'], en: [['No bags to check.', '預ける荷物はありません。']] },
    dangerNone: { ja: ['特に入ってないです。'], en: [['No, nothing like that.', '特にありません。']] },
    dangerBattery: { ja: ['あ、モバイルバッテリーが入ってます。'], en: [["Oh, there's a power bank in there.", 'モバイルバッテリーが入っています。']] },
    batteryOut: { ja: ['わかりました、手荷物に移しますね。'], en: [["Okay, I'll keep it with me.", '手荷物に移します。']] },
    feeOk: { ja: ['そうなんですか…わかりました、払います。'], en: [["Oh, okay. I'll pay the fee.", 'わかりました、払います。']] },
    feeAngry: { ja: ['え、重さオーバーしてないですよね?'], en: [["But my bag isn't overweight, is it?", '重さオーバーしてないですよね?']] },
    repack: { ja: ['じゃあ、少し中身を出します…。'], en: [["Alright, I'll take some things out.", '中身を少し出します。']] },
    seatNone: { ja: ['席はおまかせします。'], en: [['Any seat is fine.', 'どこでも大丈夫です。']] },
    seat_window: { ja: ['窓側の席はありますか?'], en: [['Could I get a window seat?', '窓側の席はありますか?']] },
    seat_aisle: { ja: ['通路側でお願いできますか?'], en: [['An aisle seat, please.', '通路側でお願いします。']] },
    seat_front: { ja: ['乗り継ぎがあるので、前の方の席だと助かります。'], en: [['I have a tight connection. Somewhere near the front?', '乗り継ぎがあるので前の方がいいです。']] },
    seatUnmet: { ja: ['希望の席じゃないけど…まあいいです。'], en: [['Not what I asked for, but okay.', '希望とは違うけど…まあいいです。']] },
    thanks: { ja: ['ありがとうございます!', '助かりました、ありがとう。'], en: [['Thank you so much!', 'ありがとうございます!']] },
    seat_exit: { ja: ['足元の広い、非常口の席は空いてますか?'], en: [['Is there an exit row seat with more legroom?', '足元の広い非常口座席はありますか?']] },
    exitNoOk: { ja: ['そうなんですね。わかりました。'], en: [["Oh, I see. That's fine.", 'そうなんですね。わかりました。']] },
    svc_wheelchair: { ja: ['足が悪いので、搭乗口まで車いすをお願いできますか?'], en: [["I'll need a wheelchair to the gate, please.", '搭乗口まで車いすをお願いします。']] },
    svc_minor: { ja: ['(保護者)この子がひとりで乗ります。着いたら祖母が迎えに来ます。'], en: [['(Parent) My child is flying alone today.', '(保護者)この子がひとりで乗ります。']] },
    svc_pet: { ja: ['犬も一緒なんですけど、預けられますか?'], en: [['My dog is coming too. Can I check him in?', '犬も一緒です。預けられますか?']] },
    svc_fragile: { ja: ['ギターなので、丁寧に扱ってほしいんですが…。'], en: [["It's a guitar, so please handle it with care.", 'ギターなので丁寧に扱ってください。']] },
    infant: { ja: ['赤ちゃんと一緒です。'], en: [["I'm travelling with my baby.", '赤ちゃんと一緒です。']] },
    conn: { ja: ['{conn}まで乗り継ぎです。'], en: [["I'm connecting to {connEn}.", '{conn}まで乗り継ぎです。']] },
    rebook: { ja: ['{num}便が欠航になったと聞いて…振り替えをお願いできますか?'], en: [['My flight {flight} was cancelled. Can you rebook me?', '{num}便が欠航になりました。振り替えをお願いします。']] },
    need_any: { ja: ['いちばん早い便でお願いします。'], en: [['The earliest flight, please.', 'いちばん早い便でお願いします。']] },
    need_by: { ja: ['{by}からの打ち合わせに間に合わせたいんです。'], en: [['I need to arrive before a {by} meeting.', '{by}からの打ち合わせに間に合いたいです。']] },
    need_pm: { ja: ['午前中は用事ができたので、お昼過ぎの便がいいです。'], en: [['I have plans this morning, so an afternoon flight would be better.', '午前は用事があるので、お昼過ぎ(12時以降)の便がいいです。']] },
    student: { ja: ['よろしくお願いします!', '修学旅行です!'], en: [['Hello!', 'こんにちは!']] },
    teacher: { ja: ['修学旅行の引率です。このあと生徒たちが来ますので、よろしくお願いします。'], en: [["I'm the teacher with the school group.", '修学旅行の引率です。']] },
    seat_buddy: { ja: ['{buddy}さんのとなりの席がいいです!', '{buddy}さんととなりにしてください!'], en: [['Can I sit next to {buddy}?', '{buddy}さんのとなりがいいです。']] },
    lg_0: { ja: ['ラウンジを使いたいのですが。'], en: [["I'd like to use the lounge.", 'ラウンジを使いたいです。']] },
    lg_1: { ja: ['連れと2人で入れますか?'], en: [['Can my friend come in with me?', '連れと2人で入れますか?']] },
    lg_2: { ja: ['家族3人なんですが、入れますか?'], en: [["We're a family of three. Can we all come in?", '家族3人で入れますか?']] },
    vol_any: { ja: ['急いでいないので、後の便でも明日でも協力できますよ。'], en: [["I'm not in a hurry. Later today or tomorrow is fine.", '急いでいないので、今日の後の便でも明日でも大丈夫です。']] },
    vol_today: { ja: ['今日中に着けるなら、協力しますよ。'], en: [['I can help if I still arrive today.', '今日中に着けるなら協力します。']] },
    vol_connect: { ja: ['協力したいんですが、着いた先で乗り継ぎがあって…。'], en: [['I want to help, but I have a connecting flight.', '協力したいけど、着いた先で乗り継ぎがあります。']] },
  },

  // あなた(係員)のセリフ
  staff: {
    docsOk: 'ありがとうございます。お手続きいたします。',
    refuse: {
      name: '恐れ入りますが、ご予約とパスポートのお名前が一致しないため、お手続きができません。',
      closed: '申し訳ございません。こちらの便は手続きの締切時刻を過ぎております。',
      expired: '申し訳ございません。パスポートの有効期限が条件を満たしていないため、ご搭乗いただけません。',
      date: '恐れ入ります、こちらは本日の便のご予約ではございません。予約変更カウンターへご案内いたします。',
      no_passport: '申し訳ございません。国際線はパスポートがないとご搭乗いただけません。',
      photo: '恐れ入りますが、パスポートのお写真とご本人様の確認ができないため、お手続きができません。',
      entry: '申し訳ございません。アメリカへの入国に必要なESTAの承認が確認できないため、ご搭乗いただけません。',
      minor: '申し訳ございません。お子さまのひとり旅には、到着地でのお迎えの方を書いた申込書が必要です。',
    },
    weigh: 'お荷物をこちらに載せていただけますか。',
    ask: 'お荷物の中に、モバイルバッテリーやスプレー缶などは入っていませんか?',
    batteryOut: 'モバイルバッテリーはお預かりできませんので、お手元でお持ちください。',
    accept: 'お荷物、お預かりいたします。',
    fee: '無料のお荷物の重さを超えておりますので、超過手荷物料金を頂戴いたします。',
    repack: '恐れ入ります、1個32kgを超えるお荷物はお預かりできません。中身を分けていただけますか。',
    noBag: 'かしこまりました。',
    seat: 'お座席は {seat} でお取りいたしました。',
    print: 'こちらが搭乗券です。{gate}番搭乗口から、{board}に搭乗開始です。いってらっしゃいませ。',
    gScan: 'ありがとうございます。いってらっしゃいませ。',
    gHold: '恐れ入ります、グループ{g}のご案内まで、もう少々お待ちください。',
    gRedirect: 'こちらは{flight}便の搭乗口です。お客様の便は{gate}番搭乗口でございます。',
    estaQ: 'ESTA(電子渡航認証)の状況をお調べいたします。',
    exitNo: '恐れ入ります、非常口座席には条件があり、今回はほかのお席をご用意しました。',
    rebook: '{flight}便、{dep}発に振り替えいたしました。',
    gReseat: '機材変更のため、お座席を{seat}に変更いたしました。',
    svcDone: {
      wheelchair: '車いすを手配いたしました。係員が搭乗口までご案内いたします。',
      minor: '係員が搭乗口から、到着地のお迎えの方までお付き添いいたします。',
      pet: 'ワンちゃんは貨物室でお預かりいたします。',
      fragile: '壊れ物タグをお付けして、お預かりいたします。',
    },
    lounge: {
      ok: 'ようこそ、つばさラウンジへ。ごゆっくりお過ごしください。',
      fee: '恐れ入ります、お連れ様はラウンジ券(有料)でのご案内となります。',
      no: '申し訳ございません。こちらのラウンジはご利用いただけない条件でございます。',
    },
    obAsk: {
      today: '後続の{flight}便への振り替えにご協力いただけますか。協力金を1万円お渡しします。',
      next: '明日の便への振り替えにご協力いただけますか。協力金2万円と宿泊費をお渡しします。',
      no: 'お申し出ありがとうございます。今回はこのままご搭乗ください。',
    },
  },
};
