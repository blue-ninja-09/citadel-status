"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch, parseRole, canAdmin, formatDate, timeAgo, type Role } from "@/lib/api";

export default function MaintenancePage() {
  const { user } = useUser();
  const role = parseRole(user?.publicMetadata?.role);
  const isAdmin = canAdmin(role) || role === "admin";

  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("upcoming");

  const [form, setForm] = useState({
    title: "", description: "", affected_services: "",
    scheduled_start: "", scheduled_end: "",
  });

  const fetch = useCallback(async () => {
    const d = await apiFetch("/maintenance");
    setMaintenance(d.maintenance || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, [fetch]);

  const create = async () => {
    await window.fetch(`${process.env.NEXT_PUBLIC_API_URL}/maintenance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, created_by: user?.username || user?.id }),
    });
    setShowModal(false);
    setForm({ title: "", description: "", affected_services: "", scheduled_start: "", scheduled_end: "" });
    fetch();
  };

  const filtered = maintenance.filter((m) => {
    if (filter === "upcoming") return ["scheduled","in_progress"].includes(m.status);
    if (filter === "completed") return ["completed","cancelled"].includes(m.status);
    return true;
  });

  return (
    <DashboardLayout
      title="Maintenance"
      subtitle="Scheduled and completed maintenance windows"
      actions={isAdmin ? (
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          + Schedule Maintenance
        </button>
      ) : undefined}
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["upcoming","completed","all"].map((f) => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-dim)", padding: 40 }}>
          {filter === "upcoming" ? "✅ No upcoming maintenance" : "No maintenance records"}
        </div>
      ) : (
        filtered.map((m) => (
          <div key={m.id} className={`maintenance-card ${m.status}`}>
            <div className="incident-header">
              <div>
                <div className="incident-title">{m.title}</div>
                <div className="incident-meta">
                  📅 {formatDate(m.scheduled_start)} → {formatDate(m.scheduled_end)}
                  {m.affected_services && ` · Affects: ${m.affected_services}`}
                  {m.created_by && ` · By: ${m.created_by}`}
                </div>
              </div>
              <span className={`pill ${m.status === "completed" ? "operational" : m.status === "cancelled" ? "unknown" : "maintenance"}`}>
                {m.status}
              </span>
            </div>
            {m.description && <div className="incident-desc">{m.description}</div>}
          </div>
        ))
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Schedule Maintenance</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Server restart for updates" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What work is being done?" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Time</label>
                <input type="datetime-local" className="form-input" value={form.scheduled_start}
                  onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">End Time</label>
                <input type="datetime-local" className="form-input" value={form.scheduled_end}
                  onChange={(e) => setForm({ ...form, scheduled_end: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Affected Services</label>
              <input className="form-input" value={form.affected_services}
                onChange={(e) => setForm({ ...form, affected_services: e.target.value })}
                placeholder="e.g. All Minecraft servers, MySQL" />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={create}
                disabled={!form.title || !form.scheduled_start || !form.scheduled_end}>
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
