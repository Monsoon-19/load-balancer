// traffic-gen/generator.js
// Standalone traffic generator. Can also be driven by the frontend via
// the proxy's /proxy/traffic/start and /proxy/traffic/stop endpoints.
//
// Usage:
//   node generator.js
//   RATE=50 COMPLEXITY=80 DURATION=30 node generator.js

const http = require("http");
const PROXY_URL = process.env.PROXY_URL || "http://localhost:4000";
const RATE = parseInt(process.env.RATE || "20");
const COMPLEXITY = parseInt(process.env.COMPLEXITY || "50");
const DURATION_SEC = parseInt(process.env.DURATION || "0");
const FAIL_RATE = parseFloat(process.env.FAIL_RATE || "0");
 
let running = true;
let sentCount = 0, successCount = 0, errorCount = 0, totalLatency = 0;
const startTime = Date.now();
 
function httpGet(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, latency: Date.now() - start }));
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    req.on("error", reject);
  });
}
 
async function sendRequest() {
  sentCount++;
  try {
    const res = await httpGet(`${PROXY_URL}/proxy/task?complexity=${COMPLEXITY}&failRate=${FAIL_RATE}`);
    totalLatency += res.latency;
    res.status >= 200 && res.status < 400 ? successCount++ : errorCount++;
  } catch { errorCount++; }
}
 
function printStats() {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const rps = (sentCount / parseFloat(elapsed)).toFixed(1);
  const avgLat = sentCount > 0 ? Math.round(totalLatency / sentCount) : 0;
  const errRate = sentCount > 0 ? ((errorCount / sentCount) * 100).toFixed(1) : "0.0";
  process.stdout.write(`\r[${elapsed}s] sent=${sentCount} ok=${successCount} err=${errorCount} rate=${rps}rps avgLat=${avgLat}ms errRate=${errRate}%   `);
}
 
async function run() {
  const intervalMs = 1000 / RATE;
  console.log(`[traffic-gen] ${RATE} req/s, complexity=${COMPLEXITY}, duration=${DURATION_SEC || "∞"}s`);
  if (DURATION_SEC > 0) setTimeout(() => { running = false; console.log("\n[traffic-gen] Done."); printStats(); process.exit(0); }, DURATION_SEC * 1000);
  process.on("SIGINT", () => { running = false; console.log("\n[traffic-gen] Stopped."); printStats(); process.exit(0); });
  const statsInterval = setInterval(printStats, 500);
  while (running) { sendRequest(); await new Promise((r) => setTimeout(r, intervalMs)); }
  clearInterval(statsInterval);
}
run().catch(console.error);