# Nick Williams — portfolio & blog

Static portfolio/blog site: free tools built from an IT Ops career and life
as an LGV driver, plus a build-log blog. Plain HTML/CSS/JS, no framework,
no database. The only "build step" is a zero-dependency Node script that
turns Markdown posts into blog pages — and GitHub Actions runs it for you
on every push, so day-to-day you never need to run it yourself.

## Structure

```
index.html              Homepage — edit directly, changes go live on push
css/style.css            All styling (design tokens at the top as CSS variables)
js/main.js               Mobile nav toggle + footer year
assets/                  Icons, images, CV — see the README in each folder
posts/*.md               Blog posts (front matter + Markdown)
scripts/build.js         Builds posts/*.md + index.html into dist/
scripts/templates/       HTML templates used by build.js
dist/                    Build output (git-ignored, generated on every deploy)
.github/workflows/       GitHub Actions: builds and deploys to GitHub Pages
```

## Adding a blog post

Add one Markdown file to `posts/`, commit, and push. That's the whole
workflow — GitHub Actions rebuilds the site (including the homepage's
"Latest posts" grid) and redeploys automatically.

Create `posts/my-new-post.md`:

```markdown
---
title: My new post
date: 2026-04-01
category: Build log
readTime: 4
excerpt: One sentence that shows up on the cards.
---

Body text goes here, in Markdown. Headings (`##`, `###`), **bold**,
*italic*, `code`, links, lists, blockquotes and fenced code blocks are
all supported.
```

The filename (minus `.md`) becomes the post's URL slug, so
`posts/my-new-post.md` publishes at `/blog/my-new-post.html`. Posts are
sorted newest-first by the `date` field, and the homepage always shows
the latest 3.

An optional `image:` front-matter field (a path like
`assets/images/blog/cover.jpg`) sets a cover image; without one, posts
use a plain placeholder block.

## Editing the homepage / tool cards

`index.html` and `css/style.css` are edited directly — there's no build
step involved and no need to run anything locally. The one exception is
the block between `<!-- LATEST_POSTS_START -->` and
`<!-- LATEST_POSTS_END -->`, which the build script regenerates on every
deploy; don't hand-edit the contents of that block, as it'll be
overwritten.

Tool cards currently link to `#` — replace each `href="#"` with the
tool's real URL as it goes live.

## Local preview

No build step is required to preview the homepage — just open
`index.html` in a browser. To preview the generated blog pages too,
you'll need [Node.js](https://nodejs.org) installed locally:

```bash
node scripts/build.js
```

Then open `dist/index.html`. If Node isn't installed locally, that's
fine — pushing to GitHub builds it for you regardless.

## Things to personalise before launch

- [ ] Site domain used for SEO tags — `https://your-domain.example`,
      set in `index.html` (canonical/OG/JSON-LD) and as `SITE_URL` at the
      top of `scripts/build.js` (used by the blog templates, `robots.txt`
      and `sitemap.xml`)
- [ ] `mailto:hello@example.com` — two occurrences in `index.html`, plus
      one in each blog template (`scripts/templates/*.html`)
- [ ] Footer / nav social links (LinkedIn, X, GitHub, Email) — currently `#`
- [ ] `assets/cv/nick-williams-cv.pdf` — see `assets/cv/README.md`
- [ ] `assets/images/profile.jpg` — see `assets/images/README.md`
- [ ] Tool card links in `index.html` — currently `#`, one per tool

## SEO

Each page ships a descriptive `<title>`/meta description, Open Graph and
Twitter Card tags, and a canonical URL. The homepage carries `Person`
JSON-LD; each post carries `BlogPosting` JSON-LD. `scripts/build.js`
generates `robots.txt` and `sitemap.xml` (including every post) into
`dist/` on each build, so a newly-published post is included automatically
— nothing to maintain by hand beyond keeping `SITE_URL` current.

## Deployment

**GitHub Pages (live now):** the included workflow
(`.github/workflows/deploy.yml`) builds the site with
`node scripts/build.js` and deploys `dist/` to GitHub Pages on every push
to `main`, using GitHub's native Pages-via-Actions flow (no committed
build output, no extra branch).

**Netlify / Vercel (ready if you switch later):** `netlify.toml` and
`vercel.json` are both included and point at the same build command
(`node scripts/build.js`) and output directory (`dist`) — connecting
either platform to this repo needs no extra configuration.

**Custom domain:** once you have one, either add it in your host's
dashboard (Netlify/Vercel), or for GitHub Pages add a `CNAME` file
containing the domain to the repo root and point its DNS at GitHub Pages.
