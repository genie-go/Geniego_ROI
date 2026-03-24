import React, { useMemo } from "react";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export default function Sparkline({ data = [], height = 32, strokeWidth = 2 }) {
  const { path, area } = useMemo(() => {
    if (!data || data.length < 2) return { path: "", area: "" };
    const xs = data.map((_, i) => i);
    const min = Math.min(...data);
    const max = Math.max(...data);
    const w = 90;
    const h = height;
    const scaleX = (i) => (i / (data.length - 1)) * w;
    const scaleY = (v) => {
      if (max === min) return h / 2;
      return h - ((v - min) / (max - min)) * h;
    };
    let d = `M ${scaleX(0)} ${scaleY(data[0])}`;
    for (let i = 1; i < data.length; i++) d += ` L ${scaleX(i)} ${scaleY(data[i])}`;
    const a = `${d} L ${w} ${h} L 0 ${h} Z`;
    return { path: d, area: a };
  }, [data, height]);

  const last = data?.length ? data[data.length - 1] : null;
  const first = data?.length ? data[0] : null;
  const trend = last != null && first != null ? clamp((last - first) / (Math.abs(first) || 1), -1, 1) : 0;

  return (
    <svg viewBox={`0 0 90 ${height}`} width="90" height={height} style={{ display: "block" }}>
      {area ? <path d={area} fill="rgba(120,160,255,0.15)" /> : null}
      {path ? <path d={path} fill="none" stroke="rgba(190,210,255,0.95)" strokeWidth={strokeWidth} strokeLinejoin="round" /> : null}
      {data?.length ? (
        <circle cx={90} cy={height / 2} r="0" />
      ) : null}
      <text x="90" y="10" textAnchor="end" fontSize="9" fill="rgba(232,238,252,0.72)">
        {trend > 0 ? "▲" : trend < 0 ? "▼" : "•"}
      </text>
    </svg>
  );
}
