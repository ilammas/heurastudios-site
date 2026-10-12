// Heura waitlist (heurastudios.com): the logic, kept free of Google services so it runs in Apps Script
// (pasted in as the "core" script file) and in Node tests alike. Code.gs wires it to the sheet.

var WAITLIST_HEADER = ['Joined at', 'Email', 'Company', 'Came from'];
var LIMITS = { email: 254, company: 100, from: 200 };
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// One line of plain text: control characters and runs of whitespace become single spaces.
function oneLine_(v) {
  return v == null ? '' : String(v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// Sheets treats a cell that starts with = + - @ as a formula; a leading apostrophe keeps it as text.
function asText_(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// p: the form's fields (email, company, from; website is the hidden field only bots fill).
// deps: rows(), append(row), now(), withLock(fn), busy().
// -> {ok:true} | {ok:true, already:true} | {ok:false, error:'email'|'company'|'busy'}
function handleJoin(p, deps) {
  if (oneLine_(p.website) !== '') return { ok: true };
  var email = oneLine_(p.email).toLowerCase();
  var company = oneLine_(p.company);
  var from = oneLine_(p.from).slice(0, LIMITS.from);
  if (!email || email.length > LIMITS.email || !EMAIL_RE.test(email)) return { ok: false, error: 'email' };
  if (!company || company.length > LIMITS.company) return { ok: false, error: 'company' };
  return deps.withLock(function () {
    var rows = deps.rows();
    for (var i = 0; i < rows.length; i++) {
      if (oneLine_(rows[i][1]).toLowerCase() === email) return { ok: true, already: true };
    }
    if (deps.busy()) return { ok: false, error: 'busy' };
    deps.append([deps.now(), asText_(email), asText_(company), asText_(from)]);
    return { ok: true };
  });
}

if (typeof module !== 'undefined') {
  module.exports = { WAITLIST_HEADER: WAITLIST_HEADER, handleJoin: handleJoin };
}
