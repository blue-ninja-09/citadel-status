"use client";

import { useUser } from "@clerk/nextjs";
import { UserProfile } from "@clerk/nextjs";
import DashboardLayout from "@/components/DashboardLayout";
import { parseRole, getRoleLabel, getRoleColor, type Role } from "@/lib/api";

export default function AccountPage() {
  const { user, isLoaded } = useUser();
  const role = isLoaded ? parseRole(user?.publicMetadata?.role) : "viewer";

  const perms = [
    { label: "View live stats",        allowed: true },
    { label: "View incidents",         allowed: true },
    { label: "View maintenance",       allowed: true },
    { label: "Create incidents",       allowed: ["owner","co_owner","admin"].includes(role) },
    { label: "Schedule maintenance",   allowed: ["owner","co_owner","admin"].includes(role) },
    { label: "Access admin panel",     allowed: ["owner","co_owner","admin"].includes(role) },
    { label: "Access owner panel",     allowed: role === "owner" },
    { label: "Manage users & roles",   allowed: role === "owner" },
    { label: "Server start/stop/kill", allowed: role === "owner" },
    { label: "Toggle Discord alerts",  allowed: role === "owner" },
  ];

  const roleDescriptions: Record<Role, string> = {
    owner:      "Full system access — all panels, user management, server controls",
    co_owner:   "Administrative access — incidents, maintenance, admin panel",
    admin:      "Staff access — incidents, maintenance, admin panel",
    has_server: "Server management access — view own server detailed stats",
    viewer:     "Read-only access — view all public stats and status",
    public:     "Public access only",
  };

  return (
    <DashboardLayout title="Account" subtitle="Your account and preferences">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Role info */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 14 }}>Your Access Level</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "var(--bg3)", border: `2px solid ${getRoleColor(role)}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
            }}>
              {role === "owner" ? "👑" : role === "co_owner" ? "🛡️" : role === "admin" ? "⚡" : role === "has_server" ? "🎮" : "👤"}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: getRoleColor(role) }}>
                {getRoleLabel(role)}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
                {roleDescriptions[role]}
              </div>
            </div>
          </div>

          <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", padding: "12px 14px" }}>
            <div style={{ color: "var(--text-dim)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Permissions</div>
            {perms.map((p) => (
              <div key={p.label} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "5px 0", borderBottom: "1px solid var(--border)", fontSize: 12,
              }}>
                <span style={{ color: p.allowed ? "var(--text)" : "var(--text-dim)" }}>{p.label}</span>
                <span style={{ color: p.allowed ? "var(--green)" : "var(--text-dim)", fontWeight: 600 }}>
                  {p.allowed ? "✓" : "✗"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Account info */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 14 }}>Account Info</div>
          {[
            { label: "Name",     value: user?.fullName || "—" },
            { label: "Username", value: user?.username || "—" },
            { label: "Email",    value: user?.primaryEmailAddress?.emailAddress || "—" },
            { label: "User ID",  value: user?.id || "—" },
            { label: "Joined",   value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—" },
          ].map((row) => (
            <div key={row.label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13,
            }}>
              <span style={{ color: "var(--text-dim)" }}>{row.label}</span>
              <span style={{
                color: "var(--text-bright)",
                fontFamily: row.label === "User ID" ? "monospace" : "inherit",
                fontSize: row.label === "User ID" ? 11 : 13,
              }}>
                {row.value}
              </span>
            </div>
          ))}

          <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--accent-dim)", border: "1px solid var(--accent)", fontSize: 12, color: "var(--text)" }}>
            <strong style={{ color: "var(--accent-light)" }}>Need a role change?</strong> Contact Caelum and provide your User ID above.
          </div>
        </div>
      </div>

      {/* Clerk profile */}
      <div className="section">
        <div className="section-title">Manage Account</div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <UserProfile />
        </div>
      </div>
    </DashboardLayout>
  );
}
