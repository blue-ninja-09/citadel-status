export const API = process.env.NEXT_PUBLIC_API_URL || "https://status-api.citadelservers.online";

export async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    signal: AbortSignal.timeout(8000),
    ...opts,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// Role hierarchy — "viewer" is the safe default, never "owner"
export type Role = "owner" | "co_owner" | "admin" | "has_server" | "viewer" | "public";

const VALID_ROLES: Role[] = ["owner", "co_owner", "admin", "has_server", "viewer", "public"];

export function parseRole(raw: unknown): Role {
  if (typeof raw === "string" && VALID_ROLES.includes(raw as Role)) {
    return raw as Role;
  }
  return "viewer"; // safe default — never assume owner
}

export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    owner:      "Owner",
    co_owner:   "Co-Owner",
    admin:      "Admin",
    has_server: "Server Owner",
    viewer:     "Viewer",
    public:     "Public",
  };
  return labels[role] || "Viewer";
}

export function getRoleColor(role: Role): string {
  const colors: Record<Role, string> = {
    owner:      "var(--red)",
    co_owner:   "var(--yellow)",
    admin:      "var(--accent-light)",
    has_server: "var(--blue)",
    viewer:     "var(--green)",
    public:     "var(--text-dim)",
  };
  return colors[role] || "var(--text-dim)";
}

export function canAdmin(role: Role) {
  return role === "owner" || role === "co_owner" || role === "admin";
}

export function isOwner(role: Role) {
  return role === "owner";
}

export function canViewDetails(role: Role) {
  return role !== "public";
}

export function statusColor(status: string): string {
  switch (status) {
    case "operational": return "var(--green)";
    case "outage":      return "var(--red)";
    case "sleeping":    return "var(--yellow)";
    case "degraded":    return "var(--yellow)";
    case "maintenance": return "var(--blue)";
    default:            return "var(--text-dim)";
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "operational": return "Operational";
    case "outage":      return "Outage";
    case "sleeping":    return "Sleeping";
    case "degraded":    return "Degraded";
    case "maintenance": return "Maintenance";
    default:            return "Unknown";
  }
}

export function categoryIcon(category: string): string {
  switch (category) {
    case "minecraft":      return "🎮";
    case "website":        return "🌐";
    case "infrastructure": return "🗄️";
    case "bot":            return "🤖";
    default:               return "⚙️";
  }
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function barClass(pct: number): string {
  if (pct < 60) return "ok";
  if (pct < 85) return "warn";
  return "danger";
}
