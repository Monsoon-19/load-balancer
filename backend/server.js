const express = require("express");
const app = express();
const PORT = parseInt(process.env.PORT || "3001");
const SERVER_ID = `backend-${PORT}`;
 
let requestCount = 0;
let totalLatency = 0;
let errorCount = 0;
let activeConnections = 0;
let isHealthy = true;
const latencyWindow = [];
const MAX_WINDOW = 100;
 
function recordLatency(ms) {
  latencyWindow.push(ms);
  if (latencyWindow.length > MAX_WINDOW) latencyWindow.shift();
  totalLatency += ms;
}
 
function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}
 
app.use(express.json());
 
app.use((req, res, next) => {
  activeConnections++;
  const start = Date.now();
  res.on("finish", () => {
    activeConnections--;
    const ms = Date.now() - start;
    requestCount++;
    recordLatency(ms);
    if (res.statusCode >= 500) errorCount++;
  });
  next();
});
 
app.get("/health", (req, res) => {
  if (!isHealthy) return res.status(503).json({ status: "unhealthy", server: SERVER_ID });
  res.json({ status: "healthy", server: SERVER_ID, port: PORT, uptime: process.uptime(), requestCount, activeConnections });
});
 
app.get("/task", async (req, res) => {
  if (!isHealthy) return res.status(503).json({ error: "server unhealthy", server: SERVER_ID });
  const complexity = parseInt(req.query.complexity || "50");
  const failRate = parseFloat(req.query.failRate || "0");
  if (Math.random() < failRate) return res.status(500).json({ error: "simulated failure", server: SERVER_ID });
  const baseDelay = Math.max(10, Math.min(300, complexity + Math.random() * 40 - 20));
  await new Promise((resolve) => setTimeout(resolve, baseDelay));
  res.json({ server: SERVER_ID, port: PORT, taskId: Math.random().toString(36).slice(2, 10), complexity, processingTime: Math.round(baseDelay), timestamp: new Date().toISOString(), activeConnections });
});
 
app.get("/metrics", (req, res) => {
  const avg = latencyWindow.length > 0 ? Math.round(latencyWindow.reduce((a, b) => a + b, 0) / latencyWindow.length) : 0;
  res.json({ server: SERVER_ID, port: PORT, requestCount, errorCount, activeConnections, avgLatency: avg, p50: percentile(latencyWindow, 50), p95: percentile(latencyWindow, 95), p99: percentile(latencyWindow, 99), isHealthy, uptime: Math.round(process.uptime()) });
});
 
app.post("/toggle-health", (req, res) => {
  isHealthy = !isHealthy;
  res.json({ server: SERVER_ID, isHealthy });
});
 
app.post("/reset", (req, res) => {
  requestCount = 0; totalLatency = 0; errorCount = 0; latencyWindow.length = 0;
  res.json({ server: SERVER_ID, reset: true });
});
 
app.listen(PORT, () => {
  console.log(`[${SERVER_ID}] Listening on http://localhost:${PORT}`);
});