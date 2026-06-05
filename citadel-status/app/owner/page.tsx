"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch, parseRole, getRoleLabel, getRoleColor, type Role } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "https://status-api.citadelservers.online";

const ALL_ROLES: Role[] = ["viewer", "has_server", "admin", "co_owner", "owner"];
const PAGES = ["dashboard", "services", "incidents", "maintenance", "changelog", "admin", "owner"];
const ROLE_ORDER: Role[] = ["public", "viewer", "has_server", "admin", "co_owner", "owner"];

type Tab = "users" | "access" | "servers" | "system";

export default function OwnerPage() {
  const { user, isLoaded } = useUser();
  const role = isLoaded ? parseRole(user?.publicMetadata?.role) : "viewer";

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
  const [pendingRole, setPendingRole] = useState<string>("viewer");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userServerAccess, setUserServerAccess] = useState<Record<string, string[]>>({});

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

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

  if (!isLoaded) return <DashboardLayout title="Owner Panel"><div className="loading"><div className="spinner" /></div></DashboardLayout>;

  if (role !== "owner") {
    return (
      <DashboardLayout title="Owner Panel">
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>👑</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-bright)" }}>Owner Only</div>
          <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 8 }}>This panel is restricted to the Owner role only.</div>
        </div>
      </DashboardLayout>
    );
  }

  // ── User actions ──────────────────────────────────────
  const changeRole = async (userId: string, newRole: string) => {
    const res = await fetch(`${API}/owner/users/${userId}/role`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    const d = await res.json();
    if (d.ok) { notify(`Role updated to ${getRoleLabel(newRole as Role)}`); fetchAll(); }
    else notify(`Error: ${d.error}`);
    setEditingRole(null);
  };

  const banUser = async (userId: string, ban: boolean) => {
    const res = await fetch(`${API}/owner/users/${userId}/${ban ? "ban" : "unban"}`, { method: "POST" });
    const d = await res.json();
    if (d.ok) { notify(ban ? "User banned" : "User unbanned"); fetchAll(); }
    else notify(`Error: ${d.error}`);
    setConfirmAction(null);
  };

  // ── Server actions ─────────────────────────────────────
  const serverAction = async (instanceId: string, action: string, name: string) => {
    const res = await fetch(`${API}/owner/amp/${instanceId}/${action}`, { method: "POST" });
    const d = await res.json();
    if (d.ok) { notify(`${name}: ${action} sent`); setTimeout(fetchAll, 2000); }
    else notify(`Error: ${d.error}`);
    setConfirmAction(null);
  };

  // ── Access control ─────────────────────────────────────
  const toggleAccess = async (r: string, page: string, allowed: boolean) => {
    const updated = { ...accessRules, [r]: { ...(accessRules[r] || {}), [page]: allowed } };
    setAccessRules(updated);
    await fetch(`${API}/owner/access-control`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [r]: { [page]: allowed } }),
    });
    notify("Access rules saved");
  };

  // ── System config ──────────────────────────────────────
  const updateConfig = async (patch: any) => {
    await fetch(`${API}/owner/config`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    notify("Config updated");
    fetchAll();
  };

  const toggleAlert = (key: string, val: boolean) => {
    setSysConfig({ ...sysConfig, alerts: { ...sysConfig.alerts, [key]: val } });
    updateConfig({ alerts: { [key]: val } });
  };

  const filteredUsers = users.filter((u) =>
    !search ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    (u.first_name + " " + u.last_name).toLowerCase().includes(search.toLowerCase()) ||
    u.id?.toLowerCase().includes(search.toLowerCase())
  );

  const roleOrderIndex = (r: string) => ROLE_ORDER.indexOf(r as Role);

  return (
    <DashboardLayout title="Owner Panel" subtitle="Full system control">
      {toast && <div className="toast">{toast}</div>}

      {/* Confirm modal */}
      {confirmAction && (
        <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">⚠️ Confirm</div>
              <button className="modal-close" onClick={() => setConfirmAction(null)}>✕</button>
            </div>
            <div style={{ fontSize: 14, color: "var(--text)", marginBottom: 20 }}>{confirmAction.message}</div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmAction.onConfirm}>{confirmAction.label}</button>
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid var(--border)" }}>
        {([
          { key: "users",   label: "👥 Users" },
          { key: "access",  label: "🔒 Access Control" },
          { key: "servers", label: "🎮 Server Controls" },
          { key: "system",  label: "⚙️ System Config" },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "10px 20px", fontSize: 13, fontWeight: 500,
            fontFamily: "var(--sans)",
            color: tab === t.key ? "var(--text-bright)" : "var(--text-dim)",
            borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
            marginBottom: -1, transition: "all 0.15s",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="loading"><div className="spinner" />Loading...</div> : <>

        {/* ── USERS TAB ── */}
        {tab === "users" && (
          <div>
            {/* Summary stats */}
            <div className="stat-grid" style={{ marginBottom: 20 }}>
              {[
                { label: "Total Users", val: users.length },
                { label: "Banned", val: users.filter(u => u.banned).length, color: "var(--red)" },
                { label: "Staff", val: users.filter(u => ["owner","co_owner","admin"].includes(u.role)).length, color: "var(--yellow)" },
                { label: "Active (7d)", val: users.filter(u => u.last_sign_in_at && Date.now() - new Date(u.last_sign_in_at).getTime() < 7*86400000).length, color: "var(--green)" },
              ].map((s) => (
                <div className="stat-block" key={s.label}>
                  <div className="stat-name">{s.label}</div>
                  <div className="stat-val" style={{ color: s.color || "var(--text-bright)", fontSize: 28 }}>{s.val}</div>
                </div>
              ))}
            </div>

            <div className="search-bar" style={{ marginBottom: 16 }}>
              <span style={{ color: "var(--text-dim)" }}>🔍</span>
              <input placeholder="Search by name, email, or user ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
              {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>✕</button>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredUsers.length === 0 ? (
                <div className="card" style={{ textAlign: "center", color: "var(--text-dim)", padding: 30 }}>No users found</div>
              ) : filteredUsers.map((u) => (
                <div key={u.id} className="card" style={{ padding: 0, overflow: "hidden", opacity: u.banned ? 0.6 : 1 }}>
                  {/* User row */}
                  <div style={{ display: "flex", alignItems: "center", padding: "14px 20px", gap: 14, flexWrap: "wrap" }}>
                    {u.image_url && <img src={u.image_url} alt="" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-bright)" }}>
                          {u.first_name || u.username || "Unknown"} {u.last_name || ""}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                          background: "var(--bg3)", color: getRoleColor(parseRole(u.role)),
                          border: `1px solid ${getRoleColor(parseRole(u.role))}30`,
                        }}>
                          {getRoleLabel(parseRole(u.role))}
                        </span>
                        {u.banned && <span style={{ fontSize: 11, color: "var(--red)", fontWeight: 700 }}>BANNED</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
                        {u.email || "No email"} · Last seen: {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "Never"}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "monospace", marginTop: 2 }}>{u.id}</div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}>
                        {expandedUser === u.id ? "▲ Less" : "▼ Manage"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded management panel */}
                  {expandedUser === u.id && (
                    <div style={{ background: "var(--bg3)", borderTop: "1px solid var(--border)", padding: "16px 20px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                        {/* Role management */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                            Role
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {ALL_ROLES.filter(r => u.id !== user?.id || r !== "owner").map((r) => (
                              <button key={r} onClick={() => changeRole(u.id, r)} style={{
                                padding: "5px 12px", fontSize: 12, fontWeight: 600,
                                border: `1px solid ${u.role === r ? getRoleColor(r) : "var(--border)"}`,
                                background: u.role === r ? `${getRoleColor(r)}15` : "var(--bg2)",
                                color: u.role === r ? getRoleColor(r) : "var(--text-dim)",
                                cursor: "pointer", borderRadius: 4, fontFamily: "var(--sans)",
                                transition: "all 0.15s",
                              }}>
                                {getRoleLabel(r)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Server access */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                            Server Visibility
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.7 }}>
                            {["owner","co_owner","admin"].includes(u.role) ? (
                              <span style={{ color: "var(--green)" }}>✓ All servers (staff role)</span>
                            ) : u.role === "has_server" ? (
                              <div>
                                {ampInstances.map(inst => {
                                  const hasAccess = (userServerAccess[u.id] || []).includes(inst.id);
                                  return (
                                    <div key={inst.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                      <button onClick={() => {
                                        const current = userServerAccess[u.id] || [];
                                        const updated = hasAccess
                                          ? current.filter(id => id !== inst.id)
                                          : [...current, inst.id];
                                        setUserServerAccess({ ...userServerAccess, [u.id]: updated });
                                        notify(`${inst.name} ${hasAccess ? "removed" : "added"} for user`);
                                      }} style={{
                                        width: 20, height: 20, borderRadius: 3, cursor: "pointer",
                                        background: hasAccess ? "var(--green-dim)" : "var(--bg2)",
                                        border: `1px solid ${hasAccess ? "var(--green-border)" : "var(--border)"}`,
                                        color: hasAccess ? "var(--green)" : "var(--text-dim)",
                                        fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center",
                                      }}>
                                        {hasAccess ? "✓" : ""}
                                      </button>
                                      <span style={{ color: "var(--text)" }}>{inst.name}</span>
                                      <span className={`pill ${inst.running && inst.app_state === 20 ? "operational" : "outage"}`} style={{ fontSize: 10, padding: "1px 6px" }}>
                                        {inst.running && inst.app_state === 20 ? "Online" : "Offline"}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span style={{ color: "var(--text-dim)" }}>No server access (role: {getRoleLabel(parseRole(u.role))})</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Danger zone */}
                      {u.id !== user?.id && (
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
                          <button className={`btn btn-sm ${u.banned ? "btn-secondary" : "btn-danger"}`}
                            onClick={() => setConfirmAction({
                              message: `${u.banned ? "Unban" : "Ban"} ${u.email || u.username}?`,
                              label: u.banned ? "Unban" : "Ban User",
                              onConfirm: () => banUser(u.id, !u.banned),
                            })}>
                            {u.banned ? "🔓 Unban User" : "🚫 Ban User"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ACCESS CONTROL TAB ── */}
        {tab === "access" && (
          <div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 20, lineHeight: 1.7 }}>
              Control which pages each role can access. Owner always has full access.
            </div>
            <div className="card" style={{ padding: 0, overflow: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Page</th>
                    {["viewer","has_server","admin","co_owner"].map(r => (
                      <th key={r} style={{ textAlign: "center" }}>
                        <span style={{ color: getRoleColor(r as Role) }}>{getRoleLabel(r as Role)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PAGES.map(page => (
                    <tr key={page}>
                      <td style={{ color: "var(--text-bright)", fontWeight: 500, textTransform: "capitalize" }}>{page}</td>
                      {["viewer","has_server","admin","co_owner"].map(r => {
                        const allowed = accessRules[r]?.[page] !== false;
                        const isAlwaysAllowed = page === "owner" && ["admin","co_owner"].includes(r);
                        return (
                          <td key={r} style={{ textAlign: "center" }}>
                            <button onClick={() => !isAlwaysAllowed && toggleAccess(r, page, !allowed)} style={{
                              background: allowed ? "var(--green-dim)" : "var(--red-dim)",
                              border: `1px solid ${allowed ? "var(--green-border)" : "var(--red-border)"}`,
                              color: allowed ? "var(--green)" : "var(--red)",
                              padding: "4px 12px", borderRadius: 4,
                              cursor: isAlwaysAllowed ? "default" : "pointer",
                              fontSize: 12, fontWeight: 600, fontFamily: "var(--sans)",
                              opacity: isAlwaysAllowed ? 0.5 : 1,
                              transition: "all 0.15s",
                            }}>
                              {allowed ? "✓" : "✗"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SERVER CONTROLS TAB ── */}
        {tab === "servers" && (
          <div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 20 }}>
              Control AMP game server instances. Use with caution.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ampInstances.map((inst) => {
                const isOnline  = inst.running && inst.app_state === 20;
                const isSleep   = inst.app_state === 50;
                const isOffline = !inst.running;
                const stateColor = isOnline ? "var(--green)" : isSleep ? "var(--yellow)" : "var(--red)";
                const memPct = inst.memory_max_mb ? Math.round(inst.memory_mb / inst.memory_max_mb * 100) : 0;

                return (
                  <div key={inst.id} className="card" style={{ padding: "18px 20px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: stateColor, flexShrink: 0, marginTop: 3 }} />
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-bright)" }}>{inst.name}</div>
                          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 3 }}>
                            {isOnline ? `${inst.players}/${inst.max_players} players · ${inst.tps} TPS · ${inst.cpu_percent}% CPU · ${inst.memory_mb}MB RAM`
                              : isSleep ? "Sleeping" : "Offline"}
                          </div>
                          {inst.public_address && (
                            <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "monospace", marginTop: 2 }}>{inst.public_address}</div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {!isOnline && !isSleep && (
                          <button className="btn btn-secondary btn-sm" style={{ color: "var(--green)", borderColor: "var(--green-border)" }}
                            onClick={() => serverAction(inst.id, "start", inst.name)}>
                            ▶ Start
                          </button>
                        )}
                        {(isOnline || isSleep) && (
                          <button className="btn btn-secondary btn-sm"
                            onClick={() => setConfirmAction({
                              message: `Restart ${inst.name}? Players will be briefly disconnected.`,
                              label: "Restart", onConfirm: () => serverAction(inst.id, "restart", inst.name),
                            })}>
                            🔄 Restart
                          </button>
                        )}
                        {(isOnline || isSleep) && (
                          <button className="btn btn-danger btn-sm"
                            onClick={() => setConfirmAction({
                              message: `Stop ${inst.name}? All players will be disconnected.`,
                              label: "Stop Server", onConfirm: () => serverAction(inst.id, "stop", inst.name),
                            })}>
                            ⏹ Stop
                          </button>
                        )}
                        {isOnline && (
                          <button className="btn btn-danger btn-sm"
                            onClick={() => setConfirmAction({
                              message: `Force kill ${inst.name}? This may cause data loss.`,
                              label: "Force Kill", onConfirm: () => serverAction(inst.id, "kill", inst.name),
                            })}>
                            💀 Kill
                          </button>
                        )}
                      </div>
                    </div>

                    {isOnline && inst.memory_max_mb && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>
                          <span>Memory</span><span>{inst.memory_mb}MB / {inst.memory_max_mb}MB</span>
                        </div>
                        <div className="bar" style={{ marginTop: 0 }}>
                          <div className={`bar-fill ${memPct < 60 ? "ok" : memPct < 85 ? "warn" : "danger"}`} style={{ width: `${Math.min(100, memPct)}%` }} />
                        </div>
                      </div>
                    )}
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
                    <tr><th>Alert Type</th><th>Key</th><th style={{ textAlign: "center" }}>Status</th></tr>
                  </thead>
                  <tbody>
                    {Object.entries(sysConfig.alerts).map(([key, val]) => (
                      <tr key={key}>
                        <td style={{ color: "var(--text-bright)", fontWeight: 500 }}>
                          {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </td>
                        <td><code style={{ fontSize: 11, color: "var(--text-dim)" }}>{key}</code></td>
                        <td style={{ textAlign: "center" }}>
                          <button onClick={() => toggleAlert(key, !val)} style={{
                            background: val ? "var(--green-dim)" : "var(--bg3)",
                            border: `1px solid ${val ? "var(--green-border)" : "var(--border)"}`,
                            color: val ? "var(--green)" : "var(--text-dim)",
                            padding: "4px 16px", borderRadius: 4, cursor: "pointer",
                            fontSize: 12, fontWeight: 700, fontFamily: "var(--sans)",
                            minWidth: 60, transition: "all 0.15s",
                          }}>
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
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="number" className="form-input" defaultValue={val as number}
                          onBlur={(e) => updateConfig({ thresholds: { [key]: parseFloat(e.target.value) } })} />
                        <span style={{ fontSize: 12, color: "var(--text-dim)", flexShrink: 0 }}>
                          {key.includes("days") ? "days" : "%"}
                        </span>
                      </div>
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
                    <input type="number" className="form-input" defaultValue={sysConfig.monitor_interval}
                      onBlur={(e) => updateConfig({ monitor_interval: parseInt(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status Embed Interval (seconds)</label>
                    <input type="number" className="form-input" defaultValue={sysConfig.status_embed_interval}
                      onBlur={(e) => updateConfig({ status_embed_interval: parseInt(e.target.value) })} />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 8 }}>
                  Changes apply immediately without restarting the server.
                </div>
              </div>
            </div>
          </div>
        )}
      </>}
    </DashboardLayout>
  );
}
