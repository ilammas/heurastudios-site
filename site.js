// Both pages. In order:
// - the Appearance setting in the footer (System, Light, Dark). The inline script in each page's <head> has already
//   set html[data-theme] from the saved choice (localStorage "ov-theme": "light" or "dark") or the system's setting,
//   before anything painted. System saves nothing, so the page follows the system's own setting, as Apple's dark mode
//   guidance asks; Light and Dark stick across pages and visits; a choice made in another tab is picked up too.
// - the header's rule once the page scrolls.
// - motion, only when the head script set html.ov-motion (not with Reduce Motion): things rise into place as they
//   come into view ([data-reveal] gets .is-in, once), and the hero's screen drifts a little as the page scrolls.
// - How it works: the step level with the stage (the middle of the window; just under the stage on narrow screens,
//   where it sits above the steps) shows its screen, and each step's rule fills in as it's passed. This follows scrolling
//   with or without motion; Reduce Motion only drops the transitions.
// - the sample chat: its bubble opens and closes the window. It pops open when the tour reaches Launch, or after
//   the page loads ([data-chat-open="load"]), until someone uses the bubble.
(function () {
  'use strict';
  var root = document.documentElement;
  var KEY = 'ov-theme';
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var radios = document.querySelectorAll('input[name="ov-appearance"]');
  var motion = root.classList.contains('ov-motion');
  var timer = 0;

  // ---- appearance

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
      // private mode or blocked storage: the choice still holds on this page
    }
  }

  function system() {
    return media && media.matches ? 'dark' : 'light';
  }

  // fade: cross-fade the colors (about 250ms). Never on the first paint.
  function apply(theme, fade) {
    if (root.getAttribute('data-theme') === theme) return;
    if (fade) {
      root.classList.add('ov-theming');
      clearTimeout(timer);
      timer = setTimeout(function () { root.classList.remove('ov-theming'); }, 400);
    }
    root.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', meta.getAttribute('data-' + theme) || (theme === 'dark' ? '#000000' : '#ffffff'));
  }

  function mark(choice) {
    for (var i = 0; i < radios.length; i++) radios[i].checked = radios[i].value === choice;
  }

  for (var i = 0; i < radios.length; i++) {
    radios[i].addEventListener('change', function (event) {
      var choice = event.target.value;
      if (choice === 'light' || choice === 'dark') {
        save(choice);
        apply(choice, true);
      } else {
        save(null);
        apply(system(), true);
      }
    });
  }

  if (media) {
    var followSystem = function () { if (!saved()) apply(system(), true); };
    if (media.addEventListener) media.addEventListener('change', followSystem);
    else if (media.addListener) media.addListener(followSystem);
  }

  window.addEventListener('storage', function (event) {
    if (event.key !== KEY && event.key !== null) return;
    mark(saved() || 'system');
    apply(saved() || system(), true);
  });

  if (!root.getAttribute('data-theme')) apply(saved() || system(), false);
  mark(saved() || 'system');

  // ---- the sample chat

  function chat(el) {
    var card = el.querySelector('.ov-chat-card');
    var bubble = el.querySelector('.ov-chat-bubble');
    if (!card || !bubble) return null;
    var touched = false;
    var wait = 0;
    function set(open) {
      el.classList.toggle('is-open', open);
      bubble.setAttribute('aria-expanded', open ? 'true' : 'false');
      bubble.setAttribute('aria-label', open ? 'Close the sample chat' : 'Open the sample chat');
    }
    set(false);
    bubble.hidden = false;
    bubble.addEventListener('click', function () {
      touched = true;
      clearTimeout(wait);
      set(!el.classList.contains('is-open'));
    });
    return {
      pop: function (delay) {
        if (touched) return;
        clearTimeout(wait);
        wait = setTimeout(function () { set(true); }, delay);
      },
      rest: function () {
        if (touched) return;
        clearTimeout(wait);
        set(false);
      }
    };
  }

  var onLoad = document.querySelectorAll('.ov-chat[data-chat-open="load"]');
  for (var c = 0; c < onLoad.length; c++) {
    var loaded = chat(onLoad[c]);
    if (loaded) loaded.pop(motion ? 700 : 0);
  }

  // ---- motion

  if (motion) {
    root.classList.add('ov-live');
    var seen = new IntersectionObserver(function (entries) {
      for (var e = 0; e < entries.length; e++) {
        if (!entries[e].isIntersecting) continue;
        entries[e].target.classList.add('is-in');
        seen.unobserve(entries[e].target);
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    var reveals = document.querySelectorAll('[data-reveal]');
    for (var r = 0; r < reveals.length; r++) seen.observe(reveals[r]);
  }
  var drifting = motion ? document.querySelectorAll('[data-parallax]') : [];

  function drift() {
    var height = window.innerHeight;
    for (var d = 0; d < drifting.length; d++) {
      var box = drifting[d].parentNode.getBoundingClientRect();
      if (box.bottom < 0 || box.top > height) continue;
      var passed = (height - box.top) / (height + box.height); // 0 as it enters at the bottom, 1 as it leaves at the top
      drifting[d].style.setProperty('--shift', ((0.5 - passed) * 40).toFixed(1) + 'px');
    }
  }

  // ---- How it works

  var tour = document.querySelector('.ov-tour');
  var steps = tour ? tour.querySelectorAll('.ov-tour-step') : [];
  var shots = tour ? tour.querySelectorAll('.ov-tour-shot') : [];
  var stage = tour ? tour.querySelector('.ov-tour-stage') : null;
  var tourChat = tour && tour.querySelector('.ov-chat') ? chat(tour.querySelector('.ov-chat')) : null;
  var narrow = window.matchMedia ? window.matchMedia('(max-width: 899px)') : null;
  var current = -1;

  function show(index) {
    if (index === current) return;
    current = index;
    var name = steps[index].getAttribute('data-step');
    for (var s = 0; s < steps.length; s++) {
      if (s === index) steps[s].setAttribute('aria-current', 'step');
      else steps[s].removeAttribute('aria-current');
    }
    for (var t = 0; t < shots.length; t++) shots[t].classList.toggle('is-active', shots[t].getAttribute('data-step') === name);
    if (tourChat) {
      if (name === 'launch') tourChat.pop(motion ? 380 : 0);
      else tourChat.rest();
    }
  }

  function follow() {
    if (!steps.length) return;
    // the step being read: level with the middle of the stage beside it, or just under the stage above it
    var line = narrow && narrow.matches && stage ? stage.getBoundingClientRect().bottom + 28 : window.innerHeight * 0.5;
    var at = 0;
    for (var s = 0; s < steps.length; s++) {
      var box = steps[s].getBoundingClientRect();
      var fill = box.bottom <= line ? 1 : box.top >= line ? 0 : (line - box.top) / box.height;
      var text = steps[s].querySelector('.ov-tour-text');
      if (text) text.style.setProperty('--fill', fill.toFixed(3));
      if (box.top <= line) at = s;
    }
    show(at);
  }

  function measure() {
    if (stage) tour.style.setProperty('--stage-h', stage.offsetHeight + 'px');
  }

  // ---- scrolling

  var header = document.querySelector('.ov-top');
  var waiting = false;
  function update() {
    waiting = false;
    if (header) header.classList.toggle('is-scrolled', (window.scrollY || window.pageYOffset) > 2);
    drift();
    follow();
  }
  function soon() {
    if (waiting) return;
    waiting = true;
    window.requestAnimationFrame(update);
  }
  window.addEventListener('scroll', soon, { passive: true });
  window.addEventListener('resize', function () { measure(); soon(); });
  window.addEventListener('load', function () { measure(); soon(); });
  measure();
  update();
})();
