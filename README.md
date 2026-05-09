#Live link - https://loadp.netlify.app/


# PerfDash — Load Balancer Performance Testing Dashboard

A full-stack performance testing and observability dashboard with a round-robin / least-connections / least-latency load balancer, real-time metrics, traffic generation, health checks, and failure simulation.

```
┌─────────────┐     ┌──────────────────────────────────────┐
│  Frontend   │────▶│  Proxy :4000                         │
│  :5173      │     │  ├── Round-robin / Least-conn / Lat  │
└─────────────┘     │  ├── Health checker (3s interval)    │
                    │  └── Metrics aggregator              │
                    └──────┬──────────────────────────────-┘
                           │
               ┌───────────┼───────────┐
               ▼           ▼           ▼
          :3001         :3002       :3003
        Backend       Backend     Backend
        (Express)     (Express)   (Express)
```

## Quick Start

### 1. Install dependencies

```bash
# From project root
npm install
cd backend && npm install
cd ../proxy && npm install
cd ../frontend && npm install
cd ..
```

### 2. Start all services

**Option A — All in one (requires `concurrently`)**
```bash
npm run dev
```

**Option B — Individual terminals**
```bash
# Terminal 1 — Backend 1
cd backend && PORT=3001 node server.js

# Terminal 2 — Backend 2
cd backend && PORT=3002 node server.js

# Terminal 3 — Backend 3
cd backend && PORT=3003 node server.js

# Terminal 4 — Proxy / Load Balancer
cd proxy && node server.js

# Terminal 5 — Frontend dashboard
cd frontend && npm run dev
```

### 3. Open the dashboard

```
http://localhost:5173
```

### 4. (Optional) Run standalone traffic generator

```bash
cd traffic-gen && node generator.js

# With options
RATE=50 COMPLEXITY=100 DURATION=30 node generator.js

# Burst test
cd traffic-gen && npm run burst
```

---

## Service Endpoints

| Service    | Port | Key Endpoints                                      |
|------------|------|----------------------------------------------------|
| Backend ×3 | 3001–3003 | `GET /health`, `GET /task`, `GET /metrics`, `POST /toggle-health` |
| Proxy      | 4000 | `GET /proxy/task`, `GET /proxy/metrics`, `POST /proxy/algorithm`, `POST /proxy/toggle/:port` |
| Frontend   | 5173 | Dashboard UI                                       |

---

## Features

### Load Balancing Algorithms (switch live from the dashboard)
- **Round Robin** — equal distribution, predictable rotation
- **Least Connections** — routes to backend with fewest active requests
- **Least Latency** — routes to fastest-responding backend

### Traffic Control (in-browser traffic generator)
- Adjustable requests/sec (1–100 rps)
- Adjustable task complexity (10–200ms simulated work)
- Adjustable failure injection rate (0–50%)
- One-click start/stop

### Health Checks
- Automatic health polling every 3 seconds per backend
- Backends marked unhealthy after 2 consecutive failures
- Automatic recovery detection and re-admission to pool
- Manual failure simulation via "SIMULATE FAILURE" button

### Metrics
- Per-backend: request count, avg latency, p50/p95/p99, error rate, active connections
- Global: total requests, overall error rate, p95/p99, live server count
- Time-series history: latency chart (p95/p99), RPS bar chart

---

## Project Structure

```
perf-dashboard/
├── backend/
│   ├── server.js         # Express server: /task /health /metrics
│   └── package.json
├── proxy/
│   ├── server.js         # Load balancer + health checker + metrics
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx                   # Main dashboard layout
│       ├── index.css                 # Theme variables
│       ├── main.jsx
│       ├── hooks/
│       │   └── useMetrics.js         # Polling, traffic gen, control actions
│       └── components/
│           ├── ServerCard.jsx        # Per-backend status + failure sim
│           ├── LatencyChart.jsx      # p95/p99 line chart (Chart.js)
│           ├── RpsChart.jsx          # Requests/sec bar chart
│           ├── TrafficPanel.jsx      # Algorithm + traffic controls
│           └── StatsBar.jsx          # Top-level summary numbers
├── traffic-gen/
│   ├── generator.js      # Standalone CLI traffic generator
│   └── package.json
└── package.json          # Workspace root with concurrently
```

---

## Configuration

### Backend task complexity
Query params on `/task`:
```
GET /task?complexity=100&failRate=0.1
```
- `complexity` — base delay in ms (10–300)
- `failRate` — 0.0 to 1.0 probability of returning 500

### Proxy algorithm switching (REST)
```bash
curl -X POST http://localhost:4000/proxy/algorithm \
  -H "Content-Type: application/json" \
  -d '{"algorithm": "least_connections"}'
# Options: "round_robin" | "least_connections" | "least_latency"
```

### Failure simulation (REST)
```bash
# Toggle backend 3002 unhealthy
curl -X POST http://localhost:4000/proxy/toggle/3002

# Toggle back healthy
curl -X POST http://localhost:4000/proxy/toggle/3002
```

---

## Extending to Production

### Add Redis for persistent metrics
Replace the in-memory `latencyWindow` arrays in `proxy/server.js` with Redis sorted sets. Use `ZADD` to append latencies with timestamps, `ZRANGEBYSCORE` for time-windowed percentiles.

```js
// proxy/server.js — add to recordLatency():
await redis.zadd(`lat:${serverId}`, Date.now(), latencyMs);
await redis.zremrangebyscore(`lat:${serverId}`, 0, Date.now() - 60000);
```

### Multiple proxy instances
Add a Redis-backed shared counter for round-robin state and connection counts:
```js
const count = await redis.incr("rr:counter");
const idx = count % liveServers.length;
```

### TLS termination
Pass `https.createServer({ key, cert }, app)` in the proxy. For Let's Encrypt:
```bash
npm install greenlock-express
```

### Docker Compose
```yaml
version: "3.9"
services:
  backend1: { build: ./backend, environment: [PORT=3001], ports: ["3001:3001"] }
  backend2: { build: ./backend, environment: [PORT=3002], ports: ["3002:3002"] }
  backend3: { build: ./backend, environment: [PORT=3003], ports: ["3003:3003"] }
  proxy:    { build: ./proxy,   ports: ["4000:4000"], depends_on: [backend1, backend2, backend3] }
  frontend: { build: ./frontend, ports: ["5173:5173"], depends_on: [proxy] }
```

### Prometheus + Grafana
Expose a `/metrics` endpoint in Prometheus text format from the proxy:
```js
const client = require("prom-client");
const histogram = new client.Histogram({ name: "proxy_latency_ms", buckets: [10,50,100,200,500] });
```
Then scrape with Prometheus and build a Grafana dashboard from the collected data.

### Rate limiting
Add `express-rate-limit` to the proxy:
```js
const rateLimit = require("express-rate-limit");
app.use("/proxy/task", rateLimit({ windowMs: 1000, max: 200 }));
```

### Adaptive algorithm switching
In `proxy/server.js`, add a background task that measures p99 latency per algorithm every 30s and auto-switches if p99 exceeds a threshold:
```js
setInterval(() => {
  const p99 = percentile(allLatencies, 99);
  if (p99 > 500 && currentAlgorithm === "round_robin") {
    currentAlgorithm = "least_connections";
  }
}, 30_000);
```

---

## Confirmed Assumptions

| Assumption | Decision |
|---|---|
| Language | Node.js (no transpilation needed, runs directly) |
| Backend framework | Express (minimal, familiar) |
| Frontend build | Vite + React (fast HMR, no Next.js overhead for a SPA dashboard) |
| Charts | Chart.js via react-chartjs-2 |
| Persistence | In-memory (swap Redis per instructions above) |
| Traffic generator | Both in-browser (useMetrics hook) and standalone CLI script |
| Proxy forwarding | Native `http` module (no `http-proxy` dep needed at this scope) |
| Health check | Active polling every 3s, threshold 2 failures |
| Frontend proxy | Vite dev server proxies `/proxy/*` to `:4000` (no CORS needed) |
