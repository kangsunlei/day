export type Feed = {
  id: string;
  title: string;
  url: string;
  last_fetch_at?: string | null;
  error?: string | null;
};

export type Article = {
  id: string;
  feed_id: string;
  title: string;
  link: string;
  content: string;
  summary: string | null;
  published_at: string | null;
  fetched_at: string;
};

export type UserPreference = {
  article_id: string;
  is_interested: boolean;
  feedback_at: string;
};

export type SyncState = {
  source: string;
  last_sync_at: string;
  etag?: string | null;
};
