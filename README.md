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
- The blog (`/blog/`): GitHub Pages builds the repo with Jekyll, and only the blog uses it. Posts are Markdown in
  `_posts/`; the list is `blog/index.html`; both use `_layouts/` (`base.html`: the header and footer; `post.html`).
  Its look is `blog.css`. Report PDFs are in `reports/`, a post's pictures in `img/blog/`. `_config.yml` keeps
  `docs/` and this README off the site. Every other page has no front matter, so Jekyll copies it as it is.

## Writing a blog post

1. On GitHub, open the repo's `_posts` folder, then **Add file → Create new file**.
2. Name it with the date and a short name in lowercase with dashes: `2026-10-20-what-we-learned.md`. The post's
   address is the short name: heurastudios.com/blog/what-we-learned/.
3. Start the file with these lines (the report line only if there's a PDF), then write the post in Markdown below
   them: `## Heading`, paragraphs, `- lists`, `**bold**`, `[a link](https://…)`, tables and images.

   ```
   ---
   title: "What we learned from Arche 0.22"
   description: "One or two sentences: the blog list, search results and link previews show it."
   author: Ryan
   report: /reports/heura-eval-005.pdf
   ---
   ```

4. **Commit changes.** The site updates in about a minute.
5. A report: open the `reports` folder, **Add file → Upload files**, and name the PDF like the post's report line.
   A picture for a post: upload it to `img/blog/` and use `![What the picture shows](/img/blog/name.png)`.

If a post's top lines are broken (a missing `---`, or a title with a colon not in quotes), GitHub emails the error and
the site keeps its last good version. Fix the file and commit again.

## Tests

- Backend: `cd _backend && node --test`
- Pages (headless Chromium through Playwright): `NODE_PATH=$(npm root -g) node --test _tests/*.test.js`.
  The tests stand in for the Apps Script, so they need no Google setup. The blog's tests build the site with
  Jekyll 3.10, the version GitHub Pages runs (`gem install jekyll -v 3.10.0 kramdown-parser-gfm`).

## The sheet

Columns: Joined at, Email, Company, Came from. One row per email (joining again doesn't add a row). "Came from"
is the page's query (utm tags), the page on this site that sent them, or the other website that did.
