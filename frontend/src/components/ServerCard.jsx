// frontend/src/components/ServerCard.jsx — v2
// Shows circuit-breaker state (CLOSED/OPEN/HALF_OPEN), weight stepper, coloured error rate.
import React from "react";

const CB = {
  CLOSED:    {label:"LIVE",    bg:"rgba(0,229,160,0.12)", color:"var(--green)", border:"var(--green2)"},
  OPEN:      {label:"DOWN",    bg:"rgba(255,68,85,0.12)", color:"var(--red)",   border:"var(--red2)"},
  HALF_OPEN: {label:"PROBING", bg:"rgba(255,184,0,0.12)", color:"var(--amber)", border:"var(--amber2)"},
};
const latColor = ms => ms<80?"var(--green)":ms<150?"var(--amber)":"var(--red)";
const errColor = r  => parseFloat(r)>=20?"var(--red)":parseFloat(r)>=5?"var(--amber)":"var(--green)";

function Stat({label,value,unit,color}){
  return (
    <div style={{display:"flex",flexDirection:"column",gap:2}}>
      <span style={{fontSize:10,color:"var(--text3)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</span>
      <span style={{fontSize:20,fontFamily:"var(--mono)",fontWeight:600,color:color||"var(--text)"}}>
        {value}{unit&&<span style={{fontSize:11,marginLeft:2,color:"var(--text2)"}}>{unit}</span>}
      </span>
    </div>
  );
}

export default function ServerCard({server, onToggle, onWeightChange, showWeightControl}){
  const {port, cbState="CLOSED", weight=1, activeConnections,
         requestCount, avgLatency, p95, errorRate} = server;
  const badge   = CB[cbState]||CB.CLOSED;
  const healthy = cbState==="CLOSED";
  const lc      = latColor(avgLatency);

  return (
    <div className="fade-in" style={{
      background:"var(--bg2)",borderRadius:"var(--radius2)",padding:"16px",
      position:"relative",overflow:"hidden",transition:"border-color 0.3s",
      border:`1px solid ${healthy?"var(--border)":cbState==="HALF_OPEN"?"rgba(255,184,0,0.4)":"var(--red2)"}`,
    }}>
      {/* accent bar */}
      <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",transition:"background 0.3s",
        background:healthy?"var(--green)":cbState==="HALF_OPEN"?"var(--amber)":"var(--red)"}}/>

      {/* header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,marginLeft:10}}>
        <span style={{fontFamily:"var(--mono)",fontSize:13,fontWeight:600,color:"var(--text)"}}>:{port}</span>
        <span style={{fontSize:11,fontFamily:"var(--mono)",padding:"2px 8px",borderRadius:20,
          background:badge.bg,color:badge.color,border:`1px solid ${badge.border}`}}>
          {badge.label}
        </span>
      </div>

      {/* stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginLeft:10,marginBottom:12}}>
        <Stat label="Requests"    value={requestCount.toLocaleString()}/>
        <Stat label="Avg latency" value={avgLatency} unit="ms" color={lc}/>
        <Stat label="p95"         value={p95}        unit="ms"/>
        <Stat label="Error rate"  value={errorRate}  unit="%" color={errColor(errorRate)}/>
      </div>

      {/* connections bar */}
      <div style={{marginLeft:10,marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:10,color:"var(--text3)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:"0.05em"}}>Active conn.</span>
          <span style={{fontSize:10,color:"var(--accent)",fontFamily:"var(--mono)"}}>{activeConnections}</span>
        </div>
        <div style={{height:4,background:"var(--bg3)",borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${Math.min(100,activeConnections*10)}%`,background:lc,borderRadius:2,transition:"width 0.5s ease"}}/>
        </div>
      </div>

      {/* dots */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginLeft:10,marginBottom:10}}>
        {Array.from({length:10}).map((_,i)=>(
          <div key={i} style={{width:6,height:6,borderRadius:"50%",transition:"background 0.3s",
            background:i<activeConnections?"var(--accent)":"var(--border2)"}}/>
        ))}
      </div>

      {/* weight control (round-robin only) */}
      {showWeightControl && (
        <div style={{marginLeft:10,marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:"var(--text3)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:"0.05em"}}>Weight</span>
          <div style={{display:"flex",gap:4,marginLeft:"auto"}}>
            {[1,2,3].map(w=>(
              <button key={w} onClick={()=>onWeightChange&&onWeightChange(server.id,w)} style={{
                width:24,height:22,fontFamily:"var(--mono)",fontSize:11,borderRadius:"var(--radius)",
                cursor:"pointer",transition:"all 0.15s",
                background:weight===w?"rgba(0,212,255,0.15)":"transparent",
                color:weight===w?"var(--accent)":"var(--text3)",
                border:`1px solid ${weight===w?"var(--accent2)":"var(--border2)"}`,
              }}>{w}</button>
            ))}
          </div>
        </div>
      )}

      {/* toggle button */}
      <button onClick={()=>onToggle(port)} style={{
        marginTop:4,marginLeft:10,width:"calc(100% - 10px)",padding:"6px 0",
        fontSize:11,fontFamily:"var(--mono)",background:"transparent",letterSpacing:"0.05em",
        border:`1px solid ${healthy?"var(--red2)":"var(--green2)"}`,
        color:healthy?"var(--red)":"var(--green)",borderRadius:"var(--radius)",cursor:"pointer",
      }}>
        {healthy?"⚡ SIMULATE FAILURE":"✓ RESTORE SERVER"}
      </button>
    </div>
  );
}