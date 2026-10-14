// The waitlist form. It checks the two fields, posts them to the Apps Script in the form's action with js=1 (so
// the script answers JSON) and shows the result in place. Without this script the form posts straight to the
// script, which answers with a plain page.
(function () {
  'use strict';
  var form = document.getElementById('wl-form');
  if (!form || !window.fetch || !window.URLSearchParams || !window.FormData) return;

  var email = form.elements.email;
  var company = form.elements.company;
  var from = form.elements.from;
  var error = document.getElementById('wl-error');
  var submit = form.querySelector('.wl-submit');
  var done = document.getElementById('wl-done');
  var doneText = document.getElementById('wl-done-text');
  var label = submit.textContent;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var busy = false;

  // Where this person came from, for the sheet: this page's query (utm tags), else the page on this site that
  // sent them here, else the other website that did.
  function whereFrom() {
    if (location.search) return location.pathname + location.search;
    try {
      var ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.host === location.host) return ref.pathname + ref.search;
      if (ref) return 'from ' + ref.hostname;
    } catch (e) {
      // an unreadable referrer: fall through
    }
    return location.pathname;
  }
  from.value = whereFrom();

  function say(message, field) {
    error.textContent = message;
    [email, company].forEach(function (f) {
      if (f === field) f.setAttribute('aria-invalid', 'true');
      else f.removeAttribute('aria-invalid');
    });
    if (field) field.focus();
  }

  function ready() {
    busy = false;
    submit.disabled = false;
    submit.textContent = label;
  }

  function joined(address, already) {
    form.hidden = true;
    doneText.textContent = already
      ? 'You were already on it. An email will go to ' + address + ' when the Heura Studios beta opens.'
      : 'An email will go to ' + address + ' when the Heura Studios beta opens.';
    done.hidden = false;
    done.focus();
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (busy) return;
    var address = email.value.trim();
    var name = company.value.trim();
    if (address.length > 254 || !EMAIL_RE.test(address)) return say('Enter your work email, like you@company.com.', email);
    if (!name) return say("Enter your company’s name.", company);
    if (name.length > 100) return say("Your company’s name can be up to 100 characters.", company);
    say('', null);

    busy = true;
    submit.disabled = true;
    submit.textContent = 'Joining…';
    var body = new URLSearchParams(new FormData(form));
    body.set('email', address);
    body.set('company', name);
    body.set('js', '1');

    fetch(form.action, { method: 'POST', body: body })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (result) {
        if (result && result.ok) return joined(address, result.already);
        ready();
        if (result && result.error === 'email') return say("That email address doesn’t look right. Check it and try again.", email);
        if (result && result.error === 'company') return say("Check your company’s name and try again.", company);
        say("That didn’t go through. Try again in a minute.", null);
      })
      .catch(function () {
        ready();
        say("That didn’t go through. Check your connection and try again.", null);
      });
  });
})();
