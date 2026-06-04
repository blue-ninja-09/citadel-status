"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch, categoryIcon, statusLabel, formatDate, timeAgo } from "@/lib/api";

const REFRESH = 30000;

export default function PublicPage() {
  const [status, setStatus]       = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [uptime, setUptime]       = useState<any>({});
  const [loading, setLoading]     = useState(true);
  const [lastUpdate, setLastUpdate] = useState("");
  const [allDown, setAllDown]     = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [s, i, m, u] = await Promise.allSettled([
        apiFetch("/public/status"),
        apiFetch("/incidents"),
        apiFetch("/maintenance"),
        apiFetch("/uptime"),
      ]);

      const sd = s.status === "fulfilled" ? s.value : null;
      const id = i.status === "fulfilled" ? i.value : null;
      const md = m.status === "fulfilled" ? m.value : null;
      const ud = u.status === "fulfilled" ? u.value : null;

      if (!sd) {
        setAllDown(true);
      } else {
        setAllDown(false);
        setStatus(sd);
      }
      if (id) setIncidents(id.incidents?.filter((inc: any) =>
        ["investigating","identified","monitoring"].includes(inc.status)) || []);
      if (md) setMaintenance(md.maintenance?.filter((m: any) =>
        ["scheduled","in_progress"].includes(m.status)) || []);
      if (ud) setUptime(ud.uptime || {});
      setLastUpdate(new Date().toLocaleTimeString());
      setLoading(false);
    } catch {
      setAllDown(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, REFRESH);
    return () => clearInterval(id);
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="public-layout">
        <div className="loading"><div className="spinner" />Loading...</div>
      </div>
    );
  }

  if (allDown) {
    return (
      <div className="public-layout">
        <div className="all-down">
          <div style={{ fontSize: 48 }}>⚠️</div>
          <div className="all-down-title">Everything is <span>Down</span></div>
          <div className="all-down-sub">
            No systems are responding.<br />
            Contact <strong style={{ color: "var(--text-bright)" }}>Caelum</strong> immediately.
          </div>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Last checked: {lastUpdate}</div>
        </div>
      </div>
    );
  }

  // Group services by category
  const grouped: Record<string, any[]> = {};
  for (const svc of status?.services || []) {
    if (!grouped[svc.category]) grouped[svc.category] = [];
    grouped[svc.category].push(svc);
  }

  const overall = status?.overall || "operational";
  const bannerText: Record<string, string> = {
    operational: "All Systems Operational",
    outage: "Service Disruption Detected",
    degraded: "Partial System Degradation",
  };
  const bannerIcon: Record<string, string> = {
    operational: "✅",
    outage: "🔴",
    degraded: "🟡",
  };

  return (
    <div className="public-layout">
      {/* Header */}
      <div className="public-header">
        <div className="public-title">Citadel <span>Status</span></div>
        <div className="public-subtitle">
          Real-time infrastructure status · Updated {lastUpdate}
        </div>
      </div>

      {/* Overall banner */}
      <div className={`status-banner ${overall}`} style={{ marginBottom: 32 }}>
        <div className="status-banner-icon">{bannerIcon[overall] || "⚙️"}</div>
        <div>
          <div className="status-banner-text">{bannerText[overall] || "Unknown"}</div>
          <div className="status-banner-sub">
            {status?.services?.filter((s: any) => s.status === "operational").length}/
            {status?.services?.length} services operational
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <Link href="/sign-in">
            <button className="btn btn-secondary btn-sm">Sign In →</button>
          </Link>
        </div>
      </div>

      {/* Active incidents */}
      {incidents.length > 0 && (
        <div className="section">
          <div className="section-title">🚨 Active Incidents</div>
          {incidents.map((inc) => (
            <div key={inc.id} className={`incident-card ${inc.status}`}>
              <div className="incident-header">
                <div>
                  <div className="incident-title">{inc.title}</div>
                  <div className="incident-meta">
                    {inc.severity} · {inc.status} · {timeAgo(inc.created_at)}
                  </div>
                </div>
                <span className={`pill ${inc.status === "resolved" ? "operational" : "outage"}`}>
                  {inc.status}
                </span>
              </div>
              <div className="incident-desc">{inc.description}</div>
              {inc.updates?.length > 0 && (
                <div className="incident-updates">
                  {inc.updates.slice(-3).map((u: any, i: number) => (
                    <div key={i} className="incident-update">
                      <span className="incident-update-time">{formatDate(u.created_at)}</span>
                      <span className="incident-update-msg">{u.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Scheduled maintenance */}
      {maintenance.length > 0 && (
        <div className="section">
          <div className="section-title">🔧 Scheduled Maintenance</div>
          {maintenance.map((m) => (
            <div key={m.id} className="maintenance-card">
              <div className="incident-header">
                <div>
                  <div className="incident-title">{m.title}</div>
                  <div className="incident-meta">
                    {formatDate(m.scheduled_start)} → {formatDate(m.scheduled_end)}
                  </div>
                </div>
                <span className="pill maintenance">{m.status}</span>
              </div>
              {m.description && <div className="incident-desc">{m.description}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Services by category */}
      {Object.entries(grouped).map(([cat, svcs]) => (
        <div className="section" key={cat}>
          <div className="section-title">
            {categoryIcon(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
            <span className="section-title-count">
              · {svcs.filter(s => s.status === "operational").length}/{svcs.length} operational
            </span>
          </div>
          <div className="service-list">
            {svcs.map((svc) => (
              <div className="service-row" key={svc.id}>
                <div className="service-icon">{categoryIcon(svc.category)}</div>
                <div className="service-info">
                  <div className="service-name">{svc.name}</div>
                </div>
                <div className="service-meta">
                  {uptime[svc.id] != null && (
                    <div className="service-uptime">
                      {uptime[svc.id]}% uptime
                    </div>
                  )}
                  <span className={`pill ${svc.status}`}>{statusLabel(svc.status)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Footer */}
      <div style={{ textAlign: "center", marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
          Citadel Status · Powered by Citadel Infrastructure
        </div>
        <div style={{ marginTop: 8 }}>
          <Link href="/sign-in" style={{ fontSize: 12, color: "var(--accent-light)", textDecoration: "none" }}>
            Staff Sign In →
          </Link>
        </div>
      </div>
    </div>
  );
}
