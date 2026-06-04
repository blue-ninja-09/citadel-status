"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import DashboardLayout from "@/citadel-status/components/DashboardLayout";
import { apiFetch, barClass, canViewDetails, timeAgo, type Role } from "@/citadel-status/lib/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const REFRESH = 10000;

export default function DashboardPage() {
  const { user } = useUser();
  const role = (user?.publicMetadata?.role as Role) || "viewer";

  const [stats, setStats]     = useState<any>(null);
  const [amp, setAmp]         = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [events, setEvents]   = useState<any[]>([]);
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allDown, setAllDown] = useState(false);
  const [toast, setToast]     = useState("");
  const [search, setSearch]   = useState("");

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setToast(`Copied ${text}`);
      setTimeout(() => setToast(""), 2000);
    });
  };

  const fetchAll = useCallback(async () => {
    const [sRes, aRes, svRes, evRes, hRes] = await Promise.allSettled([
      apiFetch("/stats"),
      apiFetch("/amp"),
      apiFetch("/services"),
      apiFetch("/events?limit=20"),
      apiFetch("/history"),
    ]);

    const s  = sRes.status  === "fulfilled" ? sRes.value  : null;
    const a  = aRes.status  === "fulfilled" ? aRes.value  : null;
    const sv = svRes.status === "fulfilled" ? svRes.value : null;
    const ev = evRes.status === "fulfilled" ? evRes.value : null;
    const h  = hRes.status  === "fulfilled" ? hRes.value  : null;

    if (!s && !a) { setAllDown(true); }
    else {
      setAllDown(false);
      if (s) setStats(s);
      if (a) setAmp(a);
      if (sv) setServices(sv.services || []);
      if (ev) setEvents(ev.events || []);
      if (h) setHistory(h);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, REFRESH);
    return () => clearInterval(id);
  }, [fetchAll]);

  if (loading) return (
    <DashboardLayout title="Overview">
      <div className="loading"><div className="spinner" />Loading...</div>
    </DashboardLayout>
  );

  if (allDown) return (
    <DashboardLayout title="Overview">
      <div className="all-down">
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div className="all-down-title">Everything is <span>Down</span></div>
        <div className="all-down-sub">Contact <strong style={{ color: "var(--text-bright)" }}>Caelum</strong> immediately.</div>
      </div>
    </DashboardLayout>
  );

  const cpu  = stats?.cpu;
  const mem  = stats?.memory;
  const disk = stats?.disk;
  const gpu  = stats?.gpu?.[0];

  const allOk = services.every((s) => s.status === "operational");
  const anyOutage = services.some((s) => s.status === "outage");
  const overall = allOk ? "operational" : anyOutage ? "outage" : "degraded";

  const filteredAmp = (amp?.instances || []).filter((i: any) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="Overview" subtitle="Live infrastructure overview">
      {toast && <div className="toast">{toast}</div>}

      {/* Overall status banner */}
      <div className={`status-banner ${overall}`}>
        <div className="status-banner-icon">
          {overall === "operational" ? "✅" : overall === "outage" ? "🔴" : "🟡"}
        </div>
        <div>
          <div className="status-banner-text">
            {overall === "operational" ? "All Systems Operational" :
             overall === "outage" ? "Service Disruption Detected" : "Partial Degradation"}
          </div>
          <div className="status-banner-sub">
            {services.filter(s => s.status === "operational").length}/{services.length} services operational
          </div>
        </div>
      </div>

      {/* System stats */}
      {canViewDetails(role) && (
        <div className="section">
          <div className="section-title">System Resources</div>
          <div className="stat-grid">
            <div className="stat-block">
              <div className="stat-name">CPU</div>
              <div className="stat-val">{cpu?.percent ?? "—"}<span className="stat-unit">%</span></div>
              <div className="stat-sub">{cpu ? `${cpu.cores_physical}C / ${cpu.cores_logical}T · ${cpu.freq_mhz} MHz` : ""}</div>
              {cpu && <div className="bar"><div className={`bar-fill ${barClass(cpu.percent)}`} style={{ width: `${cpu.percent}%` }} /></div>}
            </div>
            <div className="stat-block">
              <div className="stat-name">Memory</div>
              <div className="stat-val">{mem?.used_gb ?? "—"}<span className="stat-unit"> GB</span></div>
              <div className="stat-sub">{mem ? `of ${mem.total_gb} GB · ${mem.percent}%` : ""}</div>
              {mem && <div className="bar"><div className={`bar-fill ${barClass(mem.percent)}`} style={{ width: `${mem.percent}%` }} /></div>}
            </div>
            <div className="stat-block">
              <div className="stat-name">Disk (C:)</div>
              <div className="stat-val">{disk?.used_gb ?? "—"}<span className="stat-unit"> GB</span></div>
              <div className="stat-sub">{disk ? `of ${disk.total_gb} GB · ${disk.percent}%` : ""}</div>
              {disk && <div className="bar"><div className={`bar-fill ${barClass(disk.percent)}`} style={{ width: `${disk.percent}%` }} /></div>}
            </div>
            <div className="stat-block">
              <div className="stat-name">GPU</div>
              <div className="stat-val" style={{ fontSize: 15, paddingTop: 6 }}>{gpu?.name ?? "—"}</div>
              <div className="stat-sub" style={{ marginTop: 4 }}>{gpu?.shared ? "Shared system memory" : gpu?.vram_total_mb ? `${Math.round(gpu.vram_total_mb / 1024)} GB VRAM` : ""}</div>
            </div>
          </div>
        </div>
      )}

      {/* Game servers */}
      <div className="section">
        <div className="section-title">
          🎮 Game Servers
          <span className="section-title-count">
            · {(amp?.instances || []).filter((i: any) => i.running && i.app_state === 20).length}/{(amp?.instances || []).length} online
          </span>
        </div>

        {/* Search */}
        <div className="search-bar">
          <span style={{ color: "var(--text-dim)" }}>🔍</span>
          <input
            placeholder="Search servers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>✕</button>
          )}
        </div>

        <div className="amp-grid">
          {filteredAmp.map((inst: any) => {
            const stateClass = inst.running && inst.app_state === 20 ? "online" : inst.app_state === 50 ? "sleeping" : "offline";
            const pillClass  = inst.running && inst.app_state === 20 ? "operational" : inst.app_state === 50 ? "sleeping" : "outage";
            const pillLabel  = inst.running && inst.app_state === 20 ? "Online" : inst.app_state === 50 ? "Sleeping" : "Offline";
            const memPct     = inst.memory_max_mb ? Math.round(inst.memory_mb / inst.memory_max_mb * 100) : 0;

            return (
              <div className={`amp-card ${stateClass}`} key={inst.id}>
                <div className="amp-card-header">
                  <div>
                    <div className="amp-card-name">{inst.name}</div>
                    {inst.public_address && (
                      <div className="amp-card-address" onClick={() => copyText(inst.public_address)}>
                        {inst.public_address} ⎘
                      </div>
                    )}
                    {inst.description && (
                      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 3 }}>{inst.description}</div>
                    )}
                  </div>
                  <span className={`pill ${pillClass}`}>{pillLabel}</span>
                </div>
                <div className="amp-metrics">
                  <div>
                    <div className="amp-metric-val">{inst.cpu_percent != null ? `${inst.cpu_percent}%` : "—"}</div>
                    <div className="amp-metric-lbl">CPU</div>
                  </div>
                  <div>
                    <div className="amp-metric-val">{inst.memory_mb != null ? `${inst.memory_mb}MB` : "—"}</div>
                    <div className="amp-metric-lbl">RAM</div>
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
          })}
        </div>
      </div>

      {/* History charts */}
      {history?.system?.length > 1 && canViewDetails(role) && (
        <div className="section">
          <div className="section-title">📈 24h System History</div>
          <div className="chart-card">
            <div className="chart-title">CPU & Memory %</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={history.system} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <XAxis dataKey="time" tick={{ fill: "#4a4a4a", fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#4a4a4a", fontSize: 10 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #1f1f1f", color: "#f0ece8", fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#a0a0a0" }} />
                <Line type="monotone" dataKey="cpu" stroke="#8B2A2A" dot={false} strokeWidth={2} name="CPU %" />
                <Line type="monotone" dataKey="mem" stroke="#4ade80" dot={false} strokeWidth={2} name="RAM %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent events */}
      <div className="section">
        <div className="section-title">
          📡 Recent Events
          <span className="section-title-count">· last 20</span>
        </div>
        <div className="events-list">
          {events.length === 0 ? (
            <div style={{ padding: "20px", color: "var(--text-dim)", fontSize: 13 }}>No recent events</div>
          ) : events.map((ev: any) => (
            <div className="event-row" key={ev.id}>
              <div className={`event-dot ${ev.severity}`} />
              <div className="event-content">
                <div className="event-msg">{ev.message}</div>
                <div className="event-time">{ev.service_name} · {timeAgo(ev.ts)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
