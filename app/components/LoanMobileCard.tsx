"use client";

import React from "react";
import { Loan, User } from "@/lib/types";
import { getLoanStatus, formatMoney, formatDateUTC } from "@/lib/loanUtils";
import LoanActions from "./LoanActions";
import { LoanShareGeneratorRef } from "./LoanShareGenerator";
import { useState } from "react";

interface LoanMobileCardProps {
  loan: Loan;
  today: Date;
  currentUser: User | null;
  onPay: (loan: Loan) => void;
  onDetails: (loan: Loan) => void;
  onRenew: (loan: Loan) => void;
  onReassign: (loan: Loan) => void;
  onDelete: (loan: Loan) => void;
  shareRef: React.RefObject<LoanShareGeneratorRef | null>;
  dragHandleProps?: unknown;
  isDragging?: boolean;
  showDragHandle?: boolean;
}

export default function LoanMobileCard({
  loan,
  today,
  currentUser,
  onPay,
  onDetails,
  onRenew,
  onReassign,
  onDelete,
  shareRef,
  dragHandleProps,
  isDragging,
  showDragHandle = false,
}: LoanMobileCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const status = getLoanStatus(loan, today);

  const remainingAmount = (loan as { remainingAmount?: number }).remainingAmount || 0;
  const totalAmount = loan.amount + loan.interest;
  const paidAmount = totalAmount - remainingAmount;
  const progressRaw = (paidAmount / totalAmount) * 100;
  const progress = Math.min(100, Math.max(0, progressRaw));

  const totalCuotas = loan.days;
  const paidCuotas = paidAmount / loan.fee;

  const isLiquidado = loan.status === "Liquidado";
  const isCobrarEnabled = !isLiquidado && remainingAmount > 0;

  // Colors and texts based on status
  let leftBarColor = "#f59e0b"; // amber-500
  let badgeBg = "#fffbeb"; // amber-50
  let badgeText = "#b45309"; // amber-700
  let badgeBorder = "rgba(253, 230, 138, 0.7)"; // amber-200/70
  let dotColor = "#f59e0b";
  let saldoColor = "#e11d48"; // rose-600
  let progressBarColor = "#4f46e5"; // brand-600
  let progressTextColor = "#4f46e5"; // brand-600
  let isMora = false;

  if (status.value === "green") {
    leftBarColor = "#10b981"; // emerald-500
    badgeBg = "#ecfdf5"; // emerald-50
    badgeText = "#047857"; // emerald-700
    badgeBorder = "rgba(167, 243, 208, 0.7)"; // emerald-200/70
    dotColor = "#10b981";
    saldoColor = "#0f172a"; // slate-900
    progressBarColor = "#10b981"; // emerald-500
    progressTextColor = "#059669"; // emerald-600
  } else if (status.value === "blue") {
    leftBarColor = "#4f46e5"; // brand-600
    badgeBg = "#eef2ff"; // brand-50
    badgeText = "#4338ca"; // brand-700
    badgeBorder = "rgba(199, 210, 254, 0.7)"; // brand-200/70
    dotColor = "#4f46e5";
    saldoColor = "#0f172a"; // slate-900
    progressBarColor = "#4f46e5"; // brand-600
    progressTextColor = "#4f46e5"; // brand-600
  } else if (status.value === "red" || status.value === "yellow") {
    isMora = true;
  }

  // Label text for plan
  let rightSideSubtext = (
    <div style={{ fontSize: "11px", color: "#94a3b8" }}>
      Cuota: <span style={{ fontWeight: 600, color: "#475569" }}>{formatMoney(loan.fee)}/día</span>
    </div>
  );
  if (status.value === "green" && !isLiquidado && remainingAmount > 0) {
    rightSideSubtext = (
      <div style={{ fontSize: "11px", color: "#059669", fontWeight: 600 }}>
        Faltan {Math.ceil(remainingAmount / loan.fee)} cuotas
      </div>
    );
  } else if (status.value === "blue") {
    rightSideSubtext = (
      <div style={{ fontSize: "11px", color: "#64748b" }}>
        1ª cuota hoy
      </div>
    );
  }

  return (
    <article
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "1rem",
        border: "1px solid rgba(226, 232, 240, 0.9)",
        boxShadow: "0 2px 10px -2px rgba(15, 23, 42, 0.05), 0 1px 3px -1px rgba(15, 23, 42, 0.03)",
        padding: "1rem",
        transition: "border-color 0.2s",
        position: "relative",
        overflow: "hidden",
        opacity: isDragging ? 0.7 : 1,
        zIndex: isMenuOpen ? 10 : 1,
      }}
    >
      {/* Indicador lateral sutil */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", backgroundColor: leftBarColor, borderTopRightRadius: "0", borderBottomRightRadius: "0", borderTopLeftRadius: "1rem", borderBottomLeftRadius: "1rem" }}></div>

      {/* Encabezado Limpio */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
        <div style={{ minWidth: 0, paddingLeft: "4px" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.25, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {loan.clientName}
          </h3>
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 500, marginTop: "0.125rem", margin: 0 }}>
            DNI: {loan.documentNumber || "S/N"}
          </p>
        </div>
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.375rem",
          padding: "0.125rem 0.625rem",
          borderRadius: "9999px",
          fontSize: "11px",
          fontWeight: 700,
          backgroundColor: badgeBg,
          color: badgeText,
          border: `1px solid ${badgeBorder}`,
          whiteSpace: "nowrap"
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: dotColor, animation: isMora ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none" }}></span>
          {status.label}
        </span>
      </div>

      {/* Resumen Financiero Directo */}
      <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "baseline", justifyContent: "space-between", paddingLeft: "4px" }}>
        <div>
          <span style={{ fontSize: "11px", fontWeight: 500, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
            {isLiquidado ? "SALDO CANCELADO" : (status.value === "green" ? "SALDO RESTANTE" : "SALDO PENDIENTE")}
          </span>
          <p style={{ fontSize: "1.25rem", fontWeight: 800, color: saldoColor, letterSpacing: "-0.025em", lineHeight: 1.25, marginTop: "0.125rem", margin: 0 }}>
            {formatMoney(remainingAmount)}
          </p>
        </div>
        <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#64748b", fontWeight: 500, display: "flex", flexDirection: "column", gap: "0.125rem" }}>
          <div>Plan: <span style={{ fontWeight: 700, color: "#1e293b" }}>{formatMoney(totalAmount)}</span></div>
          {rightSideSubtext}
        </div>
      </div>

      {/* Barra de Progreso Compacta */}
      <div style={{ marginTop: "0.625rem", paddingLeft: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#64748b", fontWeight: 500, marginBottom: "0.25rem" }}>
          <span>Progreso cuotas</span>
          <span style={{ fontWeight: 700, color: progressTextColor }}>
            {Math.floor(paidCuotas)}/{totalCuotas} ({Math.round(progress)}%)
          </span>
        </div>
        <div style={{ width: "100%", height: "6px", backgroundColor: "#f1f5f9", borderRadius: "9999px", overflow: "hidden" }}>
          <div style={{ height: "100%", backgroundColor: progressBarColor, borderRadius: "9999px", width: `${progress}%` }}></div>
        </div>
      </div>

      {/* Contacto y Ubicación Sintetizados */}
      <div style={{ marginTop: "0.75rem", paddingTop: "0.625rem", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", color: "#475569", paddingLeft: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", overflow: "hidden", maxWidth: "55%" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#94a3b8", flexShrink: 0 }}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 500, color: "#334155" }}>
            {loan.address || "Sin dirección"}
          </span>
          {loan.address && (
            <button style={{ background: "none", border: "none", padding: "2px", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexShrink: 0 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#4f46e5" }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          {loan.phone ? (
            <a href={`tel:${loan.phone}`} style={{ fontWeight: 700, color: "#4f46e5", textDecoration: "none" }}>{loan.phone}</a>
          ) : (
            <span style={{ fontWeight: 700, color: "#94a3b8" }}>Sin Teléfono</span>
          )}
        </div>
      </div>

      {/* Acciones Ligeras */}
      <div style={{ marginTop: "0.75rem", paddingTop: "0.625rem", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "0.5rem", paddingLeft: "4px" }}>
        {isLiquidado ? (
          <button
            onClick={() => onRenew(loan)}
            style={{ flex: 1, padding: "0.5rem 0.75rem", borderRadius: "0.75rem", backgroundColor: "#eff6ff", color: "#2563eb", fontWeight: 600, fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", border: "none", cursor: "pointer", transition: "background-color 0.2s" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Renovar
          </button>
        ) : isCobrarEnabled ? (
          <button
            onClick={() => onPay(loan)}
            style={{ flex: 1, padding: "0.5rem 0.75rem", borderRadius: "0.75rem", backgroundColor: "#ecfdf5", color: "#047857", fontWeight: 600, fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", border: "none", cursor: "pointer", transition: "background-color 0.2s" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            Abonar
          </button>
        ) : (
          <button
            disabled
            style={{ flex: 1, padding: "0.5rem 0.75rem", borderRadius: "0.75rem", backgroundColor: "#f1f5f9", color: "#94a3b8", fontWeight: 600, fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", border: "none", cursor: "not-allowed" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            Cobrado
          </button>
        )}
        
        <button
          onClick={() => onDetails(loan)}
          style={{ flex: 1, padding: "0.5rem 0.75rem", borderRadius: "0.75rem", backgroundColor: "#f8fafc", color: "#4f46e5", fontWeight: 600, fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", border: "1px solid rgba(226, 232, 240, 0.7)", cursor: "pointer", transition: "background-color 0.2s" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          Detalles
        </button>
        
        <div style={{ position: "relative" }}>
          <LoanActions
            loan={loan}
            currentUser={currentUser}
            isMobile={true}
            today={today}
            onPay={onPay}
            onDetails={onDetails}
            onRenew={onRenew}
            onReassign={onReassign}
            onDelete={onDelete}
            shareRef={shareRef}
            minimal={true}
            iconOnly={true}
            onMenuToggle={(isOpen) => setIsMenuOpen(isOpen)}
          />
        </div>
      </div>
    </article>
  );
}
