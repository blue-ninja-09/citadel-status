"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch, canAdmin, type Role } from "@/lib/api";

export default function AdminPage() {
  const { user } = useUser();
  const role = (user?.publicMetadata?.role as Role) || "viewer";
  const isAdmin = canAdmin(role);

  const [users, setUsers]         = useState<any[]>([]);
  const [events, setEvents]       = useState<any[]>([]);
  const [uptime, setUptime]       = useState<any>({});
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser]     = useState({ clerk_id: "", role: "viewer" });

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const fetch = useCallback(async () => {
    const [ev, up] = await Promise.allSettled([
      apiFetch("/events?limit=100"),
      apiFetch("/uptime"),
    ]);
    if (ev.status === "fulfilled") setEvents(ev.value.events || []);
    if (up.status === "fulfilled") setUptime(up.value.uptime || {});
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (!isAdmin) {
    return (
      <DashboardLayout title="Admin Panel">
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🚫</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-bright)" }}>Access Denied</div>
          <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 8 }}>
            You need Owner or Co-Owner role to access this page.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const eventsByType = events.reduce((acc: any, ev: any) => {
    acc[ev.severity] = (acc[ev.severity] || 0) + 1;
    return acc;
  }, {});

  const uptimeList = Object.entries(uptime).sort(([,a]: any, [,b]: any) => (a as number) - (b as number));

  return (
    <DashboardLayout title="Admin Panel" subtitle="System administration and configuration">
      {toast && <div className="toast">{toast}</div>}

      {/* Stats overview */}
      <div className="section">
        <div className="section-title">📊 Event Summary (Last 30 Days)</div>
        <div className="stat-grid">
          <div className="stat-block">
            <div className="stat-name">Total Events</div>
            <div className="stat-val">{events.length}</div>
            <div className="stat-sub">Logged incidents</div>
          </div>
          <div className="stat-block">
            <div className="stat-name">Errors</div>
            <div className="stat-val" style={{ color: "var(--red)" }}>{eventsByType.error || 0}</div>
            <div className="stat-sub">Outages & failures</div>
          </div>
          <div className="stat-block">
            <div className="stat-name">Warnings</div>
            <div className="stat-val" style={{ color: "var(--yellow)" }}>{eventsByType.warning || 0}</div>
            <div className="stat-sub">Threshold breaches</div>
          </div>
          <div className="stat-block">
            <div className="stat-name">Recoveries</div>
            <div className="stat-val" style={{ color: "var(--green)" }}>{eventsByType.success || 0}</div>
            <div className="stat-sub">Services restored</div>
          </div>
        </div>
      </div>

      {/* Role management */}
      <div className="section">
        <div className="section-title">👥 Role Management</div>
        <div className="card">
          <div style={{ marginBottom: 16, fontSize: 13, color: "var(--text)", lineHeight: 1.7 }}>
            Roles are assigned via <strong style={{ color: "var(--text-bright)" }}>Clerk Dashboard</strong> using public metadata,
            or by editing <code style={{ background: "var(--bg3)", padding: "1px 6px", fontSize: 12 }}>config.py</code> on the server.
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { role: "owner",      label: "Owner",        desc: "Full access including admin panel, role assignment, all data", color: "var(--red)" },
              { role: "co_owner",   label: "Co-Owner",     desc: "Same as Owner except role assignment", color: "var(--yellow)" },
              { role: "has_server", label: "Server Owner", desc: "View their own server detailed stats + public data", color: "var(--blue)" },
              { role: "viewer",     label: "Viewer",       desc: "View all stats, incidents, maintenance but cannot edit", color: "var(--green)" },
            ].map((r) => (
              <div key={r.role} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "12px 16px", background: "var(--bg3)", border: "1px solid var(--border)"
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: r.color, flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-bright)" }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{r.desc}</div>
                </div>
                <code style={{ fontSize: 11, color: "var(--text-dim)", background: "var(--bg)", padding: "2px 8px" }}>
                  {r.role}
                </code>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--accent-dim)", border: "1px solid var(--accent)", fontSize: 12, color: "var(--text)" }}>
            <strong style={{ color: "var(--accent-light)" }}>To assign a role:</strong> Go to{" "}
            <a href="https://dashboard.clerk.com" target="_blank" rel="noopener" style={{ color: "var(--accent-light)" }}>
              dashboard.clerk.com
            </a>{" "}
            → Users → select user → Public Metadata → add{" "}
            <code style={{ background: "var(--bg3)", padding: "1px 6px" }}>{`{"role": "co_owner"}`}</code>
          </div>
        </div>
      </div>

      {/* Uptime table */}
      <div className="section">
        <div className="section-title">📈 30-Day Uptime by Service</div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Uptime (30d)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {uptimeList.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--text-dim)" }}>No uptime data yet</td></tr>
              ) : uptimeList.map(([id, pct]: any) => (
                <tr key={id}>
                  <td style={{ color: "var(--text-bright)", fontWeight: 500 }}>{id}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, height: 4, background: "var(--border2)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${pct}%`,
                          background: pct >= 99 ? "var(--green)" : pct >= 95 ? "var(--yellow)" : "var(--red)",
                          borderRadius: 2,
                        }} />
                      </div>
                      <span style={{
                        fontSize: 12, fontWeight: 600, minWidth: 48, textAlign: "right",
                        color: pct >= 99 ? "var(--green)" : pct >= 95 ? "var(--yellow)" : "var(--red)",
                      }}>{pct}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`pill ${pct >= 99 ? "operational" : pct >= 95 ? "degraded" : "outage"}`}>
                      {pct >= 99 ? "Excellent" : pct >= 95 ? "Good" : "Poor"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alert config reference */}
      <div className="section">
        <div className="section-title">🔔 Alert Configuration</div>
        <div className="card">
          <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 14, lineHeight: 1.7 }}>
            Alert toggles are configured in{" "}
            <code style={{ background: "var(--bg3)", padding: "2px 8px", fontSize: 12 }}>C:\status-api\config.py</code>.
            Edit the <code style={{ background: "var(--bg3)", padding: "2px 8px", fontSize: 12 }}>ALERTS</code> dict and restart the server.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { key: "server_down",       label: "Server Down" },
              { key: "server_up",         label: "Server Recovery" },
              { key: "tunnel_down",       label: "Tunnel Down" },
              { key: "tunnel_up",         label: "Tunnel Recovery" },
              { key: "mysql_down",        label: "MySQL Down" },
              { key: "mysql_up",          label: "MySQL Recovery" },
              { key: "ram_warning",       label: "RAM Warning" },
              { key: "cpu_warning",       label: "CPU Warning" },
              { key: "disk_warning",      label: "Disk Warning" },
              { key: "maintenance_start", label: "Maintenance Alert" },
              { key: "backup_success",    label: "Backup Success" },
              { key: "backup_failure",    label: "Backup Failure" },
            ].map((a) => (
              <div key={a.key} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 12px", background: "var(--bg3)", border: "1px solid var(--border)",
                fontSize: 12,
              }}>
                <span style={{ color: "var(--text)" }}>{a.label}</span>
                <code style={{ fontSize: 11, color: "var(--text-dim)" }}>{a.key}</code>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent error events */}
      <div className="section">
        <div className="section-title">🔴 Recent Errors & Warnings</div>
        <div className="events-list">
          {events.filter(e => ["error","warning"].includes(e.severity)).slice(0, 20).length === 0 ? (
            <div style={{ padding: 20, color: "var(--text-dim)", fontSize: 13 }}>No recent errors</div>
          ) : events.filter(e => ["error","warning"].includes(e.severity)).slice(0, 20).map((ev: any) => (
            <div className="event-row" key={ev.id}>
              <div className={`event-dot ${ev.severity}`} />
              <div className="event-content">
                <div className="event-msg">{ev.message}</div>
                <div className="event-time">{ev.service_name} · {new Date(ev.ts).toLocaleString()}</div>
              </div>
              <span className={`pill ${ev.severity === "error" ? "outage" : "degraded"}`}>{ev.severity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Config reference */}
      <div className="section">
        <div className="section-title">⚙️ Quick Config Reference</div>
        <div className="card">
          <table className="table">
            <thead>
              <tr><th>Setting</th><th>Location</th><th>Description</th></tr>
            </thead>
            <tbody>
              {[
                ["Alert Webhooks",     "config.py → ALERT_WEBHOOK / STATUS_WEBHOOK", "Discord notification URLs"],
                ["Alert Toggles",     "config.py → ALERTS dict",                     "Enable/disable each alert type"],
                ["Thresholds",        "config.py → THRESHOLDS dict",                 "RAM/CPU/disk warning %"],
                ["Services",          "config.py → SERVICES list",                   "Add/remove monitored services"],
                ["Roles",             "config.py → ROLES dict",                      "Map Clerk IDs to roles"],
                ["AMP Credentials",   "config.py → AMP_USER / AMP_PASS",            "AMP panel login"],
                ["Monitor Interval",  "config.py → MONITOR_INTERVAL",               "Health check frequency (seconds)"],
                ["Status Embed",      "config.py → STATUS_EMBED_INTERVAL",          "Discord embed update frequency"],
              ].map(([setting, location, desc]) => (
                <tr key={setting}>
                  <td style={{ color: "var(--text-bright)", fontWeight: 500, whiteSpace: "nowrap" }}>{setting}</td>
                  <td><code style={{ fontSize: 11, color: "var(--text-dim)" }}>{location}</code></td>
                  <td style={{ color: "var(--text-dim)" }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
