"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Loan, User } from "@/lib/types";
import { getLoanStatus } from "@/lib/loanUtils";
import { usePermissions } from "@/hooks/usePermissions";
import { LoanShareGeneratorRef } from "./LoanShareGenerator";
import { logger } from "@/lib/logging-service";

interface LoanActionsProps {
  loan: Loan;
  isMobile: boolean;
  today: Date;
  onPay: (loan: Loan) => void;
  onDetails: (loan: Loan) => void;
  onEdit?: (loan: Loan) => void;
  onRenew?: (loan: Loan) => void;
  onReassign?: (loan: Loan) => void;
  onDelete?: (loan: Loan) => void;
  shareRef?: React.RefObject<LoanShareGeneratorRef | null>;
  minimal?: boolean;
  onMenuToggle?: (isOpen: boolean) => void;
  isDraggingParent?: boolean;
  currentUser?: User | null;
}

export default function LoanActions({
  loan,
  isMobile,
  today,
  onPay,
  onDetails,
  onEdit,
  onRenew,
  onReassign,
  onDelete,
  shareRef,
  minimal = false,
  onMenuToggle,
  isDraggingParent = false,
}: LoanActionsProps) {
  const [activeMenu, setActiveMenu] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );

  // --- Funciones de Control (Definidas primero con useCallback) ---

  // Función interna para cambiar el estado y notificar al padre sin bucles infinitos
  const handleToggleMenu = useCallback(
    (newState: boolean) => {
      setActiveMenu(newState);
      if (onMenuToggle) {
        onMenuToggle(newState);
      }
    },
    [onMenuToggle],
  );

  // Gestor de eventos globales para exclusividad
  const handleGlobalMenuOpen = useCallback(
    (e: Event) => {
      const customEvent = e as CustomEvent<{
        loanId: string | number;
        type?: string;
      }>;
      const incomingLoanId = customEvent.detail?.loanId;
      const type = customEvent.detail?.type;
      const currentLoanId =
        loan.id ||
        (loan as { id?: string | number; _id?: string | number })._id;

      // Cerrar si el evento es de otro préstamo O si es del mismo préstamo pero de otro tipo
      const isDifferentLoan =
        incomingLoanId && incomingLoanId !== currentLoanId;
      const isDifferentTypeSameLoan =
        incomingLoanId === currentLoanId && type === "share";

      if ((isDifferentLoan || isDifferentTypeSameLoan) && activeMenu) {
        handleToggleMenu(false);
      }
    },
    [activeMenu, handleToggleMenu, loan],
  );

  // --- Efectos de Ciclo de Vida ---

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Cerrar el menú si el padre se empieza a arrastrar para evitar NotFoundError en el DOM
  useEffect(() => {
    if (isDraggingParent && activeMenu) {
      handleToggleMenu(false);
    }
  }, [isDraggingParent, activeMenu, handleToggleMenu]);

  // Calcula la posición fija del menú basándose en el botón toggle
  const calcMenuPosition = (mode: "below" | "above") => {
    if (!toggleBtnRef.current) return;
    const rect = toggleBtnRef.current.getBoundingClientRect();
    if (mode === "below") {
      setMenuPos({ top: rect.bottom + 4, left: rect.right });
    } else {
      setMenuPos({ top: rect.top - 4, left: rect.right });
    }
  };


  // Efecto para exclusividad y clics externos
  useEffect(() => {

    window.addEventListener("loan-menu-open", handleGlobalMenuOpen);

    // Listener de clic global para cerrar al hacer clic fuera
    const handleClickOutside = (e: MouseEvent) => {
      if (
        activeMenu &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        (!menuRef.current || !menuRef.current.contains(e.target as Node))
      ) {
        handleToggleMenu(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);

    // Cerrar menú al hacer scroll para evitar desacoplamiento visual
    const handleScroll = () => {
      if (activeMenu) setActiveMenu(false);
    };
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("loan-menu-open", handleGlobalMenuOpen);
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [activeMenu, handleToggleMenu, handleGlobalMenuOpen]); // Use stable dependencies

  const handleShare = async (mode: "calendar" | "list") => {
    if (!shareRef || !shareRef.current) return;
    setIsSharing(true);
    try {
      await shareRef.current.shareLoan(loan, mode);
    } catch (error) {
      logger.error("Error al compartir ficha:", error);
    } finally {
      setIsSharing(false);
      setActiveMenu(false);
    }
  };

  const status = getLoanStatus(loan, today);
  const { canDeleteLoan, canReassignLoan, canRenewLoan } = usePermissions();

  const isPaid =
    loan.status === "Liquidado" || (loan.remainingAmount || 0) <= 0;

  // Desktop view logic (horizontal buttons)
  if (!isMobile) {
    const canPay = loan.inIntervalPayment !== 0 || status.value !== "green";
    const hasBalance = (loan.remainingAmount || 0) > 0;
    const isActionEnabled = canPay && hasBalance;

    return (
      <div
        ref={containerRef}
        style={{
          display: "flex",
          gap: "0.25rem",
          justifyContent: "center",
          position: "relative",
          zIndex: activeMenu ? 100 : 1,
        }}
      >
        {loan.status === "Liquidado" && canRenewLoan ? (
          <button
            onClick={() => onRenew && onRenew(loan)}
            title="Renovar Préstamo"
            className="btn-icon"
            style={{ color: "var(--color-primary)" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              width="20"
              height="20"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => isActionEnabled && onPay(loan)}
            disabled={!isActionEnabled}
            title={
              !hasBalance
                ? "Pagado"
                : !canPay
                  ? "Restringido"
                  : "Registrar Pago"
            }
            style={{
              padding: "0.35rem",
              border: "none",
              backgroundColor: "transparent",
              cursor: !isActionEnabled ? "not-allowed" : "pointer",
              borderRadius: "0.375rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: !isActionEnabled ? "#94a3b8" : "#22c55e",
              opacity: !isActionEnabled ? 0.5 : 1,
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              width="20"
              height="20"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
              />
            </svg>
          </button>
        )}

        <button
          onClick={() => onDetails(loan)}
          title="Ver Detalles"
          style={{
            padding: "0.35rem",
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            borderRadius: "0.375rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#f59e0b",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            width="20"
            height="20"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>

        <button
          onClick={() => handleShare("calendar")}
          disabled={isSharing}
          title="Compartir Calendario"
          style={{
            padding: "0.35rem",
            border: "none",
            backgroundColor: "transparent",
            cursor: isSharing ? "wait" : "pointer",
            borderRadius: "0.375rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#4f46e5",
            opacity: isSharing ? 0.6 : 1,
            transition: "all 0.2s",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            width="20"
            height="20"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          </svg>
        </button>

        <button
          onClick={() => handleShare("list")}
          disabled={isSharing}
          title="Compartir Listado"
          style={{
            padding: "0.35rem",
            border: "none",
            backgroundColor: "transparent",
            cursor: isSharing ? "wait" : "pointer",
            borderRadius: "0.375rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#10b981",
            opacity: isSharing ? 0.6 : 1,
            transition: "all 0.2s",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            width="20"
            height="20"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </button>

        {/* More options button for Desktop - Only show if there are options available */}
        {!isPaid && (canReassignLoan || canDeleteLoan) && (
          <button
            ref={toggleBtnRef}
            onClick={(e) => {
              e.stopPropagation();
              const nextState = !activeMenu;
              if (nextState) {
                // Notificar a otros menús con un pequeño delay para asegurar sincronía
                const loanId =
                  loan.id ||
                  (loan as { id?: string | number; _id?: string | number })._id;
                setTimeout(() => {
                  window.dispatchEvent(
                    new CustomEvent("loan-menu-open", {
                      detail: { loanId },
                    }),
                  );
                }, 0);
              }
              setActiveMenu(nextState);
              if (nextState) calcMenuPosition("below");
            }}
            title="Más opciones"
            style={{
              padding: "0.35rem",
              border: "none",
              backgroundColor: "transparent",
              cursor: "pointer",
              borderRadius: "0.375rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              width="20"
              height="20"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
              />
            </svg>
          </button>
        )}

        {activeMenu &&
          createPortal(
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                top: menuPos?.top ?? 0,
                left: menuPos?.left ?? 0,
                transform: "translateX(-100%)",
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "0.5rem",
                boxShadow: "var(--shadow-lg)",
                zIndex: 9999,
                minWidth: "150px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                padding: "0.25rem 0",
              }}
            >
              {canReassignLoan && !isPaid && (
                <button
                  onClick={() => {
                    onReassign && onReassign(loan);
                    setActiveMenu(false);
                  }}
                  style={{
                    padding: "0.75rem 1rem",
                    border: "none",
                    backgroundColor: "transparent",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "#8b5cf6",
                    fontSize: "0.85rem",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    width="18"
                    height="18"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                  Reasignar
                </button>
              )}

              {canDeleteLoan && !isPaid && (
                <button
                  onClick={() => {
                    onDelete && onDelete(loan);
                    setActiveMenu(false);
                  }}
                  style={{
                    padding: "0.75rem 1rem",
                    border: "none",
                    backgroundColor: "transparent",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--color-danger)",
                    fontSize: "0.85rem",
                    borderTop: canReassignLoan
                      ? "1px solid var(--border-color)"
                      : "none",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    width="18"
                    height="18"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                  Eliminar
                </button>
              )}
            </div>,
            document.body,
          )}
      </div>
    );
  }

  // Mobile view logic (More menu)
  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        gap: "0.25rem",
        paddingTop: "0.5rem",
        position: "relative",
        width: minimal ? "auto" : "100%",
        justifyContent: minimal ? "center" : "space-between",
        marginTop: minimal ? "0" : "0.5rem",
        borderTop: minimal ? "none" : "1px solid var(--border-color)",
      }}
    >
      {!minimal && (
        <>
          {loan.status === "Liquidado" && canRenewLoan ? (
            <button
              onClick={() => onRenew && onRenew(loan)}
              style={{
                padding: "0.5rem 0.25rem",
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
                borderRadius: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-primary)",
                flex: 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.15rem",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  width="22"
                  height="22"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                <span style={{ fontSize: "0.65rem", fontWeight: 500 }}>
                  Renovar
                </span>
              </div>
            </button>
          ) : (
            <button
              onClick={() => {
                const canPay =
                  loan.inIntervalPayment !== 0 || status.value !== "green";
                const hasBalance = (loan.remainingAmount || 0) > 0;
                if (canPay && hasBalance) onPay(loan);
              }}
              disabled={
                !(
                  (loan.inIntervalPayment !== 0 || status.value !== "green") &&
                  (loan.remainingAmount || 0) > 0
                )
              }
              style={{
                padding: "0.5rem 0.25rem",
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
                borderRadius: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: !(
                  (loan.inIntervalPayment !== 0 || status.value !== "green") &&
                  (loan.remainingAmount || 0) > 0
                )
                  ? "#94a3b8"
                  : "#22c55e",
                opacity: !(
                  (loan.inIntervalPayment !== 0 || status.value !== "green") &&
                  (loan.remainingAmount || 0) > 0
                )
                  ? 0.5
                  : 1,
                flex: 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.15rem",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  width="22"
                  height="22"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                  />
                </svg>
                <span style={{ fontSize: "0.65rem", fontWeight: 500 }}>
                  Pagar
                </span>
              </div>
            </button>
          )}

          <button
            onClick={() => onDetails(loan)}
            style={{
              padding: "0.5rem 0.25rem",
              border: "none",
              backgroundColor: "transparent",
              cursor: "pointer",
              borderRadius: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f59e0b",
              flex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.15rem",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                width="22"
                height="22"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span style={{ fontSize: "0.65rem", fontWeight: 500 }}>
                Detalles
              </span>
            </div>
          </button>
        </>
      )}

      <button
        ref={toggleBtnRef}
        onClick={(e) => {
          e.stopPropagation();
          const nextState = !activeMenu;
          if (nextState) {
            const loanId =
              loan.id ||
              (loan as { id?: string | number; _id?: string | number })._id;
            window.dispatchEvent(
              new CustomEvent("loan-menu-open", {
                detail: { loanId, type: "more" },
              }),
            );
          }
          handleToggleMenu(nextState);
          if (nextState) calcMenuPosition("above");
        }}
        style={{
          padding: "0.5rem 0.25rem",
          border: "none",
          backgroundColor: "transparent",
          cursor: "pointer",
          borderRadius: "0.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-secondary)",
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.15rem",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            width="22"
            height="22"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
            />
          </svg>
          <span style={{ fontSize: "0.65rem", fontWeight: 500 }}>Más</span>
        </div>
      </button>

      {isMounted &&
        activeMenu &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: menuPos?.top ?? 0,
              left: menuPos?.left ?? 0,
              transform: "translate(-100%, -100%)",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "0.5rem",
              boxShadow: "var(--shadow-lg)",
              zIndex: 9999,
              minWidth: "150px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <button
              onClick={() => handleShare("calendar")}
              disabled={isSharing}
              style={{
                padding: "0.75rem 1rem",
                border: "none",
                backgroundColor: "transparent",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                cursor: isSharing ? "wait" : "pointer",
                textAlign: "left",
                color: "#4f46e5",
                fontSize: "0.85rem",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                width="18"
                height="18"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
              Compartir Calendario
            </button>

            <button
              onClick={() => handleShare("list")}
              disabled={isSharing}
              style={{
                padding: "0.75rem 1rem",
                border: "none",
                backgroundColor: "transparent",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                cursor: isSharing ? "wait" : "pointer",
                textAlign: "left",
                color: "#10b981",
                fontSize: "0.85rem",
                borderTop: "1px solid var(--border-color)",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                width="18"
                height="18"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              Compartir Listado
            </button>

            {canReassignLoan && !isPaid && (
              <button
                onClick={() => {
                  onReassign && onReassign(loan);
                  setActiveMenu(false);
                }}
                style={{
                  padding: "0.75rem 1rem",
                  border: "none",
                  backgroundColor: "transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "#8b5cf6",
                  fontSize: "0.85rem",
                  borderTop: "1px solid var(--border-color)",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  width="18"
                  height="18"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                Reasignar
              </button>
            )}

            {canDeleteLoan && !isPaid && (
              <button
                onClick={() => {
                  onDelete && onDelete(loan);
                  setActiveMenu(false);
                }}
                style={{
                  padding: "0.75rem 1rem",
                  border: "none",
                  backgroundColor: "transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "var(--color-danger)",
                  fontSize: "0.85rem",
                  borderTop: "1px solid var(--border-color)",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  width="18"
                  height="18"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
                Eliminar
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
