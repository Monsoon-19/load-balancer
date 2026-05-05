import React, { useRef, useEffect } from "react";
import { Chart, LineElement, PointElement, LineController, CategoryScale, LinearScale, Filler, Tooltip, Legend } from "chart.js";
Chart.register(LineElement, PointElement, LineController, CategoryScale, LinearScale, Filler, Tooltip, Legend);
const OPTS = {
  responsive:true, maintainAspectRatio:false, animation:{duration:200},
  interaction:{mode:"index",intersect:false},
  plugins:{
    legend:{labels:{color:"#6b7f96",font:{family:"IBM Plex Mono",size:11},boxWidth:12,padding:16}},
    tooltip:{backgroundColor:"#111418",borderColor:"#2a3140",borderWidth:1,titleColor:"#c8d4e0",bodyColor:"#6b7f96",titleFont:{family:"IBM Plex Mono",size:11},bodyFont:{family:"IBM Plex Mono",size:11},callbacks:{label:(ctx)=>` ${ctx.dataset.label}: ${ctx.parsed.y}ms`}},
  },
  scales:{
    x:{ticks:{color:"#3d4f62",font:{family:"IBM Plex Mono",size:10},maxTicksLimit:8,maxRotation:0},grid:{color:"#1e242e"}},
    y:{ticks:{color:"#3d4f62",font:{family:"IBM Plex Mono",size:10},callback:(v)=>`${v}ms`},grid:{color:"#1e242e"},min:0},
  },
};
export default function LatencyChart({ history }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    chartRef.current = new Chart(ctx, { type:"line", data:{ labels:[], datasets:[
      {label:"p95",data:[],borderColor:"#00d4ff",backgroundColor:"rgba(0,212,255,0.06)",borderWidth:1.5,pointRadius:0,fill:true,tension:0.4},
      {label:"p99",data:[],borderColor:"#a78bfa",backgroundColor:"rgba(167,139,250,0.04)",borderWidth:1.5,pointRadius:0,fill:true,tension:0.4},
    ]}, options:OPTS });
    return () => chartRef.current?.destroy();
  }, []);
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !history?.labels?.length) return;
    chart.data.labels = history.labels;
    chart.data.datasets[0].data = history.p95;
    chart.data.datasets[1].data = history.p99;
    chart.update("none");
  }, [history]);
  return <div style={{height:180,position:"relative"}}><canvas ref={canvasRef} /></div>;
}