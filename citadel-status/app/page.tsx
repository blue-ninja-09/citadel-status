"use client";

import { useEffect, useState, useCallback } from "react";
import { UserButton } from "@clerk/nextjs";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "https://status-api.citadelservers.online";
const REFRESH_MS = 10000;

function barClass(pct: number) {
  if (pct < 60) return "ok";
  if (pct < 85) return "warn";
  return "danger";
}

export default function Dashboard() {
  const [stats, setStats]       = useState<any>(null);
  const [amp, setAmp]           = useState<any>(null);
  const [tunnels, setTunnels]   = useState<any>(null);
  const [sql, setSql]           = useState<any>(null);
  const [history, setHistory]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [allDown, setAllDown]   = useState(false);
  const [lastUpdate, setLastUpdate] = useState("");
  const [countdown, setCountdown]   = useState(REFRESH_MS / 1000);
  const [toast, setToast]       = useState("");

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address).then(() => {
      setToast(`Copied ${address}`);
      setTimeout(() => setToast(""), 2000);
    });
  };

  const fetchAll = useCallback(async () => {
    const [sRes, aRes, tRes, sqlRes, hRes] = await Promise.allSettled([
      fetch(`${API}/stats`,   { signal: AbortSignal.timeout(6000) }),
      fetch(`${API}/amp`,     { signal: AbortSignal.timeout(6000) }),
      fetch(`${API}/tunnels`, { signal: AbortSignal.timeout(8000) }),
      fetch(`${API}/sql`,     { signal: AbortSignal.timeout(5000) }),
      fetch(`${API}/history`, { signal: AbortSignal.timeout(8000) }),
    ]);

    const s   = sRes.status === "fulfilled" && sRes.value.ok ? await sRes.value.json() : null;
    const a   = aRes.status === "fulfilled" && aRes.value.ok ? await aRes.value.json() : null;
    const t   = tRes.status === "fulfilled" && tRes.value.ok ? await tRes.value.json() : null;
    const sq  = sqlRes.status === "fulfilled" && sqlRes.value.ok ? await sqlRes.value.json() : null;
    const h   = hRes.status === "fulfilled" && hRes.value.ok ? await hRes.value.json() : null;

    if (!s && !a && !t && !sq && !h) {
      setAllDown(true);
      document.title = "⚠️ Citadel Status";
    } else {
      setAllDown(false);
      if (s) setStats(s);
      if (a) setAmp(a);
      if (t) setTunnels(t);
      if (sq) setSql(sq);
      if (h) setHistory(h);

      const anyDown = a?.instances?.some((i: any) => !i.running);
      document.title = anyDown ? "⚠️ Citadel Status" : "Citadel Status";
    }

    setLastUpdate(new Date().toLocaleTimeString());
    setCountdown(REFRESH_MS / 1000);
    setLoading(false);
  }, []);


  useEffect(() => {
    fetchAll();
    const fetchId = setInterval(fetchAll, REFRESH_MS);
    return () => clearInterval(fetchId);
  }, [fetchAll]);

  // Countdown timer
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(c => c <= 1 ? REFRESH_MS / 1000 : c - 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Connecting...
      </div>
    );
  }

  if (allDown) {
    return (
      <div className="app">
        <div className="all-down">
          <div className="all-down-title">Everything is <span>Down</span></div>
          <div className="all-down-sub">
            No systems are responding. Contact{" "}
            <strong style={{ color: "var(--text-bright)" }}>Caelum</strong> immediately.
          </div>
          {lastUpdate && (
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
              Last checked at {lastUpdate}
            </div>
          )}
        </div>
      </div>
    );
  }

  const cpu  = stats?.cpu;
  const mem  = stats?.memory;
  const disk = stats?.disk;
  const gpu  = stats?.gpu?.[0];

  return (
    <div className="app">
      {toast && <div className="toast">{toast}</div>}

      {/* Nav */}
      <nav className="nav">
        <div className="logo">Citadel <span>Status</span></div>
        <div className="nav-right">
          <div className="live-badge">
            <div className="live-dot" /> Live
          </div>
          <div className="last-updated">
            {lastUpdate} · refresh in {countdown}s
          </div>
          <UserButton />
        </div>
      </nav>

      {/* System */}
      <div className="section">
        <div className="section-title">System</div>
        <div className="stat-grid">
          <div className="stat-block">
            <div className="stat-name">CPU</div>
            <div className="stat-val">{cpu?.percent ?? "—"}<span className="stat-unit">%</span></div>
            <div className="stat-lbl">{cpu ? `${cpu.cores_physical}C · ${cpu.cores_logical}T · ${cpu.freq_mhz} MHz` : ""}</div>
            {cpu && <div className="bar"><div className={`bar-fill ${barClass(cpu.percent)}`} style={{ width: `${cpu.percent}%` }} /></div>}
          </div>
          <div className="stat-block">
            <div className="stat-name">Memory</div>
            <div className="stat-val">{mem?.used_gb ?? "—"}<span className="stat-unit"> GB</span></div>
            <div className="stat-lbl">{mem ? `of ${mem.total_gb} GB` : ""}</div>
            {mem && <div className="bar"><div className={`bar-fill ${barClass(mem.percent)}`} style={{ width: `${mem.percent}%` }} /></div>}
          </div>
          <div className="stat-block">
            <div className="stat-name">Disk (C:)</div>
            <div className="stat-val">{disk?.used_gb ?? "—"}<span className="stat-unit"> GB</span></div>
            <div className="stat-lbl">{disk ? `of ${disk.total_gb} GB` : ""}</div>
            {disk && <div className="bar"><div className={`bar-fill ${barClass(disk.percent)}`} style={{ width: `${disk.percent}%` }} /></div>}
          </div>
          <div className="stat-block">
            <div className="stat-name">GPU</div>
            <div className="stat-val" style={{ fontSize: 16, paddingTop: 4 }}>{gpu?.name ?? "—"}</div>
            <div className="stat-lbl" style={{ marginTop: 6 }}>{gpu?.shared ? "Shared memory" : gpu?.vram_total_mb ? `${Math.round(gpu.vram_total_mb / 1024)} GB VRAM` : ""}</div>
          </div>
        </div>
      </div>

      {/* Tunnels */}
      <div className="section">
        <div className="section-title">
          Cloudflare Tunnels
          {tunnels && (
            <span style={{ marginLeft: 10, color: "var(--text-dim)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
              {tunnels.tunnels.filter((t: any) => t.up).length}/{tunnels.tunnels.length} online
            </span>
          )}
        </div>
        <div className="list">
          {tunnels ? tunnels.tunnels.map((t: any) => (
            <div className="list-row" key={t.url}>
              <div>
                <div className="list-name">{t.name}</div>
                <div className="list-sub">{t.url}</div>
              </div>
              <div className={`pill ${t.up ? "up" : "down"}`}>{t.up ? "Online" : "Down"}</div>
            </div>
          )) : (
            <div className="list-row"><div className="list-sub">Unavailable</div></div>
          )}
          {sql && (
            <div className="list-row">
              <div>
                <div className="list-name">MySQL (XAMPP)</div>
                <div className="list-sub">localhost:3306 · Global ban database</div>
              </div>
              <div className={`pill ${sql.mysql ? "up" : "down"}`}>{sql.mysql ? "Online" : "Down"}</div>
            </div>
          )}
        </div>
      </div>

      {/* AMP */}
      <div className="section">
        <div className="section-title">
          Game Servers
          {amp && (
            <span style={{ marginLeft: 10, color: "var(--text-dim)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
              {amp.instances.filter((i: any) => i.running).length}/{amp.instances.length} running
            </span>
          )}
        </div>
        <div className="amp-list">
          {amp?.instances?.length ? amp.instances.map((inst: any) => {
            const memPct = inst.memory_max_mb ? Math.round(inst.memory_mb / inst.memory_max_mb * 100) : 0;
            return (
              <div className="amp-row" key={inst.id}>
                <div className="amp-row-header">
                  <div>
                    <div className="amp-name">{inst.name}</div>
                    {inst.public_address && (
                      <div className="amp-address" onClick={() => copyAddress(inst.public_address)} title="Click to copy">
                        {inst.public_address} <span className="copy-icon">⎘</span>
                      </div>
                    )}
                  </div>
                  <div className={`pill ${inst.running ? inst.app_state === 50 ? "sleeping" : "up" : "down"}`}>
                    {inst.running ? inst.app_state === 50 ? "Sleeping" : "Online" : "Offline"}
                  </div>
                </div>
                <div className="amp-metrics">
                  <div>
                    <div className="amp-metric-val">{inst.cpu_percent != null ? `${inst.cpu_percent}%` : "—"}</div>
                    <div className="amp-metric-lbl">CPU</div>
                  </div>
                  <div>
                    <div className="amp-metric-val">{inst.memory_mb != null ? `${inst.memory_mb} MB` : "—"}</div>
                    <div className="amp-metric-lbl">Memory</div>
                  </div>
                  <div>
                    <div className="amp-metric-val">{inst.tps != null ? `${inst.tps}/${inst.tps_max}` : "—"}</div>
                    <div className="amp-metric-lbl">TPS</div>
                  </div>
                  <div>
                    <div className="amp-metric-val">{inst.players != null ? `${inst.players}/${inst.max_players}` : "—"}</div>
                    <div className="amp-metric-lbl">Players</div>
                  </div>
                </div>
                {inst.running && inst.memory_max_mb && (
                  <div className="bar">
                    <div className={`bar-fill ${barClass(memPct)}`} style={{ width: `${Math.min(100, memPct)}%` }} />
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="amp-row"><div style={{ color: "var(--text-dim)", fontSize: 13 }}>No instances available</div></div>
          )}
        </div>
      </div>

      {/* History */}
      {history?.system?.length > 1 && (
        <div className="section">
          <div className="section-title">Last 24 Hours — System</div>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={history.system} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <XAxis dataKey="time" tick={{ fill: "#555", fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#555", fontSize: 11 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #1f1f1f", color: "#f0ece8", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#a0a0a0" }} />
                <Line type="monotone" dataKey="cpu" stroke="#8B2A2A" dot={false} strokeWidth={2} name="CPU %" />
                <Line type="monotone" dataKey="mem" stroke="#4ade80" dot={false} strokeWidth={2} name="RAM %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Player history per server */}
      {history?.instances && Object.keys(history.instances).length > 0 && (
        <div className="section">
          <div className="section-title">Last 24 Hours — Players</div>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                data={(() => {
                  // Merge all instance timeseries into one array by time
                  const timeMap: Record<string, any> = {};
                  Object.entries(history.instances).forEach(([name, points]: any) => {
                    points.forEach((p: any) => {
                      if (!timeMap[p.time]) timeMap[p.time] = { time: p.time };
                      timeMap[p.time][name] = p.players ?? 0;
                    });
                  });
                  return Object.values(timeMap).sort((a: any, b: any) => a.time.localeCompare(b.time));
                })()}
              >
                <XAxis dataKey="time" tick={{ fill: "#555", fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#555", fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #1f1f1f", color: "#f0ece8", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#a0a0a0" }} />
                {Object.keys(history.instances).map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name} dot={false} strokeWidth={2}
                    stroke={["#8B2A2A","#4ade80","#fbbf24","#60a5fa","#a78bfa"][i % 5]} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
