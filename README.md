# heurastudios.com

The Heura Studio waitlist site: the home page (every call to action is "Join waitlist") and `/waitlist/`, which
saves a work email and a company name to the "Heura waitlist" Google Sheet in Ryan's ostravanne.com Drive.

- `index.html`, `site.css`, `home.js`, `theme.js`: the home page (the same look as ostravanne.com)
- `waitlist/`: the form, in the same layout as Heura Studio's sign-up page. Its `action` is the Apps Script web app.
- `_backend/`: the Apps Script behind the form (`core.js` is the logic, `Code.gs` the Google side). In the Apps
  Script project they're pasted into one file.
- `CNAME`: GitHub Pages serves this repo at heurastudios.com. Pages doesn't publish `_` folders.

## Tests

- Backend: `cd _backend && node --test`
- Pages (headless Chromium through Playwright): `NODE_PATH=$(npm root -g) node --test _tests/*.test.js`.
  The tests stand in for the Apps Script, so they need no Google setup.

## The sheet

Columns: Joined at, Email, Company, Came from. One row per email (joining again doesn't add a row). "Came from"
is the page's query (utm tags), the page on this site that sent them, or the other website that did.
