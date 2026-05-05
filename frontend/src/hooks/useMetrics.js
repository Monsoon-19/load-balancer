// src/hooks/useMetrics.js
import { useState, useEffect, useRef, useCallback } from "react";
 
const PROXY = "";
const POLL_INTERVAL = 800;
const HISTORY_MAX = 120;
 
function initHistory() { return { labels: [], p95: [], p99: [], rps: [], servers: {} }; }
 
export function useMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState(initHistory);
  const [error, setError] = useState(null);
  const [isTrafficRunning, setIsTrafficRunning] = useState(false);
  const [trafficConfig, setTrafficConfig] = useState({ rate: 20, complexity: 50, failRate: 0 });
  const trafficRef = useRef(null);
  const prevCountRef = useRef(0);
  const lastTimestampRef = useRef(Date.now());
 
  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${PROXY}/proxy/metrics`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMetrics(data);
      setError(null);
      setHistory((prev) => {
        const now = new Date();
        const label = `${now.getMinutes().toString().padStart(2,"0")}:${now.getSeconds().toString().padStart(2,"0")}`;
        const elapsed = (Date.now() - lastTimestampRef.current) / 1000;
        lastTimestampRef.current = Date.now();
        const delta = data.totalRequests - prevCountRef.current;
        prevCountRef.current = data.totalRequests;
        const rps = elapsed > 0 ? Math.round(delta / elapsed) : 0;
        const labels = [...prev.labels, label].slice(-HISTORY_MAX);
        const p95 = [...prev.p95, data.overallP95 || 0].slice(-HISTORY_MAX);
        const p99 = [...prev.p99, data.overallP99 || 0].slice(-HISTORY_MAX);
        const rpsArr = [...prev.rps, rps].slice(-HISTORY_MAX);
        const servers = { ...prev.servers };
        data.servers.forEach((s) => { if (!servers[s.id]) servers[s.id] = []; servers[s.id] = [...servers[s.id], s.requestCount].slice(-HISTORY_MAX); });
        return { labels, p95, p99, rps: rpsArr, servers };
      });
    } catch (err) { setError(err.message); }
  }, []);
 
  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchMetrics]);
 
  const sendRequest = useCallback(async () => {
    const { complexity, failRate } = trafficConfig;
    try { await fetch(`${PROXY}/proxy/task?complexity=${complexity}&failRate=${failRate}`); } catch {}
  }, [trafficConfig]);
 
  const startTraffic = useCallback(() => {
    if (trafficRef.current) return;
    const intervalMs = Math.max(50, Math.round(1000 / trafficConfig.rate));
    trafficRef.current = setInterval(sendRequest, intervalMs);
    setIsTrafficRunning(true);
  }, [trafficConfig, sendRequest]);
 
  const stopTraffic = useCallback(() => {
    if (trafficRef.current) { clearInterval(trafficRef.current); trafficRef.current = null; }
    setIsTrafficRunning(false);
  }, []);
 
  const updateTrafficConfig = useCallback((updates) => {
    setTrafficConfig((prev) => {
      const next = { ...prev, ...updates };
      if (isTrafficRunning) {
        if (trafficRef.current) clearInterval(trafficRef.current);
        const intervalMs = Math.max(50, Math.round(1000 / next.rate));
        trafficRef.current = setInterval(sendRequest, intervalMs);
      }
      return next;
    });
  }, [isTrafficRunning, sendRequest]);
 
  const setAlgorithm = useCallback(async (algorithm) => {
    await fetch(`${PROXY}/proxy/algorithm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ algorithm }) });
    fetchMetrics();
  }, [fetchMetrics]);
 
  const resetMetrics = useCallback(async () => {
    await fetch(`${PROXY}/proxy/reset`, { method: "POST" });
    setHistory(initHistory());
    prevCountRef.current = 0;
    fetchMetrics();
  }, [fetchMetrics]);
 
  const toggleServer = useCallback(async (port) => {
    await fetch(`${PROXY}/proxy/toggle/${port}`, { method: "POST" });
    fetchMetrics();
  }, [fetchMetrics]);
 
  return { metrics, history, error, isTrafficRunning, trafficConfig, startTraffic, stopTraffic, updateTrafficConfig, setAlgorithm, resetMetrics, toggleServer };
}