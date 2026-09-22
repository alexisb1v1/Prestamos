"use client";

import { useState, MouseEvent, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Loan } from "@/app/features/loans";
import { formatMoney, getLoanStatus } from "@/lib/loanUtils";
import { User } from "@/lib/types";
import LoanActions from "./LoanActions";
import {
  MapPin,
  Phone,
  Wallet,
  Eye,
  Share2,
  Calendar,
  ClipboardList,
  Menu,
  Info,
} from "lucide-react";
import ProgressInfoModal from "./ProgressInfoModal";
import { LoanShareGeneratorRef } from "./LoanShareGenerator";

interface CollectionRouteCardProps {
  loan: Loan;
  index: number;
  today: Date;
  currentUser: User | null;
  onPay: (loan: Loan) => void;
  onDetails: (loan: Loan) => void;
  onUpdateInfo?: (loan: Loan) => void;
  shareRef?: React.RefObject<LoanShareGeneratorRef | null>;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
  showDragHandle?: boolean;
}

export default function CollectionRouteCard({
  loan,
  index,
  today,
  currentUser,
  onPay,
  onDetails,
  onUpdateInfo,
  shareRef,
  dragHandleProps,
  isDragging,
  showDragHandle,
}: CollectionRouteCardProps) {
  // Estados
  const [isSharing, setIsSharing] = useState(false);
  const [showFullName, setShowFullName] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const shareBtnRef = useRef<HTMLButtonElement>(null);
  const [shareMenuPos, setShareMenuPos] = useState<{
    top: number;
    right: number;
  } | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Cálculos dinámicos
  const status = getLoanStatus(loan, today);
  const remainingAmount =
    (loan as { remainingAmount?: number }).remainingAmount || 0;
  const totalAmount = loan.amount + loan.interest;
  const paidAmount = totalAmount - remainingAmount;
  const totalCuotas = loan.days;
  const paidCuotas = Math.max(0, Math.min(totalCuotas, paidAmount / loan.fee));
  const progress = (paidAmount / totalAmount) * 100;

  // Lógica de abreviación de nombres
  // Alexis Fernando Basilio Verastegui -> Alexis F. Basilio V.
  // Jorge Luis Villavicencio -> Jorge L. Villavicencio
  const getCompactName = (name: string) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);

    if (parts.length >= 4) {
      // Caso 2 nombres, 2 apellidos (o más)
      return `${parts[0]} ${parts[1][0]}. ${parts[2]} ${parts[3][0]}.`;
    }

    if (parts.length === 3) {
      // Heurística para Jorge Luis Villavicencio -> Jorge L. Villavicencio
      // O Claudia Dosantos Mendoza -> Claudia Dosantos M.
      // Si la segunda parte es corta, probablemente es un nombre medio.
      // Si la segunda parte es larga, probablemente es el apellido principal.
      if (parts[1].length <= 4) {
        return `${parts[0]} ${parts[1][0]}. ${parts[2]}`;
      } else {
        return `${parts[0]} ${parts[1]} ${parts[2][0]}.`;
      }
    }

    return name;
  };

  const compactName = getCompactName(loan.clientName);

  // Auto-ocultar nombre completo después de 3 segundos
  useEffect(() => {
    if (showFullName) {
      const timer = setTimeout(() => setShowFullName(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showFullName]);

  // Configuración de colores
  const getStatusColor = () => {
    switch (status.value) {
      case "green":
        return "#10b981";
      case "yellow":
        return "#f59e0b";
      case "red":
        return "#ef4444";
      case "blue":
        return "#4f46e5";
      default:
        return "#94a3b8";
    }
  };

  const statusColor = getStatusColor();

  useEffect(() => {
    if (isDragging && showShareMenu) {
      setShowShareMenu(false);
    }
  }, [isDragging, showShareMenu]);

  useEffect(() => {
    if (!showShareMenu) return;

    const handleOtherMenuOpen = () => setShowShareMenu(false);
    const closeMenu = () => setShowShareMenu(false);

    window.addEventListener("click", closeMenu);
    window.addEventListener("loan-menu-open", handleOtherMenuOpen);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("loan-menu-open", handleOtherMenuOpen);
    };
  }, [showShareMenu]);

  const handleShare = async (e: MouseEvent, mode: "calendar" | "list") => {
    e.stopPropagation();
    setShowShareMenu(false);
    if (loan && shareRef?.current) {
      setIsSharing(true);
      try {
        await shareRef.current.shareLoan(loan, mode);
      } catch (error) {
        console.error("Error al compartir:", error);
      } finally {
        setIsSharing(true); // Mantener cargando un momento para el feedback visual
        setTimeout(() => setIsSharing(false), 2000);
      }
    }
  };

  const toggleShareMenu = (e: MouseEvent) => {
    e.stopPropagation();
    if (!showShareMenu && shareBtnRef.current) {
      const rect = shareBtnRef.current.getBoundingClientRect();
      setShareMenuPos({
        top: rect.top - 5,
        right: window.innerWidth - rect.right,
      });

      // Notificar a otros menús para que se cierren
      const loanId =
        loan.id ||
        (loan as { id?: string | number; _id?: string | number })._id;
      window.dispatchEvent(
        new CustomEvent("loan-menu-open", {
          detail: { loanId, type: "share" },
        }),
      );
    }
    setShowShareMenu(!showShareMenu);
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "1rem",
        border: "1px solid #f1f5f9",
        boxShadow: isDragging
          ? "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
          : "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
        transition: "all 0.2s ease",
        position: "relative",
        marginBottom: "1rem",
        zIndex: isMenuOpen || showShareMenu || isDragging ? 50 : 1,
        opacity: isDragging ? 0.9 : 1,
        transform: isDragging ? "scale(1.02)" : "none",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Franja Lateral estilo Stitch */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "4px",
          backgroundColor: statusColor,
          borderTopLeftRadius: "1rem",
          borderBottomLeftRadius: "1rem",
        }}
      ></div>

      {/* 1. Header: Estado, Drag Handle y Pendiente */}
      <div
        style={{
          padding: "1rem 1.25rem 0.5rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Badge Estado */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.25rem 0.75rem",
              backgroundColor: statusColor + "15",
              borderRadius: "9999px",
              border: `1px solid ${statusColor}30`,
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: statusColor,
              }}
            ></div>
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 800,
                textTransform: "uppercase",
                color: statusColor,
                letterSpacing: "0.05em",
              }}
            >
              {status.label}
            </span>
          </div>

          {/* Drag Handle a la derecha del badge */}
          {showDragHandle && (
            <div
              {...dragHandleProps}
              style={{
                color: "#cbd5e1",
                cursor: "grab",
                display: "flex",
                alignItems: "center",
                padding: "0.25rem",
                borderRadius: "0.25rem",
              }}
              onMouseDown={(e) => e.currentTarget.style.cursor = "grabbing"}
              onMouseUp={(e) => e.currentTarget.style.cursor = "grab"}
            >
              <Menu size={16} strokeWidth={2.5} />
            </div>
          )}
        </div>

        {/* Pendiente */}
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
          <span
            style={{
              fontSize: "0.6rem",
              fontWeight: 800,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Pendiente
          </span>
          <span
            style={{
              fontSize: "1.1rem",
              fontWeight: 900,
              color: "#0f172a",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {formatMoney(remainingAmount)}
          </span>
        </div>
      </div>

      {/* 2. Cuerpo: Cliente y Botón Cobrar */}
      <div
        style={{
          padding: "0.5rem 1.25rem 0.75rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            onClick={() => setShowFullName(!showFullName)}
            style={{ cursor: "pointer", position: "relative" }}
            title={loan.clientName}
          >
            <h3
              style={{
                fontSize: "0.95rem",
                fontWeight: 800,
                color: showFullName ? "#1e293b" : "#0f172a",
                margin: "0 0 0.4rem 0",
                letterSpacing: "-0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                transition: "color 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem"
              }}
            >
              <span style={{ color: "#0f172a" }}>{index + 1}.</span>
              {showFullName ? loan.clientName : compactName}
            </h3>

            {/* Tooltip nombre completo */}
            {showFullName && (
              <div
                style={{
                  position: "absolute",
                  top: "-30px",
                  left: "0",
                  backgroundColor: "#1e293b",
                  color: "white",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  zIndex: 100,
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  pointerEvents: "none",
                  animation: "fadeInOut 0.2s ease",
                }}
              >
                {loan.clientName}
                <div
                  style={{
                    position: "absolute",
                    bottom: "-4px",
                    left: "10px",
                    width: "8px",
                    height: "8px",
                    backgroundColor: "#1e293b",
                    transform: "rotate(45deg)",
                  }}
                ></div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.35rem",
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "#64748b",
              }}
            >
              <MapPin size={12} strokeWidth={2.5} style={{ opacity: 0.8, marginTop: "0.1rem", flexShrink: 0 }} />
              <span style={{ textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {loan.address || "Sin dirección"}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.7rem",
                fontWeight: 800,
                color: "#4f46e5",
              }}
            >
              <Phone size={12} strokeWidth={2.5} />
              <a href={`tel:${loan.phone}`} style={{ color: "inherit", textDecoration: "none" }}>
                {loan.phone || "Sin teléfono"}
              </a>
            </div>
          </div>
        </div>

        <button
          onClick={() => onPay(loan)}
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.6rem 1rem",
            backgroundColor: "#10b981",
            color: "white",
            borderRadius: "0.5rem",
            border: "none",
            fontSize: "0.75rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.96)"; e.currentTarget.style.boxShadow = "none"; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 2px 4px rgba(16, 185, 129, 0.2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 2px 4px rgba(16, 185, 129, 0.2)"; }}
        >
          <Wallet size={16} strokeWidth={2.5} /> COBRAR
        </button>
      </div>

      {/* 3. Barra de Progreso */}
      <div style={{ padding: "0.5rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Progreso</span>
            <button
              onClick={(e) => { e.stopPropagation(); setShowInfoModal(true); }}
              style={{ background: "none", border: "none", padding: 0, color: "#cbd5e1", cursor: "pointer", display: "flex" }}
            >
              <Info size={12} strokeWidth={2.5} />
            </button>
          </div>
          <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#4f46e5", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {paidCuotas.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 1 })} / {totalCuotas} CUOTAS
          </span>
        </div>
        <div style={{ width: "100%", height: "4px", backgroundColor: "#e0e7ff", borderRadius: "9999px", overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", backgroundColor: "#4f46e5", borderRadius: "9999px", transition: "width 0.5s ease" }}></div>
        </div>
      </div>

      {/* 4. Footer: Estadísticas y Herramientas */}
      <div
        style={{
          padding: "0.75rem 1.25rem",
          borderTop: "1px solid #f1f5f9",
          backgroundColor: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Plan:</span>
            <span style={{ fontSize: "0.75rem", fontWeight: 900, color: "#0f172a" }}>{formatMoney(totalAmount)}</span>
          </div>
          <div style={{ width: "1px", height: "12px", backgroundColor: "#e2e8f0" }}></div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Cuota:</span>
            <span style={{ fontSize: "0.75rem", fontWeight: 900, color: "#4f46e5" }}>{formatMoney(loan.fee)}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            onClick={() => onDetails(loan)}
            style={{
              width: "32px",
              height: "32px",
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
              cursor: "pointer",
            }}
          >
            <Eye size={16} strokeWidth={2} />
          </button>
          
          <div style={{ position: "relative" }}>
            <button
              ref={shareBtnRef}
              onClick={toggleShareMenu}
              disabled={isSharing}
              title="Compartir"
              style={{
                width: "32px",
                height: "32px",
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
                cursor: isSharing ? "wait" : "pointer",
              }}
            >
              <Share2 size={16} strokeWidth={2} />
            </button>

            {isMounted && showShareMenu && createPortal(
              <div
                style={{
                  position: "fixed",
                  bottom: `calc(100vh - ${(shareMenuPos?.top || 0) - 5}px)`,
                  right: `${shareMenuPos?.right || 0}px`,
                  backgroundColor: "white",
                  borderRadius: "10px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  border: "1px solid #f1f5f9",
                  zIndex: 10000,
                  minWidth: "160px",
                  overflow: "hidden",
                  animation: "fadeInOut 0.2s ease",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => handleShare(e, "calendar")}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.75rem", width: "100%",
                    padding: "0.75rem 1rem", border: "none", backgroundColor: "transparent",
                    color: "#4f46e5", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                    textAlign: "left", transition: "background 0.2s",
                  }}
                >
                  <Calendar size={14} /> Calendario
                </button>
                <button
                  onClick={(e) => handleShare(e, "list")}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.75rem", width: "100%",
                    padding: "0.75rem 1rem", border: "none", backgroundColor: "transparent",
                    color: "#10b981", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                    textAlign: "left", borderTop: "1px solid #f8fafc",
                  }}
                >
                  <ClipboardList size={14} /> Historial Abonos
                </button>
              </div>,
              document.body
            )}
          </div>
          
          <div style={{ marginLeft: "0.25rem" }}>
            <LoanActions
              loan={loan}
              currentUser={currentUser}
              isMobile={true}
              today={today}
              onPay={onPay}
              onDetails={onDetails}
              onEdit={onUpdateInfo}
              onRenew={() => {}}
              onReassign={() => {}}
              onDelete={() => {}}
              shareRef={shareRef}
              minimal={true}
              onMenuToggle={setIsMenuOpen}
              isDraggingParent={isDragging}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInOut {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <ProgressInfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />
    </div>
  );
}
