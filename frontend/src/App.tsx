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
}

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
  const [hasSearched, setHasSearched] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  function addToHistory(q: string) {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.question !== q);
      return [{ question: q, timestamp: Date.now() }, ...filtered];
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

  async function handleQuery(q?: string) {
    const query = q || question;
    if (!query.trim() || loading) return;

    setQuestion(query);
    setHasSearched(true);
    setShowHistory(false);
    setLoading(true);
    setError(null);
    setResult(null);
    addToHistory(query);

    try {
      const resp = await fetch("http://localhost:8000/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.detail || "Request failed");
      }

      const data: QueryResult = await resp.json();
      setResult(data);
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
    setHasSearched(false);
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

  // Landing page
  if (!hasSearched) {
    return (
      <div className="landing">
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
