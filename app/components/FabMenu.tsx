"use client";

import { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import { getDashboardDataUseCase } from "@/app/features/loans";
import { userService } from "@/lib/userService";
import { authService } from "@/lib/auth";
import { formatMoney } from "@/lib/loanUtils";
import { logger } from "@/lib/logging-service";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ConfirmModal from "./ConfirmModal";
import CreateLoanModal from "./CreateLoanModal";
import CreateExpenseModal from "./CreateExpenseModal";
import LoadingSpinner from "./LoadingSpinner";

export default function FabMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // ... stats state ...

  // New Loan Logic
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);

  // Expense Logic
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Day Close Logic
  const captureRef = useRef<HTMLDivElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [stats, setStats] = useState<{
    lent: number;
    collected: number;
    expenses: number;
    activeClients: number;
    user: string;
    detailCollected?: { yape: number; efectivo: number };
  } | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && !(e.target as Element).closest(".fab-container")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isOpen]);

  const executeShare = async () => {
    try {
      setShowConfirm(false);
      setLoading(true);

      // 1. Fetch Data
      const currentUser = authService.getUser();
      if (!currentUser) return;

      let userIdFilter = "";
      if (currentUser.profile === "COBRADOR") {
        userIdFilter = String(currentUser.id);
      }

      const result = await getDashboardDataUseCase.execute(userIdFilter);

      // 2. Update stats state
      result.match(
        (data) => {
          setStats({
            lent: data.totalLentToday || 0,
            collected: data.collectedToday || 0,
            expenses: data.totalExpensesToday || 0,
            activeClients: data.activeClients || 0,
            user: currentUser.firstName || currentUser.username,
            detailCollected: data.detailCollectedToday,
          });
        },
        (err) => {
          throw new Error(err.message);
        },
      );

      // Wait for render
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!captureRef.current) return;

      // 3. Generate Image
      const canvas = await html2canvas(captureRef.current, {
        scale: 2,
        backgroundColor: "#f8fafc",
        logging: false,
      } as any);

      const filename = `cierre-${format(new Date(), "yyyy-MM-dd")}-${currentUser.username}.png`;

      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error("Error al generar la imagen");
        const file = new File([blob], filename, { type: "image/png" });

        if (
          navigator.share &&
          navigator.canShare &&
          navigator.canShare({ files: [file] })
        ) {
          await navigator.share({
            title: "Cierre del Día",
            text: `Resumen de cobranza - ${format(new Date(), "dd/MM/yyyy")}`,
            files: [file],
          });
        } else {
          const link = document.createElement("a");
          link.href = canvas.toDataURL("image/png");
          link.download = filename;
          link.click();
        }
      }, "image/png");

      // Pausa forzada de 3 segundos para dar tiempo a la imagen y al compartir
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 4. API Call & Logout
      await userService.toggleDayStatus(String(currentUser.id), true);
      await authService.logout();
      window.location.href = "/login";
    } catch (error) {
      logger.error("Error sharing stats:", error);
      alert("Error al generar o compartir el resumen.");
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  };

  // formatMoney is now imported from lib/loanUtils above

  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });

  return (
    <>
      <div className="fab-container">
        {/* Actions (stacked bottom-up) */}
        <div
          className={`fab-menu-item ${isOpen ? "fab-visible" : ""}`}
          style={{ transitionDelay: isOpen ? "0.1s" : "0s" }}
        >
          <span className="fab-label">Cerrar Día</span>
          <button
            className="fab-menu-btn fab-action-close"
            onClick={() => setShowConfirm(true)}
            disabled={loading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
        </div>

        <div
          className={`fab-menu-item ${isOpen ? "fab-visible" : ""}`}
          style={{ transitionDelay: isOpen ? "0.05s" : "0.05s" }}
        >
          <span className="fab-label">Nuevo Préstamo</span>
          <button
            className="fab-menu-btn fab-action-loan"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setIsLoanModalOpen(true);
              setIsOpen(false);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>

        <div
          className={`fab-menu-item ${isOpen ? "fab-visible" : ""}`}
          style={{ transitionDelay: isOpen ? "0.1s" : "0.05s" }}
        >
          <span className="fab-label">Registrar Gasto</span>
          <button
            className="fab-menu-btn"
            style={{ color: "#ef4444" }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpenseModalOpen(true);
              setIsOpen(false);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </button>
        </div>

        {/* Main FAB */}
        <button
          className={`fab-main ${isOpen ? "fab-open" : ""}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          aria-label="Menu de acciones"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={executeShare}
        title="¿Cerrar el día?"
        message="¿Estás seguro de que deseas cerrar el día? Esta acción generará el reporte y no permitirá registrar más pagos ni préstamos por hoy."
        confirmText="Sí, cerrar día"
        cancelText="Cancelar"
      />

      <CreateLoanModal
        isOpen={isLoanModalOpen}
        onClose={() => setIsLoanModalOpen(false)}
        onSuccess={() => {
          // Dispatch Global Event to update Dashboard if visible
          window.dispatchEvent(new Event("dashboard-update"));
        }}
      />

      <CreateExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={() => {
          window.dispatchEvent(new Event("dashboard-update"));
        }}
      />

      {/* Hidden Capture Area */}
      <div className="fab-capture-container" ref={captureRef}>
        <div className="fab-capture-card">
          <div className="fab-capture-header">
            <h2 className="fab-capture-title">Resumen Diario</h2>
            <p className="fab-capture-date">
              {today.charAt(0).toUpperCase() + today.slice(1)}
            </p>
          </div>

          <div className="fab-capture-row">
            <span className="fab-capture-stat-label">Total Prestado</span>
            <span className="fab-capture-stat-value fab-capture-total-lent">
              {stats ? formatMoney(stats.lent) : "..."}
            </span>
          </div>

          <div className="fab-capture-row">
            <span className="fab-capture-stat-label">Total Gastos</span>
            <span
              className="fab-capture-stat-value"
              style={{ color: "#ef4444" }}
            >
              {stats ? formatMoney(stats.expenses) : "..."}
            </span>
          </div>

          <div
            className="fab-capture-row"
            style={{
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "0.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
                alignItems: "center",
              }}
            >
              <span className="fab-capture-stat-label">Total Cobrado</span>
              <span className="fab-capture-stat-value fab-capture-collected">
                {stats ? formatMoney(stats.collected) : "..."}
              </span>
            </div>
            {stats?.detailCollected && (
              <div
                style={{
                  marginTop: "0.5rem",
                  paddingTop: "0.5rem",
                  borderTop: "1px dashed #e2e8f0",
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                      color: "#64748b",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Yape
                  </span>
                  <span
                    style={{
                      fontSize: "1rem",
                      fontWeight: "600",
                      color: "#6366f1",
                    }}
                  >
                    {formatMoney(stats.detailCollected.yape)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    borderLeft: "1px solid #e2e8f0",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                      color: "#64748b",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Efectivo
                  </span>
                  <span
                    style={{
                      fontSize: "1rem",
                      fontWeight: "600",
                      color: "#22c55e",
                    }}
                  >
                    {formatMoney(stats.detailCollected.efectivo)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="fab-capture-row">
            <span className="fab-capture-stat-label">Clientes Activos</span>
            <span className="fab-capture-stat-value fab-capture-clients">
              {stats ? stats.activeClients : "..."}
            </span>
          </div>

          <div
            className="fab-capture-footer"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <div>Generado por {stats?.user || "App Préstamos"}</div>
            <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>
              <span
                style={{
                  fontWeight: 800,
                  color: "#0f172a",
                  letterSpacing: "-0.025em",
                }}
              >
                Neo<span style={{ color: "#4f46e5" }}>Cobros</span>
              </span>{" "}
              - Sistema de Control de Préstamos
            </div>
          </div>
        </div>
      </div>

      {/* Pantalla bloqueadora de carga mientras se ejecuta el cierre */}
      {loading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LoadingSpinner message="Guardando datos y generando documento de cierre..." />
        </div>
      )}
    </>
  );
}
