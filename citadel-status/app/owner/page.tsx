"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch, type Role } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "https://status-api.citadelservers.online";

const PAGES = ["dashboard", "services", "incidents", "maintenance", "changelog", "admin"];
const ROLES = ["viewer", "has_server", "co_owner"];
const ROLE_LABELS: Record<string, string> = {
  owner: "Owner", co_owner: "Co-Owner", has_server: "Server Owner",
  viewer: "Viewer", public: "Public",
};
const ROLE_COLORS: Record<string, string> = {
  owner: "var(--red)", co_owner: "var(--yellow)",
  has_server: "var(--blue)", viewer: "var(--green)", public: "var(--text-dim)",
};

type Tab = "users" | "access" | "servers" | "system";

export default function OwnerPage() {
  const { user } = useUser();
  const role = (user?.publicMetadata?.role as Role) || "viewer";

  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<any[]>([]);
  const [ampInstances, setAmpInstances] = useState<any[]>([]);
  const [accessRules, setAccessRules] = useState<any>({});
  const [sysConfig, setSysConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<any>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<string>("");

  const notify = (msg: string, isError = false) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const fetchAll = useCallback(async () => {
    const [u, a, ac, sc] = await Promise.allSettled([
      apiFetch("/owner/users"),
      apiFetch("/amp"),
      apiFetch("/owner/access-control"),
      apiFetch("/owner/config"),
    ]);
    if (u.status === "fulfilled") setUsers(u.value.users || []);
    if (a.status === "fulfilled") setAmpInstances(a.value.instances || []);
    if (ac.status === "fulfilled") setAccessRules(ac.value.rules || {});
    if (sc.status === "fulfilled") setSysConfig(sc.value);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (role !== "owner") {
    return (
      <DashboardLayout title="Owner Panel">
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>👑</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-bright)" }}>Owner Only</div>
          <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 8 }}>
            This panel is restricted to the Owner role only.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── User actions ──────────────────────────────────────────────

  const changeRole = async (userId: string, newRole: string) => {
    const res = await fetch(`${API}/owner/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    const d = await res.json();
    if (d.ok) {
      notify(`Role updated to ${newRole}`);
      fetchAll();
    } else {
      notify(`Error: ${d.error}`, true);
    }
    setEditingRole(null);
  };

  const banUser = async (userId: string, ban: boolean) => {
    const res = await fetch(`${API}/owner/users/${userId}/${ban ? "ban" : "unban"}`, { method: "POST" });
    const d = await res.json();
    if (d.ok) { notify(ban ? "User banned" : "User unbanned"); fetchAll(); }
    else notify(`Error: ${d.error}`, true);
    setConfirmAction(null);
  };

  // ── Server actions ────────────────────────────────────────────

  const serverAction = async (instanceId: string, action: string, name: string) => {
    const res = await fetch(`${API}/owner/amp/${instanceId}/${action}`, { method: "POST" });
    const d = await res.json();
    if (d.ok) { notify(`${name}: ${action} sent`); setTimeout(fetchAll, 2000); }
    else notify(`Error: ${d.error}`, true);
    setConfirmAction(null);
  };

  // ── Access control ────────────────────────────────────────────

  const toggleAccess = async (role: string, page: string, allowed: boolean) => {
    const updated = { ...accessRules, [role]: { ...(accessRules[role] || {}), [page]: allowed } };
    setAccessRules(updated);
    await fetch(`${API}/owner/access-control`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [role]: { [page]: allowed } }),
    });
    notify("Access rules updated");
  };

  // ── System config ─────────────────────────────────────────────

  const updateConfig = async (patch: any) => {
    await fetch(`${API}/owner/config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    notify("Config updated");
    fetchAll();
  };

  const toggleAlert = (key: string, val: boolean) => {
    const updated = { ...sysConfig.alerts, [key]: val };
    setSysConfig({ ...sysConfig, alerts: updated });
    updateConfig({ alerts: { [key]: val } });
  };

  const filteredUsers = users.filter((u) =>
    !search ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="Owner Panel" subtitle="Full system control — owner access only">
      {toast && <div className="toast">{toast}</div>}

      {/* Confirm modal */}
      {confirmAction && (
        <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">⚠️ Confirm Action</div>
              <button className="modal-close" onClick={() => setConfirmAction(null)}>✕</button>
            </div>
            <div style={{ fontSize: 14, color: "var(--text)", marginBottom: 20 }}>
              {confirmAction.message}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmAction.onConfirm}>
                {confirmAction.label}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {([
          { key: "users",   label: "👥 Users" },
          { key: "access",  label: "🔒 Access Control" },
          { key: "servers", label: "🎮 Server Controls" },
          { key: "system",  label: "⚙️ System Config" },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "10px 16px", fontSize: 13, fontWeight: 500,
              fontFamily: "var(--sans)",
              color: tab === t.key ? "var(--text-bright)" : "var(--text-dim)",
              borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -1,
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />Loading...</div>
      ) : (
        <>
          {/* ── USERS TAB ── */}
          {tab === "users" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
                  {users.length} total users · {users.filter(u => u.banned).length} banned
                </div>
              </div>

              <div className="search-bar" style={{ marginBottom: 16 }}>
                <span style={{ color: "var(--text-dim)" }}>🔍</span>
                <input
                  placeholder="Search by name, email, or user ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>✕</button>
                )}
              </div>

              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Last Sign In</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text-dim)" }}>No users found</td></tr>
                    ) : filteredUsers.map((u) => (
                      <tr key={u.id} style={{ opacity: u.banned ? 0.5 : 1 }}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {u.image_url && (
                              <img src={u.image_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />
                            )}
                            <div>
                              <div style={{ color: "var(--text-bright)", fontWeight: 500, fontSize: 13 }}>
                                {u.first_name || u.username || "Unknown"} {u.last_name || ""}
                                {u.banned && <span style={{ color: "var(--red)", fontSize: 11, marginLeft: 6 }}>BANNED</span>}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "monospace" }}>{u.id}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text-dim)" }}>{u.email || "—"}</td>
                        <td>
                          {editingRole === u.id ? (
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <select
                                className="form-select"
                                style={{ padding: "4px 8px", fontSize: 12, width: "auto" }}
                                value={pendingRole}
                                onChange={(e) => setPendingRole(e.target.value)}
                              >
                                {["viewer","has_server","co_owner","owner"].map(r => (
                                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                ))}
                              </select>
                              <button className="btn btn-primary btn-sm" onClick={() => changeRole(u.id, pendingRole)}>Save</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => setEditingRole(null)}>✕</button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{
                                fontSize: 11, fontWeight: 600, padding: "2px 8px",
                                borderRadius: 4, background: "var(--bg3)",
                                color: ROLE_COLORS[u.role] || "var(--text-dim)",
                                border: `1px solid ${ROLE_COLORS[u.role] || "var(--border)"}20`,
                              }}>
                                {ROLE_LABELS[u.role] || u.role}
                              </span>
                              {u.id !== user?.id && (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => { setEditingRole(u.id); setPendingRole(u.role); }}
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text-dim)" }}>
                          {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "Never"}
                        </td>
                        <td>
                          {u.id !== user?.id && (
                            <button
                              className={`btn btn-sm ${u.banned ? "btn-secondary" : "btn-danger"}`}
                              onClick={() => setConfirmAction({
                                message: `Are you sure you want to ${u.banned ? "unban" : "ban"} ${u.email || u.username}?`,
                                label: u.banned ? "Unban User" : "Ban User",
                                onConfirm: () => banUser(u.id, !u.banned),
                              })}
                            >
                              {u.banned ? "Unban" : "Ban"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ACCESS CONTROL TAB ── */}
          {tab === "access" && (
            <div>
              <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 20, lineHeight: 1.7 }}>
                Control which pages each role can access. Owner always has full access and cannot be restricted.
              </div>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Page</th>
                      {ROLES.map(r => (
                        <th key={r} style={{ textAlign: "center" }}>
                          <span style={{ color: ROLE_COLORS[r] }}>{ROLE_LABELS[r]}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PAGES.map(page => (
                      <tr key={page}>
                        <td style={{ color: "var(--text-bright)", fontWeight: 500, textTransform: "capitalize" }}>
                          {page}
                        </td>
                        {ROLES.map(r => {
                          const allowed = accessRules[r]?.[page] !== false;
                          return (
                            <td key={r} style={{ textAlign: "center" }}>
                              <button
                                onClick={() => toggleAccess(r, page, !allowed)}
                                style={{
                                  background: allowed ? "var(--green-dim)" : "var(--red-dim)",
                                  border: `1px solid ${allowed ? "var(--green-border)" : "var(--red-border)"}`,
                                  color: allowed ? "var(--green)" : "var(--red)",
                                  padding: "4px 12px", borderRadius: 4, cursor: "pointer",
                                  fontSize: 12, fontWeight: 600, fontFamily: "var(--sans)",
                                  transition: "all 0.15s",
                                }}
                              >
                                {allowed ? "✓ Allow" : "✗ Deny"}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-dim)" }}>
                Note: Co-Owner and Owner always retain full access regardless of these settings.
              </div>
            </div>
          )}

          {/* ── SERVER CONTROLS TAB ── */}
          {tab === "servers" && (
            <div>
              <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 20, lineHeight: 1.7 }}>
                Control AMP game server instances directly. Use with caution — stopping a server will disconnect all players.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ampInstances.map((inst) => {
                  const isOnline = inst.running && inst.app_state === 20;
                  const isSleeping = inst.app_state === 50;
                  return (
                    <div key={inst.id} className="card" style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{
                            width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                            background: isOnline ? "var(--green)" : isSleeping ? "var(--yellow)" : "var(--red)",
                          }} />
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-bright)" }}>{inst.name}</div>
                            <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
                              {isOnline ? `Online · ${inst.players}/${inst.max_players} players · ${inst.tps} TPS` :
                               isSleeping ? "Sleeping" : "Offline"}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          {!isOnline && (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ color: "var(--green)" }}
                              onClick={() => serverAction(inst.id, "start", inst.name)}
                            >
                              ▶ Start
                            </button>
                          )}
                          {isOnline && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setConfirmAction({
                                message: `Restart ${inst.name}? This will briefly disconnect all players.`,
                                label: "Restart Server",
                                onConfirm: () => serverAction(inst.id, "restart", inst.name),
                              })}
                            >
                              🔄 Restart
                            </button>
                          )}
                          {isOnline && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => setConfirmAction({
                                message: `Stop ${inst.name}? All players will be disconnected.`,
                                label: "Stop Server",
                                onConfirm: () => serverAction(inst.id, "stop", inst.name),
                              })}
                            >
                              ⏹ Stop
                            </button>
                          )}
                          {isOnline && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => setConfirmAction({
                                message: `Force kill ${inst.name}? This may cause data loss.`,
                                label: "Force Kill",
                                onConfirm: () => serverAction(inst.id, "kill", inst.name),
                              })}
                            >
                              💀 Kill
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── SYSTEM CONFIG TAB ── */}
          {tab === "system" && sysConfig && (
            <div>
              {/* Alert toggles */}
              <div className="section">
                <div className="section-title">🔔 Discord Alert Toggles</div>
                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                  <table className="table">
                    <thead>
                      <tr><th>Alert Type</th><th>Key</th><th style={{ textAlign: "center" }}>Enabled</th></tr>
                    </thead>
                    <tbody>
                      {Object.entries(sysConfig.alerts).map(([key, val]) => (
                        <tr key={key}>
                          <td style={{ color: "var(--text-bright)", fontWeight: 500 }}>
                            {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </td>
                          <td><code style={{ fontSize: 11, color: "var(--text-dim)" }}>{key}</code></td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              onClick={() => toggleAlert(key, !val)}
                              style={{
                                background: val ? "var(--green-dim)" : "var(--bg3)",
                                border: `1px solid ${val ? "var(--green-border)" : "var(--border)"}`,
                                color: val ? "var(--green)" : "var(--text-dim)",
                                padding: "4px 14px", borderRadius: 4, cursor: "pointer",
                                fontSize: 12, fontWeight: 600, fontFamily: "var(--sans)",
                                minWidth: 72, transition: "all 0.15s",
                              }}
                            >
                              {val ? "ON" : "OFF"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Thresholds */}
              <div className="section">
                <div className="section-title">📊 Alert Thresholds</div>
                <div className="card">
                  <div className="form-row">
                    {Object.entries(sysConfig.thresholds).map(([key, val]) => (
                      <div className="form-group" key={key}>
                        <label className="form-label">
                          {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                        <input
                          type="number"
                          className="form-input"
                          defaultValue={val as number}
                          onBlur={(e) => updateConfig({ thresholds: { [key]: parseFloat(e.target.value) } })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Intervals */}
              <div className="section">
                <div className="section-title">⏱ Monitor Intervals</div>
                <div className="card">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Monitor Interval (seconds)</label>
                      <input
                        type="number"
                        className="form-input"
                        defaultValue={sysConfig.monitor_interval}
                        onBlur={(e) => updateConfig({ monitor_interval: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Status Embed Interval (seconds)</label>
                      <input
                        type="number"
                        className="form-input"
                        defaultValue={sysConfig.status_embed_interval}
                        onBlur={(e) => updateConfig({ status_embed_interval: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 8 }}>
                    Changes apply immediately without restarting the server.
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
