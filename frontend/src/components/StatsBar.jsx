import React from "react";
const s = {
  bar: { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))", gap:1, background:"var(--border)", border:"1px solid var(--border)", borderRadius:"var(--radius2)", overflow:"hidden", marginBottom:20 },
  cell: { background:"var(--bg2)", padding:"14px 16px", display:"flex", flexDirection:"column", gap:4 },
  label: { fontFamily:"var(--mono)", fontSize:10, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.07em" },
  value: (c) => ({ fontFamily:"var(--mono)", fontSize:22, fontWeight:600, color:c||"var(--text)", lineHeight:1 }),
  sub: { fontFamily:"var(--mono)", fontSize:10, color:"var(--text3)" },
};
function Stat({ label, value, color }) {
  return <div style={s.cell}><span style={s.label}>{label}</span><span style={s.value(color)}>{value ?? "—"}</span></div>;
}
export default function StatsBar({ metrics }) {
  if (!metrics) return <div style={s.bar}>{["Total Requests","Error Rate","p95 Latency","p99 Latency","Live Servers","Algorithm"].map(l=><Stat key={l} label={l} value="—"/>)}</div>;
  const errColor = parseFloat(metrics.overallErrorRate) > 10 ? "var(--red)" : parseFloat(metrics.overallErrorRate) > 2 ? "var(--amber)" : "var(--green)";
  const srvColor = metrics.liveServers === 0 ? "var(--red)" : metrics.liveServers < metrics.totalServers ? "var(--amber)" : "var(--green)";
  return (
    <div style={s.bar}>
      <Stat label="Total Requests" value={metrics.totalRequests.toLocaleString()} />
      <Stat label="Error Rate" value={`${metrics.overallErrorRate}%`} color={errColor} />
      <Stat label="p95 Latency" value={`${metrics.overallP95}ms`} color="var(--accent)" />
      <Stat label="p99 Latency" value={`${metrics.overallP99}ms`} color="var(--purple)" />
      <Stat label="Live Servers" value={`${metrics.liveServers}/${metrics.totalServers}`} color={srvColor} />
      <Stat label="Algorithm" value={metrics.algorithm.replace("_"," ").toUpperCase()} color="var(--text2)" />
    </div>
  );
}