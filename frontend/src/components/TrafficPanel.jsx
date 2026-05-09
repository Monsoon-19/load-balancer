// frontend/src/components/TrafficPanel.jsx
import React from "react";

const ALGOS = [
  {id:"round_robin",       label:"Round Robin"},
  {id:"least_connections", label:"Least Conn."},
  {id:"least_latency",     label:"Least Latency"},
];

export default function TrafficPanel({isRunning,config,algorithm,onStart,onStop,onConfigChange,onAlgorithmChange,onReset}){
  const panel={background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:"var(--radius2)",padding:"20px"};
  const title={fontFamily:"var(--mono)",fontSize:11,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:16};
  const row={display:"flex",alignItems:"center",gap:12,marginBottom:14};
  const lbl={fontFamily:"var(--mono)",fontSize:11,color:"var(--text2)",width:100,flexShrink:0};
  const val={fontFamily:"var(--mono)",fontSize:13,fontWeight:600,color:"var(--accent)",width:48,textAlign:"right",flexShrink:0};
  const algoBtn=active=>({padding:"5px 12px",fontFamily:"var(--mono)",fontSize:11,borderRadius:20,cursor:"pointer",
    background:active?"rgba(0,212,255,0.12)":"transparent",letterSpacing:"0.04em",
    color:active?"var(--accent)":"var(--text2)",border:`1px solid ${active?"var(--accent2)":"var(--border2)"}`});
  const startBtn={flex:1,padding:"10px 0",fontFamily:"var(--mono)",fontSize:12,fontWeight:600,letterSpacing:"0.08em",
    borderRadius:"var(--radius)",cursor:"pointer",
    background:isRunning?"transparent":"var(--green)",color:isRunning?"var(--red)":"#000",
    border:isRunning?"1px solid var(--red)":"none"};
  const resetBtn={padding:"10px 16px",fontFamily:"var(--mono)",fontSize:12,background:"transparent",
    color:"var(--text2)",border:"1px solid var(--border2)",borderRadius:"var(--radius)",cursor:"pointer"};

  return (
    <div style={panel}>
      <div style={title}>// traffic control</div>

      <div style={{marginBottom:16}}>
        <div style={{...lbl,marginBottom:8,display:"block"}}>ALGORITHM</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {ALGOS.map(a=>(
            <button key={a.id} style={algoBtn(algorithm===a.id)} onClick={()=>onAlgorithmChange(a.id)}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div style={row}>
        <span style={lbl}>RATE</span>
        <input type="range" min={1} max={100} value={config.rate}
          onChange={e=>onConfigChange({rate:parseInt(e.target.value)})}/>
        <span style={val}>{config.rate}<span style={{fontSize:10,color:"var(--text2)"}}>rps</span></span>
      </div>

      <div style={row}>
        <span style={lbl}>COMPLEXITY</span>
        <input type="range" min={10} max={200} step={10} value={config.complexity}
          onChange={e=>onConfigChange({complexity:parseInt(e.target.value)})}/>
        <span style={val}>{config.complexity}<span style={{fontSize:10,color:"var(--text2)"}}>ms</span></span>
      </div>

      <div style={row}>
        <span style={lbl}>FAIL RATE</span>
        <input type="range" min={0} max={50} step={1} value={Math.round(config.failRate*100)}
          onChange={e=>onConfigChange({failRate:parseInt(e.target.value)/100})}/>
        <span style={val}>{Math.round(config.failRate*100)}<span style={{fontSize:10,
          color:config.failRate>0?"var(--red)":"var(--text2)"}}>%</span></span>
      </div>

      <div style={{display:"flex",gap:10,marginTop:18}}>
        <button style={startBtn} onClick={isRunning?onStop:onStart}>
          {isRunning?<>■ STOP<span className="blink"> _</span></>:"▶ START TRAFFIC"}
        </button>
        <button style={resetBtn} onClick={onReset}>RESET</button>
      </div>
    </div>
  );
}