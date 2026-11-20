'use strict';
/* =====================================================================
   グランドスタッフシミュレーター  v0.7
   ---------------------------------------------------------------------
   拡張の入口(大きくするときはここから)
   - 新しいトラブル      → 03-rules.js の ISSUES に1つ追加
   - 新しい空港・路線    → 02-data.js の DATA.airports
   - 新しい勤務日        → 02-data.js の DATA.days(それ以降は自動生成)
   - 新しいルール説明    → 02-data.js の DATA.manual
   - 新しい業務(シーン)  → Scenes.xxx = { enter, update, onAct } を作り Game.go('xxx')
   ===================================================================== */
const CONFIG = {
  version: '0.7.2',
  saveKey: 'gss-save-v1',
  startDate: '2026-12-01',   // 勤務1日目の日付
  gateSpeed: 6,              // 搭乗ゲートの時間の速さ(実時間1秒 = ゲーム内6秒)
  score: {
    // カウンター
    serve: 100, refuseRight: 120, refuseWrongReason: 40,
    missDoc: -200, wrongRefuse: -150,
    feeRight: 50, repackRight: 40, batteryCaught: 60, bagMistake: -120,
    seatMet: 30, seatUnmet: -20, seatClass: -100,
    missedQueue: -150, fast: 20,
    svcRight: 40, svcMiss: -120, svcExtra: -60, tagRight: 40, tagWrong: -100,
    exitBad: -150, exitDeclined: 30, rebookBest: 100, rebookOk: 40, rebookBad: -100,
    carryRight: 50, carryMiss: -100, carryExtra: -60,
    // 搭乗ゲート
    gBoard: 15, gHold: 40, gRedirect: 80,
    gWrongBoard: -300, gEarlyBoard: -30, gWrongHold: -60, gWrongWait: -40, gWrongRedirect: -150,
    gLeftBehind: -200, gOnTime: 300, gDelayPerMin: -30, gNoShowHandled: 50,
    gReseat: 30, gReseatMiss: -100, gReseatExtra: -30,
    obBest: 60, obOk: 30, obDecline: 40, obBad: -150, obExtra: -100, obShort: -200,
  },
};
