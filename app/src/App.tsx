import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { importFromBaseUrl } from "./services/importer";
import { getRecommendation, listArticles, recordPreference } from "./data/repository";
import type { Article } from "./data/types";

const DEFAULT_URL_KEY = "rss_base_url";

function App() {
  const [baseUrl, setBaseUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ feeds: number; articles: number } | null>(null);
  const [recommendation, setRecommendation] = useState<Article | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(DEFAULT_URL_KEY);
    if (saved) setBaseUrl(saved);
  }, []);

  useEffect(() => {
    if (!baseUrl) return;
    localStorage.setItem(DEFAULT_URL_KEY, baseUrl);
  }, [baseUrl]);

  async function refreshArticles() {
    const all = await listArticles();
    setArticles(all);
    const rec = await getRecommendation();
    setRecommendation(rec);
  }

  async function handleImport() {
    if (!baseUrl) return;
    setStatus("Importing...");
    try {
      const result = await importFromBaseUrl(baseUrl);
      setCounts(result);
      await refreshArticles();
      setStatus("Import done");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Import failed");
    }
  }

  async function handleFeedback(isInterested: boolean) {
    if (!recommendation) return;
    await recordPreference(recommendation.id, isInterested);
    await refreshArticles();
  }

  const latestArticles = useMemo(() => articles.slice(0, 10), [articles]);

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>RSS Reader (MVP-A)</h1>
          <p className="sub">Local-first, import from GitHub Pages</p>
        </div>
      </header>

      <section className="panel">
        <label className="label">Data source (GitHub Pages base URL)</label>
        <div className="row">
          <input
            className="input"
            value={baseUrl}
            placeholder="https://<user>.github.io/<repo>"
            onChange={(e) => setBaseUrl(e.target.value)}
          />
          <button className="button" onClick={handleImport}>
            Import
          </button>
        </div>
        <div className="meta">
          {status && <span>Status: {status}</span>}
          {counts && (
            <span>
              Imported {counts.articles} articles from {counts.feeds} feeds
            </span>
          )}
        </div>
      </section>

      <section className="panel">
        <h2>Today Recommendation</h2>
        {recommendation ? (
          <div className="card">
            <a href={recommendation.link} target="_blank" rel="noreferrer">
              {recommendation.title}
            </a>
            <p className="small">{recommendation.published_at || recommendation.fetched_at}</p>
            <div className="row">
              <button className="button ghost" onClick={() => handleFeedback(true)}>
                Interested
              </button>
              <button className="button ghost" onClick={() => handleFeedback(false)}>
                Not Interested
              </button>
            </div>
          </div>
        ) : (
          <p className="muted">No recommendation yet. Import data first.</p>
        )}
      </section>

      <section className="panel">
        <h2>Latest Articles</h2>
        {latestArticles.length === 0 && <p className="muted">No articles yet.</p>}
        <ul className="list">
          {latestArticles.map((article) => (
            <li key={article.id}>
              <a href={article.link} target="_blank" rel="noreferrer">
                {article.title}
              </a>
              <span className="small">{article.published_at || article.fetched_at}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default App;
