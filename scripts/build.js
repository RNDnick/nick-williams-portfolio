#!/usr/bin/env node
/**
 * Zero-dependency static site builder.
 *
 * Reads posts/*.md (front matter + markdown body), renders them through the
 * templates in scripts/templates/, and writes a deployable copy of the whole
 * site into dist/ — the homepage's "Latest posts" grid included.
 *
 * Usage: node scripts/build.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const DIST_DIR = path.join(ROOT, 'dist');

// TODO: update once a custom domain is live — used for canonical URLs,
// Open Graph tags, and the generated sitemap.
const SITE_URL = 'https://your-domain.example';

// ---------------------------------------------------------------------------
// Front matter
// ---------------------------------------------------------------------------
function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const data = {};
  match[1].split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    value = value.replace(/^["']|["']$/g, '');
    data[key] = value;
  });

  return { data, body: match[2] };
}

// ---------------------------------------------------------------------------
// Tiny markdown -> HTML converter (headings, bold/italic, links, lists,
// blockquotes, fenced code, paragraphs). Enough for blog-post prose without
// pulling in a dependency.
// ---------------------------------------------------------------------------
function inline(text) {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function mdToHtml(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let i = 0;
  let listType = null; // 'ul' | 'ol' | null
  let paragraph = [];

  function flushParagraph() {
    if (paragraph.length) {
      html.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  }

  function closeList() {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  }

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (/^```/.test(line)) {
      flushParagraph();
      closeList();
      const code = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      i++;
      continue;
    }

    // Headings
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length + 1; // start body headings at h2
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      flushParagraph();
      closeList();
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      html.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`);
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      if (listType !== 'ul') { closeList(); html.push('<ul>'); listType = 'ul'; }
      html.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`);
      i++;
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      flushParagraph();
      if (listType !== 'ol') { closeList(); html.push('<ol>'); listType = 'ol'; }
      html.push(`<li>${inline(line.replace(/^\d+\.\s+/, ''))}</li>`);
      i++;
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      flushParagraph();
      closeList();
      i++;
      continue;
    }

    // Paragraph text
    paragraph.push(line.trim());
    i++;
  }

  flushParagraph();
  closeList();
  return html.join('\n');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Safe to inline inside a double-quoted JSON string in a <script> tag.
function jsonEscape(str) {
  return JSON.stringify(str).slice(1, -1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function render(template, values) {
  return Object.keys(values).reduce(
    (out, key) => out.split(`{{${key}}}`).join(values[key]),
    template
  );
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// ---------------------------------------------------------------------------
// Load posts
// ---------------------------------------------------------------------------
function loadPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];

  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const slug = file.replace(/\.md$/, '');
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
      const { data, body } = parseFrontMatter(raw);

      return {
        slug,
        title: data.title || slug,
        date: data.date || '1970-01-01',
        dateDisplay: formatDate(data.date || '1970-01-01'),
        category: data.category || 'General',
        excerpt: data.excerpt || '',
        readTime: data.readTime || '5',
        image: data.image || '',
        contentHtml: mdToHtml(body),
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ---------------------------------------------------------------------------
// Card / page rendering
// ---------------------------------------------------------------------------
function cardValues(post, imagePrefix) {
  return {
    SLUG: post.slug,
    TITLE: escapeHtml(post.title),
    CATEGORY: escapeHtml(post.category),
    READ_TIME: escapeHtml(String(post.readTime)),
    EXCERPT: escapeHtml(post.excerpt),
    THUMB_STYLE: post.image ? ` style="background-image:url('${imagePrefix}${post.image}')"` : '',
  };
}

function postCard(post, template) {
  return render(template, cardValues(post, '../'));
}

function homepageCard(post, template) {
  return render(template, cardValues(post, ''));
}

function build() {
  const posts = loadPosts();

  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });

  // Copy the static parts of the site as-is.
  for (const entry of ['css', 'js', 'assets', 'tools']) {
    const src = path.join(ROOT, entry);
    if (fs.existsSync(src)) copyRecursive(src, path.join(DIST_DIR, entry));
  }

  // --- Homepage: inject the 3 latest posts between the marker comments ----
  const homeSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const homeCardTpl = fs.readFileSync(path.join(TEMPLATES_DIR, 'home-post-card.html'), 'utf8');

  const latestCards = posts
    .slice(0, 3)
    .map((p) => homepageCard(p, homeCardTpl))
    .join('\n');

  const latestBlock = posts.length
    ? `<div class="blog-grid">\n${latestCards}\n</div>`
    : `<div class="empty-state">No posts yet — add a Markdown file to <code>posts/</code> and rebuild.</div>`;

  const homeOut = homeSrc.replace(
    /<!-- LATEST_POSTS_START:[\s\S]*?<!-- LATEST_POSTS_END -->/,
    `<!-- LATEST_POSTS_START: regenerated by scripts/build.js from posts/*.md, do not hand-edit -->\n${latestBlock}\n<!-- LATEST_POSTS_END -->`
  );
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), homeOut);

  // --- Blog index -----------------------------------------------------------
  const blogIndexTpl = fs.readFileSync(path.join(TEMPLATES_DIR, 'blog-index.html'), 'utf8');
  const blogCardTpl = fs.readFileSync(path.join(TEMPLATES_DIR, 'blog-post-card.html'), 'utf8');

  const allCards = posts.map((p) => postCard(p, blogCardTpl)).join('\n');
  const blogGrid = posts.length
    ? `<div class="blog-grid blog-index-grid">\n${allCards}\n</div>`
    : `<div class="empty-state">No posts yet — add a Markdown file to <code>posts/</code> and rebuild.</div>`;

  fs.mkdirSync(path.join(DIST_DIR, 'blog'), { recursive: true });
  fs.writeFileSync(
    path.join(DIST_DIR, 'blog', 'index.html'),
    render(blogIndexTpl, { POSTS_GRID: blogGrid, SITE_URL })
  );

  // --- Individual post pages -------------------------------------------------
  const postTpl = fs.readFileSync(path.join(TEMPLATES_DIR, 'post.html'), 'utf8');
  for (const post of posts) {
    const out = render(postTpl, {
      SITE_URL,
      SLUG: post.slug,
      TITLE: escapeHtml(post.title),
      TITLE_JSON: jsonEscape(post.title),
      CATEGORY: escapeHtml(post.category),
      READ_TIME: escapeHtml(String(post.readTime)),
      DATE_DISPLAY: post.dateDisplay,
      DATE_ISO: post.date,
      EXCERPT: escapeHtml(post.excerpt),
      EXCERPT_JSON: jsonEscape(post.excerpt),
      CONTENT: post.contentHtml,
    });
    fs.writeFileSync(path.join(DIST_DIR, 'blog', `${post.slug}.html`), out);
  }

  // --- robots.txt + sitemap.xml ---------------------------------------------
  fs.writeFileSync(
    path.join(DIST_DIR, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`
  );

  const staticUrls = [`${SITE_URL}/`, `${SITE_URL}/blog/`, `${SITE_URL}/tools/tradesman-crm/`];
  const postUrls = posts.map((p) => `${SITE_URL}/blog/${p.slug}.html`);
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...[...staticUrls, ...postUrls].map((url) => `  <url><loc>${url}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemap);

  console.log(`Built ${posts.length} post(s) into dist/`);
}

build();
