const test = require('node:test');
const assert = require('node:assert/strict');
const { handleJoin, WAITLIST_HEADER } = require('../core.js');

// A stand-in for the sheet: rows below the header, in the header's column order.
function fakeDeps(rows = [], opts = {}) {
  const appended = [];
  return {
    appended,
    deps: {
      rows: () => rows.concat(appended),
      append: row => appended.push(row),
      now: () => new Date('2026-10-12T07:00:00Z'),
      withLock: fn => fn(),
      busy: () => !!opts.busy,
    },
  };
}

test('the sheet has the columns the founders read', () => {
  assert.deepEqual(WAITLIST_HEADER, ['Joined at', 'Email', 'Company', 'Came from']);
});

test('a new person is added with the time, their email in lowercase, the company and where they came from', () => {
  const { deps, appended } = fakeDeps();
  const r = handleJoin({ email: '  Ann@Acme.CO ', company: ' Acme Inc ', from: '/waitlist/?utm_source=x' }, deps);
  assert.deepEqual(r, { ok: true });
  assert.equal(appended.length, 1);
  assert.deepEqual(appended[0], [new Date('2026-10-12T07:00:00Z'), 'ann@acme.co', 'Acme Inc', '/waitlist/?utm_source=x']);
});

test('joining twice with the same email (any case) keeps one row and still says ok', () => {
  const { deps, appended } = fakeDeps([[new Date(), 'ann@acme.co', 'Acme', '/']]);
  assert.deepEqual(handleJoin({ email: 'ANN@acme.co', company: 'Acme' }, deps), { ok: true, already: true });
  assert.equal(appended.length, 0);
});

test('an email that does not look like one is refused', () => {
  const { deps, appended } = fakeDeps();
  for (const email of ['', 'ann', 'ann@acme', 'a b@acme.co', 'x'.repeat(250) + '@a.co']) {
    assert.deepEqual(handleJoin({ email, company: 'Acme' }, deps), { ok: false, error: 'email' }, email);
  }
  assert.equal(appended.length, 0);
});

test('the company is required and at most 100 characters', () => {
  const { deps, appended } = fakeDeps();
  assert.deepEqual(handleJoin({ email: 'a@b.co', company: '   ' }, deps), { ok: false, error: 'company' });
  assert.deepEqual(handleJoin({ email: 'a@b.co', company: 'x'.repeat(101) }, deps), { ok: false, error: 'company' });
  assert.deepEqual(handleJoin({ email: 'a@b.co', company: 'x'.repeat(100) }, deps), { ok: true });
  assert.equal(appended.length, 1);
});

test('a bot that fills the hidden field is told ok but nothing is saved', () => {
  const { deps, appended } = fakeDeps();
  assert.deepEqual(handleJoin({ email: 'bot@spam.co', company: 'Spam', website: 'http://spam' }, deps), { ok: true });
  assert.equal(appended.length, 0);
});

test('text that Sheets would run as a formula is stored as plain text', () => {
  const { deps, appended } = fakeDeps();
  handleJoin({ email: 'a@b.co', company: '=HYPERLINK("http://x","y")', from: '+1' }, deps);
  assert.equal(appended[0][2], '\'=HYPERLINK("http://x","y")');
  assert.equal(appended[0][3], "'+1");
});

test('line breaks and control characters are flattened, and where they came from is capped', () => {
  const { deps, appended } = fakeDeps();
  handleJoin({ email: 'a@b.co', company: 'Acme\n\tInc\u0000', from: '/' + 'p'.repeat(400) }, deps);
  assert.equal(appended[0][2], 'Acme Inc');
  assert.equal(appended[0][3].length, 200);
});

test('when a flood of joins arrives, new ones are turned away for the minute', () => {
  const { deps, appended } = fakeDeps([], { busy: true });
  assert.deepEqual(handleJoin({ email: 'a@b.co', company: 'Acme' }, deps), { ok: false, error: 'busy' });
  assert.equal(appended.length, 0);
});

test('the duplicate check and the write happen under the lock', () => {
  const { deps } = fakeDeps();
  let inside = false;
  const seen = [];
  deps.withLock = fn => { inside = true; try { return fn(); } finally { inside = false; } };
  const rows = deps.rows;
  deps.rows = () => { seen.push(['rows', inside]); return rows(); };
  const append = deps.append;
  deps.append = row => { seen.push(['append', inside]); append(row); };
  handleJoin({ email: 'a@b.co', company: 'Acme' }, deps);
  assert.deepEqual(seen, [['rows', true], ['append', true]]);
});
