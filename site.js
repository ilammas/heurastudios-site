// Both pages. In order:
// - the Appearance setting in the footer (System, Light, Dark). The inline script in each page's <head> has already
//   set html[data-theme] from the saved choice (localStorage "ov-theme": "light" or "dark") or the system's setting,
//   before anything painted. System saves nothing, so the page follows the system's own setting, as Apple's dark mode
//   guidance asks; Light and Dark stick across pages and visits; a choice made in another tab is picked up too.
// - the header's rule once the page scrolls.
// - motion, only when the head script set html.ov-motion (not with Reduce Motion): things rise into place as they
//   come into view ([data-reveal] gets .is-in, once), and the hero's screen drifts a little as the page scrolls.
// - the hero's scene, with motion in a window at least 560px tall: it opens like the share card, then holds still
//   while the screen comes to the middle and the lead and the buttons come in (see below).
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
      if (scene && hero.contains(drifting[d])) { drifting[d].style.removeProperty('--shift'); continue; }
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

  // ---- the hero's scene. It opens like the share card: the headline on the left, in the middle of the window's height,
  // and the screen on the right, level with the headline's top and running off the window's edge and bottom (in
  // a narrow window: under the headline, peeking in from the right). Then the stage holds still while the runway
  // scrolls by: the headline rises to its place, and the screen comes back to the middle in a straight diagonal line, a
  // little with every bit of scrolling, settling to its laid-out size as it lands. The lead comes in word by word
  // behind it, each line once the screen has moved past it, then the buttons pop in, taking clicks once they mostly
  // show. Scrolling back plays it backwards. Tabbing to a button plays the scene to its end, and a focused button shows
  // wherever the page is scrolled. Turning on Reduce Motion lays the hero out, as do no motion at load,
  // a window under 560px tall, and a browser that can't clip the screen's overflow without unsticking the stage
  // (overflow-x: clip) or move it with translate and scale.

  var hero = document.querySelector('.ov-hero');
  var heroStage = hero ? hero.querySelector('.ov-hero-stage') : null;
  var heroShot = hero ? hero.querySelector('.ov-shot') : null;
  var heroTitle = hero ? hero.querySelector('h1') : null;
  var heroSide = hero ? hero.querySelector('.ov-intro-side') : null;
  var heroLead = hero ? hero.querySelector('.ov-hero-lead') : null;
  var heroButtons = heroSide ? heroSide.querySelectorAll('.ov-btn') : [];
  var heroReady = Boolean(heroStage && heroShot && heroTitle && heroSide && heroLead && hero.querySelector('.ov-hero-runway'));
  var heroWords = [];
  var tall = window.matchMedia ? window.matchMedia('(min-height: 560px)') : null;
  var able = Boolean(window.CSS && CSS.supports && CSS.supports('overflow-x', 'clip') && CSS.supports('translate', '1px'));
  var scene = null; // while it's on: where it starts and how long it runs (in scrolling), the screen's offset and size at its start
  var staged = { width: 0, height: 0 }; // the window it was measured in

  function wanted() { return heroReady && motion && able && (!tall || tall.matches); }

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function smooth(v) { v = clamp(v); return v * v * (3 - 2 * v); }

  // the lead's words, each in its own span, in a copy screen readers skip; they read the sentence whole, from a
  // visually hidden span (a span per word would be a stop per word)
  function splitLead() {
    if (heroWords.length) return;
    var text = heroLead.textContent;
    var said = document.createElement('span');
    said.className = 'ov-sr';
    said.textContent = text;
    var shown = document.createElement('span');
    shown.setAttribute('aria-hidden', 'true');
    var parts = text.split(/(\s+)/);
    for (var w = 0; w < parts.length; w++) {
      if (!parts[w]) continue;
      if (/^\s+$/.test(parts[w])) { shown.appendChild(document.createTextNode(parts[w])); continue; }
      var word = document.createElement('span');
      word.className = 'ov-word';
      word.textContent = parts[w];
      shown.appendChild(word);
      heroWords.push(word);
    }
    heroLead.textContent = '';
    heroLead.appendChild(said);
    heroLead.appendChild(shown);
  }

  // where an element is laid out in the stage, leaving out any transform on it or around it (the reveals move the lead
  // and the buttons until they're in)
  function laidOut(el) {
    var x = 0, y = 0;
    for (var e = el; e && e !== heroStage; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
    return { left: x, bottom: y + el.offsetHeight };
  }

  function unplay() {
    heroTitle.style.translate = '';
    heroShot.style.translate = heroShot.style.scale = '';
    for (var w = 0; w < heroWords.length; w++) heroWords[w].style.opacity = heroWords[w].style.translate = '';
    for (var b = 0; b < heroButtons.length; b++) {
      heroButtons[b].style.opacity = heroButtons[b].style.scale = heroButtons[b].style.pointerEvents = '';
    }
  }

  // measures the laid-out hero and works out where the screen starts; then shows the scene where the page is now
  function stageScene() {
    if (!heroReady) return;
    var on = wanted();
    staged.width = document.documentElement.clientWidth;
    staged.height = document.documentElement.clientHeight;
    unplay();
    hero.classList.toggle('ov-scene', on);
    if (!on) {
      scene = null;
      hero.style.removeProperty('--scene');
      return;
    }
    splitLead();
    var pin = parseFloat(getComputedStyle(heroStage).top) || 0; // the header's height: the stage holds still under it
    var stage = heroStage.getBoundingClientRect();
    var shot = heroShot.getBoundingClientRect();
    var title = heroTitle.getBoundingClientRect();
    var side = heroSide.getBoundingClientRect();
    var high = document.documentElement.clientHeight || window.innerHeight; // not the pinch-zoomed view
    var beside = side.left > title.left + 40; // the lead beside the headline, not under it
    var lift = 0;
    var left, top, size;
    // where things stand in the window when the scene starts (the stage just under the header): y - stage.top + pin
    if (beside) {
      // the headline's middle at 43% of the window under the header, as on the share card
      lift = Math.max(0, Math.min(pin + (high - pin) * 0.43 - title.height / 2 - (title.top - stage.top + pin), high * 0.25));
      left = side.left;
      top = title.top + lift;
      // big enough to run off the bottom of the window
      size = Math.min(Math.max((high - (top - stage.top + pin)) * 1.06 / shot.height, 0.9), 1.3);
    } else {
      left = shot.left + shot.width * 0.42;
      top = side.top;
      size = Math.min(Math.max((high - (top - stage.top + pin)) * 0.95 / shot.height, 1), 1.2);
    }
    // The screen's top edge travels from top down to where it's laid out as the scene runs (0 to 1). The words come in
    // in reading order, each no sooner than that edge has passed below it (with room for its little rise), and the
    // buttons (which pop in place) once the edge has passed them too, so nothing ever shows over the screen. Everything
    // is in before the end.
    var from = top - stage.top;
    var reach = Math.max(shot.top - stage.top - from, 1);
    var rise = parseFloat(getComputedStyle(heroLead).fontSize) * 0.45 + 4;
    var words = [];
    for (var w = 0; w < heroWords.length; w++) {
      var clear = clamp((laidOut(heroWords[w]).bottom + rise - from) / reach);
      words.push(Math.min(Math.max(clear, 0.05 + 0.45 * w / heroWords.length), 0.86));
    }
    var last = 0;
    for (var b = 0; b < heroButtons.length; b++) last = Math.max(last, laidOut(heroButtons[b]).bottom + 4);
    var length = Math.round(high * (beside ? 1.15 : 1));
    hero.style.setProperty('--scene', length + 'px');
    scene = {
      start: hero.getBoundingClientRect().top + (window.scrollY || window.pageYOffset) - pin,
      length: length, lift: lift, dx: left - shot.left, dy: top - shot.top, size: size,
      words: words, buttons: Math.min(clamp((last - from) / reach), 0.9 - 0.04 * (heroButtons.length - 1)),
    };
    playScene();
  }

  function playScene() {
    if (!scene) return;
    var p = clamp(((window.scrollY || window.pageYOffset) - scene.start) / scene.length);
    // how far the screen has come: with the scrolling all the way, a little softer at the very start and end
    var f = 0.5 * p + 0.5 * smooth(p);
    heroTitle.style.translate = scene.lift ? '0 ' + (scene.lift * (1 - smooth(p / 0.3))).toFixed(1) + 'px' : '';
    heroShot.style.translate = (scene.dx * (1 - f)).toFixed(1) + 'px ' + (scene.dy * (1 - f)).toFixed(1) + 'px';
    heroShot.style.scale = (scene.size + (1 - scene.size) * f).toFixed(4);
    for (var w = 0; w < heroWords.length; w++) {
      var lit = clamp((f - scene.words[w]) / 0.1);
      heroWords[w].style.opacity = lit.toFixed(3);
      heroWords[w].style.translate = '0 ' + ((1 - lit) * 0.4).toFixed(3) + 'em';
    }
    for (var b = 0; b < heroButtons.length; b++) {
      var focused = false;
      try { focused = heroButtons[b].matches(':focus-visible'); } catch (e) { focused = false; }
      var pop = focused ? 1 : smooth((f - scene.buttons - 0.04 * b) / 0.1);
      heroButtons[b].style.opacity = pop.toFixed(3);
      heroButtons[b].style.scale = (0.92 + 0.08 * pop).toFixed(4);
      heroButtons[b].style.pointerEvents = pop > 0.5 ? '' : 'none';
    }
  }

  if (heroReady) {
    heroSide.addEventListener('focusin', function (event) {
      if (!scene) return;
      var keyboard = true;
      try { keyboard = event.target.matches(':focus-visible'); } catch (e) { keyboard = true; }
      if (!keyboard) return;
      var end = Math.ceil(scene.start + scene.length);
      if ((window.scrollY || window.pageYOffset) < end) {
        try { window.scrollTo({ top: end, behavior: 'instant' }); } catch (e) { window.scrollTo(0, end); }
      }
      playScene();
    });
    heroSide.addEventListener('focusout', function () { soon(); });
  }

  // Reduce Motion turned on with the page open: everything stops moving and the hero is laid out
  var calm = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function stillness() {
    if (!calm || !calm.matches || !motion) return;
    motion = false;
    root.classList.remove('ov-motion', 'ov-live');
    for (var d = 0; d < drifting.length; d++) drifting[d].style.removeProperty('--shift');
    drifting = [];
    stageScene();
    soon();
  }
  if (calm && calm.addEventListener) calm.addEventListener('change', stillness);
  else if (calm && calm.addListener) calm.addListener(stillness);

  // ---- scrolling

  var header = document.querySelector('.ov-top');
  var waiting = false;
  function update() {
    waiting = false;
    if (header) header.classList.toggle('is-scrolled', (window.scrollY || window.pageYOffset) > 2);
    playScene();
    drift();
    follow();
  }
  function soon() {
    if (waiting) return;
    waiting = true;
    window.requestAnimationFrame(update);
  }
  window.addEventListener('scroll', soon, { passive: true });
  // a new width, a different window, or the scene coming or going re-measures it; a phone's address bar showing or
  // hiding (a little height) doesn't, so the page doesn't shift under a finger
  window.addEventListener('resize', function () {
    var html = document.documentElement;
    if (html.clientWidth !== staged.width || Math.abs(html.clientHeight - staged.height) > 150 || wanted() !== Boolean(scene)) stageScene();
    measure();
    soon();
  });
  window.addEventListener('load', function () { stageScene(); measure(); soon(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { stageScene(); soon(); });
  stageScene();
  measure();
  update();
})();
