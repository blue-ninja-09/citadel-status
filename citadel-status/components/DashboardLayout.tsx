"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Sidebar from "./Sidebar";
import { type Role, parseRole, apiFetch } from "@/lib/api";

interface Props {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function DashboardLayout({ children, title, subtitle, actions }: Props) {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<Role>("viewer");
  const [activeIncidents, setActiveIncidents] = useState(0);
  const [lastUpdate, setLastUpdate] = useState("");
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (!isLoaded) return;
    // Only set role once user is fully loaded — never default to owner
    const raw = user?.publicMetadata?.role;
    setRole(parseRole(raw));
  }, [user, isLoaded]);

  useEffect(() => {
    apiFetch("/incidents")
      .then((d) => {
        const active = d.incidents?.filter((i: any) =>
          ["investigating", "identified", "monitoring"].includes(i.status)
        ).length || 0;
        setActiveIncidents(active);
      })
      .catch(() => {});
    setLastUpdate(new Date().toLocaleTimeString());
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setLastUpdate(new Date().toLocaleTimeString());
          return 10;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="layout">
      <Sidebar role={role} activeIncidents={activeIncidents} />
      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{title}</div>
          <div className="topbar-right">
            <div className="live-badge">
              <div className="live-dot" /> Live
            </div>
            <div className="last-updated">{lastUpdate} · {countdown}s</div>
            {actions}
          </div>
        </div>
        <div className="page-content">
          {subtitle && (
            <div className="page-header">
              <div className="page-subtitle">{subtitle}</div>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
