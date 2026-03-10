import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  rows: Record<string, unknown>[];
  metadata: {
    column_names: string[];
    column_types: string[];
  };
}

function isNumeric(type: string): boolean {
  return /int|double|float|decimal|bigint|uint256/.test(type.toLowerCase());
}

function isTimestamp(type: string): boolean {
  return /timestamp|date|time/.test(type.toLowerCase());
}

export default function ResultsChart({ rows, metadata }: Props) {
  if (!rows.length) return <p style={{ color: "var(--text-dim)" }}>No data to chart</p>;

  const { column_names, column_types } = metadata;

  // Find a good x-axis (first string/timestamp column) and y-axis (first numeric column)
  const numericIdx = column_types.findIndex((t) => isNumeric(t));
  const timeIdx = column_types.findIndex((t) => isTimestamp(t));
  const stringIdx = column_types.findIndex(
    (t) => !isNumeric(t) && !isTimestamp(t)
  );

  const xKey = column_names[timeIdx >= 0 ? timeIdx : stringIdx >= 0 ? stringIdx : 0];
  const yKey = column_names[numericIdx >= 0 ? numericIdx : 1] || column_names[1];

  if (!xKey || !yKey) {
    return <p style={{ color: "var(--text-dim)" }}>Cannot determine chart axes</p>;
  }

  // Format data — truncate x labels, ensure y is number
  const data = rows.map((row) => ({
    ...row,
    [xKey]:
      typeof row[xKey] === "string" && row[xKey] !== null
        ? (row[xKey] as string).length > 20
          ? (row[xKey] as string).slice(0, 17) + "..."
          : row[xKey]
        : row[xKey],
    [yKey]: Number(row[yKey]) || 0,
  }));

  const useLineChart = timeIdx >= 0;

  const formatYAxis = (val: number) => {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
    return val.toLocaleString();
  };

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height={400}>
        {useLineChart ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3d" />
            <XAxis dataKey={xKey} tick={{ fill: "#8888a0", fontSize: 12 }} />
            <YAxis tickFormatter={formatYAxis} tick={{ fill: "#8888a0", fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: "#1e1e2e", border: "1px solid #2a2a3d", borderRadius: 6 }}
              labelStyle={{ color: "#e0e0e8" }}
              itemStyle={{ color: "#f0a030" }}
            />
            <Line type="monotone" dataKey={yKey} stroke="#f0a030" strokeWidth={2} dot={false} />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3d" />
            <XAxis dataKey={xKey} tick={{ fill: "#8888a0", fontSize: 12 }} angle={-30} textAnchor="end" height={80} />
            <YAxis tickFormatter={formatYAxis} tick={{ fill: "#8888a0", fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: "#1e1e2e", border: "1px solid #2a2a3d", borderRadius: 6 }}
              labelStyle={{ color: "#e0e0e8" }}
              itemStyle={{ color: "#f0a030" }}
            />
            <Bar dataKey={yKey} fill="#f0a030" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
      <div className="chart-note">
        X: {xKey} | Y: {yKey}
      </div>
    </div>
  );
}
