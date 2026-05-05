import React from "react";
const s = {
  card: (h) => ({ background:"var(--bg2)", border:`1px solid ${h?"var(--border)":"var(--red2)"}`, borderRadius:"var(--radius2)", padding:"16px", position:"relative", overflow:"hidden", transition:"border-color 0.3s" }),
  accent: (h) => ({ position:"absolute", top:0, left:0, width:3, height:"100%", background:h?"var(--green)":"var(--red)", transition:"background 0.3s" }),
  header: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, marginLeft:10 },
  id: { fontFamily:"var(--mono)", fontSize:13, fontWeight:600, color:"var(--text)" },
  badge: (h) => ({ fontSize:11, fontFamily:"var(--mono)", padding:"2px 8px", borderRadius:20, background:h?"rgba(0,229,160,0.12)":"rgba(255,68,85,0.12)", color:h?"var(--green)":"var(--red)", border:`1px solid ${h?"var(--green2)":"var(--red2)"}` }),
  grid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginLeft:10, marginBottom:12 },
  stat: { display:"flex", flexDirection:"column", gap:2 },
  statLabel: { fontSize:10, color:"var(--text3)", fontFamily:"var(--mono)", textTransform:"uppercase", letterSpacing:"0.05em" },
  statValue: { fontSize:20, fontFamily:"var(--mono)", fontWeight:600, color:"var(--text)" },
  barTrack: { height:4, background:"var(--bg3)", borderRadius:2, marginLeft:10, overflow:"hidden" },
  barFill: (pct,c) => ({ height:"100%", width:`${Math.min(100,pct)}%`, background:c, borderRadius:2, transition:"width 0.5s ease" }),
  toggleBtn: (h) => ({ marginTop:12, marginLeft:10, width:"calc(100% - 10px)", padding:"6px 0", fontSize:11, fontFamily:"var(--mono)", background:"transparent", border:`1px solid ${h?"var(--red2)":"var(--green2)"}`, color:h?"var(--red)":"var(--green)", borderRadius:"var(--radius)", letterSpacing:"0.05em" }),
  dots: { display:"flex", gap:4, flexWrap:"wrap", marginLeft:10, marginTop:8 },
  dot: (a) => ({ width:6, height:6, borderRadius:"50%", background:a?"var(--accent)":"var(--border2)", transition:"background 0.3s" }),
};
function Stat({ label, value, unit }) {
  return <div style={s.stat}><span style={s.statLabel}>{label}</span><span style={s.statValue}>{value}{unit&&<span style={{fontSize:12,marginLeft:2,color:"var(--text2)"}}>{unit}</span>}</span></div>;
}
export default function ServerCard({ server, onToggle }) {
  const { port, healthy, activeConnections, requestCount, avgLatency, p95, errorRate } = server;
  const latColor = avgLatency < 80 ? "var(--green)" : avgLatency < 150 ? "var(--amber)" : "var(--red)";
  return (
    <div style={s.card(healthy)} className="fade-in">
      <div style={s.accent(healthy)} />
      <div style={s.header}>
        <span style={s.id}>:{port}</span>
        <span style={s.badge(healthy)}>{healthy ? "LIVE" : "DOWN"}</span>
      </div>
      <div style={s.grid}>
        <Stat label="Requests" value={requestCount.toLocaleString()} />
        <Stat label="Avg latency" value={avgLatency} unit="ms" />
        <Stat label="p95" value={p95} unit="ms" />
        <Stat label="Error rate" value={errorRate} unit="%" />
      </div>
      <div style={{marginLeft:10,marginBottom:6}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={s.statLabel}>Active connections</span>
          <span style={{...s.statLabel,color:"var(--accent)"}}>{activeConnections}</span>
        </div>
        <div style={s.barTrack}><div style={s.barFill(activeConnections*10, latColor)} /></div>
      </div>
      <div style={s.dots}>{Array.from({length:10}).map((_,i)=><div key={i} style={s.dot(i<activeConnections)}/>)}</div>
      <button style={s.toggleBtn(healthy)} onClick={() => onToggle(port)}>
        {healthy ? "⚡ SIMULATE FAILURE" : "✓ RESTORE SERVER"}
      </button>
    </div>
  );
}