import React from "react";
import { useMetrics } from "./hooks/useMetrics";
import ServerCard from "./components/ServerCard";
import LatencyChart from "./components/LatencyChart";
import RpsChart from "./components/RpsChart";
import TrafficPanel from "./components/TrafficPanel";
import StatsBar from "./components/StatsBar";


const s = {
  root: { minHeight:"100vh", background:"var(--bg)", padding:"20px 24px 40px", maxWidth:1400, margin:"0 auto" },
  header: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, paddingBottom:16, borderBottom:"1px solid var(--border)" },
  logo: { fontFamily:"var(--mono)", fontWeight:600, fontSize:18, color:"var(--text)", display:"flex", alignItems:"center", gap:10 },
  statusDot: (ok) => ({ width:8, height:8, borderRadius:"50%", background:ok?"var(--green)":"var(--red)", boxShadow:ok?"0 0 6px var(--green)":"0 0 6px var(--red)", animation:ok?"pulse 2s ease-in-out infinite":"none", display:"inline-block" }),
  headerRight: { display:"flex", alignItems:"center", gap:10, fontFamily:"var(--mono)", fontSize:11, color:"var(--text3)" },
  layout: { display:"grid", gridTemplateColumns:"300px 1fr", gap:16, alignItems:"start" },
  sidebar: { display:"flex", flexDirection:"column", gap:16 },
  main: { display:"flex", flexDirection:"column", gap:16 },
  section: { background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--radius2)", padding:"16px 20px" },
  sectionTitle: { fontFamily:"var(--mono)", fontSize:11, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14 },
  serverGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:12 },
  errorBanner: { background:"rgba(255,68,85,0.1)", border:"1px solid var(--red2)", borderRadius:"var(--radius)", padding:"10px 14px", fontFamily:"var(--mono)", fontSize:12, color:"var(--red)", marginBottom:16 },
  footer: { marginTop:32, fontFamily:"var(--mono)", fontSize:10, color:"var(--text3)", textAlign:"center" },
};
export default function App() {
  const { metrics, history, error, isTrafficRunning, trafficConfig, startTraffic, stopTraffic, updateTrafficConfig, setAlgorithm, resetMetrics, toggleServer } = useMetrics();
  const isConnected = !error && metrics !== null;
  return (
    <div style={s.root}>
      <header style={s.header}>
        <div style={s.logo}>
          <span style={{color:"var(--accent)"}}>PERF</span>
          <span>DASH</span>
          <span style={{color:"var(--text3)",fontWeight:400}}>// load balancer</span>
        </div>
        <div style={s.headerRight}>
          <span style={s.statusDot(isConnected)} />
          {isConnected ? "PROXY CONNECTED" : "CONNECTING..."}
          {isTrafficRunning && <><span style={{margin:"0 4px",color:"var(--border2)"}}>|</span><span style={{color:"var(--green)"}}>TRAFFIC ACTIVE<span className="blink"> ●</span></span></>}
        </div>
      </header>
      {error && <div style={s.errorBanner}>⚠ Cannot reach proxy at localhost:4000 — {error}</div>}
      <StatsBar metrics={metrics} />
      <div style={s.layout}>
        <div style={s.sidebar}>
          <TrafficPanel isRunning={isTrafficRunning} config={trafficConfig} algorithm={metrics?.algorithm||"round_robin"} onStart={startTraffic} onStop={stopTraffic} onConfigChange={updateTrafficConfig} onAlgorithmChange={setAlgorithm} onReset={resetMetrics} />
          {metrics && (
            <div style={s.section}>
              <div style={s.sectionTitle}>// routing state</div>
              <div style={{fontFamily:"var(--mono)",fontSize:11,lineHeight:1.8,color:"var(--text2)"}}>
                <div>algo: <span style={{color:"var(--accent)"}}>{metrics.algorithm}</span></div>
                <div>rr_index: <span style={{color:"var(--purple)"}}>{metrics.roundRobinIndex}</span></div>
                <div>live: <span style={{color:"var(--green)"}}>{metrics.servers.filter(s=>s.healthy).map(s=>`:${s.port}`).join(", ")||"none"}</span></div>
                <div>errors: <span style={{color:metrics.totalErrors>0?"var(--red)":"var(--text3)"}}>{metrics.totalErrors}</span></div>
              </div>
            </div>
          )}
        </div>
        <div style={s.main}>
          <div style={s.section}><div style={s.sectionTitle}>// latency — p95 / p99</div><LatencyChart history={history} /></div>
          <div style={s.section}><div style={s.sectionTitle}>// request throughput (req/s)</div><RpsChart history={history} /></div>
          <div style={s.section}>
            <div style={s.sectionTitle}>// backend pool</div>
            <div style={s.serverGrid}>
              {metrics?.servers.map(server=><ServerCard key={server.id} server={server} onToggle={toggleServer}/>) ?? <span style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--text3)"}}>waiting for backends...</span>}
            </div>
          </div>
        </div>
      </div>
      <div style={s.footer}>PERF-DASH v1.0 · proxy:4000 · backends:3001-3003 · frontend:5173</div>
    </div>
  );
}