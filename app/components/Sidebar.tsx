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
  LogOut,
  X,
  BookOpen,
  Download,
  BarChart,
  KeyRound,
  Users,
  Building2,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { authService } from "@/lib/auth";
import { formatUserName } from "@/lib/utils";
import { TOURS } from "@/lib/tours.config";
import ChangePasswordModal from "./ChangePasswordModal";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
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

  const [manualReportesExpanded, setManualReportesExpanded] = useState<
    boolean | null
  >(null);
  const isReportesExpanded =
    manualReportesExpanded !== null ? manualReportesExpanded : false;
  const toggleReportes = () =>
    setManualReportesExpanded(!isReportesExpanded);

  const [manualHelpExpanded, setManualHelpExpanded] = useState<boolean | null>(
    null,
  );
  const isHelpExpanded =
    manualHelpExpanded !== null ? manualHelpExpanded : false;
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

  // Obtener iniciales o dos dígitos de identificación
  const getInitials = (name?: string) => {
    if (!name) return "45";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const isActive = (href: string) => pathname === href;

  if (!isMounted) {
    return (
      <aside className="sidebar-container">
        <div className="sidebar-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-title">
                Neo<span>Cobros</span>
              </span>
              <span className="sidebar-brand-subtitle">SAAS DE COBRANZA</span>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Botón flotante para abrir menú en móvil */}
      {!isOpen && (
        <button
          className="sidebar-toggle-btn"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir Menú"
        >
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

      {/* Backdrop para móvil */}
      <div
        className={`sidebar-backdrop ${isOpen ? "sidebar-open" : ""}`}
        onClick={() => setIsOpen(false)}
        style={{ zIndex: 101 }}
      />

      <aside
        className={`sidebar-container ${isOpen ? "sidebar-open" : ""}`}
        style={{ zIndex: 101 }}
      >
        {/* 1. Cabecera del Menú */}
        <div className="sidebar-header">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              minWidth: 0,
            }}
          >
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-title">
                Neo<span>Cobros</span>
              </span>
              <span className="sidebar-brand-subtitle">SAAS DE COBRANZA</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              className="sidebar-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar Menú"
              style={{ display: isOpen ? "flex" : "none" }}
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* 2. Contenido de Navegación */}
        <nav className="sidebar-nav">
          {/* SECCIÓN: OPERACIONES DEL DÍA */}
          <div className="sidebar-nav-section">
            <p className="sidebar-section-title">Operaciones del Día</p>

            {/* Resumen del Día */}
            <Link
              href="/dashboard"
              className={`sidebar-item ${isActive("/dashboard") ? "sidebar-active" : ""}`}
              onClick={() => setIsOpen(false)}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <LayoutDashboard
                  size={19}
                  strokeWidth={isActive("/dashboard") ? 2.5 : 2}
                  color={isActive("/dashboard") ? "#4147eb" : "#94a3b8"}
                />
                <span>Resumen del Día</span>
              </div>
              {isActive("/dashboard") && <span className="sidebar-item-pill" />}
            </Link>

            {/* Préstamos con Badge */}
            <Link
              href="/prestamos"
              className={`sidebar-item ${isActive("/prestamos") ? "sidebar-active" : ""}`}
              onClick={() => setIsOpen(false)}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <Wallet
                  size={19}
                  strokeWidth={isActive("/prestamos") ? 2.5 : 2}
                  color={isActive("/prestamos") ? "#4147eb" : "#94a3b8"}
                />
                <span>Préstamos</span>
              </div>
            </Link>

            {/* Gastos */}
            <Link
              href="/gastos"
              className={`sidebar-item ${isActive("/gastos") ? "sidebar-active" : ""}`}
              onClick={() => setIsOpen(false)}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <ReceiptText
                  size={19}
                  strokeWidth={isActive("/gastos") ? 2.5 : 2}
                  color={isActive("/gastos") ? "#4147eb" : "#94a3b8"}
                />
                <span>Gastos</span>
              </div>
              {isActive("/gastos") && <span className="sidebar-item-pill" />}
            </Link>
          </div>

          {/* SECCIÓN: CONSULTAS Y GESTIÓN */}
          {(canViewReports ||
            canManageUsers ||
            canManageCompanies ||
            isAdmin ||
            isOwner) && (
              <div className="sidebar-nav-section">
                <p className="sidebar-section-title">Consultas y Gestión</p>

                {/* Reportes */}
                {canViewReports && (
                  <div>
                    <button
                      className={`sidebar-item ${isReportesExpanded ? "sidebar-active" : ""}`}
                      onClick={toggleReportes}
                      style={{
                        width: "100%",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <BarChart
                          size={19}
                          strokeWidth={isReportesExpanded ? 2.5 : 2}
                          color={isReportesExpanded ? "#4147eb" : "#94a3b8"}
                        />
                        <span>Reportes</span>
                      </div>
                      <ChevronDown
                        size={16}
                        style={{
                          transition: "transform 0.2s ease",
                          transform: isReportesExpanded
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                          color: "#94a3b8",
                        }}
                      />
                    </button>

                    {isReportesExpanded && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.2rem",
                          paddingLeft: "1.75rem",
                          paddingTop: "0.35rem",
                        }}
                      >
                        <Link
                          href="/reportes/vision-general"
                          className={`sidebar-tutorial-item ${isActive("/reportes/vision-general") ? "sidebar-active" : ""}`}
                          onClick={() => setIsOpen(false)}
                        >
                          <span className="sidebar-tutorial-dot" />
                          <span>Visión General</span>
                        </Link>
                        <Link
                          href="/reportes/por-cobrador"
                          className={`sidebar-tutorial-item ${isActive("/reportes/por-cobrador") ? "sidebar-active" : ""}`}
                          onClick={() => setIsOpen(false)}
                        >
                          <span className="sidebar-tutorial-dot" />
                          <span>Por Cobrador</span>
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Usuarios */}
                {canManageUsers && (
                  <Link
                    href="/cobradores"
                    className={`sidebar-item ${isActive("/cobradores") ? "sidebar-active" : ""}`}
                    onClick={() => setIsOpen(false)}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <Users
                        size={19}
                        strokeWidth={isActive("/cobradores") ? 2.5 : 2}
                        color={isActive("/cobradores") ? "#4147eb" : "#94a3b8"}
                      />
                      <span>Usuarios</span>
                    </div>
                    {isActive("/cobradores") && (
                      <span className="sidebar-item-pill" />
                    )}
                  </Link>
                )}

                {/* Empresas */}
                {canManageCompanies && (
                  <Link
                    href="/empresas"
                    className={`sidebar-item ${isActive("/empresas") ? "sidebar-active" : ""}`}
                    onClick={() => setIsOpen(false)}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <Building2
                        size={19}
                        strokeWidth={isActive("/empresas") ? 2.5 : 2}
                        color={isActive("/empresas") ? "#4147eb" : "#94a3b8"}
                      />
                      <span>Empresas</span>
                    </div>
                    {isActive("/empresas") && (
                      <span className="sidebar-item-pill" />
                    )}
                  </Link>
                )}

                {/* Configuración */}
                {(isOwner) && (
                  <Link
                    href="/configuracion"
                    className={`sidebar-item ${isActive("/configuracion") ? "sidebar-active" : ""}`}
                    onClick={() => setIsOpen(false)}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <Settings
                        size={19}
                        strokeWidth={isActive("/configuracion") ? 2.5 : 2}
                        color={isActive("/configuracion") ? "#4147eb" : "#94a3b8"}
                      />
                      <span>Configuración</span>
                    </div>
                    {isActive("/configuracion") && (
                      <span className="sidebar-item-pill" />
                    )}
                  </Link>
                )}
              </div>
            )}

          {/* SECCIÓN: AYUDA Y SOPORTE */}
          <div className="sidebar-nav-section">
            <p className="sidebar-section-title">Ayuda y Soporte</p>
            <div>
              <button
                className="sidebar-tutorial-header"
                onClick={toggleHelp}
                type="button"
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <BookOpen size={19} strokeWidth={2.2} />
                  <span>Tutoriales</span>
                </div>
                <ChevronDown
                  size={16}
                  style={{
                    transition: "transform 0.2s ease",
                    transform: isHelpExpanded
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    color: isHelpExpanded ? "#4147eb" : "#94a3b8",
                  }}
                />
              </button>

              {isHelpExpanded && (
                <div className="sidebar-tutorial-sublist">
                  {Object.values(TOURS).map((tour) => (
                    <button
                      key={tour.id}
                      className="sidebar-tutorial-item"
                      onClick={() => handleStartTour(tour.path)}
                      type="button"
                    >
                      <span className="sidebar-tutorial-dot" />
                      <span>{tour.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* 3. Bloque Inferior: PWA, Perfil y Sesión */}
        <div className="sidebar-footer">
          {/* Tarjeta Instalar App Móvil / PWA */}
          {canInstall && (
            <div className="sidebar-pwa-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "0.65rem",
                    backgroundColor: "rgba(65, 71, 235, 0.1)",
                    color: "#4147eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Download size={17} strokeWidth={2.5} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#0f172a",
                      lineHeight: 1.2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    Instalar App Móvil
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.625rem",
                      color: "#64748b",
                      lineHeight: 1.2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    Versión PWA Offline
                  </p>
                </div>
              </div>
              <button
                onClick={handleInstallPWA}
                type="button"
                style={{
                  padding: "0.3rem 0.65rem",
                  borderRadius: "0.5rem",
                  backgroundColor: "#4147eb",
                  color: "white",
                  border: "none",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  flexShrink: 0,
                  boxShadow: "0 2px 4px rgba(65, 71, 235, 0.2)",
                }}
              >
                Instalar
              </button>
            </div>
          )}

          {/* Tarjeta de Usuario & Acciones */}
          <div className="sidebar-user-card">
            {/* Usuario info */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "38px",
                  height: "38px",
                  borderRadius: "9999px",
                  backgroundColor: "#4147eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  color: "white",
                  fontSize: "0.85rem",
                  flexShrink: 0,
                  boxShadow: "0 2px 6px rgba(65, 71, 235, 0.25)",
                }}
              >
                {getInitials(user?.username)}
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: "10px",
                    height: "10px",
                    borderRadius: "9999px",
                    backgroundColor: "#10b981",
                    border: "2px solid #ffffff",
                  }}
                  title="Estado activo"
                />
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.875rem",
                    fontWeight: 800,
                    color: "#0f172a",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {formatUserName(user)}
                </p>
                <p
                  style={{
                    margin: "0.15rem 0 0 0",
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {isOwner
                    ? "PROPIETARIO / ADMIN"
                    : isAdmin
                      ? "ADMINISTRADOR"
                      : "COBRADOR"}
                </p>
              </div>
            </div>

            <div style={{ height: "1px", backgroundColor: "#f1f5f9" }} />

            {/* Links Cambiar Clave y Cerrar Sesión */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.15rem",
              }}
            >
              <button
                className="sidebar-action-link"
                onClick={() => {
                  setIsChangePasswordOpen(true);
                  setIsOpen(false);
                }}
                type="button"
              >
                <KeyRound size={15} color="#94a3b8" />
                <span>Cambiar Clave</span>
              </button>

              <button
                className="sidebar-logout-link"
                onClick={handleLogout}
                type="button"
              >
                <LogOut size={15} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </>
  );
}
