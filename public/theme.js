(function () {
  var h = document.documentElement;
  var s = localStorage.getItem('theme');
  if (s) h.setAttribute('data-theme', s);
  else if (!matchMedia('(prefers-color-scheme:dark)').matches)
    h.setAttribute('data-theme', 'light');
  matchMedia('(prefers-color-scheme:dark)').addEventListener('change', function (e) {
    h.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  });
  window.toggleTheme = function () {
    var t = h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    h.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    return t;
  };
})();
