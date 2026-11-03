/* Кнопка «выбери за меня»: объёмный кубик в красках меню, точки синие; тень отдельно — она остаётся на столе, когда кубик подлетает */
(function () {
  document.documentElement.classList.add('btn2');
  var html = '<span class="die-sh"></span><svg class="dice-svg" viewBox="0 0 40 44" aria-hidden="true"><g transform="rotate(-8 20 22)" stroke="#033E69" stroke-width="1.4" stroke-linejoin="round"><path d="M3 11 L20 2 L37 11 L20 20 Z" fill="#FFF9EE"/><path d="M3 11 L20 20 L20 40 L3 31 Z" fill="#BFD8D6"/><path d="M20 20 L37 11 L37 31 L20 40 Z" fill="#E8DCC4"/><g stroke="none" fill="#033E69"><g transform="matrix(17,-9,17,9,3,11)"><circle cx=".24" cy=".24" r=".1"/><circle cx=".76" cy=".24" r=".1"/><circle cx=".5" cy=".5" r=".1"/><circle cx=".24" cy=".76" r=".1"/><circle cx=".76" cy=".76" r=".1"/></g><g transform="matrix(17,9,0,20,3,11)"><circle cx=".25" cy=".22" r=".085"/><circle cx=".5" cy=".5" r=".085"/><circle cx=".75" cy=".78" r=".085"/></g><g transform="matrix(17,-9,0,20,20,20)"><circle cx=".5" cy=".5" r=".1"/></g></g></g></svg>';
  function apply() { document.querySelectorAll('.pick').forEach(function (b) { if (b.dataset.v !== '5') { b.innerHTML = html; b.dataset.v = '5'; b.setAttribute('aria-label', 'выбери за меня'); } }); }
  apply(); new MutationObserver(apply).observe(document.getElementById('app'), { childList: true, subtree: true });
})();
