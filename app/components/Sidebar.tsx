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
  Server,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { authService } from "@/lib/auth";
import { formatUserName } from "@/lib/utils";
import { TOURS } from "@/lib/tours.config";
import { trackEvent } from "@/lib/analytics";
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
  const [companyIcon, setCompanyIcon] = useState<string>("");

  useEffect(() => {
    const updateIcon = () => {
      try {
        const stored = localStorage.getItem("company_settings");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.branding?.iconUrl) {
            setCompanyIcon(parsed.branding.iconUrl);
          } else {
            setCompanyIcon("");
          }
        }
      } catch {}
    };

    updateIcon();
    window.addEventListener("company_theme_updated", updateIcon);
    return () => window.removeEventListener("company_theme_updated", updateIcon);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);

    const checkInstall = () => {
      const isMobileDevice =
        window.innerWidth < 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i.test(navigator.userAgent);

      if (isMobileDevice && (window as any).deferredInstallPrompt) {
        setCanInstall(true);
      } else {
        setCanInstall(false);
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
    trackEvent("pwa_install_click");
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
    manualReportesExpanded !== null
      ? manualReportesExpanded
      : pathname.startsWith("/reportes");
  const toggleReportes = () =>
    setManualReportesExpanded(!isReportesExpanded);

  const [manualHelpExpanded, setManualHelpExpanded] = useState<boolean | null>(
    null,
  );
  const isHelpExpanded =
    manualHelpExpanded !== null ? manualHelpExpanded : false;
  const toggleHelp = () => setManualHelpExpanded(!isHelpExpanded);

  const handleStartTour = (path: string, tourTitle?: string) => {
    trackEvent("tour_start", { tour: path, titulo: tourTitle });
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
            {companyIcon ? (
              <img
                src={companyIcon}
                alt="Logo Empresa"
                style={{
                  width: 34,
                  height: 34,
                  objectFit: "contain",
                  borderRadius: "0.5rem",
                  backgroundColor: "#ffffff",
                  padding: 2,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              />
            ) : null}
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
              onClick={() => {
                trackEvent("menu_click", { opcion: "resumen_dia" });
                setIsOpen(false);
              }}
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
                  color={isActive("/dashboard") ? "var(--color-primary, #4147eb)" : "#94a3b8"}
                />
                <span>Resumen del Día</span>
              </div>
              {isActive("/dashboard") && <span className="sidebar-item-pill" />}
            </Link>

            {/* Préstamos con Badge */}
            <Link
              href="/prestamos"
              className={`sidebar-item ${isActive("/prestamos") ? "sidebar-active" : ""}`}
              onClick={() => {
                trackEvent("menu_click", { opcion: "prestamos" });
                setIsOpen(false);
              }}
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
                  color={isActive("/prestamos") ? "var(--color-primary, #4147eb)" : "#94a3b8"}
                />
                <span>Préstamos</span>
              </div>
            </Link>

            {/* Gastos */}
            <Link
              href="/gastos"
              className={`sidebar-item ${isActive("/gastos") ? "sidebar-active" : ""}`}
              onClick={() => {
                trackEvent("menu_click", { opcion: "gastos" });
                setIsOpen(false);
              }}
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
                  color={isActive("/gastos") ? "var(--color-primary, #4147eb)" : "#94a3b8"}
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
                          color={isReportesExpanded ? "var(--color-primary, #4147eb)" : "#94a3b8"}
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
                          onClick={() => {
                            trackEvent("menu_click", { opcion: "reportes_general" });
                            setIsOpen(false);
                          }}
                        >
                          <span className="sidebar-tutorial-dot" />
                          <span>Visión General</span>
                        </Link>
                        <Link
                          href="/reportes/por-cobrador"
                          className={`sidebar-tutorial-item ${isActive("/reportes/por-cobrador") ? "sidebar-active" : ""}`}
                          onClick={() => {
                            trackEvent("menu_click", { opcion: "reportes_cobrador" });
                            setIsOpen(false);
                          }}
                        >
                          <span className="sidebar-tutorial-dot" />
                          <span>Por Cobrador</span>
                        </Link>
                        <Link
                          href="/reportes/capital-inversion"
                          className={`sidebar-tutorial-item ${isActive("/reportes/capital-inversion") ? "sidebar-active" : ""}`}
                          onClick={() => {
                            trackEvent("menu_click", { opcion: "reportes_capital_inversion" });
                            setIsOpen(false);
                          }}
                        >
                          <span className="sidebar-tutorial-dot" />
                          <span>Capital e Inversión</span>
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
                    onClick={() => {
                      trackEvent("menu_click", { opcion: "usuarios" });
                      setIsOpen(false);
                    }}
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
                        color={isActive("/cobradores") ? "var(--color-primary, #4147eb)" : "#94a3b8"}
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
                    onClick={() => {
                      trackEvent("menu_click", { opcion: "empresas" });
                      setIsOpen(false);
                    }}
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
                        color={isActive("/empresas") ? "var(--color-primary, #4147eb)" : "#94a3b8"}
                      />
                      <span>Empresas</span>
                    </div>
                    {isActive("/empresas") && (
                      <span className="sidebar-item-pill" />
                    )}
                  </Link>
                )}

                {/* Configuración Empresa (Admin / Owner) */}
                {(isAdmin || isOwner) && (
                  <Link
                    href="/configuracion"
                    className={`sidebar-item ${isActive("/configuracion") ? "sidebar-active" : ""}`}
                    onClick={() => {
                      trackEvent("menu_click", { opcion: "configuracion_empresa" });
                      setIsOpen(false);
                    }}
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
                        color={isActive("/configuracion") ? "var(--color-primary, #4147eb)" : "#94a3b8"}
                      />
                      <span>Configuración Empresa</span>
                    </div>
                    {isActive("/configuracion") && (
                      <span className="sidebar-item-pill" />
                    )}
                  </Link>
                )}

                {/* Configuración Sistema / Mantenimiento Masivo (Owner) */}
                {isOwner && (
                  <Link
                    href="/configuracion/sistema"
                    className={`sidebar-item ${isActive("/configuracion/sistema") ? "sidebar-active" : ""}`}
                    onClick={() => {
                      trackEvent("menu_click", { opcion: "configuracion_sistema" });
                      setIsOpen(false);
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <Server
                        size={19}
                        strokeWidth={isActive("/configuracion/sistema") ? 2.5 : 2}
                        color={isActive("/configuracion/sistema") ? "var(--color-primary, #4147eb)" : "#94a3b8"}
                      />
                      <span>Configuración Sistema</span>
                    </div>
                    {isActive("/configuracion/sistema") && (
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
                    color: isHelpExpanded ? "var(--color-primary, #4147eb)" : "#94a3b8",
                  }}
                />
              </button>

              {isHelpExpanded && (
                <div className="sidebar-tutorial-sublist">
                  {Object.values(TOURS)
                    .filter((tour) => {
                      if (tour.path === "/configuracion") {
                        return isAdmin || isOwner;
                      }
                      return true;
                    })
                    .map((tour) => (
                      <button
                        key={tour.id}
                        className="sidebar-tutorial-item"
                        onClick={() => handleStartTour(tour.path, tour.title)}
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
                    backgroundColor: "color-mix(in srgb, var(--color-primary, #4147eb) 12%, transparent)",
                    color: "var(--color-primary, #4147eb)",
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
                  backgroundColor: "var(--color-primary, #4147eb)",
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
                  backgroundColor: "var(--color-primary, #4147eb)",
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
                  trackEvent("menu_click", { opcion: "cambiar_clave" });
                  setIsChangePasswordOpen(true);
                  setIsOpen(false);
                }}
                type="button"
              >
                <KeyRound size={15} color="#94a3b8" />
                <span>Cambiar Contraseña</span>
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
