import { useState } from "react";
import QueryInput from "./components/QueryInput";
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

export default function App() {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"table" | "chart">("table");

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

  async function handleQuery(question: string) {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const resp = await fetch("http://localhost:8000/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
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

  return (
    <div className="app">
      <header>
        <h1>
          <span className="accent">Dune</span> Natural Language Query
        </h1>
        <p className="subtitle">
          Ask questions about blockchain data in plain English
        </p>
      </header>

      <QueryInput onSubmit={handleQuery} loading={loading} />

      {error && <div className="error-box">{error}</div>}

      {loading && (
        <div className="loading">
          <div className="spinner" />
          <p>Generating SQL &amp; querying Dune...</p>
        </div>
      )}

      {result && (
        <>
          <SqlDisplay sql={result.sql} executionTimeMs={result.execution_time_ms} />

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
        </>
      )}
    </div>
  );
}
