import { useState } from "react";

interface Props {
  sql: string;
}

export default function SqlDisplay({ sql }: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="sql-display">
      <div className="label">Generated SQL</div>
      <button className="copy-btn" onClick={handleCopy}>
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre>{sql}</pre>
    </div>
  );
}
