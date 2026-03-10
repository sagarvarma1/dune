import { useState } from "react";

const EXAMPLES = [
  "Top 10 tokens by DEX volume today",
  "ETH price over the last 7 days",
  "Largest NFT sales this week",
  "Daily Uniswap volume last 30 days",
  "Whale transfers over $1M today",
];

interface Props {
  onSubmit: (question: string) => void;
  loading: boolean;
}

export default function QueryInput({ onSubmit, loading }: Props) {
  const [question, setQuestion] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (question.trim() && !loading) {
      onSubmit(question.trim());
    }
  }

  return (
    <>
      <form className="query-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What are the top DEXes by volume this week?"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !question.trim()}>
          {loading ? "Querying..." : "Query"}
        </button>
      </form>

      <div className="examples">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setQuestion(ex);
              if (!loading) onSubmit(ex);
            }}
          >
            {ex}
          </button>
        ))}
      </div>
    </>
  );
}
