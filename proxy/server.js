// proxy/server.js
// Central load-balancer proxy. Exposes:
//   POST /proxy/task         - forward to a backend via selected algorithm
//   GET  /proxy/metrics      - aggregated metrics from all backends
//   GET  /proxy/status       - pool status + algorithm
//   POST /proxy/algorithm    - switch algorithm at runtime
//   POST /proxy/reset        - reset all backend stats
//   POST /proxy/toggle/:port - toggle a backend's health (failure sim)

const express = require("express");
const http = require("http");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
 
const PROXY_PORT = parseInt(process.env.PROXY_PORT || "4000");
const BACKENDS = [
  { id: "backend-3001", url: "http://localhost:3001", port: 3001 },
  { id: "backend-3002", url: "http://localhost:3002", port: 3002 },
  { id: "backend-3003", url: "http://localhost:3003", port: 3003 },
];
 
const state = {};
BACKENDS.forEach((b) => {
  state[b.id] = { ...b, healthy: true, activeConnections: 0, requestCount: 0, totalLatency: 0, errorCount: 0, latencyWindow: [], consecutiveFailures: 0, lastCheck: null };
});
 
const MAX_WINDOW = 200;
const HEALTH_CHECK_INTERVAL_MS = 3000;
const UNHEALTHY_THRESHOLD = 2;
let currentAlgorithm = "round_robin";
let roundRobinIndex = 0;
 
function getLiveServers() { return Object.values(state).filter((s) => s.healthy); }
 
function selectRoundRobin() {
  const live = getLiveServers();
  if (!live.length) return null;
  const server = live[roundRobinIndex % live.length];
  roundRobinIndex++;
  return server;
}
 
function selectLeastConnections() {
  const live = getLiveServers();
  if (!live.length) return null;
  return live.reduce((min, s) => (s.activeConnections < min.activeConnections ? s : min));
}
 
function avgLatency(s) {
  if (!s.latencyWindow.length) return 0;
  return s.latencyWindow.reduce((a, b) => a + b, 0) / s.latencyWindow.length;
}
 
function selectLeastLatency() {
  const live = getLiveServers();
  if (!live.length) return null;
  return live.reduce((best, s) => (avgLatency(s) < avgLatency(best) ? s : best));
}
 
function selectBackend() {
  switch (currentAlgorithm) {
    case "least_connections": return selectLeastConnections();
    case "least_latency": return selectLeastLatency();
    default: return selectRoundRobin();
  }
}
 
function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}
 
function httpGet(url, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, body: data }); } });
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    req.on("error", reject);
  });
}
 
function httpPost(url, body, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const parsed = new URL(url);
    const options = { hostname: parsed.hostname, port: parsed.port, path: parsed.pathname + parsed.search, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }, timeout: timeoutMs };
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(data || "{}") }));
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}
 
async function checkHealth(server) {
  try {
    const res = await httpGet(`${server.url}/health`, 2000);
    server.lastCheck = new Date().toISOString();
    if (res.status === 200) {
      server.consecutiveFailures = 0;
      if (!server.healthy) console.log(`[proxy] ✅  ${server.id} recovered`);
      server.healthy = true;
    } else { throw new Error(`HTTP ${res.status}`); }
  } catch (err) {
    server.consecutiveFailures++;
    server.lastCheck = new Date().toISOString();
    if (server.consecutiveFailures >= UNHEALTHY_THRESHOLD && server.healthy) {
      server.healthy = false;
      console.log(`[proxy] ❌  ${server.id} marked unhealthy (${err.message})`);
    }
  }
}
 
function startHealthChecks() {
  setInterval(() => { Object.values(state).forEach(checkHealth); }, HEALTH_CHECK_INTERVAL_MS);
  Object.values(state).forEach(checkHealth);
}
 
app.all("/proxy/task", async (req, res) => {
  const server = selectBackend();
  if (!server) return res.status(503).json({ error: "no healthy backends" });
  server.activeConnections++;
  const start = Date.now();
  try {
    const qs = new URLSearchParams(req.query).toString();
    const result = await httpGet(`${server.url}/task${qs ? "?" + qs : ""}`, 8000);
    const latency = Date.now() - start;
    server.requestCount++;
    server.totalLatency += latency;
    server.latencyWindow.push(latency);
    if (server.latencyWindow.length > MAX_WINDOW) server.latencyWindow.shift();
    if (result.status >= 500) server.errorCount++;
    res.status(result.status).json({ ...result.body, _proxy: { algorithm: currentAlgorithm, selectedServer: server.id, proxyLatency: latency } });
  } catch (err) {
    server.errorCount++;
    server.consecutiveFailures++;
    res.status(502).json({ error: "upstream error", server: server.id, message: err.message });
  } finally { server.activeConnections--; }
});
 
app.get("/proxy/metrics", (req, res) => {
  const servers = Object.values(state).map((s) => ({
    id: s.id, port: s.port, healthy: s.healthy, activeConnections: s.activeConnections,
    requestCount: s.requestCount, errorCount: s.errorCount, avgLatency: Math.round(avgLatency(s)),
    p50: percentile(s.latencyWindow, 50), p95: percentile(s.latencyWindow, 95), p99: percentile(s.latencyWindow, 99),
    consecutiveFailures: s.consecutiveFailures, lastCheck: s.lastCheck,
    errorRate: s.requestCount > 0 ? ((s.errorCount / s.requestCount) * 100).toFixed(1) : "0.0",
  }));
  const totalReqs = servers.reduce((a, s) => a + s.requestCount, 0);
  const totalErrors = servers.reduce((a, s) => a + s.errorCount, 0);
  const allLatencies = Object.values(state).flatMap((s) => s.latencyWindow);
  res.json({ algorithm: currentAlgorithm, roundRobinIndex, totalRequests: totalReqs, totalErrors, overallErrorRate: totalReqs > 0 ? ((totalErrors / totalReqs) * 100).toFixed(1) : "0.0", overallP95: percentile(allLatencies, 95), overallP99: percentile(allLatencies, 99), liveServers: servers.filter((s) => s.healthy).length, totalServers: servers.length, servers, timestamp: new Date().toISOString() });
});
 
app.get("/proxy/status", (req, res) => {
  res.json({ algorithm: currentAlgorithm, servers: Object.values(state).map((s) => ({ id: s.id, port: s.port, healthy: s.healthy, activeConnections: s.activeConnections, consecutiveFailures: s.consecutiveFailures })) });
});
 
app.post("/proxy/algorithm", (req, res) => {
  const { algorithm } = req.body;
  const valid = ["round_robin", "least_connections", "least_latency"];
  if (!valid.includes(algorithm)) return res.status(400).json({ error: `algorithm must be one of: ${valid.join(", ")}` });
  currentAlgorithm = algorithm;
  roundRobinIndex = 0;
  console.log(`[proxy] algorithm switched to ${algorithm}`);
  res.json({ algorithm });
});
 
app.post("/proxy/reset", async (req, res) => {
  Object.values(state).forEach((s) => { s.requestCount = 0; s.totalLatency = 0; s.errorCount = 0; s.latencyWindow = []; s.consecutiveFailures = 0; });
  roundRobinIndex = 0;
  await Promise.allSettled(Object.values(state).map((s) => httpPost(`${s.url}/reset`, {})));
  res.json({ reset: true });
});
 
app.post("/proxy/toggle/:port", async (req, res) => {
  const port = parseInt(req.params.port);
  const server = Object.values(state).find((s) => s.port === port);
  if (!server) return res.status(404).json({ error: "server not found" });
  try {
    const result = await httpPost(`${server.url}/toggle-health`, {});
    res.json({ server: server.id, backendIsHealthy: result.body.isHealthy });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
 
app.listen(PROXY_PORT, () => {
  console.log(`[proxy] Load balancer running on http://localhost:${PROXY_PORT}`);
  startHealthChecks();
});