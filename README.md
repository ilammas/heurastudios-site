# heurastudios.com

The Heura Studios waitlist site: the home page (every call to action is "Join waitlist") and `/waitlist/`, which
saves a work email and a company name to the "Heura waitlist" Google Sheet in Ryan's ostravanne.com Drive.

- `index.html`, `site.css`, `site.js`: the home page. `site.css` and `site.js` are shared by both pages: the
  header, the Appearance setting in the footer, things rising into place as they scroll in (not with Reduce
  Motion), the How it works tour (a stage that stays in view and shows each step's screen) and the sample chat
  whose bubble opens and closes it.
- `img/`: real Heura Studios screens (retaken Oct 13, 2026 in the Studio's console look, from a throwaway Studio in
  public mode with the stand-in model, so nothing the model says is shown), made with a sample AI for a made-up shop ("Fernbrook Supply Co."), one per
  appearance (`-light.webp`, `-dark.webp`). `studio-chat-card.webp` is the chat window alone on a transparent
  background (the same in both appearances); the site draws the bubble under it.
- `waitlist/`: the form. Its `action` is the Apps Script web app.
- `privacy/`, `terms/` and `legal.css`: the Privacy Policy and the Terms of Service (Leo's text of Oct 13, 2026,
  the same words as the Heura Studios app's /privacy and /terms; the training switch reads opt-in), linked from
  every page's footer and from the waitlist form. Their placeholders ([insert date before publishing], the
  contact emails, the provider list...) still need filling: they went live with them on Oct 13, 2026.
- `_backend/`: the Apps Script behind the form (`core.js` is the logic, `Code.gs` the Google side). In the Apps
  Script project they're pasted into one file.
- `favicon.ico`, `favicon.svg`, `favicon-32.png`, `icon-512.png`, `apple-touch-icon.png`: the logo mark (an ink
  square with Heura orange through its middle third, as in the header) for tabs, bookmarks, search results and
  home screens; the SVG turns light in dark mode like the header's. `og-image.png`: the 1200x630 card a shared
  link shows (the logo, the headline and the Overview screen). Every page names the site Heura Studios for link
  previews (`og:site_name`), and the home page for search results (WebSite data).
- `CNAME`: GitHub Pages serves this repo at heurastudios.com. Pages doesn't publish `_` folders.

## Tests

- Backend: `cd _backend && node --test`
- Pages (headless Chromium through Playwright): `NODE_PATH=$(npm root -g) node --test _tests/*.test.js`.
  The tests stand in for the Apps Script, so they need no Google setup.

## The sheet

Columns: Joined at, Email, Company, Came from. One row per email (joining again doesn't add a row). "Came from"
is the page's query (utm tags), the page on this site that sent them, or the other website that did.
