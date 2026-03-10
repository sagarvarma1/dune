interface Props {
  rows: Record<string, unknown>[];
  metadata: {
    column_names: string[];
    row_count: number;
  };
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "-";
  if (typeof val === "number") {
    if (Number.isInteger(val)) return val.toLocaleString();
    return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return String(val);
}

export default function ResultsTable({ rows, metadata }: Props) {
  if (!rows.length) return <p style={{ color: "var(--text-dim)" }}>No results</p>;

  const columns = metadata.column_names || Object.keys(rows[0]);

  return (
    <>
      <div className="results-table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col} title={String(row[col] ?? "")}>
                    {formatValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row-count">{metadata.row_count} rows returned</div>
    </>
  );
}
