/* ---------- 起動 ---------- */
(function () {
  const start = (snap) => Game.boot(snap || {});
  const hot = window.claude && window.claude.hot;
  if (hot && hot.ready) hot.ready(start);
  else start((hot && hot.data) || {});
})();
