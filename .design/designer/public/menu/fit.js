/* Подгонка: один интервал между блюдами (--rp) и один кегль (--k) на всё меню.
   Сначала сжимается интервал, потом чуть кегль; если и так не влезает — список прокручивается внутри столбца. Текст не обрезается никогда. */
(function () {
  // рисунок справа, по центру между строками [a, b] — напротив коротких названий
  // рамка самого текста, а не блока: строка состава — блок во всю ширину столбца
  function textRect(el) { var r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); }
  var AT = { zavtrak: [2, 4], goryachee: [1, 2], supy: [1, 3], salaty: [3, 4] };
  function placeArt(ps) {
    ps.forEach(function (p) {
      var at = AT[p.dataset.sec], rows = p.querySelectorAll('.dish'); if (!at || rows.length <= at[1]) return;
      var pr = p.getBoundingClientRect(), sx = pr.height / p.offsetHeight || 1;
      var a = rows[at[0]].getBoundingClientRect(), b = rows[at[1]].getBoundingClientRect();
      p.style.setProperty('--py', ((a.top + b.bottom) / 2 - pr.top) / sx + 'px');
      // не закрывать текст: если рисунок задевает строки, сдвинуть его к краю листа
      p.style.removeProperty('--pr');
      var img = p.querySelector('.dishart').getBoundingClientRect(), need = 0;
      [].forEach.call(rows, function (r) {
        [r.querySelector('.name'), r.querySelector('.prod')].forEach(function (el) {
          var n = textRect(el); if (n.bottom > img.top + 4 && n.top < img.bottom - 4) need = Math.max(need, n.right + 6 - img.left);
        });
      });
      if (need > 0) p.style.setProperty('--pr', Math.max(0, parseFloat(getComputedStyle(p.querySelector('.plate')).right) - need / sx) + 'px');
    });
  }
  // кубик не занимает строку; если последнее блюдо упирается в него — столбец оставляет под кубиком место
  function diceRow(p) {
    p.classList.remove('dicerow');
    var b = p.querySelector('.pick').getBoundingClientRect(), hit = false;
    p.querySelectorAll('.dish .name, .dish .prod, .plate .dishart').forEach(function (el) {
      var r = el.tagName === 'IMG' ? el.getBoundingClientRect() : textRect(el); if (r.right > b.left && r.bottom > b.top + 6) hit = true;
    });
    p.classList.toggle('dicerow', hit);
  }
  var busy = false;
  function fitAll() {
    busy = true;
    var shown = [];
    document.querySelectorAll('.desk .sheet[hidden], .desk .outside[hidden]').forEach(function (el) { el.hidden = false; el.style.visibility = 'hidden'; shown.push(el); });
    var ps = [].filter.call(document.querySelectorAll('.panel:not(.cover)'), function (p) { return p.getClientRects().length; });
    var phone = !!document.querySelector('.phone');
    var RP = phone ? [5, 2] : [9, 3], KMIN = phone ? 0.86 : 0.9;
    function set(name, v) { ps.forEach(function (p) { p.style.setProperty(name, v); }); }
    function over() { return ps.some(function (p) { return p.scrollHeight > p.clientHeight + 1; }); }
    ps.forEach(function (p) { p.classList.remove('tight'); });
    set('--k', 1); set('--rp', RP[0] + 'px');
    ps.forEach(diceRow);
    var rp = RP[0], k = 1;
    while (over() && rp > RP[1]) { rp -= 0.5; set('--rp', rp + 'px'); }
    while (over() && k > KMIN) { k -= 0.02; set('--k', k.toFixed(2)); }
    ps.forEach(diceRow);
    ps.forEach(function (p) { if (p.scrollHeight > p.clientHeight + 1) p.classList.add('tight'); });
    placeArt(ps);
    shown.forEach(function (el) { el.hidden = true; el.style.visibility = ''; });
    window.__fit = { rp: rp, k: k };
    setTimeout(function () { busy = false; }, 0);
  }
  var t; function soon() { clearTimeout(t); t = setTimeout(fitAll, 60); }
  window.addEventListener('resize', soon); window.addEventListener('load', soon);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(soon);
  new MutationObserver(function () { if (!busy) soon(); }).observe(document.getElementById('app'), { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  soon();
  window.__fitMenu = fitAll;
})();
