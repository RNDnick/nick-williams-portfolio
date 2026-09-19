// Mobile nav toggle
(function () {
  var nav = document.querySelector('.site-nav');
  var toggle = document.querySelector('.nav-toggle');
  if (!nav || !toggle) return;

  toggle.addEventListener('click', function () {
    nav.classList.toggle('open');
    var expanded = nav.classList.contains('open');
    toggle.setAttribute('aria-expanded', String(expanded));
  });

  nav.querySelectorAll('.nav-links a').forEach(function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('open');
    });
  });
})();

// Footer year
(function () {
  var el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
})();
