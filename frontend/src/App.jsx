// frontend/src/App.jsx — v2 (complete, interview-ready)
import React from "react";
import { useMetrics }      from "./hooks/useMetrics";
import { ErrorBoundary }   from "./components/ErrorBoundary";
import ServerCard          from "./components/ServerCard";
import LatencyChart        from "./components/LatencyChart";
import RpsChart            from "./components/RpsChart";
import TrafficPanel        from "./components/TrafficPanel";
import StatsBar            from "./components/StatsBar";
import RequestLog          from "./components/RequestLog";

const s = {
  root:   { minHeight:"100vh", background:"var(--bg)", padding:"20px 24px 40px", maxWidth:1400, margin:"0 auto" },
  header: { display:"flex", alignItems:"center", justifyContent:"space-between",
            marginBottom:24, paddingBottom:16, borderBottom:"1px solid var(--border)" },
  logo:   { fontFamily:"var(--mono)", fontWeight:600, fontSize:18, color:"var(--text)",
            display:"flex", alignItems:"center", gap:10 },
  dot: ok=>({ width:8, height:8, borderRadius:"50%", display:"inline-block",
              background:ok?"var(--green)":"var(--red)",
              boxShadow:ok?"0 0 6px var(--green)":"0 0 6px var(--red)",
              animation:ok?"pulse 2s ease-in-out infinite":"none" }),
  hdr:    { display:"flex", alignItems:"center", gap:10, fontFamily:"var(--mono)", fontSize:11, color:"var(--text3)" },
  sidebar:{ display:"flex", flexDirection:"column", gap:16 },
  main:   { display:"flex", flexDirection:"column", gap:16 },
  section:{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--radius2)", padding:"16px 20px" },
  secTitle:{ fontFamily:"var(--mono)", fontSize:11, color:"var(--text3)",
             textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14 },
  grid:   { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 },
  errBanner:{ background:"rgba(255,68,85,0.1)", border:"1px solid var(--red2)", borderRadius:"var(--radius)",
              padding:"10px 14px", fontFamily:"var(--mono)", fontSize:12, color:"var(--red)", marginBottom:16 },
  skeleton: { height:24, borderRadius:"var(--radius)", background:"var(--bg3)",
              animation:"shimmer 1.5s ease-in-out infinite", marginBottom:8 },
  footer: { marginTop:32, fontFamily:"var(--mono)", fontSize:10, color:"var(--text3)", textAlign:"center" },
};

function Skeleton() {
  return (
    <div style={{marginBottom:20}}>
      {[100,80,60,90,70,50].map((w,i)=>(
        <div key={i} style={{...s.skeleton, width:`${w}%`, animationDelay:`${i*0.1}s`}}/>
      ))}
    </div>
  );
}

export default function App() {
  const {
    metrics, history, error, requestLog,
    isTrafficRunning, trafficConfig,
    startTraffic, stopTraffic, updateTrafficConfig,
    setAlgorithm, resetMetrics, toggleServer, setWeight,
  } = useMetrics();

  const connected   = !error && metrics !== null;
  const isRoundRobin = (metrics?.algorithm || "round_robin") === "round_robin";

  return (
    <div style={s.root}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header style={s.header}>
        <div style={s.logo}>
          <span style={{color:"var(--accent)"}}>PERF</span>
          <span>DASH</span>
          <span style={{color:"var(--text3)", fontWeight:400}}>// load balancer</span>
        </div>
        <div style={s.hdr}>
          <span style={s.dot(connected)}/>
          {connected ? "PROXY CONNECTED" : "CONNECTING..."}
          {isTrafficRunning && (
            <>
              <span style={{margin:"0 4px",color:"var(--border2)"}}>|</span>
              <span style={{color:"var(--green)"}}>TRAFFIC ACTIVE<span className="blink"> ●</span></span>
            </>
          )}
        </div>
      </header>

      {/* ── Error banner ───────────────────────────────────────── */}
      {error && <div style={s.errBanner}>⚠ {error}</div>}

      {/* ── Stats bar ──────────────────────────────────────────── */}
      <ErrorBoundary label="stats-bar">
        {metrics ? <StatsBar metrics={metrics}/> : <Skeleton/>}
      </ErrorBoundary>

      {/* ── Main layout ────────────────────────────────────────── */}
      <div className="dashboard-layout">

        {/* Sidebar */}
        <div style={s.sidebar}>
          <TrafficPanel
            isRunning={isTrafficRunning}
            config={trafficConfig}
            algorithm={metrics?.algorithm || "round_robin"}
            onStart={startTraffic}
            onStop={stopTraffic}
            onConfigChange={updateTrafficConfig}
            onAlgorithmChange={setAlgorithm}
            onReset={resetMetrics}
          />

          {metrics && (
            <div style={s.section}>
              {/* Routing state */}
              <div style={s.secTitle}>// routing state</div>
              <div style={{fontFamily:"var(--mono)",fontSize:11,lineHeight:1.8,color:"var(--text2)",marginBottom:14}}>
                <div>algo: <span style={{color:"var(--accent)"}}>{metrics.algorithm}</span></div>
                <div>rr_index: <span style={{color:"var(--purple)"}}>{metrics.roundRobinIndex}</span></div>
                <div>live: <span style={{color:"var(--green)"}}>
                  {metrics.servers.filter(s=>s.healthy).map(s=>`:${s.port}`).join(", ")||"none"}
                </span></div>
                <div>errors: <span style={{color:metrics.totalErrors>0?"var(--red)":"var(--text3)"}}>
                  {metrics.totalErrors}
                </span></div>
              </div>

              {/* Request log */}
              <div style={{...s.secTitle, marginTop:8}}>// request log</div>
              <RequestLog entries={requestLog}/>
            </div>
          )}
        </div>

        {/* Main area */}
        <div style={s.main}>
          <div style={s.section}>
            <div style={s.secTitle}>// latency — p95 / p99</div>
            <LatencyChart history={history}/>
          </div>

          <div style={s.section}>
            <div style={s.secTitle}>// request throughput (req/s)</div>
            <RpsChart history={history}/>
          </div>

          <ErrorBoundary label="backend-pool">
            <div style={s.section}>
              <div style={s.secTitle}>
                // backend pool
                {isRoundRobin && (
                  <span style={{marginLeft:8,color:"var(--text3)",fontSize:10,textTransform:"none"}}>
                    (weight buttons active in round-robin mode)
                  </span>
                )}
              </div>
              <div style={s.grid}>
                {metrics?.servers.map(server=>(
                  <ServerCard
                    key={server.id}
                    server={server}
                    onToggle={toggleServer}
                    onWeightChange={setWeight}
                    showWeightControl={isRoundRobin}
                  />
                )) ?? (
                  <span style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--text3)"}}>
                    waiting for backends...
                  </span>
                )}
              </div>
            </div>
          </ErrorBoundary>
        </div>
      </div>

      <div style={s.footer}>
        PERF-DASH v2.0 &nbsp;·&nbsp; proxy:4000 &nbsp;·&nbsp; backends:3001–3003
        &nbsp;·&nbsp; frontend:5173 &nbsp;·&nbsp; db:metrics.db
      </div>
    </div>
  );
}