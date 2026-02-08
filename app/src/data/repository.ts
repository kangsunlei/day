import { getAll, getByKey, put, putMany } from "./db";
import type { Article, Feed, SyncState, UserPreference } from "./types";

export async function upsertFeeds(feeds: Feed[]): Promise<void> {
  await putMany("feeds", feeds);
}

export async function upsertArticles(articles: Article[]): Promise<void> {
  await putMany("articles", articles);
}

export async function listFeeds(): Promise<Feed[]> {
  return getAll<Feed>("feeds");
}

export async function listArticles(): Promise<Article[]> {
  const articles = await getAll<Article>("articles");
  return articles.sort((a, b) => {
    const at = a.published_at || a.fetched_at;
    const bt = b.published_at || b.fetched_at;
    return bt.localeCompare(at);
  });
}

export async function recordPreference(articleId: string, isInterested: boolean): Promise<void> {
  const pref: UserPreference = {
    article_id: articleId,
    is_interested: isInterested,
    feedback_at: new Date().toISOString()
  };
  await put("preferences", pref);
}

export async function getPreferences(): Promise<UserPreference[]> {
  return getAll<UserPreference>("preferences");
}

export async function getRecommendation(): Promise<Article | null> {
  const [articles, prefs] = await Promise.all([listArticles(), getPreferences()]);
  const seen = new Set(prefs.map((p) => p.article_id));
  const unread = articles.filter((a) => !seen.has(a.id));
  if (unread.length === 0) return null;
  const index = Math.floor(Math.random() * unread.length);
  return unread[index];
}

export async function getSyncState(source: string): Promise<SyncState | undefined> {
  return getByKey<SyncState>("sync_state", source);
}

export async function setSyncState(state: SyncState): Promise<void> {
  await put("sync_state", state);
}
