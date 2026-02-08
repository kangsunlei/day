import { setSyncState, upsertArticles, upsertFeeds } from "../data/repository";
import type { Article, Feed } from "../data/types";

function joinBase(baseUrl: string, file: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${file}`;
}

async function fetchJson<T>(url: string): Promise<{ data: T; etag: string | null }> {
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) {
    throw new Error(`Fetch failed: ${resp.status} ${resp.statusText}`);
  }
  const etag = resp.headers.get("etag");
  const data = (await resp.json()) as T;
  return { data, etag };
}

function ensureArray<T>(data: unknown, label: string): T[] {
  if (!Array.isArray(data)) {
    throw new Error(`${label} should be an array`);
  }
  return data as T[];
}

export async function importFromBaseUrl(baseUrl: string): Promise<{
  feeds: number;
  articles: number;
}> {
  const feedsUrl = joinBase(baseUrl, "feeds.json");
  const articlesUrl = joinBase(baseUrl, "articles.json");

  const [{ data: feeds }, { data: articles, etag }] = await Promise.all([
    fetchJson<Feed[]>(feedsUrl),
    fetchJson<Article[]>(articlesUrl)
  ]);

  const feedList = ensureArray<Feed>(feeds, "feeds.json");
  const articleList = ensureArray<Article>(articles, "articles.json");

  await Promise.all([upsertFeeds(feedList), upsertArticles(articleList)]);

  await setSyncState({
    source: baseUrl,
    last_sync_at: new Date().toISOString(),
    etag
  });

  return { feeds: feedList.length, articles: articleList.length };
}
