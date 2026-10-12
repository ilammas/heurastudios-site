// The home page after the design review: nothing hidden until it scrolls in, no text under 11px, kits that show
// what's in them and don't pretend to be buttons, sections that hold together in dark mode, How it works that
// plays once, one filled call to action per view, an appearance switch that gives the choice back to the system,
// no empty tab stops, no "we", and nothing that moves forever.
const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, launch } = require('./helpers');

let server, browser;
test.before(async () => { server = await startServer(); browser = await launch(); });
test.after(async () => { await browser.close(); await server.close(); });

async function open(path, options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, ...options });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(server.url + path);
  return { page, errors, close: () => ctx.close() };
}

// A computed color: rgb()/rgba() in 0 to 255, or color(srgb …) in 0 to 1 (what color-mix() computes to).
function luminance(css) {
  const scale = /^color\(srgb/.test(css) ? 1 : 255;
  const [r, g, b] = css.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / scale)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

for (const width of [1280, 834, 375]) {
  test(`at ${width}px the hero and the closing band line up on the page's left edge, like every section heading`, async () => {
    const { page, close } = await open('/', { viewport: { width, height: 860 } });
    const lefts = await page.evaluate(() => {
      const left = sel => {
        const el = document.querySelector(sel);
        const range = document.createRange();
        range.selectNodeContents(el);
        return Math.round(range.getClientRects()[0].left); // where the first line of text starts
      };
      return {
        edge: left('#ov-how-title'),
        hero: left('.ov-hero-title'),
        sub: left('.ov-hero-sub'),
        actions: Math.round(document.querySelector('.ov-hero-actions .ov-btn').getBoundingClientRect().left),
        closing: left('#ov-access-title'),
        closingLead: left('.ov-access .ov-lead'),
        closingButton: Math.round(document.querySelector('.ov-access .ov-btn').getBoundingClientRect().left),
      };
    });
    for (const [name, x] of Object.entries(lefts)) assert.ok(Math.abs(x - lefts.edge) <= 4, `${name} starts at ${x}px, the page edge is ${lefts.edge}px`);
    await close();
  });
}

test('everything below the hero shows without scrolling', async () => {
  const { page, errors, close } = await open('/');
  await page.waitForTimeout(400);
  // (the How it works panels for steps that aren't selected are hidden on purpose, like any tab panel)
  const hidden = await page.evaluate(() => [...document.querySelectorAll('main > section')]
    .filter(s => !s.classList.contains('ov-hero'))
    .filter(s => [...s.querySelectorAll('*')].concat(s)
      .filter(el => !el.closest('[role="tabpanel"]:not(.is-active)'))
      .some(el => getComputedStyle(el).opacity === '0' && el.textContent.trim()))
    .map(s => s.id || s.className));
  assert.deepEqual(hidden, []);
  assert.deepEqual(errors, []);
  await close();
});

test('each starter kit names its three documents, and the page says what every kit holds', async () => {
  const { page, close } = await open('/');
  const kits = await page.locator('#kits').innerText();
  for (const doc of ['Refund Policy', 'Shipping FAQ', 'Warranty', 'Time Off Policy', 'Benefits Guide', 'Remote Work Policy',
    'Passwords and MFA', 'VPN Guide', 'Laptop Requests', 'Product Sheet', 'Pricing', 'Objection Handling']) {
    assert.match(kits, new RegExp(doc), doc);
  }
  assert.match(kits, /3 documents, 6 rules, 10 example answers and 8 test questions/);
  await close();
});

test('pointing at a kit changes nothing, because a kit is not a button', async () => {
  const { page, close } = await open('/');
  const kit = page.locator('#kits .ov-kit').first();
  await kit.scrollIntoViewIfNeeded();
  const look = () => kit.evaluate(el => {
    const s = getComputedStyle(el);
    return [s.transform, s.boxShadow, s.borderTopColor, s.backgroundColor].join(' | ');
  });
  const before = await look();
  await kit.hover();
  await page.waitForTimeout(700);
  assert.equal(await look(), before);
  await close();
});

for (const width of [320, 375]) {
  test(`no text is smaller than 11px at ${width}px wide, in any step of How it works`, async () => {
    const { page, close } = await open('/', { viewport: { width, height: 760 } });
    const tooSmall = () => page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('#ov-home *')) {
        const text = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
        if (!text) continue;
        const shown = el.checkVisibility({ visibilityProperty: true, checkVisibilityCSS: true });
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (shown && size < 11) out.push(`${text} (${size}px)`);
      }
      return out;
    });
    const found = await tooSmall();
    for (const name of ['Teach', 'Train', 'Launch']) {
      await page.getByRole('tab', { name }).click();
      await page.waitForTimeout(150);
      found.push(...await tooSmall());
    }
    assert.deepEqual([...new Set(found)], []);
    await close();
  });
}

for (const scheme of ['light', 'dark']) {
  test(`with Increase Contrast on (${scheme}), secondary text and outlines get stronger`, async () => {
    const { page, close } = await open('/', { colorScheme: scheme, contrast: 'more' });
    const [sub, pageColor, edge, caseColor] = await page.evaluate(() => [
      getComputedStyle(document.querySelector('.ov-hero-sub')).color,
      getComputedStyle(document.getElementById('ov-home')).backgroundColor,
      getComputedStyle(document.querySelector('.ov-box')).borderTopColor,
      getComputedStyle(document.querySelector('.ov-case')).backgroundColor,
    ]);
    const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
    assert.ok(ratio(sub, pageColor) >= 10, `secondary text ${sub} on ${pageColor}: ${ratio(sub, pageColor).toFixed(2)}:1`);
    assert.ok(ratio(edge, caseColor) >= 3, `box edge ${edge} on ${caseColor}: ${ratio(edge, caseColor).toFixed(2)}:1`);
    await close();
  });
}

test('with Reduce Transparency on, the header is solid', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
  await page.goto(server.url + '/');
  const [filter, background] = await page.evaluate(() => {
    const s = getComputedStyle(document.querySelector('.ov-top'));
    return [s.backdropFilter, s.backgroundColor];
  });
  assert.equal(filter, 'none');
  assert.match(background, /^rgb\(/, `header background ${background} should be opaque`);
  await ctx.close();
});

test('in dark mode the gray sections stand apart from the page', async () => {
  const { page, close } = await open('/', { colorScheme: 'dark' });
  const [band, pageColor] = await page.evaluate(() => [
    getComputedStyle(document.getElementById('how')).backgroundColor,
    getComputedStyle(document.getElementById('ov-home')).backgroundColor,
  ]);
  const ratio = (luminance(band) + 0.05) / (luminance(pageColor) + 0.05);
  assert.ok(ratio >= 1.12, `band ${band} on ${pageColor} is only ${ratio.toFixed(3)}:1`);
  await close();
});

test('How it works plays through its four steps once, then stops on Launch', async () => {
  const { page, close } = await open('/');
  await page.locator('.ov-stage').scrollIntoViewIfNeeded();
  // finish each step's timer line in turn, the way waiting 5.5 seconds would
  for (let i = 0; i < 5; i++) {
    const finished = await page.waitForFunction(() => {
      const line = document.getAnimations().find(a => a.effect && a.effect.target && a.effect.target.closest('.ov-step-progress'));
      if (!line) return 'none';
      if (line.playState !== 'running') return false;
      line.finish();
      return 'finished';
    }, null, { timeout: 4000 }).then(h => h.jsonValue()).catch(() => 'timeout');
    if (finished !== 'finished') break;
    await page.waitForTimeout(120);
  }
  assert.equal(await page.getByRole('tab', { name: 'Launch', selected: true }).count(), 1);
  assert.equal(await page.getByRole('button', { name: 'Play the steps' }).count(), 1);
  assert.equal(await page.evaluate(() => document.getAnimations().filter(a => a.effect && a.effect.target &&
    a.effect.target.closest('.ov-step-progress') && a.playState === 'running').length), 0);
  await close();
});

test('after it has played through, Play starts How it works over from the first step', async () => {
  const { page, close } = await open('/');
  await page.locator('.ov-stage').scrollIntoViewIfNeeded();
  for (let i = 0; i < 4; i++) {
    await page.waitForFunction(() => {
      const line = document.getAnimations().find(a => a.effect && a.effect.target && a.effect.target.closest('.ov-step-progress'));
      if (!line || line.playState !== 'running') return false;
      line.finish();
      return true;
    }, null, { timeout: 4000 });
    await page.waitForTimeout(120);
  }
  await page.getByRole('button', { name: 'Play the steps' }).click();
  assert.equal(await page.getByRole('tab', { name: 'Pick', selected: true }).count(), 1);
  assert.equal(await page.getByRole('button', { name: 'Pause the steps' }).count(), 1);
  await close();
});

test("the header's Join waitlist stays quiet while the hero's is on screen, and fills once it scrolls away", async () => {
  const { page, close } = await open('/', { colorScheme: 'light' });
  const cta = page.locator('.ov-top a[href="/waitlist/"]');
  await page.waitForTimeout(300);
  assert.equal(await cta.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
  await page.locator('#how').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  assert.equal(await cta.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(0, 0, 0)');
  await close();
});

test('switching back to the system appearance forgets the choice, so the page follows the system again', async () => {
  const { page, close } = await open('/', { colorScheme: 'light' });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem('ov-theme')), 'dark');
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem('ov-theme')), null);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'dark', null, { timeout: 2000 });
  await close();
});

test('Tab from the hero goes straight to How it works, not through the model boxes', async () => {
  const { page, close } = await open('/');
  await page.getByRole('link', { name: 'See how it works' }).focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('role')), 'tab');
  assert.match(await page.evaluate(() => document.activeElement.textContent), /Pick/);
  await close();
});

test('the page never says "we"', async () => {
  const { page, close } = await open('/');
  assert.doesNotMatch(await page.evaluate(() => document.body.innerText), /\bwe\b|\bwe'll\b|\bwe're\b|\bwe’ll\b/i);
  await close();
});

test('nothing on the home page moves forever', async () => {
  const { page, close } = await open('/');
  await page.locator('.ov-stage').scrollIntoViewIfNeeded();
  const forever = [];
  for (const name of ['Pick', 'Teach', 'Train', 'Launch']) {
    await page.getByRole('tab', { name }).click();
    await page.waitForTimeout(1800);
    forever.push(...await page.evaluate(() => document.getAnimations()
      .filter(a => a.effect && a.effect.getComputedTiming().iterations === Infinity && a.playState !== 'finished')
      .map(a => a.animationName || 'unnamed')));
  }
  assert.deepEqual([...new Set(forever)], []);
  await close();
});
