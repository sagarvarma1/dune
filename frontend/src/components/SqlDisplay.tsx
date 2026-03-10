import { useState } from "react";

interface Props {
  sql: string;
  executionTimeMs: number;
}

export default function SqlDisplay({ sql, executionTimeMs }: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const timeStr =
    executionTimeMs >= 1000
      ? `${(executionTimeMs / 1000).toFixed(1)}s`
      : `${executionTimeMs}ms`;

  return (
    <div className="sql-display">
      <div className="sql-header">
        <div className="label">Generated SQL</div>
        <span className="exec-time">Completed in {timeStr}</span>
      </div>
      <button className="copy-btn" onClick={handleCopy}>
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre>{sql}</pre>
    </div>
  );
}
