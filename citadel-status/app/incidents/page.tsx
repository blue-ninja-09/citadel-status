"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import DashboardLayout from "@/citadel-status/components/DashboardLayout";
import { apiFetch, canAdmin, formatDate, timeAgo, type Role } from "@/citadel-status/lib/api";

export default function IncidentsPage() {
  const { user } = useUser();
  const role = (user?.publicMetadata?.role as Role) || "viewer";
  const isAdmin = canAdmin(role);

  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState<any>(null);
  const [filter, setFilter]       = useState<string>("active");

  const [form, setForm] = useState({
    title: "", description: "", severity: "minor",
    status: "investigating", affected_services: "",
  });

  const [updateForm, setUpdateForm] = useState({
    update_message: "", status: "investigating",
  });

  const fetchIncidents = useCallback(async () => {
    const d = await apiFetch("/incidents");
    setIncidents(d.incidents || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchIncidents();
    const id = setInterval(fetchIncidents, 15000);
    return () => clearInterval(id);
  }, [fetchIncidents]);

  const createIncident = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/incidents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, created_by: user?.username || user?.id }),
    });
    setShowModal(false);
    setForm({ title: "", description: "", severity: "minor", status: "investigating", affected_services: "" });
    fetchIncidents();
  };

  const updateIncident = async (id: number) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/incidents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updateForm, created_by: user?.username || user?.id }),
    });
    setShowUpdateModal(null);
    fetchIncidents();
  };

  const filtered = incidents.filter((i) => {
    if (filter === "active") return ["investigating","identified","monitoring"].includes(i.status);
    if (filter === "resolved") return i.status === "resolved";
    return true;
  });

  return (
    <DashboardLayout
      title="Incidents"
      subtitle="Track and manage service incidents"
      actions={isAdmin ? (
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          + New Incident
        </button>
      ) : undefined}
    >
      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["active","resolved","all"].map((f) => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === "active" && ` (${incidents.filter(i => ["investigating","identified","monitoring"].includes(i.status)).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />Loading incidents...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-dim)", padding: 40 }}>
          {filter === "active" ? "✅ No active incidents" : "No incidents found"}
        </div>
      ) : (
        filtered.map((inc) => (
          <div key={inc.id} className={`incident-card ${inc.status}`}>
            <div className="incident-header">
              <div>
                <div className="incident-title">{inc.title}</div>
                <div className="incident-meta">
                  #{inc.id} · {inc.severity} · Created {timeAgo(inc.created_at)}
                  {inc.resolved_at && ` · Resolved ${timeAgo(inc.resolved_at)}`}
                  {inc.affected_services && ` · Affects: ${inc.affected_services}`}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`pill ${inc.status === "resolved" ? "operational" : inc.status === "monitoring" ? "maintenance" : "outage"}`}>
                  {inc.status}
                </span>
                {isAdmin && inc.status !== "resolved" && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setShowUpdateModal(inc); setUpdateForm({ update_message: "", status: inc.status }); }}
                  >
                    Update
                  </button>
                )}
              </div>
            </div>
            <div className="incident-desc">{inc.description}</div>
            {inc.updates?.length > 0 && (
              <div className="incident-updates">
                {inc.updates.map((u: any, i: number) => (
                  <div key={i} className="incident-update">
                    <span className="incident-update-time">{formatDate(u.created_at)}</span>
                    <span className="incident-update-msg">[{u.status}] {u.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}

      {/* Create incident modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Create Incident</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Brief incident title" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What's happening?" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Severity</label>
                <select className="form-select" value={form.severity}
                  onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                  <option value="minor">Minor</option>
                  <option value="major">Major</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="investigating">Investigating</option>
                  <option value="identified">Identified</option>
                  <option value="monitoring">Monitoring</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Affected Services</label>
              <input className="form-input" value={form.affected_services}
                onChange={(e) => setForm({ ...form, affected_services: e.target.value })}
                placeholder="e.g. FNaR, MySQL" />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createIncident} disabled={!form.title}>Create Incident</button>
            </div>
          </div>
        </div>
      )}

      {/* Update incident modal */}
      {showUpdateModal && (
        <div className="modal-overlay" onClick={() => setShowUpdateModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Update: {showUpdateModal.title}</div>
              <button className="modal-close" onClick={() => setShowUpdateModal(null)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Update Message</label>
              <textarea className="form-textarea" value={updateForm.update_message}
                onChange={(e) => setUpdateForm({ ...updateForm, update_message: e.target.value })}
                placeholder="What's the latest update?" />
            </div>
            <div className="form-group">
              <label className="form-label">New Status</label>
              <select className="form-select" value={updateForm.status}
                onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}>
                <option value="investigating">Investigating</option>
                <option value="identified">Identified</option>
                <option value="monitoring">Monitoring</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowUpdateModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => updateIncident(showUpdateModal.id)}>Post Update</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
