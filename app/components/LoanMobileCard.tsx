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
        borderRadius: "0.75rem",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
        padding: "10px 12px",
        transition: "border-color 0.2s",
        position: "relative",
        overflow: "hidden",
        opacity: isDragging ? 0.7 : 1,
        zIndex: isMenuOpen ? 10 : 1,
        display: "flex",
        flexDirection: "column",
        gap: "5px",
      }}
    >
      {/* Indicador lateral sutil */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3.5px", backgroundColor: leftBarColor, borderTopLeftRadius: "0.75rem", borderBottomLeftRadius: "0.75rem" }}></div>

      {/* Encabezado Limpio y Compacto */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", paddingLeft: "2px" }}>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", lineHeight: 1.2, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textTransform: "uppercase" }}>
            {loan.clientName}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "1px 7px",
              borderRadius: "9999px",
              fontSize: "9.5px",
              fontWeight: 800,
              backgroundColor: badgeBg,
              color: badgeText,
              border: `1px solid ${badgeBorder}`,
              whiteSpace: "nowrap",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              lineHeight: 1.3
            }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: dotColor, animation: isMora ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none" }}></span>
              {status.label}
            </span>
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500, lineHeight: 1.3 }}>
              DNI: {loan.documentNumber || "S/N"}
            </span>
          </div>
        </div>
      </div>

      {/* Resumen Financiero en Bloque Compacto (igual que Dashboard) */}
      <div style={{ backgroundColor: "#f8fafc", borderRadius: "8px", padding: "7px 10px", display: "flex", flexDirection: "column", gap: "5px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", alignItems: "baseline" }}>
          <div>
            <span style={{ fontSize: "10.5px", color: "#64748b", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "1px" }}>
              Plan
            </span>
            <div style={{ fontSize: "14.5px", fontWeight: 750, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              {formatMoney(totalAmount)}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: "10.5px", color: "#64748b", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "1px" }}>
              Saldo
            </span>
            <div style={{ fontSize: "14.5px", fontWeight: 750, color: saldoColor, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              {formatMoney(remainingAmount)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "10.5px", color: "#64748b", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "1px" }}>
              Cuota diaria
            </span>
            <div style={{ fontSize: "14.5px", fontWeight: 750, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              {formatMoney(loan.fee)}
            </div>
          </div>
        </div>

        {/* Barra de Progreso */}
        <div style={{ marginTop: "1px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "#64748b", marginBottom: "3px", fontWeight: 500 }}>
            <span>Progreso: {Math.floor(paidCuotas)} de {totalCuotas} cuotas</span>
            <span style={{ fontWeight: 700, color: progressTextColor }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ width: "100%", backgroundColor: "#e2e8f0", height: "5px", borderRadius: "9999px", overflow: "hidden" }}>
            <div style={{ height: "100%", backgroundColor: progressBarColor, borderRadius: "9999px", width: `${progress}%`, transition: "width 0.3s ease" }}></div>
          </div>
        </div>
      </div>

      {/* Contacto y Ubicación */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11.5px", color: "#64748b", padding: 0, gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", flex: 1, minWidth: 0 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#94a3b8", flexShrink: 0 }}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 500, color: "#334155", fontSize: "11.5px" }}>
            {loan.address || "Sin dirección"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          {loan.phone ? (
            <a href={`tel:${loan.phone}`} style={{ width: "26px", height: "26px", borderRadius: "9999px", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#334155", textDecoration: "none" }} title={`Llamar al ${loan.phone}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </a>
          ) : (
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>Sin Tel.</span>
          )}
        </div>
      </div>

      {/* Acciones Compactas (Altura 36px) */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: 0 }}>
        {isLiquidado ? (
          <button
            onClick={() => onRenew(loan)}
            style={{ flex: 1, height: "36px", borderRadius: "9px", backgroundColor: "#eff6ff", color: "#2563eb", fontWeight: 700, fontSize: "13.5px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", border: "none", cursor: "pointer", transition: "all 0.2s" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Renovar
          </button>
        ) : isCobrarEnabled ? (
          <button
            onClick={() => onPay(loan)}
            style={{ flex: 1, height: "36px", borderRadius: "9px", backgroundColor: "#10b981", color: "white", fontWeight: 700, fontSize: "13.5px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", border: "none", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "all 0.2s" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            Cobrar {formatMoney(loan.fee)}
          </button>
        ) : (
          <button
            disabled
            style={{ flex: 1, height: "36px", borderRadius: "9px", backgroundColor: "#f1f5f9", color: "#94a3b8", fontWeight: 700, fontSize: "13.5px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", border: "none", cursor: "not-allowed" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            Cobrado
          </button>
        )}
        
        <button
          onClick={() => onDetails(loan)}
          style={{ width: "36px", height: "36px", borderRadius: "9px", backgroundColor: "#f1f5f9", color: "#334155", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", transition: "all 0.2s", flexShrink: 0 }}
          title="Ver Detalles"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        
        <div style={{ position: "relative", flexShrink: 0 }}>
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
