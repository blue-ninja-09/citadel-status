"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import DashboardLayout from "@/citadel-status/components/DashboardLayout";
import { apiFetch, canAdmin, formatDate, type Role } from "@/citadel-status/lib/api";

export default function ChangelogPage() {
  const { user } = useUser();
  const role = (user?.publicMetadata?.role as Role) || "viewer";
  const isAdmin = canAdmin(role);

  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ version: "", title: "", description: "" });

  const fetch = useCallback(async () => {
    const d = await apiFetch("/changelog");
    setEntries(d.changelog || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async () => {
    await window.fetch(`${process.env.NEXT_PUBLIC_API_URL}/changelog`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, created_by: user?.username || user?.id }),
    });
    setShowModal(false);
    setForm({ version: "", title: "", description: "" });
    fetch();
  };

  return (
    <DashboardLayout
      title="Changelog"
      subtitle="Dashboard updates and feature additions"
      actions={isAdmin ? (
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Add Entry</button>
      ) : undefined}
    >
      {loading ? (
        <div className="loading"><div className="spinner" />Loading...</div>
      ) : entries.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-dim)", padding: 40 }}>
          No changelog entries yet
        </div>
      ) : (
        entries.map((entry) => (
          <div key={entry.id} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {entry.version && (
                  <span style={{
                    background: "var(--accent-dim)", color: "var(--accent-light)",
                    border: "1px solid var(--accent)", padding: "2px 8px",
                    fontSize: 11, fontWeight: 700, fontFamily: "monospace",
                  }}>
                    v{entry.version}
                  </span>
                )}
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-bright)" }}>{entry.title}</div>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{formatDate(entry.created_at)}</div>
            </div>
            {entry.description && (
              <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {entry.description}
              </div>
            )}
          </div>
        ))
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add Changelog Entry</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Version (optional)</label>
                <input className="form-input" value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="2.1.0" />
              </div>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What changed?" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" style={{ minHeight: 120 }} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detail the changes made..." />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={create} disabled={!form.title}>Add Entry</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
