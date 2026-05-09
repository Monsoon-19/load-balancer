// frontend/src/hooks/useMetrics.js — v2
// Polls /proxy/metrics every 800ms and /proxy/log every 2s.
// Persists chart history to localStorage (5-min TTL).
// Drives in-browser traffic generator.

import { useState, useEffect, useRef, useCallback } from "react";

const PROXY         = import.meta.env.VITE_PROXY_URL || "";
const POLL_MS       = 800;
const HISTORY_MAX   = 120;
const STORAGE_KEY   = "perfdash_history_v2";
const STORAGE_TTL   = 5 * 60 * 1000;

function initHistory() {
  return { labels:[], p95:[], p99:[], rps:[], servers:{} };
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initHistory();
    const { history, savedAt } = JSON.parse(raw);
    if (Date.now() - savedAt > STORAGE_TTL) return initHistory();
    return history;
  } catch { return initHistory(); }
}

function saveHistory(h) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ history:h, savedAt:Date.now() })); }
  catch {}
}

export function useMetrics() {
  const [metrics, setMetrics]           = useState(null);
  const [history, setHistory]           = useState(loadHistory);
  const [error, setError]               = useState(null);
  const [requestLog, setRequestLog]     = useState([]);
  const [isTrafficRunning, setRunning]  = useState(false);
  const [trafficConfig, setConfig]      = useState({ rate:20, complexity:50, failRate:0 });

  const trafficRef   = useRef(null);
  const prevCountRef = useRef(0);
  const lastTsRef    = useRef(Date.now());

  // ── Metrics polling ──────────────────────────────────────────────────
  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${PROXY}/proxy/metrics`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMetrics(data);
      setError(null);

      setHistory(prev => {
        const now   = new Date();
        const label = `${now.getMinutes().toString().padStart(2,"0")}:${now.getSeconds().toString().padStart(2,"0")}`;
        const elapsed = (Date.now() - lastTsRef.current) / 1000;
        lastTsRef.current = Date.now();
        // FIX: if proxy restarted totalRequests resets — avoid negative delta
        const delta = data.totalRequests >= prevCountRef.current
          ? data.totalRequests - prevCountRef.current : data.totalRequests;
        prevCountRef.current = data.totalRequests;
        const rps = elapsed > 0 ? Math.max(0, Math.round(delta / elapsed)) : 0;

        const next = {
          labels:  [...prev.labels, label].slice(-HISTORY_MAX),
          p95:     [...prev.p95,    data.overallP95||0].slice(-HISTORY_MAX),
          p99:     [...prev.p99,    data.overallP99||0].slice(-HISTORY_MAX),
          rps:     [...prev.rps,    rps].slice(-HISTORY_MAX),
          servers: { ...prev.servers },
        };
        data.servers.forEach(s => {
          if (!next.servers[s.id]) next.servers[s.id] = [];
          next.servers[s.id] = [...next.servers[s.id], s.requestCount].slice(-HISTORY_MAX);
        });
        setTimeout(() => saveHistory(next), 0);
        return next;
      });
    } catch (e) {
      setError(e.message.includes("Failed to fetch")
        ? "Cannot reach proxy — is it running on :4000?"
        : e.message);
    }
  }, []);

  // ── Log polling ──────────────────────────────────────────────────────
  const fetchLog = useCallback(async () => {
    try {
      const res  = await fetch(`${PROXY}/proxy/log?n=20`);
      const data = await res.json();
      setRequestLog(data.entries || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchMetrics(); fetchLog();
    const m = setInterval(fetchMetrics, POLL_MS);
    const l = setInterval(fetchLog, 2000);
    return () => { clearInterval(m); clearInterval(l); };
  }, [fetchMetrics, fetchLog]);

  // ── Traffic generator ────────────────────────────────────────────────
  const sendRequest = useCallback(async () => {
    const { complexity, failRate } = trafficConfig;
    try { await fetch(`${PROXY}/proxy/task?complexity=${complexity}&failRate=${failRate}`); } catch {}
  }, [trafficConfig]);

  const startTraffic = useCallback(() => {
    if (trafficRef.current) return;
    trafficRef.current = setInterval(sendRequest, Math.max(50, Math.round(1000/trafficConfig.rate)));
    setRunning(true);
  }, [trafficConfig, sendRequest]);

  const stopTraffic = useCallback(() => {
    if (trafficRef.current) { clearInterval(trafficRef.current); trafficRef.current=null; }
    setRunning(false);
  }, []);

  const updateTrafficConfig = useCallback(updates => {
    setConfig(prev => {
      const next = { ...prev, ...updates };
      if (trafficRef.current) {
        clearInterval(trafficRef.current);
        trafficRef.current = setInterval(sendRequest, Math.max(50, Math.round(1000/next.rate)));
      }
      return next;
    });
  }, [sendRequest]);

  // ── Control actions ──────────────────────────────────────────────────
  const setAlgorithm = useCallback(async algo => {
    await fetch(`${PROXY}/proxy/algorithm`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({algorithm:algo})});
    fetchMetrics();
  }, [fetchMetrics]);

  const resetMetrics = useCallback(async () => {
    await fetch(`${PROXY}/proxy/reset`,{method:"POST"});
    const fresh = initHistory();
    setHistory(fresh); saveHistory(fresh);
    prevCountRef.current = 0;
    setRequestLog([]);
    fetchMetrics();
  }, [fetchMetrics]);

  const toggleServer = useCallback(async port => {
    await fetch(`${PROXY}/proxy/toggle/${port}`,{method:"POST"});
    fetchMetrics();
  }, [fetchMetrics]);

  const setWeight = useCallback(async (id, weight) => {
    await fetch(`${PROXY}/proxy/weight/${id}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({weight})});
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, history, error, requestLog, isTrafficRunning, trafficConfig,
           startTraffic, stopTraffic, updateTrafficConfig,
           setAlgorithm, resetMetrics, toggleServer, setWeight };
}