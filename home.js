// The home page's motion and interaction. All of it is an enhancement: without this file every word still shows,
// the boxes still rise on hover (site.css), the header's button is filled, and How it works is a plain numbered list.
(function () {
  'use strict';
  var home = document.getElementById('ov-home');
  if (!home) return;
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function calm() {
    return !!(reduce && reduce.matches);
  }

  function clamp(value, low, high) {
    return value < low ? low : value > high ? high : value;
  }

  header();
  shelf();
  steps();

  // ---- The sticky header gets a hairline once the page has scrolled, and its Join waitlist fills (.is-past) once
  // the hero's own button has gone under it, so a view never holds two filled buttons that say the same thing.
  function header() {
    var top = home.querySelector('.ov-top');
    if (!top) return;
    if (!('IntersectionObserver' in window)) {
      top.classList.add('is-past');
      var onScroll = function () { top.classList.toggle('is-scrolled', window.scrollY > 2); };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      return;
    }
    var actions = home.querySelector('.ov-hero-actions');
    if (actions) {
      new IntersectionObserver(function (entries) {
        top.classList.toggle('is-past', !entries[0].isIntersecting);
      }, { rootMargin: '-' + Math.round(top.offsetHeight) + 'px 0px 0px 0px' }).observe(actions);
    } else {
      top.classList.add('is-past');
    }
    var mark = document.createElement('div');
    mark.setAttribute('aria-hidden', 'true');
    mark.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:2px;pointer-events:none';
    home.insertBefore(mark, home.firstChild);
    new IntersectionObserver(function (entries) {
      top.classList.toggle('is-scrolled', !entries[0].isIntersecting);
    }).observe(mark);
  }

  // ---- The model boxes. Hovering or a held touch lifts a box off the shelf: it rises, grows a little, turns toward
  // the pointer, a highlight follows the pointer across it, and its shadow on the shelf spreads and fades. Letting
  // go springs it back down, with a small bounce off the shelf. (The boxes aren't controls, so they don't take
  // keyboard focus.)
  function shelf() {
    var lineup = home.querySelector('.ov-lineup');
    if (!lineup) return;
    lineup.classList.add('is-live');
    var RISE = 14; // px
    var GROW = 0.03;
    var TILT = 7; // degrees at the edge
    var items = Array.prototype.map.call(lineup.querySelectorAll('.ov-slot'), make);
    var frameId = 0;
    var last = 0;

    function spring(x) {
      return { x: x, v: 0, to: x };
    }

    function make(slot) {
      var box = slot.querySelector('.ov-box');
      var item = {
        slot: slot, box: box, shadow: slot.querySelector('.ov-contact'),
        lift: spring(0), rx: spring(0), ry: spring(0), mx: 35, my: 22,
        hover: false, press: false,
      };
      box.addEventListener('pointerenter', function (e) {
        if (e.pointerType === 'touch') return;
        item.hover = true;
        aim(item, e);
        set(item);
      });
      box.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch' ? !item.press : !item.hover) return;
        aim(item, e);
        set(item);
      });
      box.addEventListener('pointerleave', function (e) {
        if (e.pointerType === 'touch') return;
        item.hover = false;
        set(item);
      });
      // On a phone there's no hover: the box lifts for as long as the finger is down.
      box.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'touch') return;
        item.press = true;
        aim(item, e);
        set(item);
      });
      var letGo = function (e) {
        if (e.pointerType !== 'touch') return;
        item.press = false;
        set(item);
      };
      box.addEventListener('pointerup', letGo);
      box.addEventListener('pointercancel', letGo); // the touch became a scroll
      return item;
    }

    // Where the pointer is across the box, measured on its slot, which doesn't move.
    function aim(item, e) {
      var r = item.slot.getBoundingClientRect();
      var px = clamp((e.clientX - r.left) / r.width, 0, 1);
      var py = clamp((e.clientY - r.top) / r.height, 0, 1);
      item.ry.to = (px - 0.5) * 2 * TILT;
      item.rx.to = (0.5 - py) * 2 * TILT;
      item.mx = px * 100;
      item.my = py * 100;
    }

    function set(item) {
      var up = item.hover || item.press;
      if (calm()) {
        item.box.classList.toggle('is-up', up); // the shadow and a firmer edge, without moving
        return;
      }
      item.lift.to = up ? 1 : 0;
      if (!up) {
        item.rx.to = 0;
        item.ry.to = 0;
      }
      if (!frameId) {
        last = performance.now();
        frameId = requestAnimationFrame(frame);
      }
    }

    // A damped spring, stepped in small slices so it behaves the same at any frame rate.
    function step(s, stiffness, damping, dt) {
      s.v += (-stiffness * (s.x - s.to) - damping * s.v) * dt;
      s.x += s.v * dt;
    }

    function still(s, eps) {
      return Math.abs(s.x - s.to) < eps && Math.abs(s.v) < eps * 10;
    }

    function frame(now) {
      var dt = clamp((now - last) / 1000, 0, 0.05);
      last = now;
      var slices = Math.max(1, Math.ceil(dt / (1 / 240)));
      var moving = false;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        for (var n = 0; n < slices; n++) {
          step(it.lift, 300, 20.5, dt / slices);
          if (it.lift.x < 0) { // it lands on the shelf and bounces a little
            it.lift.x = 0;
            it.lift.v = -it.lift.v * 0.3;
          }
          step(it.rx, 190, 19, dt / slices);
          step(it.ry, 190, 19, dt / slices);
        }
        var busy = !still(it.lift, 0.0015) || !still(it.rx, 0.02) || !still(it.ry, 0.02);
        if (!busy) {
          it.lift.x = it.lift.to; it.lift.v = 0;
          it.rx.x = it.rx.to; it.rx.v = 0;
          it.ry.x = it.ry.to; it.ry.v = 0;
        }
        draw(it);
        moving = moving || busy;
      }
      frameId = moving ? requestAnimationFrame(frame) : 0;
    }

    function draw(it) {
      var box = it.box;
      var lift = it.lift.x;
      if (it.lift.to === 0 && lift === 0 && it.rx.x === 0 && it.ry.x === 0) {
        box.style.transform = '';
        box.style.removeProperty('--lift');
        it.shadow.style.transform = '';
        it.shadow.style.opacity = '';
        return;
      }
      box.style.transform = 'perspective(900px) translateY(' + (-RISE * lift).toFixed(2) + 'px) scale(' + (1 + GROW * lift).toFixed(4) +
        ') rotateX(' + it.rx.x.toFixed(2) + 'deg) rotateY(' + it.ry.x.toFixed(2) + 'deg)';
      box.style.setProperty('--lift', clamp(lift, 0, 1).toFixed(3));
      box.style.setProperty('--mx', it.mx.toFixed(1) + '%');
      box.style.setProperty('--my', it.my.toFixed(1) + '%');
      it.shadow.style.transform = 'scale(' + (1 + 0.3 * lift).toFixed(3) + ',' + (1 + 1.1 * lift).toFixed(3) + ')';
      it.shadow.style.opacity = clamp(1 - 0.62 * lift, 0, 1).toFixed(3);
    }
  }

  // ---- How it works: the four steps become tabs (arrow keys, Home, End, click, or hover) that drive the preview
  // beside them. The first time the preview comes into view it plays through the four steps once, shown by a thin
  // line filling along the selected step, and rests on the last. The line holds while the pointer rests on the
  // steps; it stops for good when someone clicks a step, uses the keyboard on the steps or the preview, or presses
  // pause. Play starts it over from the first step.
  function steps() {
    var how = document.getElementById('how');
    if (!how) return;
    var list = how.querySelector('.ov-steps');
    var stage = how.querySelector('.ov-stage');
    var button = how.querySelector('.ov-play');
    var tabs = Array.prototype.slice.call(list.querySelectorAll('.ov-step'));
    var scenes = Array.prototype.slice.call(how.querySelectorAll('.ov-scene'));
    if (!tabs.length || tabs.length !== scenes.length) return;
    var current = 0;
    var playing = !calm();
    var inView = false;
    var seen = false;
    var pointing = false;
    var timers = [];
    var counter = 0;
    var hoverTimer = 0;
    var STEP = 5500; // ms on each step while playing
    var line = null;

    list.setAttribute('role', 'tablist');
    list.setAttribute('aria-orientation', 'vertical');
    list.setAttribute('aria-labelledby', 'ov-how-title');
    tabs.forEach(function (tab, i) {
      var title = tab.querySelector('.ov-step-title');
      var text = tab.querySelector('.ov-step-text');
      tab.id = title.id + '-tab';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-labelledby', title.id);
      if (text && text.id) tab.setAttribute('aria-describedby', text.id);
      tab.setAttribute('aria-controls', scenes[i].id);
      tab.setAttribute('aria-selected', String(i === current));
      tab.tabIndex = i === current ? 0 : -1;
      scenes[i].setAttribute('role', 'tabpanel');
      scenes[i].setAttribute('aria-labelledby', title.id);
      scenes[i].tabIndex = 0;
      scenes[i].classList.toggle('is-active', i === current);

      tab.addEventListener('click', function () {
        stop();
        if (i === current) replay();
        else select(i);
      });
    });

    list.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      var to;
      switch (e.key) {
        case 'ArrowDown': case 'ArrowRight': to = i + 1; break;
        case 'ArrowUp': case 'ArrowLeft': to = i - 1; break;
        case 'Home': to = 0; break;
        case 'End': to = tabs.length - 1; break;
        case 'Enter': case ' ': to = i; break;
        default: return;
      }
      e.preventDefault();
      stop();
      select(to, true);
    });

    // Moving the mouse onto a step selects it (after a short pause, so sweeping across doesn't flicker), and while
    // the pointer rests on the steps the line holds, so the preview doesn't move on while someone reads. Only a
    // pointer that really moved counts: when the page scrolls under a still pointer, browsers report it entering
    // whatever slides beneath it, and that mustn't change the step.
    var lastX = -1;
    var lastY = -1;
    var aimed = -1;
    // Where the pointer last was, anywhere on the page. This listener runs after the list's own (the event
    // bubbles up to it), so the list compares each move with the one before.
    document.addEventListener('pointermove', function (e) {
      lastX = e.clientX;
      lastY = e.clientY;
    }, { passive: true });
    list.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || (e.clientX === lastX && e.clientY === lastY)) return;
      if (!pointing) {
        pointing = true;
        update();
      }
      var i = tabs.indexOf(e.target.closest ? e.target.closest('.ov-step') : null);
      if (i < 0 || i === aimed) return;
      aimed = i;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () { select(i); }, 90);
    });
    list.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse') return;
      clearTimeout(hoverTimer);
      aimed = -1;
      pointing = false;
      update();
    });

    // Keyboard focus arriving on a step or the preview stops it for good, so the selection never moves out from
    // under someone. Focusing the pause button doesn't: that's how they'd pause or play it.
    list.addEventListener('focusin', stop);
    stage.addEventListener('focusin', function (e) {
      if (e.target !== button) stop();
    });

    if (button) {
      button.hidden = calm();
      button.addEventListener('click', function () {
        playing = !playing;
        if (playing && current === tabs.length - 1) select(0); // it had played through: from the top
        update();
      });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        var e = entries[0];
        inView = e.isIntersecting && e.intersectionRatio >= 0.55;
        if (inView && !seen) {
          seen = true;
          replay(); // play the first drawing when it comes into view, not while it's off screen
        }
        update();
      }, { threshold: [0, 0.55, 1] }).observe(stage);
    }
    document.addEventListener('visibilitychange', update);
    update();

    // While playing, the thin line on the selected step fills over STEP ms (a Web Animation this code pauses and
    // plays itself), and when it's full the next step comes up. Stopped, the selected step's line just shows full.
    function update() {
      var held = !inView || pointing || document.hidden;
      if (!playing) {
        if (line) line.cancel();
        line = null;
      } else {
        if (!line) {
          line = tabs[current].querySelector('.ov-step-progress span').animate(
            [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: STEP, easing: 'linear', fill: 'both' });
          line.onfinish = function () {
            if (!playing) return;
            if (current === tabs.length - 1) stop(); // once through, then it rests on the last step
            else select(current + 1);
          };
        }
        if (held) line.pause();
        else line.play();
      }
      if (button) {
        button.setAttribute('data-state', playing ? 'playing' : 'stopped');
        button.setAttribute('aria-label', playing ? 'Pause the steps' : 'Play the steps');
      }
    }

    function stop() {
      if (!playing) return;
      playing = false;
      update();
    }

    function select(i, focus) {
      i = (i + tabs.length) % tabs.length;
      if (i !== current) {
        tabs[current].setAttribute('aria-selected', 'false');
        tabs[current].tabIndex = -1;
        scenes[current].classList.remove('is-active');
        current = i;
        tabs[i].setAttribute('aria-selected', 'true');
        tabs[i].tabIndex = 0;
        scenes[i].classList.add('is-active');
        perform(i);
        if (line) line.cancel(); // the line starts over on the new step
        line = null;
        update();
      }
      if (focus) tabs[i].focus();
    }

    // Plays the current drawing again from its first frame.
    function replay() {
      var scene = scenes[current];
      if (scene.getAnimations) {
        scene.getAnimations({ subtree: true }).forEach(function (a) {
          if (!a.animationName) return; // only the drawing's own animations, not the fade between drawings
          a.cancel();
          a.play();
        });
      }
      perform(current);
    }

    // The numbers in the drawings count along with them.
    function perform(i) {
      timers.forEach(clearTimeout);
      timers = [];
      cancelAnimationFrame(counter);
      var lessons = scenes[i].querySelector('[data-count="lessons"]');
      var readiness = scenes[i].querySelector('[data-count="readiness"]');
      if (calm()) {
        if (lessons) lessons.textContent = '3 lessons';
        if (readiness) readiness.textContent = '94';
        return;
      }
      if (lessons) {
        lessons.textContent = 'No lessons yet';
        [[800, '1 lesson'], [1400, '2 lessons'], [1850, '3 lessons']].forEach(function (s) {
          timers.push(setTimeout(function () { lessons.textContent = s[1]; }, s[0]));
        });
      }
      if (readiness) {
        readiness.textContent = '0';
        var start = performance.now() + 300;
        var tick = function (now) {
          var t = clamp((now - start) / 1800, 0, 1);
          readiness.textContent = String(Math.round(94 * (1 - Math.pow(1 - t, 4))));
          if (t < 1) counter = requestAnimationFrame(tick);
        };
        counter = requestAnimationFrame(tick);
      }
    }
  }
})();
