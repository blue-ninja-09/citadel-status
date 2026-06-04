"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { type Role, getRoleLabel } from "@/lib/api";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { label: "Overview",    href: "/dashboard",     icon: "📊" },
  { label: "Services",    href: "/services",      icon: "⚙️" },
  { label: "Incidents",   href: "/incidents",     icon: "🚨" },
  { label: "Maintenance", href: "/maintenance",   icon: "🔧" },
  { label: "Changelog",   href: "/changelog",     icon: "📋" },
  { label: "Account",     href: "/account",       icon: "👤" },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Admin Panel", href: "/admin", icon: "🛡️", adminOnly: true },
  { label: "Owner Panel", href: "/owner", icon: "👑", adminOnly: true },
];

interface Props {
  role: Role;
  activeIncidents?: number;
}

export default function Sidebar({ role, activeIncidents = 0 }: Props) {
  const pathname = usePathname();
  const { user } = useUser();

  const isAdmin = role === "owner" || role === "co_owner";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">Citadel <span>Status</span></div>
        <div className="sidebar-logo-sub">Infrastructure Monitor</div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-section-label">Navigation</div>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname === item.href || pathname.startsWith(item.href + "/") ? "active" : ""}`}
            >
              <span>{item.icon}</span>
              {item.label}
              {item.label === "Incidents" && activeIncidents > 0 && (
                <span className="nav-badge">{activeIncidents}</span>
              )}
            </Link>
          ))}
        </div>

        {isAdmin && (
          <div className="nav-section" style={{ marginTop: 8 }}>
            <div className="nav-section-label">Admin</div>
            {ADMIN_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname === item.href ? "active" : ""}`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div className="sidebar-bottom">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <UserButton />
          <div>
            <div style={{ fontSize: 12, color: "var(--text-bright)", fontWeight: 500 }}>
              {user?.firstName || user?.username || "User"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{getRoleLabel(role)}</div>
          </div>
        </div>
        <Link href="/" style={{ fontSize: 11, color: "var(--text-dim)", textDecoration: "none" }}>
          ← Public Status Page
        </Link>
      </div>
    </aside>
  );
}
