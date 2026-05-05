import React from "react";
const s = {
  panel: { background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--radius2)", padding:"20px" },
  title: { fontFamily:"var(--mono)", fontSize:11, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:16 },
  row: { display:"flex", alignItems:"center", gap:12, marginBottom:14 },
  label: { fontFamily:"var(--mono)", fontSize:11, color:"var(--text2)", width:100, flexShrink:0 },
  value: { fontFamily:"var(--mono)", fontSize:13, fontWeight:600, color:"var(--accent)", width:48, textAlign:"right", flexShrink:0 },
  algoRow: { display:"flex", gap:6, flexWrap:"wrap", marginBottom:18 },
  algoBtn: (a) => ({ padding:"5px 12px", fontFamily:"var(--mono)", fontSize:11, borderRadius:20, background:a?"rgba(0,212,255,0.12)":"transparent", color:a?"var(--accent)":"var(--text2)", border:`1px solid ${a?"var(--accent2)":"var(--border2)"}`, letterSpacing:"0.04em" }),
  btnRow: { display:"flex", gap:10, marginTop:18 },
  startBtn: (r) => ({ flex:1, padding:"10px 0", fontFamily:"var(--mono)", fontSize:12, fontWeight:600, letterSpacing:"0.08em", borderRadius:"var(--radius)", background:r?"transparent":"var(--green)", color:r?"var(--red)":"#000", border:r?"1px solid var(--red)":"none" }),
  resetBtn: { padding:"10px 16px", fontFamily:"var(--mono)", fontSize:12, background:"transparent", color:"var(--text2)", border:"1px solid var(--border2)", borderRadius:"var(--radius)" },
};
const ALGOS = [{id:"round_robin",label:"Round Robin"},{id:"least_connections",label:"Least Conn."},{id:"least_latency",label:"Least Latency"}];
export default function TrafficPanel({ isRunning, config, algorithm, onStart, onStop, onConfigChange, onAlgorithmChange, onReset }) {
  return (
    <div style={s.panel}>
      <div style={s.title}>// traffic control</div>
      <div style={{marginBottom:16}}>
        <div style={{...s.label,marginBottom:8,display:"block"}}>ALGORITHM</div>
        <div style={s.algoRow}>{ALGOS.map(a=><button key={a.id} style={s.algoBtn(algorithm===a.id)} onClick={()=>onAlgorithmChange(a.id)}>{a.label}</button>)}</div>
      </div>
      <div style={s.row}>
        <span style={s.label}>RATE</span>
        <input type="range" min={1} max={100} value={config.rate} onChange={e=>onConfigChange({rate:parseInt(e.target.value)})} />
        <span style={s.value}>{config.rate}<span style={{fontSize:10,color:"var(--text2)"}}>rps</span></span>
      </div>
      <div style={s.row}>
        <span style={s.label}>COMPLEXITY</span>
        <input type="range" min={10} max={200} step={10} value={config.complexity} onChange={e=>onConfigChange({complexity:parseInt(e.target.value)})} />
        <span style={s.value}>{config.complexity}<span style={{fontSize:10,color:"var(--text2)"}}>ms</span></span>
      </div>
      <div style={s.row}>
        <span style={s.label}>FAIL RATE</span>
        <input type="range" min={0} max={50} step={1} value={Math.round(config.failRate*100)} onChange={e=>onConfigChange({failRate:parseInt(e.target.value)/100})} />
        <span style={s.value}>{Math.round(config.failRate*100)}<span style={{fontSize:10,color:config.failRate>0?"var(--red)":"var(--text2)"}}>%</span></span>
      </div>
      <div style={s.btnRow}>
        <button style={s.startBtn(isRunning)} onClick={isRunning?onStop:onStart}>{isRunning?<>■ STOP<span className="blink"> _</span></>:"▶ START TRAFFIC"}</button>
        <button style={s.resetBtn} onClick={onReset}>RESET</button>
      </div>
    </div>
  );
}