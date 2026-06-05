"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch, parseRole, categoryIcon, statusLabel, timeAgo } from "@/lib/api";

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [uptime, setUptime]     = useState<any>({});
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [toast, setToast]       = useState("");

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setToast(`Copied ${text}`);
      setTimeout(() => setToast(""), 2000);
    });
  };

  const fetchAll = useCallback(async () => {
    const [sv, u] = await Promise.allSettled([
      apiFetch("/services"),
      apiFetch("/uptime"),
    ]);
    if (sv.status === "fulfilled") setServices(sv.value.services || []);
    if (u.status === "fulfilled") setUptime(u.value.uptime || {});
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 15000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const filtered = services.filter((s) =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  );

  const grouped: Record<string, any[]> = {};
  for (const svc of filtered) {
    if (!grouped[svc.category]) grouped[svc.category] = [];
    grouped[svc.category].push(svc);
  }

  const catOrder = ["minecraft", "website", "infrastructure", "bot"];
  const sortedCats = Object.keys(grouped).sort(
    (a, b) => catOrder.indexOf(a) - catOrder.indexOf(b)
  );

  return (
    <DashboardLayout title="Services" subtitle="All monitored services and their current status">
      {toast && <div className="toast">{toast}</div>}

      <div className="search-bar">
        <span style={{ color: "var(--text-dim)" }}>🔍</span>
        <input
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>✕</button>
        )}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />Loading services...</div>
      ) : (
        sortedCats.map((cat) => (
          <div className="section" key={cat}>
            <div className="section-title">
              {categoryIcon(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
              <span className="section-title-count">
                · {grouped[cat].filter(s => s.status === "operational").length}/{grouped[cat].length} operational
              </span>
            </div>
            <div className="service-list">
              {grouped[cat].map((svc) => (
                <div className="service-row" key={svc.id}>
                  <div className="service-icon">{categoryIcon(svc.category)}</div>
                  <div className="service-info">
                    <div className="service-name">{svc.name}</div>
                    <div className="service-desc">{svc.description}</div>
                    {svc.owner && (
                      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                        Owner: {svc.owner}
                      </div>
                    )}
                  </div>
                  <div className="service-meta">
                    {/* MC server stats */}
                    {svc.category === "minecraft" && svc.players != null && (
                      <div style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "right" }}>
                        <div>{svc.players}/{svc.max_players} players</div>
                        {svc.tps != null && <div>{svc.tps} TPS</div>}
                      </div>
                    )}

                    {/* Address */}
                    {svc.public_address && (
                      <div
                        className="service-address"
                        onClick={() => copyText(svc.public_address)}
                        title="Click to copy"
                      >
                        {svc.public_address} ⎘
                      </div>
                    )}

                    {/* Uptime */}
                    {uptime[svc.id] != null && (
                      <div className="service-uptime" style={{
                        color: uptime[svc.id] >= 99 ? "var(--green)" :
                               uptime[svc.id] >= 95 ? "var(--yellow)" : "var(--red)"
                      }}>
                        {uptime[svc.id]}%
                      </div>
                    )}

                    <span className={`pill ${svc.status}`}>{statusLabel(svc.status)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </DashboardLayout>
  );
}
