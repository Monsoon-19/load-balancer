// frontend/src/components/RpsChart.jsx
import React, { useRef, useEffect } from "react";
import { Chart, BarElement, BarController, CategoryScale, LinearScale, Tooltip } from "chart.js";
Chart.register(BarElement, BarController, CategoryScale, LinearScale, Tooltip);

const OPTS={
  responsive:true,maintainAspectRatio:false,animation:{duration:150},
  plugins:{legend:{display:false},
    tooltip:{backgroundColor:"#111418",borderColor:"#2a3140",borderWidth:1,
      titleColor:"#c8d4e0",bodyColor:"#6b7f96",
      titleFont:{family:"IBM Plex Mono",size:11},bodyFont:{family:"IBM Plex Mono",size:11},
      callbacks:{label:ctx=>` ${ctx.parsed.y} req/s`}}},
  scales:{
    x:{ticks:{color:"#3d4f62",font:{family:"IBM Plex Mono",size:10},maxTicksLimit:8,maxRotation:0},grid:{display:false}},
    y:{ticks:{color:"#3d4f62",font:{family:"IBM Plex Mono",size:10},callback:v=>`${v}rps`},grid:{color:"#1e242e"},min:0},
  },
};

export default function RpsChart({history}){
  const canvasRef=useRef(null), chartRef=useRef(null);
  useEffect(()=>{
    const ctx=canvasRef.current.getContext("2d");
    chartRef.current=new Chart(ctx,{type:"bar",data:{labels:[],datasets:[
      {label:"RPS",data:[],backgroundColor:"rgba(0,229,160,0.25)",borderColor:"#00e5a0",borderWidth:1,borderRadius:2},
    ]},options:OPTS});
    return ()=>chartRef.current?.destroy();
  },[]);
  useEffect(()=>{
    const c=chartRef.current;
    if(!c||!history?.labels?.length) return;
    c.data.labels=history.labels;
    c.data.datasets[0].data=history.rps;
    c.update("none");
  },[history]);
  return <div style={{height:160,position:"relative"}}><canvas ref={canvasRef}/></div>;
}