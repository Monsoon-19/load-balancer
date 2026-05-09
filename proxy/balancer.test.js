// proxy/balancer.test.js  — run with: node --test balancer.test.js
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Pure helpers (mirrors proxy/server.js exactly)
function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a,b)=>a-b);
  return sorted[Math.max(0, Math.ceil((p/100)*sorted.length)-1)];
}
function avgLat(s) {
  if (!s.latencyWindow.length) return 0;
  return s.latencyWindow.reduce((a,b)=>a+b,0)/s.latencyWindow.length;
}
function makeServer(id, o={}) {
  return {id, port:3000, cbState:"CLOSED", weight:1, activeConnections:0, latencyWindow:[], ...o};
}
function makeRR(servers) {
  let idx=0;
  return ()=>{
    const live=servers.filter(s=>s.cbState==="CLOSED");
    if(!live.length) return null;
    const pool=live.flatMap(s=>Array(s.weight||1).fill(s));
    return pool[(idx++)%pool.length];
  };
}

// Circuit breaker helpers
function onSuccess(s){ s.consecutiveFailures=0; s.cbState="CLOSED"; }
function onFailure(s,threshold=2){
  s.consecutiveFailures++; s.lastFailureTime=Date.now();
  if(s.cbState==="CLOSED"&&s.consecutiveFailures>=threshold) s.cbState="OPEN";
  else if(s.cbState==="HALF_OPEN") s.cbState="OPEN";
}

describe("percentile", ()=>{
  it("returns 0 for empty", ()=> assert.equal(percentile([],95),0));
  it("single element", ()=> assert.equal(percentile([42],50),42));
  it("p50 of odd array", ()=> assert.equal(percentile([10,20,30,40,50],50),30));
  it("p100 = max", ()=> assert.equal(percentile([5,15,25,35],100),35));
  it("order-independent", ()=> assert.equal(percentile([100,1,50,25,75],50),50));
});

describe("avgLat", ()=>{
  it("empty → 0", ()=> assert.equal(avgLat(makeServer("a")),0));
  it("averages correctly", ()=> assert.equal(avgLat(makeServer("a",{latencyWindow:[10,20,30]})),20));
});

describe("round-robin (equal weights)", ()=>{
  it("cycles all servers", ()=>{
    const srvs=["a","b","c"].map(id=>makeServer(id));
    const next=makeRR(srvs);
    assert.equal(next().id,"a");
    assert.equal(next().id,"b");
    assert.equal(next().id,"c");
    assert.equal(next().id,"a");
  });
  it("skips OPEN servers", ()=>{
    const srvs=[makeServer("a"),makeServer("b",{cbState:"OPEN"}),makeServer("c")];
    const next=makeRR(srvs);
    const ids=[next(),next(),next(),next()].map(s=>s.id);
    assert.ok(!ids.includes("b"));
    assert.equal(ids[0],"a"); assert.equal(ids[1],"c");
  });
  it("null when all OPEN", ()=>{
    assert.equal(makeRR([makeServer("a",{cbState:"OPEN"})])(),null);
  });
});

describe("weighted round-robin", ()=>{
  it("distributes by weight", ()=>{
    const srvs=[makeServer("a",{weight:2}),makeServer("b",{weight:1})];
    const next=makeRR(srvs);
    const sel=Array.from({length:30},()=>next().id);
    assert.equal(sel.filter(x=>x==="a").length,20);
    assert.equal(sel.filter(x=>x==="b").length,10);
  });
});

describe("circuit breaker", ()=>{
  it("CLOSED→OPEN after threshold", ()=>{
    const s=makeServer("a",{consecutiveFailures:0});
    onFailure(s); assert.equal(s.cbState,"CLOSED");
    onFailure(s); assert.equal(s.cbState,"OPEN");
  });
  it("HALF_OPEN→CLOSED on success", ()=>{
    const s=makeServer("a",{cbState:"HALF_OPEN",consecutiveFailures:2});
    onSuccess(s); assert.equal(s.cbState,"CLOSED"); assert.equal(s.consecutiveFailures,0);
  });
  it("HALF_OPEN→OPEN on probe failure", ()=>{
    const s=makeServer("a",{cbState:"HALF_OPEN",consecutiveFailures:2});
    onFailure(s); assert.equal(s.cbState,"OPEN");
  });
});