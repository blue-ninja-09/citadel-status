"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { type Role, parseRole, getRoleLabel, getRoleColor } from "@/lib/api";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
  minRole?: Role;
}

const NAV: NavItem[] = [
  { label: "Overview",    href: "/dashboard",   icon: "📊" },
  { label: "Services",    href: "/services",    icon: "⚙️" },
  { label: "Incidents",   href: "/incidents",   icon: "🚨" },
  { label: "Maintenance", href: "/maintenance", icon: "🔧" },
  { label: "Changelog",   href: "/changelog",   icon: "📋" },
  { label: "Account",     href: "/account",     icon: "👤" },
];

const STAFF_NAV: NavItem[] = [
  { label: "Admin Panel", href: "/admin", icon: "🛡️", minRole: "admin" },
  { label: "Owner Panel", href: "/owner", icon: "👑", minRole: "owner" },
];

const ROLE_ORDER: Role[] = ["public", "viewer", "has_server", "admin", "co_owner", "owner"];

function meetsMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_ORDER.indexOf(userRole) >= ROLE_ORDER.indexOf(minRole);
}

interface Props {
  role: Role;
  activeIncidents?: number;
}

export default function Sidebar({ role, activeIncidents = 0 }: Props) {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();

  // Re-derive role from user metadata to ensure it's always accurate
  const safeRole = isLoaded ? parseRole(user?.publicMetadata?.role) : "viewer";
  const displayRole = safeRole;

  const staffItems = STAFF_NAV.filter(item =>
    item.minRole ? meetsMinRole(displayRole, item.minRole) : true
  );

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

        {staffItems.length > 0 && (
          <div className="nav-section" style={{ marginTop: 8 }}>
            <div className="nav-section-label">Staff</div>
            {staffItems.map((item) => (
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
            <div style={{
              fontSize: 11,
              color: getRoleColor(displayRole),
              fontWeight: 600,
            }}>
              {getRoleLabel(displayRole)}
            </div>
          </div>
        </div>
        <Link href="/" style={{ fontSize: 11, color: "var(--text-dim)", textDecoration: "none" }}>
          ← Public Status Page
        </Link>
      </div>
    </aside>
  );
}
