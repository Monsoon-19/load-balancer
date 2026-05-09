// traffic-gen/generator.js — standalone CLI traffic generator
// Usage: node generator.js
// Env:   RATE=50  COMPLEXITY=80  DURATION=30  FAIL_RATE=0.1

const http     = require("http");
const PROXY    = process.env.PROXY_URL  || "http://localhost:4000";
const RATE     = parseInt(process.env.RATE        || "20");
const CMPLX    = parseInt(process.env.COMPLEXITY  || "50");
const DURATION = parseInt(process.env.DURATION    || "0");
const FAIL     = parseFloat(process.env.FAIL_RATE || "0");

let running=true, sent=0, ok=0, err=0, totalLat=0;
const t0=Date.now();

function get(url, ms=5000) {
  return new Promise((res,rej)=>{
    const s=Date.now();
    const r=http.get(url,{timeout:ms},resp=>{
      let d=""; resp.on("data",c=>d+=c);
      resp.on("end",()=>res({status:resp.statusCode,lat:Date.now()-s}));
    });
    r.on("timeout",()=>{r.destroy();rej(new Error("timeout"))});
    r.on("error",rej);
  });
}

async function fire() {
  sent++;
  try {
    const r=await get(`${PROXY}/proxy/task?complexity=${CMPLX}&failRate=${FAIL}`);
    totalLat+=r.lat;
    r.status<400 ? ok++ : err++;
  } catch { err++; }
}

function stats() {
  const el=((Date.now()-t0)/1000).toFixed(1);
  const rps=(sent/parseFloat(el)).toFixed(1);
  const avg=sent?Math.round(totalLat/sent):0;
  const er=sent?((err/sent)*100).toFixed(1):"0.0";
  process.stdout.write(`\r[${el}s] sent=${sent} ok=${ok} err=${err} rps=${rps} avgLat=${avg}ms errRate=${er}%   `);
}

async function run() {
  const ms=1000/RATE;
  console.log(`[traffic-gen] ${RATE}rps  complexity=${CMPLX}ms  duration=${DURATION||"∞"}s  failRate=${FAIL}`);
  if(DURATION>0) setTimeout(()=>{ running=false; console.log("\nDone."); stats(); process.exit(0); },DURATION*1000);
  process.on("SIGINT",()=>{ running=false; console.log("\nStopped."); stats(); process.exit(0); });
  const si=setInterval(stats,500);
  while(running){ fire(); await new Promise(r=>setTimeout(r,ms)); }
  clearInterval(si);
}
run().catch(console.error);