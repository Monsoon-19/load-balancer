// frontend/src/components/RequestLog.jsx
// Live scrolling feed of last 20 requests — shows routing decisions in real time.
import React, { useRef, useEffect } from "react";

const STATUS_COLOR = c => c>=500?"var(--red)":c>=400?"var(--amber)":"var(--green)";
const LAT_COLOR    = ms => ms<80?"var(--green)":ms<150?"var(--amber)":"var(--red)";
const ALG_SHORT    = { round_robin:"RR", least_connections:"LC", least_latency:"LL" };

export default function RequestLog({ entries }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = 0; }, [entries.length]);

  if (!entries || entries.length === 0) {
    return (
      <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--text3)",padding:"8px 0"}}>
        no requests yet — start traffic to see the log
      </div>
    );
  }

  return (
    <div ref={ref} style={{maxHeight:220,overflowY:"auto",display:"flex",flexDirection:"column",gap:2}}>
      {entries.map((e, i) => {
        const t   = new Date(e.ts);
        const ts  = `${t.getMinutes().toString().padStart(2,"0")}:${t.getSeconds().toString().padStart(2,"0")}.${t.getMilliseconds().toString().padStart(3,"0")}`;
        const srv = (e.serverId||e.server_id||"?").replace("backend-","");
        const lat = e.latency_ms || e.latency || 0;
        return (
          <div key={i} className="fade-in" style={{
            display:"grid", gridTemplateColumns:"62px 52px 48px 38px 1fr",
            gap:"0 6px", fontFamily:"var(--mono)", fontSize:11, padding:"3px 6px",
            borderRadius:"var(--radius)", alignItems:"center",
            background: i===0 ? "rgba(0,212,255,0.05)" : "transparent",
          }}>
            <span style={{color:"var(--text3)"}}>{ts}</span>
            <span style={{color:"var(--accent)"}}>{srv}</span>
            <span style={{color:LAT_COLOR(lat)}}>{lat}ms</span>
            <span style={{color:STATUS_COLOR(e.status)}}>{e.status}</span>
            <span style={{color:"var(--text3)"}}>{ALG_SHORT[e.algorithm]||e.algorithm}</span>
          </div>
        );
      })}
    </div>
  );
}