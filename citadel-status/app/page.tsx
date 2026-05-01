"use client";

import { useEffect, useState, useCallback } from "react";
import { UserButton } from "@clerk/nextjs";

const API = process.env.NEXT_PUBLIC_API_URL || "https://status-api.citadelservers.online";
const REFRESH_MS = 10000;

function getColor(pct: number) {
  if (pct < 60) return "green";
  if (pct < 85) return "yellow";
  return "red";
}

function StatCard({ title, value, unit, label, pct }: {
  title: string; value: string | number; unit?: string;
  label?: string; pct?: number;
}) {
  const color = pct != null ? getColor(pct) : "green";
  return (
    <div className="card">
      <div className="card-accent" />
      <div className="card-header">
        <div className="card-title">{title}</div>
      </div>
      <div className="stat-value">
        {value}<span className="stat-unit">{unit}</span>
      </div>
      {label && <div className="stat-label">{label}</div>}
      {pct != null && (
        <div className="progress-wrap">
          <div className="progress-bar">
            <div className={`progress-fill ${color}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats]     = useState<any>(null);
  const [amp, setAmp]         = useState<any>(null);
  const [tunnels, setTunnels] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allDown, setAllDown] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const fetchAll = useCallback(async () => {
    try {
      const [sRes, aRes, tRes] = await Promise.allSettled([
        fetch(`${API}/stats`, { signal: AbortSignal.timeout(6000) }),
        fetch(`${API}/amp`,   { signal: AbortSignal.timeout(6000) }),
        fetch(`${API}/tunnels`, { signal: AbortSignal.timeout(8000) }),
      ]);

      const s = sRes.status === "fulfilled" && sRes.value.ok ? await sRes.value.json() : null;
      const a = aRes.status === "fulfilled" && aRes.value.ok ? await aRes.value.json() : null;
      const t = tRes.status === "fulfilled" && tRes.value.ok ? await tRes.value.json() : null;

      if (!s && !a && !t) {
        setAllDown(true);
      } else {
        setAllDown(false);
        if (s) setStats(s);
        if (a) setAmp(a);
        if (t) setTunnels(t);
      }

      setLastUpdate(new Date().toLocaleTimeString());
      setLoading(false);
    } catch {
      setAllDown(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-bar">
          <span /><span /><span /><span />
        </div>
        CONNECTING TO CITADEL...
      </div>
    );
  }

  if (allDown) {
    return (
      <div className="app">
        <div className="all-down">
          <div className="all-down-icon">⚠</div>
          <div className="all-down-title">Everything is Down</div>
          <div className="all-down-sub">
            No systems are responding.<br />
            Contact <strong style={{ color: "var(--accent)" }}>Caelum</strong> immediately.
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-dim)" }}>
            Last attempt: {lastUpdate || "—"}
          </div>
        </div>
      </div>
    );
  }

  const mem   = stats?.memory;
  const cpu   = stats?.cpu;
  const disk  = stats?.disk;
  const gpu   = stats?.gpu?.[0];

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <div className="header-left">
          <div className="logo">CITADEL <span>STATUS</span></div>
          <div className="live-badge">
            <div className="live-dot" />
            LIVE
          </div>
        </div>
        <div className="header-right">
          <div className="last-updated">UPDATED {lastUpdate}</div>
          <UserButton />
        </div>
      </div>

      {/* System Stats */}
      <div className="section-label">System / Host Machine</div>
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatCard
          title="CPU Usage"
          value={cpu?.percent ?? "—"}
          unit="%"
          label={cpu ? `${cpu.cores_physical}C / ${cpu.cores_logical}T · ${cpu.freq_mhz} MHz` : ""}
          pct={cpu?.percent}
        />
        <StatCard
          title="Memory"
          value={mem?.used_gb ?? "—"}
          unit=" GB"
          label={mem ? `of ${mem.total_gb} GB total` : ""}
          pct={mem?.percent}
        />
        <StatCard
          title="Disk (C:)"
          value={disk?.used_gb ?? "—"}
          unit=" GB"
          label={disk ? `of ${disk.total_gb} GB total` : ""}
          pct={disk?.percent}
        />
        <StatCard
          title="GPU"
          value={gpu?.vram_total_mb ? `${Math.round(gpu.vram_total_mb / 1024)} GB` : "—"}
          unit=""
          label={gpu?.name ?? "Unknown"}
        />
      </div>

      {/* Tunnels + AMP side by side */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Cloudflare Tunnels */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Cloudflare Tunnels</div>
            {tunnels && (
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-dim)" }}>
                {tunnels.tunnels.filter((t: any) => t.up).length}/{tunnels.tunnels.length} UP
              </div>
            )}
          </div>
          {tunnels ? tunnels.tunnels.map((t: any) => (
            <div className="tunnel-row" key={t.url}>
              <div>
                <div className="tunnel-name">{t.name}</div>
                <div className="tunnel-url">{t.url}</div>
              </div>
              <div className={`status-pill ${t.up ? "up" : "down"}`}>
                {t.up ? "UP" : "DOWN"}
              </div>
            </div>
          )) : (
            <div style={{ fontFamily: "var(--mono)", color: "var(--text-dim)", fontSize: 12 }}>
              Tunnel data unavailable
            </div>
          )}
        </div>

        {/* AMP Summary */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">AMP — Instance Overview</div>
            {amp && (
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-dim)" }}>
                {amp.instances.filter((i: any) => i.running).length}/{amp.instances.length} RUNNING
              </div>
            )}
          </div>
          {amp ? amp.instances.map((inst: any) => (
            <div className="tunnel-row" key={inst.id}>
              <div>
                <div className="tunnel-name">{inst.name}</div>
                <div className="tunnel-url">{inst.module}</div>
              </div>
              <div className={`status-pill ${inst.running ? "up" : "down"}`}>
                {inst.running ? "ONLINE" : "OFFLINE"}
              </div>
            </div>
          )) : (
            <div style={{ fontFamily: "var(--mono)", color: "var(--text-dim)", fontSize: 12 }}>
              AMP data unavailable
            </div>
          )}
        </div>
      </div>

      {/* AMP Instance Detail Cards */}
      {amp?.instances?.length > 0 && (
        <>
          <div className="section-label">AMP — Instance Details</div>
          {amp.instances.map((inst: any) => (
            <div className={`amp-card ${inst.running ? "running" : "stopped"}`} key={inst.id}>
              <div className="amp-card-header">
                <div>
                  <div className="amp-name">{inst.name}</div>
                  <div className="amp-module">{inst.module}</div>
                </div>
                <div className={`status-pill ${inst.running ? "up" : "down"}`}>
                  {inst.running ? "ONLINE" : "OFFLINE"}
                </div>
              </div>
              <div className="amp-metrics">
                <div className="amp-metric">
                  <div className="amp-metric-val">
                    {inst.cpu_percent != null ? `${inst.cpu_percent}%` : "—"}
                  </div>
                  <div className="amp-metric-lbl">CPU</div>
                </div>
                <div className="amp-metric">
                  <div className="amp-metric-val">
                    {inst.memory_mb != null ? `${inst.memory_mb} MB` : "—"}
                  </div>
                  <div className="amp-metric-lbl">Memory</div>
                </div>
                <div className="amp-metric">
                  <div className="amp-metric-val">
                    {inst.tps != null ? `${inst.tps}/${inst.tps_max}` : "—"}
                  </div>
                  <div className="amp-metric-lbl">TPS</div>
                </div>
                <div className="amp-metric">
                  <div className="amp-metric-val">
                    {inst.players != null
                      ? `${inst.players}/${inst.max_players}`
                      : "—"}
                  </div>
                  <div className="amp-metric-lbl">Players</div>
                </div>
              </div>
              {inst.running && inst.memory_mb != null && inst.memory_max_mb != null && (
                <div className="progress-wrap" style={{ marginTop: 14 }}>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${getColor(Math.round(inst.memory_mb / inst.memory_max_mb * 100))}`}
                      style={{ width: `${Math.min(100, Math.round(inst.memory_mb / inst.memory_max_mb * 100))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
