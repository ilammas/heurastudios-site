// heurastudios.com: the home page sends everyone to the waitlist, and the waitlist page saves a work email and a
// company to the Apps Script behind the form (stood in for here, so no Google setup is needed).
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

// The form's endpoint, answered by a stand-in. Every request it gets is recorded.
async function standIn(page, answer) {
  const action = await page.getAttribute('#wl-form', 'action');
  const sent = [];
  await page.route(url => url.href === action, async route => {
    sent.push(Object.fromEntries(new URLSearchParams(route.request().postData() || '')));
    if (answer === 'network') return route.abort();
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(answer) });
  });
  return sent;
}

async function fill(page, email, company) {
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Company name').fill(company);
  await page.getByRole('button', { name: 'Join waitlist' }).click();
}

test('every call to action on the home page is Join waitlist and goes to the waitlist page', async () => {
  const { page, errors, close } = await open('/');
  const links = page.getByRole('link', { name: 'Join waitlist' });
  assert.ok(await links.count() >= 3, 'header, hero and the closing band');
  for (const href of await links.evaluateAll(as => as.map(a => a.getAttribute('href')))) assert.equal(href, '/waitlist/');
  const text = await page.evaluate(() => document.body.innerText);
  assert.doesNotMatch(text, /early access|store/i);
  assert.equal(await page.locator('a[href^="mailto:"]').evaluateAll(as => as.filter(a => /waitlist/i.test(a.textContent)).length), 0);
  assert.deepEqual(errors, []);
  await close();
});

test('the home page still shows the lineup, Arche first and available', async () => {
  const { page, close } = await open('/');
  const labels = await page.locator('.ov-lineup .ov-box').evaluateAll(bs => bs.map(b => b.getAttribute('aria-label')));
  assert.deepEqual(labels, ['Heura Arche, available', 'Heura Asteria, coming soon', 'Heura Aniketos, coming soon']);
  await close();
});

test('the waitlist page asks for a work email and a company name, nothing else', async () => {
  const { page, errors, close } = await open('/waitlist/');
  assert.equal(await page.getByRole('heading', { level: 1 }).textContent(), 'Join the waitlist');
  // the fields a person is asked to fill (the bot trap is hidden from people and screen readers)
  const fields = await page.locator('#wl-form input:not([type=hidden])').evaluateAll(is => is.filter(i => !i.closest('[aria-hidden="true"]')).map(i => i.name));
  assert.deepEqual(fields, ['email', 'company']);
  assert.equal(await page.getByLabel('Work email').getAttribute('type'), 'email');
  assert.equal(await page.getByLabel('Work email').getAttribute('autocomplete'), 'email');
  assert.equal(await page.getByLabel('Company name').getAttribute('autocomplete'), 'organization');
  assert.equal(await page.locator('input[type=password]').count(), 0);
  assert.deepEqual(errors, []);
  await close();
});

test('joining sends the email, the company and where they came from, then says they are on the list', async () => {
  const { page, close } = await open('/waitlist/?utm_source=launch');
  const sent = await standIn(page, { ok: true });
  await fill(page, 'ann@acme.co', 'Acme');
  await page.getByRole('heading', { name: "You're on the waitlist" }).waitFor();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].js, '1');
  assert.equal(sent[0].email, 'ann@acme.co');
  assert.equal(sent[0].company, 'Acme');
  assert.equal(sent[0].from, '/waitlist/?utm_source=launch');
  assert.equal(sent[0].website, '');
  assert.match(await page.locator('#wl-done').innerText(), /ann@acme\.co/);
  assert.equal(await page.locator('#wl-form').isVisible(), false);
  await close();
});

test('someone already on the list is told so, kindly', async () => {
  const { page, close } = await open('/waitlist/');
  await standIn(page, { ok: true, already: true });
  await fill(page, 'ann@acme.co', 'Acme');
  await page.getByRole('heading', { name: "You're on the waitlist" }).waitFor();
  assert.match(await page.locator('#wl-done').innerText(), /already/i);
  await close();
});

test('a work email that does not look like one is caught before anything is sent', async () => {
  const { page, close } = await open('/waitlist/');
  const sent = await standIn(page, { ok: true });
  await fill(page, 'ann@acme', 'Acme');
  assert.match(await page.locator('#wl-error').innerText(), /work email/i);
  assert.equal(await page.getByLabel('Work email').getAttribute('aria-invalid'), 'true');
  assert.equal(sent.length, 0);
  await close();
});

test('a missing company name is caught before anything is sent', async () => {
  const { page, close } = await open('/waitlist/');
  const sent = await standIn(page, { ok: true });
  await fill(page, 'ann@acme.co', '   ');
  assert.match(await page.locator('#wl-error').innerText(), /company/i);
  assert.equal(sent.length, 0);
  await close();
});

for (const [what, answer] of [['the server says no', { ok: false, error: 'busy' }], ['the network fails', 'network']]) {
  test(`when ${what}, the form stays and says to try again`, async () => {
    const { page, close } = await open('/waitlist/');
    await standIn(page, answer);
    await fill(page, 'ann@acme.co', 'Acme');
    await page.locator('#wl-error').filter({ hasText: /try again/i }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Join waitlist' }).isEnabled(), true);
    assert.equal(await page.getByLabel('Work email').inputValue(), 'ann@acme.co');
    await close();
  });
}

test('the server refusing the email or the company points at that field', async () => {
  const { page, close } = await open('/waitlist/');
  await standIn(page, { ok: false, error: 'company' });
  await fill(page, 'ann@acme.co', 'Acme');
  await page.locator('#wl-error').filter({ hasText: /company/i }).waitFor();
  assert.equal(await page.getByLabel('Company name').getAttribute('aria-invalid'), 'true');
  await close();
});

test('without JavaScript the form still posts straight to the waitlist script', async () => {
  const { page, close } = await open('/waitlist/', { javaScriptEnabled: false });
  const form = page.locator('#wl-form');
  assert.match(await form.getAttribute('action'), /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/);
  assert.equal((await form.getAttribute('method')).toLowerCase(), 'post');
  assert.equal(await form.isVisible(), true);
  await close();
});

test('a theme chosen on the home page carries over to the waitlist page', async () => {
  const { page, close } = await open('/', { colorScheme: 'light' });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.goto(server.url + '/waitlist/');
  assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark');
  assert.equal(await page.getByRole('button', { name: 'Switch to light mode' }).count(), 1);
  await close();
});

test('nothing scrolls sideways on a phone', async () => {
  for (const path of ['/', '/waitlist/']) {
    const { page, close } = await open(path, { viewport: { width: 375, height: 812 } });
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), 0, path);
    await close();
  }
});
