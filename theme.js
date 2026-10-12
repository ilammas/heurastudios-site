// The light/dark switch in the header, on every page. The inline script in each page's <head> has already set
// html[data-theme] from the saved choice (localStorage "ov-theme": "light" or "dark") or the system setting,
// before anything painted. This file makes the switch work, keeps its name saying what it will do, follows the
// system until someone picks, and picks up a choice made in another tab. Switching back to what the system shows
// forgets the choice, so the page follows the system's own setting again (Apple's dark mode guidance: a site that
// ignores the system appearance looks broken).
(function () {
  'use strict';
  var root = document.documentElement;
  var KEY = 'ov-theme';
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var buttons = document.querySelectorAll('.ov-theme');
  var timer = 0;

  function saved() {
    try {
      var value = window.localStorage.getItem(KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch (e) {
      return null;
    }
  }

  function save(value) {
    try {
      if (value) window.localStorage.setItem(KEY, value);
      else window.localStorage.removeItem(KEY);
    } catch (e) {
      // private mode or blocked storage: the switch still works for this page
    }
  }

  function system() {
    return media && media.matches ? 'dark' : 'light';
  }

  function current() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function label() {
    var next = current() === 'dark' ? 'light' : 'dark';
    for (var i = 0; i < buttons.length; i++) buttons[i].setAttribute('aria-label', 'Switch to ' + next + ' mode');
  }

  // fade: cross-fade the colors (about 250ms). Never on the first paint.
  function apply(theme, fade) {
    if (theme !== current()) {
      if (fade) {
        root.classList.add('ov-theming');
        clearTimeout(timer);
        timer = setTimeout(function () { root.classList.remove('ov-theming'); }, 400);
      }
      root.setAttribute('data-theme', theme);
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', meta.getAttribute('data-' + theme) || (theme === 'dark' ? '#000000' : '#ffffff'));
    }
    label();
  }

  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      save(next === system() ? null : next); // the system's own look needs no saved choice
      apply(next, true);
    });
  }

  if (media) {
    var follow = function () { if (!saved()) apply(system(), true); };
    if (media.addEventListener) media.addEventListener('change', follow);
    else if (media.addListener) media.addListener(follow);
  }

  window.addEventListener('storage', function (event) {
    if (event.key !== KEY) return;
    apply(event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : system(), true);
  });

  if (!root.getAttribute('data-theme')) apply(saved() || system(), false);
  label();
})();
