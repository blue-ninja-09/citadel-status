"use client";

import { useUser } from "@clerk/nextjs";
import { UserProfile } from "@clerk/nextjs";
import DashboardLayout from "@/components/DashboardLayout";
import { getRoleLabel, type Role } from "@/lib/api";

export default function AccountPage() {
  const { user } = useUser();
  const role = (user?.publicMetadata?.role as Role) || "viewer";

  return (
    <DashboardLayout title="Account" subtitle="Your account and preferences">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Role info */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 14 }}>Your Access Level</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", background: "var(--accent-dim)",
              border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
            }}>
              {role === "owner" ? "👑" : role === "co_owner" ? "🛡️" : role === "has_server" ? "🎮" : "👤"}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-bright)" }}>
                {getRoleLabel(role)}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
                {role === "owner"      ? "Full system access" :
                 role === "co_owner"   ? "Administrative access" :
                 role === "has_server" ? "Server management access" :
                                        "Read-only access"}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--bg3)", border: "1px solid var(--border)", fontSize: 12 }}>
            <div style={{ color: "var(--text-dim)", marginBottom: 6 }}>Permissions</div>
            {[
              { label: "View live stats",        allowed: true },
              { label: "View incidents",         allowed: true },
              { label: "View maintenance",       allowed: true },
              { label: "Create incidents",       allowed: role === "owner" || role === "co_owner" },
              { label: "Schedule maintenance",   allowed: role === "owner" || role === "co_owner" },
              { label: "Access admin panel",     allowed: role === "owner" || role === "co_owner" },
              { label: "Assign roles",           allowed: role === "owner" },
            ].map((p) => (
              <div key={p.label} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "4px 0", borderBottom: "1px solid var(--border)",
              }}>
                <span style={{ color: "var(--text)" }}>{p.label}</span>
                <span style={{ color: p.allowed ? "var(--green)" : "var(--text-dim)", fontSize: 13 }}>
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
              display: "flex", justifyContent: "space-between",
              padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13,
            }}>
              <span style={{ color: "var(--text-dim)" }}>{row.label}</span>
              <span style={{ color: "var(--text-bright)", fontFamily: row.label === "User ID" ? "monospace" : "inherit", fontSize: row.label === "User ID" ? 11 : 13 }}>
                {row.value}
              </span>
            </div>
          ))}

          <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--accent-dim)", border: "1px solid var(--accent)", fontSize: 12, color: "var(--text)" }}>
            <strong style={{ color: "var(--accent-light)" }}>Need a role change?</strong> Contact Caelum and provide your User ID above.
          </div>
        </div>
      </div>

      {/* Clerk profile manager */}
      <div className="section">
        <div className="section-title">Manage Account</div>
        <div style={{ transform: "scale(0.95)", transformOrigin: "top left" }}>
          <UserProfile />
        </div>
      </div>
    </DashboardLayout>
  );
}
