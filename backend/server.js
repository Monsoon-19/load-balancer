// backend/server.js
// Three identical instances run on PORT=3001, 3002, 3003
// Endpoints: GET /health  GET /task  GET /metrics  POST /toggle-health  POST /reset

const express = require("express");
const app = express();
const PORT      = parseInt(process.env.PORT || "3001");
const SERVER_ID = `backend-${PORT}`;

// ── In-memory state ───────────────────────────────────────────────────────
let requestCount     = 0;
let errorCount       = 0;
let activeConnections = 0;
let isHealthy        = true;
const latencyWindow  = [];   // rolling last-100 samples
const MAX_WINDOW     = 100;

function recordLatency(ms) {
  latencyWindow.push(ms);
  if (latencyWindow.length > MAX_WINDOW) latencyWindow.shift();
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

// ── Middleware ────────────────────────────────────────────────────────────
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

// ── Routes ────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  if (!isHealthy)
    return res.status(503).json({ status: "unhealthy", server: SERVER_ID });
  res.json({
    status: "healthy", server: SERVER_ID, port: PORT,
    uptime: process.uptime(), requestCount, activeConnections,
  });
});

app.get("/task", async (req, res) => {
  if (!isHealthy)
    return res.status(503).json({ error: "server unhealthy", server: SERVER_ID });

  const complexity = parseInt(req.query.complexity || "50");
  const failRate   = parseFloat(req.query.failRate   || "0");

  if (Math.random() < failRate)
    return res.status(500).json({ error: "simulated failure", server: SERVER_ID });

  // Simulate variable CPU work
  const delay = Math.max(10, Math.min(300, complexity + Math.random() * 40 - 20));
  await new Promise(r => setTimeout(r, delay));

  res.json({
    server: SERVER_ID, port: PORT,
    taskId: Math.random().toString(36).slice(2, 10),
    complexity, processingTime: Math.round(delay),
    timestamp: new Date().toISOString(), activeConnections,
  });
});

app.get("/metrics", (req, res) => {
  const avg = latencyWindow.length
    ? Math.round(latencyWindow.reduce((a, b) => a + b, 0) / latencyWindow.length)
    : 0;
  res.json({
    server: SERVER_ID, port: PORT, requestCount, errorCount,
    activeConnections, avgLatency: avg,
    p50: percentile(latencyWindow, 50),
    p95: percentile(latencyWindow, 95),
    p99: percentile(latencyWindow, 99),
    isHealthy, uptime: Math.round(process.uptime()),
  });
});

app.post("/toggle-health", (req, res) => {
  isHealthy = !isHealthy;
  console.log(`[${SERVER_ID}] health toggled → ${isHealthy ? "healthy" : "unhealthy"}`);
  res.json({ server: SERVER_ID, isHealthy });
});

app.post("/reset", (req, res) => {
  requestCount = 0; errorCount = 0; latencyWindow.length = 0;
  res.json({ server: SERVER_ID, reset: true });
});

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[${SERVER_ID}] http://localhost:${PORT}`);
  console.log(`  GET  /health        GET  /task`);
  console.log(`  GET  /metrics       POST /toggle-health   POST /reset`);
});