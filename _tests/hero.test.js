// The hero (Ryan, Oct 14, 2026: "i kinda liked the design where the screenshot was on the right side of the screen,
// like have it there and as i scroll down, it comes to the middle and the Heura studios turns the documents, rules
// answers... join waitlist and see how it works will fade in and come to life", then, of the share card: "this one").
// It opens like the share card: the headline on the left and the Overview screen in its panel on the right, running off
// the window's edge, with no lead and no buttons yet, the headline in the middle of the window's height as on the card.
// While the page scrolls, the hero holds still under the header: the headline rises to its place, and the screen comes
// back to the middle under it in a straight diagonal line, a little with every bit of scrolling (Ryan: "as i scroll
// down, it slowly comes back to the middle and make it diagonal"), the lead coming in word by word behind it where it
// was, then the two buttons. Then the page scrolls on. With Reduce Motion, without JavaScript, or in a short window, the hero is simply laid out.
const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, launch } = require('./helpers');

let server, browser;
test.before(async () => { server = await startServer(); browser = await launch(); });
test.after(async () => { await browser.close(); await server.close(); });

async function open(path, options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(server.url + path);
  return { page, errors, close: () => ctx.close() };
}

const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

async function scrollToY(page, y) {
  await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), y);
  await frames(page);
}

// where the hero's parts are on screen, and how much of the lead and the buttons shows
function state(page) {
  return page.evaluate(() => {
    const box = el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }; };
    const opacity = el => Number(getComputedStyle(el).opacity);
    const hero = document.querySelector('.ov-hero');
    const lead = hero.querySelector('.ov-hero-lead');
    const shown = el => { let o = 1; for (let e = el; e && e !== hero; e = e.parentElement) o *= opacity(e); return o; };
    const words = [...lead.querySelectorAll('.ov-word')];
    return {
      scene: hero.classList.contains('ov-scene'),
      shot: box(hero.querySelector('.ov-shot')), title: box(hero.querySelector('h1')), side: box(hero.querySelector('.ov-intro-side')),
      stage: box(hero.querySelector('.ov-hero-stage')), under: document.querySelector('.ov-top').getBoundingClientRect().bottom, pad: parseFloat(getComputedStyle(hero.querySelector('.ov-hero-stage')).paddingTop),
      words: words.map(shown), lead: shown(lead), text: (lead.querySelector('.ov-sr') || lead).textContent,
      buttons: [...hero.querySelectorAll('.ov-actions .ov-btn')].map(shown),
      runway: hero.querySelector('.ov-hero-runway').getBoundingClientRect().height,
      spill: document.documentElement.scrollWidth - window.innerWidth, vw: window.innerWidth, vh: window.innerHeight,
    };
  });
}

// the hero in detail: each word of the lead and each button with how much of it shows, the headline's lines, and the
// screen's picture inside its panel
function detail(page) {
  return page.evaluate(() => {
    const box = el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
    const hero = document.querySelector('.ov-hero');
    const shown = el => { let o = 1; for (let e = el; e && e !== hero; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; };
    return {
      panel: box(hero.querySelector('.ov-shot')), picture: box(hero.querySelector('.ov-shot-img')),
      lines: (() => {
        const out = [], walk = document.createTreeWalker(hero.querySelector('h1'), NodeFilter.SHOW_TEXT), range = document.createRange();
        while (walk.nextNode()) {
          range.selectNodeContents(walk.currentNode);
          out.push(...[...range.getClientRects()].map(r => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom })));
        }
        return out.filter(r => r.right - r.left > 2);
      })(),
      bits: [...hero.querySelectorAll('.ov-word, .ov-actions .ov-btn')].map(el => ({ text: el.textContent, shown: shown(el), ...box(el) })),
    };
  });
}
const overlaps = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;

// what a click at the middle of the hero's Join waitlist would land on
function clickLands(page) {
  return page.evaluate(() => {
    const b = document.querySelector('.ov-hero .ov-btn-primary').getBoundingClientRect();
    const el = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return el && el.closest('.ov-hero .ov-btn-primary') ? 'the button' : 'something else';
  });
}

const LEAD = 'Heura Studios turns the documents, rules and answers you already have into an assistant for your customers or your team. Teach it, test it, then put it on your website.';

for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }]) {
  test(`at ${viewport.width}x${viewport.height} the hero opens like the share card: the screen on the right, running off the edge; no lead or buttons yet`, async () => {
    const { page, errors, close } = await open('/', { viewport });
    await page.waitForTimeout(1600);
    const s = await state(page);
    assert.ok(s.scene, 'the scene is on');
    assert.ok(s.shot.left >= s.title.right && s.shot.left >= s.side.left - 2, `right of the headline, where the lead goes: ${JSON.stringify(s)}`);
    assert.ok(Math.abs(s.shot.top - s.title.top) <= 2, `beside the headline, level with its top: ${JSON.stringify(s.shot)} ${JSON.stringify(s.title)}`);
    const middle = s.under + (s.vh - s.under) * 0.43;
    assert.ok(Math.abs((s.title.top + s.title.bottom) / 2 - middle) <= s.vh * 0.04, `the headline in the middle of the window's height: ${JSON.stringify(s.title)}`);
    assert.ok(s.shot.right > s.vw + 20 && s.shot.bottom > s.vh, `running off the right edge and the bottom: ${JSON.stringify(s.shot)}`);
    assert.equal(s.spill, 0, 'nothing scrolls sideways');
    assert.equal(s.text, LEAD, 'the lead says the same');
    assert.ok(s.words.length >= 25 && s.words.every(o => o < 0.05), `no lead yet: ${s.words}`);
    assert.ok(s.buttons.length === 2 && s.buttons.every(o => o < 0.05), `no buttons yet: ${s.buttons}`);
    assert.equal(await clickLands(page), 'something else', 'a button that isn’t showing takes no clicks');
    assert.deepEqual(errors, []);
    await close();
  });
}

test('scrolling plays it: the hero holds still while the screen comes to the middle, the lead and the buttons come in, then the page scrolls on', async () => {
  const { page, errors, close } = await open('/');
  await page.waitForTimeout(1600);
  const start = await state(page);
  assert.ok(start.runway >= 300, `a stretch of scrolling for it: ${start.runway}`);
  await scrollToY(page, Math.round(start.runway * 0.5));
  const mid = await state(page);
  assert.ok(start.stage.top === start.under && mid.stage.top === start.under, `the hero holds still under the header: ${start.stage.top}, ${mid.stage.top}`);
  assert.ok(mid.shot.left < start.shot.left - 40, `the screen is on its way: ${mid.shot.left} after ${start.shot.left}`);
  await scrollToY(page, start.runway);
  const end = await state(page);
  assert.equal(end.stage.top, start.under, 'still holding');
  assert.ok(Math.abs(end.title.top - end.stage.top - end.pad) <= 1, `the headline has risen to its place: ${end.title.top}`);
  assert.ok(Math.abs(end.shot.left - end.title.left) <= 1, `on the headline's left edge: ${end.shot.left} vs ${end.title.left}`);
  assert.ok(Math.abs((end.shot.left + end.shot.right) / 2 - end.vw / 2) <= 2, `in the middle: ${JSON.stringify(end.shot)}`);
  assert.ok(end.shot.top > end.title.bottom, 'under the headline');
  assert.ok(end.words.every(o => o === 1) && end.buttons.every(o => o === 1), `the lead and the buttons are in: ${end.words} ${end.buttons}`);
  assert.equal(await clickLands(page), 'the button');
  await scrollToY(page, start.runway + 200);
  const after = await state(page);
  assert.ok(Math.abs(after.stage.top - (start.under - 200)) <= 1, `then it scrolls on: ${after.stage.top}`);
  await scrollToY(page, 0);
  const back = await state(page);
  assert.ok(Math.abs(back.shot.left - start.shot.left) <= 1 && back.buttons.every(o => o < 0.05), 'scrolling back up plays it backwards');
  assert.deepEqual(errors, []);
  await close();
});

for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 667 }]) {
  test(`on a ${viewport.width}x${viewport.height} phone the screen peeks in from the right under the headline, then comes to the middle`, async () => {
    const { page, errors, close } = await open('/', { viewport });
    await page.waitForTimeout(1600);
    const start = await state(page);
    assert.ok(start.scene, 'the scene is on');
    assert.ok(start.shot.top >= start.title.bottom - 1, 'under the headline');
    assert.ok(start.shot.left > start.vw * 0.3 && start.shot.right > start.vw + 20, `peeking in from the right: ${JSON.stringify(start.shot)}`);
    assert.equal(start.spill, 0, 'nothing scrolls sideways');
    assert.ok(start.words.every(o => o < 0.05) && start.buttons.every(o => o < 0.05), 'no lead or buttons yet');
    await scrollToY(page, start.runway);
    const end = await state(page);
    assert.ok(start.stage.top === start.under && end.stage.top === start.under && Math.abs(end.title.top - start.title.top) <= 1, 'the hero held still under the header');
    assert.ok(Math.abs((end.shot.left + end.shot.right) / 2 - end.vw / 2) <= 2, `in the middle: ${JSON.stringify(end.shot)}`);
    assert.ok(end.shot.top > end.side.bottom, 'under the lead and the buttons');
    assert.ok(end.words.every(o => o === 1) && end.buttons.every(o => o === 1), 'the lead and the buttons are in');
    assert.deepEqual(errors, []);
    await close();
  });
}

test('tabbing to Join waitlist before it has come in plays the hero to its end, so the button shows', async () => {
  const { page, errors, close } = await open('/');
  await page.waitForTimeout(1600);
  await page.focus('.ov-top .ov-btn');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.matches('.ov-hero .ov-btn-primary')), true, 'the hero’s Join waitlist has focus');
  await page.waitForTimeout(100);
  await frames(page);
  const s = await state(page);
  assert.ok(s.buttons.every(o => o === 1), `the buttons show: ${s.buttons}`);
  const b = await page.locator('.ov-hero .ov-btn-primary').boundingBox();
  assert.ok(b.y >= 64 && b.y + b.height <= s.vh, `and the focused one is on screen: ${JSON.stringify(b)}`);
  assert.ok(await page.evaluate(() => window.scrollY) >= s.runway - 1, 'the page scrolled to the end of the scene');
  // back to the header: the scene follows the scrolling again, nothing stays stuck
  await page.keyboard.press('Shift+Tab');
  await scrollToY(page, 0);
  await page.waitForTimeout(100);
  const top = await state(page);
  assert.ok(top.buttons.every(o => o < 0.05), `with focus gone, scrolling back hides the buttons again: ${top.buttons}`);
  assert.ok(top.shot.left > top.title.right, 'and the screen is back on the right');
  assert.deepEqual(errors, []);
  await close();
});

test('a focused button stays on screen while the page scrolls back up', async () => {
  const { page, errors, close } = await open('/');
  await page.waitForTimeout(1600);
  await page.focus('.ov-top .ov-btn');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(100);
  await scrollToY(page, 0);
  await page.waitForTimeout(100);
  const s = await state(page);
  assert.equal(s.buttons[0], 1, 'the focused Join waitlist shows');
  assert.ok(s.words.every(o => o < 0.05), 'the rest follows the scrolling');
  assert.deepEqual(errors, []);
  await close();
});

test('a button takes clicks once it mostly shows, and not before', async () => {
  const { page, errors, close } = await open('/', { viewport: { width: 1366, height: 768 } });
  await page.waitForTimeout(1600);
  const { runway } = await state(page);
  let checkedShowing = false, checkedHidden = false;
  for (let i = 50; i <= 100; i++) {
    await scrollToY(page, Math.round(runway * i / 100));
    const shown = (await state(page)).buttons[0];
    if (shown >= 0.5 && shown < 0.98) { assert.equal(await clickLands(page), 'the button', `at ${i}%, ${shown} showing`); checkedShowing = true; }
    if (shown < 0.3) { assert.equal(await clickLands(page), 'something else', `at ${i}%, ${shown} showing`); checkedHidden = true; }
  }
  assert.ok(checkedShowing && checkedHidden, 'both cases came up');
  assert.deepEqual(errors, []);
  await close();
});

test('a screen reader reads the lead as one sentence, not word by word', async () => {
  const { page, close } = await open('/');
  await page.waitForTimeout(1600);
  assert.equal((await state(page)).scene, true);
  assert.equal(await page.locator('.ov-hero-lead').ariaSnapshot(), `- paragraph: ${LEAD}`);
  // in the browser's own accessibility tree, the paragraph holds the sentence as one piece of text: no node per word
  const cdp = await page.context().newCDPSession(page);
  const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.ov-hero-lead' });
  const { node } = await cdp.send('DOM.describeNode', { nodeId });
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const byId = new Map(nodes.map(n => [n.nodeId, n]));
  const para = nodes.find(n => n.backendDOMNodeId === node.backendNodeId);
  function collect(n) {
    const out = [];
    for (const id of n.childIds || []) {
      const c = byId.get(id);
      if (!c) continue;
      if (!c.ignored) out.push(`${c.role && c.role.value}:${c.name ? c.name.value : ''}`);
      out.push(...collect(c));
    }
    return out;
  }
  assert.ok(para, 'the paragraph is there');
  const texts = collect(para).filter(x => x.startsWith('StaticText:'));
  assert.deepEqual(texts, [`StaticText:${LEAD}`], 'the sentence in one piece, with no node per word');
  await close();
});

test('printing shows the hero laid out', async () => {
  const { page, close } = await open('/');
  await page.waitForTimeout(1600);
  await page.emulateMedia({ media: 'print' });
  await frames(page);
  const s = await state(page);
  const moved = await page.evaluate(() => ['h1', '.ov-shot'].map(q => getComputedStyle(document.querySelector('.ov-hero ' + q)).translate));
  assert.deepEqual(moved, ['none', 'none'], 'the headline and the screen where they are laid out');
  assert.ok(s.words.every(o => o === 1) && s.buttons.every(o => o === 1), 'the lead and the buttons show');
  await close();
});

test('turning on Reduce Motion with the page open lays the hero out', async () => {
  const { page, errors, close } = await open('/');
  await page.waitForTimeout(1600);
  await scrollToY(page, 120);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(200);
  const s = await state(page);
  assert.equal(s.scene, false);
  assert.equal(s.runway, 0);
  assert.ok(s.words.every(o => o === 1) && s.buttons.every(o => o === 1) && s.lead === 1, 'everything shows');
  assert.deepEqual(errors, []);
  await close();
});

for (const [what, options, wait] of [
  ['Reduce Motion', { reducedMotion: 'reduce' }, 300],
  ['no JavaScript', { javaScriptEnabled: false }, 300],
  ['a short window', { viewport: { width: 1280, height: 520 } }, 1600],
]) {
  test(`with ${what} the hero is simply laid out: the screen under the headline, the lead and the buttons showing`, async () => {
    const { page, errors, close } = await open('/', options);
    await page.waitForTimeout(wait);
    const s = await state(page);
    assert.equal(s.scene, false);
    assert.equal(s.runway, 0, 'no extra scrolling');
    assert.ok(Math.abs(s.shot.left - s.title.left) <= 1 && s.shot.top > s.title.bottom, `the screen under the headline: ${JSON.stringify(s.shot)}`);
    assert.equal(s.lead, 1);
    assert.ok(s.words.every(o => o === 1) && s.buttons.every(o => o === 1), 'the lead and the buttons show');
    assert.equal(s.text, LEAD);
    assert.deepEqual(errors, []);
    await close();
  });
}

test('turning a desktop window into a phone-sized one partway through re-measures the scene, and it still lands right', async () => {
  const { page, errors, close } = await open('/');
  await page.waitForTimeout(1600);
  const first = await state(page);
  await scrollToY(page, Math.round(first.runway * 0.4));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  const phone = await state(page);
  assert.ok(phone.scene && phone.runway !== first.runway, `re-measured for the phone: ${phone.runway}`);
  const y = await page.evaluate(() => window.scrollY);
  const fresh = await open('/', { viewport: { width: 390, height: 844 } });
  await fresh.page.waitForTimeout(1600);
  await scrollToY(fresh.page, y);
  const same = await state(fresh.page);
  await fresh.close();
  for (const k of ['left', 'top', 'width']) assert.ok(Math.abs(phone.shot[k] - same.shot[k]) <= 1, `the screen's ${k} matches a fresh load: ${phone.shot[k]} vs ${same.shot[k]}`);
  assert.deepEqual(phone.words.map(o => o.toFixed(2)), same.words.map(o => o.toFixed(2)), 'and so does the lead');
  await scrollToY(page, phone.runway);
  const end = await state(page);
  assert.ok(Math.abs((end.shot.left + end.shot.right) / 2 - end.vw / 2) <= 2, `in the middle: ${JSON.stringify(end.shot)}`);
  assert.ok(end.words.every(o => o === 1) && end.buttons.every(o => o === 1));
  assert.equal(end.spill, 0);
  assert.deepEqual(errors, []);
  await close();
});

test('a window that loses a little height while scrolling (a phone’s address bar) keeps the scene as it was', async () => {
  const { page, errors, close } = await open('/', { viewport: { width: 390, height: 844 } });
  await page.waitForTimeout(1600);
  const first = await state(page);
  await scrollToY(page, Math.round(first.runway * 0.5));
  const before = await state(page);
  await page.setViewportSize({ width: 390, height: 764 });
  await page.waitForTimeout(200);
  const after = await state(page);
  assert.equal(after.runway, first.runway, 'the same stretch of scrolling');
  assert.ok(Math.abs(after.shot.left - before.shot.left) <= 1 && Math.abs(after.shot.top - before.shot.top) <= 1, 'the screen stays where it was');
  assert.deepEqual(errors, []);
  await close();
});

test('a browser without overflow clip gets the laid-out hero', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    const supports = CSS.supports.bind(CSS);
    CSS.supports = (...args) => (/overflow/.test(args.join(' ')) && /clip/.test(args.join(' ')) ? false : supports(...args));
  });
  const page = await ctx.newPage();
  await page.goto(server.url + '/');
  await page.waitForTimeout(1600);
  const s = await state(page);
  assert.equal(s.scene, false);
  assert.equal(s.runway, 0);
  assert.ok(s.words.every(o => o === 1) && s.buttons.every(o => o === 1) && s.lead === 1);
  assert.equal(s.spill, 0);
  await ctx.close();
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 390, height: 844 }]) {
  test(`at ${viewport.width}x${viewport.height} the screen comes back to the middle in a straight diagonal line, a little with every bit of scrolling, and nothing shows under it`, async () => {
    const { page, errors, close } = await open('/', { viewport });
    await page.waitForTimeout(1600);
    const first = await state(page);
    await scrollToY(page, first.runway);
    const last = await state(page);
    await scrollToY(page, 0);
    let before = 0;
    for (let i = 1; i <= 9; i++) {
      await scrollToY(page, Math.round(first.runway * i / 10));
      const now = await state(page);
      const across = (first.shot.left - now.shot.left) / (first.shot.left - last.shot.left);
      const down = (now.shot.top - first.shot.top) / (last.shot.top - first.shot.top);
      assert.ok(Math.abs(across - down) <= 0.02, `a straight line at ${i * 10}%: ${across.toFixed(3)} across, ${down.toFixed(3)} down`);
      assert.ok(across - before >= 0.04 && across - before <= 0.2, `a little with every bit of scrolling at ${i * 10}%: ${before.toFixed(3)} to ${across.toFixed(3)}`);
      before = across;
      const d = await detail(page);
      for (const bit of d.bits) {
        if (bit.shown > 0.05) assert.ok(!overlaps(bit, d.panel), `"${bit.text}" shows under the screen at ${i * 10}%`);
      }
      for (const line of d.lines) assert.ok(!overlaps(line, d.picture), `the headline runs over the screen's picture at ${i * 10}%`);
    }
    assert.deepEqual(errors, []);
    await close();
  });
}
