"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Wallet,
  ReceiptText,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  X,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { authService } from "@/lib/auth";
import { formatUserName } from "@/lib/utils";

export default function Sidebar() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const {
    user,
    isAdmin,
    isOwner,
    canManageUsers,
    canManageCompanies,
    canViewReports,
  } = usePermissions();

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const [manualConfigExpanded, setManualConfigExpanded] = useState<
    boolean | null
  >(null);

  // Derived state: Use manual override if present, otherwise default to true for admins/owners
  const isConfigExpanded =
    manualConfigExpanded !== null ? manualConfigExpanded : isAdmin || isOwner;

  const toggleConfig = () => {
    setManualConfigExpanded(!isConfigExpanded);
  };

  const handleLogout = async () => {
    await authService.logout();
    window.location.href = "/login";
  };

  // Helper to get initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return "??";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const isActive = (href: string) => pathname === href;

  if (!isMounted) {
    return (
      <aside className="sidebar-container">
        <div className="sidebar-logo">
          <div className="sidebar-logo-main">
            Neo<span className="sidebar-logo-accent">Cobros</span>
          </div>
          <div className="sidebar-logo-sub">CARGANDO...</div>
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Mobile Toggle Button (Burger) - Hidden when sidebar is open */}
      {!isOpen && (
        <button
          className="sidebar-toggle-btn"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir Menú"
        >
          {/* Using a simple div instead of Menu icon as it was removed or just use a square */}
          <div
            style={{
              width: 20,
              height: 2,
              backgroundColor: "currentColor",
              boxShadow: "0 6px 0 currentColor, 0 -6px 0 currentColor",
            }}
          />
        </button>
      )}

      {/* Backdrop for mobile */}
      <div
        className={`sidebar-backdrop ${isOpen ? "sidebar-open" : ""}`}
        onClick={() => setIsOpen(false)}
      />

      <aside className={`sidebar-container ${isOpen ? "sidebar-open" : ""}`}>
        {/* Close Button for Mobile */}
        <button
          className="sidebar-close-btn"
          onClick={() => setIsOpen(false)}
          aria-label="Cerrar Menú"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        {/* Logo Section */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-main">
            Neo<span className="sidebar-logo-accent">Cobros</span>
          </div>
          <div className="sidebar-logo-sub">SAAS DE COBRANZA</div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-group-label">PRINCIPAL</div>

          <Link
            href="/dashboard"
            className={`sidebar-nav-item ${isActive("/dashboard") ? "sidebar-active" : ""}`}
            onClick={() => setIsOpen(false)}
          >
            <LayoutDashboard
              size={20}
              strokeWidth={isActive("/dashboard") ? 2.5 : 2}
            />
            Resumen
          </Link>

          <Link
            href="/prestamos"
            className={`sidebar-nav-item ${isActive("/prestamos") ? "sidebar-active" : ""}`}
            onClick={() => setIsOpen(false)}
          >
            <Wallet size={20} strokeWidth={isActive("/prestamos") ? 2.5 : 2} />
            Préstamos
          </Link>

          <Link
            href="/gastos"
            className={`sidebar-nav-item ${isActive("/gastos") ? "sidebar-active" : ""}`}
            onClick={() => setIsOpen(false)}
          >
            <ReceiptText
              size={20}
              strokeWidth={isActive("/gastos") ? 2.5 : 2}
            />
            Gastos
          </Link>

          {/* Administration Section - Only for Admin/Owner */}
          {(isAdmin || isOwner) && (
            <>
              <div className="sidebar-group-label">ADMINISTRACIÓN</div>

              <div>
                <button
                  className={`sidebar-accordion-header ${isConfigExpanded ? "sidebar-active" : ""}`}
                  onClick={toggleConfig}
                >
                  <Settings
                    size={20}
                    strokeWidth={isConfigExpanded ? 2.5 : 2}
                  />
                  <span style={{ flex: 1, textAlign: "left" }}>
                    Configuración
                  </span>
                  {isConfigExpanded ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>

                {isConfigExpanded && (
                  <div className="sidebar-accordion-content">
                    {canManageUsers && (
                      <Link
                        href="/cobradores"
                        className={`sidebar-sub-item ${isActive("/cobradores") ? "sidebar-active" : ""}`}
                        onClick={() => setIsOpen(false)}
                      >
                        Usuarios
                      </Link>
                    )}
                    {canManageCompanies && (
                      <Link
                        href="/empresas"
                        className={`sidebar-sub-item ${isActive("/empresas") ? "sidebar-active" : ""}`}
                        onClick={() => setIsOpen(false)}
                      >
                        Empresas
                      </Link>
                    )}
                    {canViewReports && (
                      <Link
                        href="/reportes"
                        className={`sidebar-sub-item ${isActive("/reportes") ? "sidebar-active" : ""}`}
                        onClick={() => setIsOpen(false)}
                      >
                        Reportes
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-profile-card">
            <div className="sidebar-avatar">{getInitials(user?.username)}</div>
            <div className="sidebar-profile-info">
              <div className="sidebar-user-name">{formatUserName(user)}</div>
              <div className="sidebar-user-role">
                {isOwner
                  ? "PROPIETARIO / ADMIN"
                  : isAdmin
                    ? "ADMINISTRADOR"
                    : "COBRADOR"}
              </div>
            </div>
          </div>

          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <LogOut size={20} strokeWidth={2.5} />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
