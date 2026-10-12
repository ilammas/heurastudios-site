# heurastudios.com

The Heura Studio waitlist site: the home page (every call to action is "Join waitlist") and `/waitlist/`, which
saves a work email and a company name to the "Heura waitlist" Google Sheet in Ryan's ostravanne.com Drive.

- `index.html`, `site.css`, `site.js`: the home page. `site.css` and `site.js` are shared by both pages: the
  header, the Appearance setting in the footer, things rising into place as they scroll in (not with Reduce
  Motion), the How it works tour (a stage that stays in view and shows each step's screen) and the sample chat
  whose bubble opens and closes it.
- `img/`: real Heura Studio screens, made with a sample AI for a made-up shop ("Fernbrook Supply Co."), one per
  appearance (`-light.webp`, `-dark.webp`). `studio-chat-card.webp` is the chat window alone on a transparent
  background (the same in both appearances); the site draws the bubble under it.
- `waitlist/`: the form. Its `action` is the Apps Script web app.
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
