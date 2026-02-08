import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import Parser from "rss-parser";

const ROOT = new URL("..", import.meta.url);
const FEEDS_PATH = path.resolve(ROOT.pathname, "feeds.json");
const OUTPUT_DIR = path.resolve(ROOT.pathname, "output");
const MAX_ITEMS_PER_FEED = Number(process.env.MAX_ITEMS_PER_FEED || 50);

const parser = new Parser({
  timeout: 15000
});

function sha1(input) {
  return crypto.createHash("sha1").update(input).digest("hex");
}

function toIso(dateLike) {
  if (!dateLike) return null;
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function normalizeText(text) {
  if (!text) return "";
  return String(text).trim();
}

async function loadFeeds() {
  const raw = await fs.readFile(FEEDS_PATH, "utf-8");
  const list = JSON.parse(raw);
  if (!Array.isArray(list)) {
    throw new Error("feeds.json must be an array");
  }
  return list.map((feed, index) => ({
    id: feed.id || sha1(feed.url || `feed-${index}`),
    title: feed.title || feed.url || `feed-${index}`,
    url: feed.url
  }));
}

async function fetchFeed(feed) {
  if (!feed.url) return { feed, items: [], error: "missing url" };
  try {
    const parsed = await parser.parseURL(feed.url);
    const items = (parsed.items || []).slice(0, MAX_ITEMS_PER_FEED);
    return { feed, parsed, items, error: null };
  } catch (err) {
    return { feed, items: [], error: err?.message || "unknown" };
  }
}

function mapItem(feed, item) {
  const link = item.link || item.guid || "";
  const id = sha1(`${feed.id}:${link}:${item.title || ""}`);
  return {
    id,
    feed_id: feed.id,
    title: normalizeText(item.title) || "(untitled)",
    link: link,
    content: normalizeText(item.content || item["content:encoded"] || item.summary),
    summary: null,
    published_at: toIso(item.isoDate || item.pubDate),
    fetched_at: new Date().toISOString()
  };
}

function uniqueByLink(articles) {
  const seen = new Set();
  const out = [];
  for (const article of articles) {
    const key = article.link || article.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(article);
  }
  return out;
}

async function writeOutput(payload) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const articlesPath = path.join(OUTPUT_DIR, "articles.json");
  const feedsPath = path.join(OUTPUT_DIR, "feeds.json");
  const indexPath = path.join(OUTPUT_DIR, "index.html");

  await fs.writeFile(articlesPath, JSON.stringify(payload.articles, null, 2));
  await fs.writeFile(feedsPath, JSON.stringify(payload.feeds, null, 2));

  const indexHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>RSS Collector Output</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; margin: 32px; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 6px; }
  </style>
</head>
<body>
  <h1>RSS Collector Output</h1>
  <p>Updated: ${new Date().toISOString()}</p>
  <ul>
    <li><a href="./articles.json">articles.json</a></li>
    <li><a href="./feeds.json">feeds.json</a></li>
  </ul>
  <p>Counts: <code>${payload.articles.length}</code> articles</p>
</body>
</html>`;

  await fs.writeFile(indexPath, indexHtml);
}

async function main() {
  const feeds = await loadFeeds();
  const results = await Promise.all(feeds.map(fetchFeed));

  const feedMeta = results.map((r) => ({
    id: r.feed.id,
    title: r.feed.title,
    url: r.feed.url,
    last_fetch_at: new Date().toISOString(),
    error: r.error
  }));

  const articles = uniqueByLink(
    results.flatMap((r) => r.items.map((item) => mapItem(r.feed, item)))
  );

  await writeOutput({
    feeds: feedMeta,
    articles
  });

  console.log(`feeds: ${feeds.length}, articles: ${articles.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
