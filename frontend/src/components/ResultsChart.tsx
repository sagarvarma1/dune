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

/**
 * Detect if timestamp data looks like an aggregated time series
 * (e.g. daily volume, hourly prices) vs raw transactions.
 *
 * Aggregated = rows are roughly evenly spaced in time.
 * Raw = irregular timestamps (individual transactions).
 */
function isAggregatedTimeSeries(rows: Record<string, unknown>[], xKey: string): boolean {
  if (rows.length < 3) return false;

  // Parse timestamps and sort
  const times = rows
    .map((r) => new Date(r[xKey] as string).getTime())
    .filter((t) => !isNaN(t))
    .sort((a, b) => a - b);

  if (times.length < 3) return false;

  // Calculate gaps between consecutive points
  const gaps: number[] = [];
  for (let i = 1; i < times.length; i++) {
    gaps.push(times[i] - times[i - 1]);
  }

  // Find the median gap
  const sorted = [...gaps].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // If median gap is at least 1 hour, it's likely aggregated (daily, hourly, etc.)
  const ONE_HOUR = 3600 * 1000;
  if (median < ONE_HOUR) return false;

  // Check consistency: most gaps should be within 3x of the median
  const consistent = gaps.filter((g) => g > 0 && g <= median * 3).length;
  return consistent / gaps.length > 0.6;
}

export default function ResultsChart({ rows, metadata }: Props) {
  if (!rows.length) return <p style={{ color: "var(--text-dim)" }}>No data to chart</p>;

  const { column_names, column_types } = metadata;

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

  // Decide chart type: line only for aggregated time series
  const useLineChart = timeIdx >= 0 && isAggregatedTimeSeries(rows, xKey);

  // Format data
  const data = rows.map((row) => {
    let xVal = row[xKey];
    if (typeof xVal === "string" && xVal.length > 20) {
      xVal = xVal.slice(0, 17) + "...";
    }
    return {
      ...row,
      [xKey]: xVal,
      [yKey]: Number(row[yKey]) || 0,
    };
  });

  const formatYAxis = (val: number) => {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
    return val.toLocaleString();
  };

  const formatTooltipValue = (val: number) => {
    if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(2)}K`;
    return val.toLocaleString();
  };

  const tooltipStyle = {
    contentStyle: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, padding: "8px 12px" },
    labelStyle: { color: "#1a1a1a", fontWeight: 600, marginBottom: 4 },
    itemStyle: { color: "#e8622c" },
    formatter: (value: number) => [formatTooltipValue(value), yKey],
    cursor: { fill: "rgba(232, 98, 44, 0.08)" },
  };

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height={400}>
        {useLineChart ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey={xKey} tick={{ fill: "#6b6b6b", fontSize: 12 }} />
            <YAxis tickFormatter={formatYAxis} tick={{ fill: "#6b6b6b", fontSize: 12 }} />
            <Tooltip {...tooltipStyle} />
            <Line type="monotone" dataKey={yKey} stroke="#e8622c" strokeWidth={2} dot={false} />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey={xKey} tick={{ fill: "#6b6b6b", fontSize: 12 }} angle={-30} textAnchor="end" height={80} />
            <YAxis tickFormatter={formatYAxis} tick={{ fill: "#6b6b6b", fontSize: 12 }} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey={yKey} fill="#e8622c" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
      <div className="chart-note">
        X: {xKey} | Y: {yKey} | {useLineChart ? "Line" : "Bar"} chart
      </div>
    </div>
  );
}
