/* Подгонка: если столбцу не хватает высоты — сначала сжимается картинка (CSS), потом чуть уменьшается кегль, текст не обрезается никогда */
(function () {
  // сколько нужно уменьшить рисунки, чтобы столбец влез (без изменения кегля)
  function needIs(p) {
    var is = 1; p.style.setProperty('--k', 1); p.style.setProperty('--is', 1);
    while (p.scrollHeight > p.clientHeight + 1 && is > 0.72) { is -= 0.04; p.style.setProperty('--is', is.toFixed(2)); }
    return is;
  }
  function fitK(p) {
    var k = 1, guard = 0;
    while (p.scrollHeight > p.clientHeight + 1 && k > 0.66 && guard++ < 20) { k -= 0.03; p.style.setProperty('--k', k.toFixed(2)); }
  }
  // «Горячее» и «Салаты»: рисунок справа, по центру между двумя блюдами
  function placeHot() {
    var AT = { goryachee: [1, 2], salaty: [3, 4], supy: [1, 3] }; // напротив гречки и риса; напротив тунца и винегрета
    document.querySelectorAll('.panel[data-sec="goryachee"], .panel[data-sec="salaty"], .panel[data-sec="supy"]').forEach(function (p) {
      var at = AT[p.dataset.sec], rows = p.querySelectorAll('.dish'); if (rows.length <= at[1] || !p.getClientRects().length) return;
      var pr = p.getBoundingClientRect(), a = rows[at[0]].getBoundingClientRect(), b = rows[at[1]].getBoundingClientRect();
      var sx = pr.height / p.offsetHeight || 1;
      p.style.setProperty('--py', ((a.top + b.bottom) / 2 - pr.top) / sx + 'px');
      // не закрывать текст: если рисунок задевает названия соседних строк, сдвинуть его к краю
      p.style.removeProperty('--pr');
      var img = p.querySelector('.dishart').getBoundingClientRect(), need = 0;
      [].forEach.call(rows, function (r) { var n = r.querySelector('.name').getBoundingClientRect(); if (n.bottom > img.top && n.top < img.bottom) need = Math.max(need, n.right + 6 - img.left); });
      if (need > 0) p.style.setProperty('--pr', Math.max(4, parseFloat(getComputedStyle(p.querySelector('.plate')).right) - need / sx) + 'px');
    });
  }
  // рисунки всегда одного размера; кегль один на всё меню — считается по обеим сторонам листа (скрытая сторона
  // на время замера показывается невидимой); не мельче 0.9, остальное — прокрутка внутри столбца
  var busy = false;
  function fitAll() {
    busy = true;
    var shown = [];
    document.querySelectorAll('.desk .sheet[hidden], .desk .outside[hidden]').forEach(function (el) { el.hidden = false; el.style.visibility = 'hidden'; shown.push(el); });
    var ps = [].filter.call(document.querySelectorAll('.panel:not(.cover)'), function (p) { return p.getClientRects().length; });
    ps.forEach(function (p) { p.classList.remove('tight'); p.style.setProperty('--is', 1); p.style.setProperty('--k', 1); });
    var k = 1;
    ps.forEach(function (p) { var kk = 1; while (p.scrollHeight > p.clientHeight + 1 && kk > (document.querySelector('.phone') ? 0.86 : 0.9)) { kk -= 0.02; p.style.setProperty('--k', kk.toFixed(2)); } k = Math.min(k, kk); });
    ps.forEach(function (p) { p.style.setProperty('--k', k.toFixed(2)); if (p.scrollHeight > p.clientHeight + 1) p.classList.add('tight'); });
    placeHot();
    shown.forEach(function (el) { el.hidden = true; el.style.visibility = ''; });
    setTimeout(function () { busy = false; }, 0);
  }
  var t; function soon() { clearTimeout(t); t = setTimeout(fitAll, 60); }
  window.addEventListener('resize', soon); window.addEventListener('load', soon);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(soon);
  new MutationObserver(function () { if (!busy) soon(); }).observe(document.getElementById('app'), { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  soon();
  window.__fitMenu = fitAll;
})();
