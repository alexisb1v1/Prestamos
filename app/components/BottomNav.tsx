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
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function BottomNav() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

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
    }
  };

  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });
  const isAnyModalOpen = isLoanModalOpen || isExpenseModalOpen || showConfirm;

  return (
    <>
      {!isAnyModalOpen && (
        <nav className="bottom-nav-container">
          <div className="bottom-nav-inner">
            <Link 
              href="/dashboard"
              className={`bottom-nav-btn ${pathname === "/dashboard" ? "active" : ""}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
              <span className="bottom-nav-label">Home</span>
            </Link>

            <button 
              onClick={() => setIsLoanModalOpen(true)}
              className="bottom-nav-btn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
              <span className="bottom-nav-label">Préstamo</span>
            </button>

            <button 
              onClick={() => setIsExpenseModalOpen(true)}
              className="bottom-nav-btn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17V7"/></svg>
              <span className="bottom-nav-label">Gastos</span>
            </button>

            <button 
              onClick={() => setShowConfirm(true)}
              className="bottom-nav-btn danger"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span className="bottom-nav-label">Caja</span>
            </button>
          </div>
        </nav>
      )}

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
