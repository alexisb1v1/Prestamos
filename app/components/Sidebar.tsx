"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  HelpCircle,
  Download,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { authService } from "@/lib/auth";
import { formatUserName } from "@/lib/utils";
import { TOURS } from "@/lib/tours.config";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
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

  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    
    const checkInstall = () => {
      if ((window as any).deferredInstallPrompt) {
        setCanInstall(true);
      }
    };
    
    // Verificar estado inicial y suscribirse a evento global
    checkInstall();
    window.addEventListener("pwa-install-available", checkInstall);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pwa-install-available", checkInstall);
    };
  }, []);

  const handleInstallPWA = async () => {
    const deferredPrompt = (window as any).deferredInstallPrompt;
    if (!deferredPrompt) return;
    
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setCanInstall(false);
      (window as any).deferredInstallPrompt = null;
    }
  };

  const [manualConfigExpanded, setManualConfigExpanded] = useState<
    boolean | null
  >(null);

  // Derived state: Use manual override if present, otherwise default to true for admins/owners
  const isConfigExpanded =
    manualConfigExpanded !== null ? manualConfigExpanded : isAdmin || isOwner;

  const toggleConfig = () => {
    setManualConfigExpanded(!isConfigExpanded);
  };

  const [manualHelpExpanded, setManualHelpExpanded] = useState<boolean | null>(null);
  const isHelpExpanded = manualHelpExpanded !== null ? manualHelpExpanded : false;
  const toggleHelp = () => setManualHelpExpanded(!isHelpExpanded);

  const handleStartTour = (path: string) => {
    setIsOpen(false);
    if (pathname !== path) {
      router.push(path);
      setTimeout(() => {
        if (window.startTour) window.startTour(path);
      }, 800);
    } else {
      if (window.startTour) window.startTour(path);
    }
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

          {/* Sección de Ayuda / Tutoriales */}
          <div className="sidebar-group-label" style={{ marginTop: '1rem' }}>AYUDA</div>
          <div>
            <button
              className={`sidebar-accordion-header ${isHelpExpanded ? "sidebar-active" : ""}`}
              onClick={toggleHelp}
            >
              <HelpCircle size={20} strokeWidth={isHelpExpanded ? 2.5 : 2} />
              <span style={{ flex: 1, textAlign: "left" }}>Tutoriales</span>
              {isHelpExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {isHelpExpanded && (
              <div className="sidebar-accordion-content">
                {Object.values(TOURS).map((tour) => (
                  <button
                    key={tour.id}
                    className="sidebar-sub-item"
                    style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none' }}
                    onClick={() => handleStartTour(tour.path)}
                  >
                    {tour.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {canInstall && (
            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
              <button
                className="sidebar-nav-item"
                onClick={handleInstallPWA}
                style={{
                  width: "calc(100% - 1.5rem)",
                  margin: "0 0.75rem",
                  justifyContent: "flex-start",
                  backgroundColor: "#e0e7ff",
                  color: "#4338ca",
                  border: "1px solid #c7d2fe",
                }}
              >
                <Download size={20} strokeWidth={2.5} />
                Instalar App
              </button>
            </div>
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
