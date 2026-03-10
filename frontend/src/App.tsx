import { useState, useRef, useEffect } from "react";
import SqlDisplay from "./components/SqlDisplay";
import ResultsTable from "./components/ResultsTable";
import ResultsChart from "./components/ResultsChart";
import "./App.css";

export interface QueryResult {
  sql: string;
  rows: Record<string, unknown>[];
  metadata: {
    column_names: string[];
    column_types: string[];
    row_count: number;
  };
  execution_time_ms: number;
}

interface HistoryEntry {
  question: string;
  timestamp: number;
  sql?: string;
}

type Page = "landing" | "results" | "history" | "about";

const EXAMPLES = [
  "Top 10 tokens by DEX volume today",
  "ETH price over the last 7 days",
];

const HISTORY_KEY = "dune-search-history";
const MAX_HISTORY = 20;

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(history: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

export default function App() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"table" | "chart">("table");
  const [page, setPage] = useState<Page>("landing");
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  function addToHistory(q: string, sql?: string) {
    setHistory((prev) => {
      const existing = prev.find((h) => h.question === q);
      const filtered = prev.filter((h) => h.question !== q);
      return [{ question: q, timestamp: Date.now(), sql: sql || existing?.sql }, ...filtered];
    });
  }

  function removeFromHistory(q: string) {
    setHistory((prev) => prev.filter((h) => h.question !== q));
  }

  function clearHistory() {
    setHistory([]);
  }

  function downloadCsv(data: QueryResult) {
    const cols = data.metadata.column_names || Object.keys(data.rows[0]);
    const header = cols.join(",");
    const rows = data.rows.map((row) =>
      cols.map((c) => {
        const val = row[c];
        const str = val === null || val === undefined ? "" : String(val);
        return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dune_results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleQuery(q?: string, cachedSql?: string) {
    const query = q || question;
    if (!query.trim() || loading) return;

    // Check if we have cached SQL from history
    const sqlToUse = cachedSql || history.find((h) => h.question === query)?.sql;

    setQuestion(query);
    setPage("results");
    setShowHistory(false);
    setLoading(true);
    setError(null);
    setResult(null);
    addToHistory(query);

    try {
      const body: { question: string; sql?: string } = { question: query };
      if (sqlToUse) body.sql = sqlToUse;

      const resp = await fetch("http://localhost:8000/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.detail || "Request failed");
      }

      const data: QueryResult = await resp.json();
      setResult(data);
      // Save the SQL back to history
      addToHistory(query, data.sql);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleQuery();
  }

  function goHome() {
    setPage("landing");
    setResult(null);
    setError(null);
    setQuestion("");
    setShowHistory(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function formatTime(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const navLinks = (
    <nav className="nav-links">
      <button onClick={() => setPage("history")}>History</button>
      <button onClick={() => setPage("about")}>About</button>
    </nav>
  );

  // History page
  if (page === "history") {
    return (
      <div className="page">
        <div className="page-header">
          <button className="top-logo" onClick={goHome}>
            <img src="/dune.png" alt="Dune" />
            <span>DUNE</span>
          </button>
          {navLinks}
        </div>
        <div className="page-content">
          <h2 className="page-title">Search History</h2>
          {history.length === 0 ? (
            <p className="empty-state">No queries yet. Try searching for something!</p>
          ) : (
            <>
              <button className="clear-all-btn" onClick={clearHistory}>Clear all</button>
              <div className="history-list">
                {history.map((h) => (
                  <div key={h.question + h.timestamp} className="history-list-item">
                    <button
                      className="history-list-query"
                      onClick={() => handleQuery(h.question)}
                    >
                      <span className="history-list-text">{h.question}</span>
                      <span className="history-list-time">{formatDate(h.timestamp)}</span>
                    </button>
                    <button
                      className="history-list-remove"
                      onClick={() => removeFromHistory(h.question)}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // About page
  if (page === "about") {
    return (
      <div className="page">
        <div className="page-header">
          <button className="top-logo" onClick={goHome}>
            <img src="/dune.png" alt="Dune" />
            <span>DUNE</span>
          </button>
          {navLinks}
        </div>
        <div className="page-content">
          <h2 className="page-title">About Dune Search</h2>
          <div className="about-text">
            <p>
              Dune Search lets you query blockchain data using plain English.
              Type a question, and it gets converted into a DuneSQL query,
              executed against Dune's database of 100+ blockchains, and the
              results are displayed as interactive tables and charts.
            </p>
            <h3>How it works</h3>
            <ol>
              <li>You type a question in plain English</li>
              <li>Claude AI converts it into a valid DuneSQL query</li>
              <li>The query runs against Dune's 3+ petabyte blockchain database</li>
              <li>Results are displayed as a table and auto-detected chart</li>
            </ol>
            <h3>Built with</h3>
            <ul>
              <li>Dune API — onchain data platform</li>
              <li>Claude API — natural language to SQL</li>
              <li>React + TypeScript — frontend</li>
              <li>FastAPI + Python — backend</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Landing page
  if (page === "landing") {
    return (
      <div className="landing">
        <nav className="landing-nav">
          {navLinks}
        </nav>
        <div className="landing-center">
          <img src="/dune.png" alt="Dune" className="landing-logo" />
          <h1 className="landing-title">Dune Search</h1>
          <p className="landing-subtitle">Ask questions about blockchain data in plain English</p>

          <form className="search-bar" onSubmit={handleSubmit}>
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onFocus={() => setShowHistory(true)}
              onBlur={() => setTimeout(() => setShowHistory(false), 200)}
              placeholder="e.g. What are the top DEXes by volume this week?"
              autoFocus
            />
            {showHistory && history.length > 0 && (
              <div className="history-dropdown">
                <div className="history-header">
                  <span>Recent searches</span>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); clearHistory(); }}>Clear all</button>
                </div>
                {history.map((h) => (
                  <div key={h.question} className="history-item">
                    <button
                      type="button"
                      className="history-query"
                      onMouseDown={(e) => { e.preventDefault(); handleQuery(h.question); }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                      </svg>
                      <span>{h.question}</span>
                      <span className="history-time">{formatTime(h.timestamp)}</span>
                    </button>
                    <button
                      type="button"
                      className="history-remove"
                      onMouseDown={(e) => { e.preventDefault(); removeFromHistory(h.question); }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </form>

          <div className="landing-examples">
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => handleQuery(ex)}>
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Results page
  return (
    <div className="results-page">
      <div className="top-bar">
        <button className="top-logo" onClick={goHome}>
          <img src="/dune.png" alt="Dune" />
          <span>DUNE</span>
        </button>
        <form className="top-search-bar" onSubmit={handleSubmit}>
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading}
          />
        </form>
        {navLinks}
      </div>

      <div className="results-content">
        {error && <div className="error-box">{error}</div>}

        {loading && (
          <div className="loading">
            <div className="spinner" />
            <p>Generating SQL &amp; querying Dune...</p>
          </div>
        )}

        {result && (
          <>
            <div className="tabs-bar">
              <div className="tabs">
                <button
                  className={activeTab === "table" ? "active" : ""}
                  onClick={() => setActiveTab("table")}
                >
                  Table
                </button>
                <button
                  className={activeTab === "chart" ? "active" : ""}
                  onClick={() => setActiveTab("chart")}
                >
                  Chart
                </button>
              </div>
              <button className="download-btn" onClick={() => downloadCsv(result)}>
                Download CSV
              </button>
            </div>

            {activeTab === "table" ? (
              <ResultsTable rows={result.rows} metadata={result.metadata} />
            ) : (
              <ResultsChart rows={result.rows} metadata={result.metadata} />
            )}

            <SqlDisplay sql={result.sql} executionTimeMs={result.execution_time_ms} />
          </>
        )}
      </div>
    </div>
  );
}
