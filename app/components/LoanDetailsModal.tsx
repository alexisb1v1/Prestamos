"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import {
  getLoanDetailsUseCase,
  deleteInstallmentUseCase,
} from "@/app/features/loans";
import { formatMoney, getLoanStatus, formatDateUTC } from "@/lib/loanUtils";
import { Loan, LoanDetails } from "@/lib/types";
import {
  format,
  parseISO,
  eachDayOfInterval,
  isSameDay,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  getDay,
  differenceInDays,
} from "date-fns";
import { es } from "date-fns/locale";
import { usePermissions } from "@/hooks/usePermissions";
import { LoanShareGeneratorRef } from "./LoanShareGenerator";
import ConfirmModal from "./ConfirmModal";
import LoadingSpinner from "./LoadingSpinner";
import { logger } from "@/lib/logging-service";
import { ArrowLeft, Share2, Calendar, Receipt, ChevronLeft, ChevronRight, Clock, CheckCircle2 } from "lucide-react";

interface LoanDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  shareRef?: React.RefObject<LoanShareGeneratorRef | null>;
}

function LoanDetailsModal({
  isOpen,
  onClose,
  loan,
  shareRef,
}: LoanDetailsModalProps) {
  const [details, setDetails] = useState<LoanDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"calendar" | "list">("calendar");
  const [isSharing, setIsSharing] = useState(false);
  const { canDeletePayment } = usePermissions();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    const timer = setTimeout(checkMobile, 0);
    window.addEventListener("resize", checkMobile);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const loadDetails = useCallback(async () => {
    if (!loan) return;
    setLoading(true);
    setError("");

    const result = await getLoanDetailsUseCase.execute(loan.id.toString());

    result.match(
      (data) => setDetails(data),
      (err) => {
        logger.error("Error loading loan details:", err);
        setError("Error al cargar los detalles del préstamo.");
      },
    );

    setLoading(false);
  }, [loan]);

  useEffect(() => {
    if (isOpen && loan) {
      loadDetails();
      setActiveTab("calendar");
    }
  }, [isOpen, loan, loadDetails]);

  const parseDateSafe = useCallback((dateStr: string) => {
    if (!dateStr) return new Date();
    const date = new Date(dateStr);
    return new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    );
  }, []);

  const startDateStr = details?.startDate || loan?.startDate || "";
  const endDateStr = details?.endDate || loan?.endDate || "";

  const parsedDates = useMemo(() => {
    if (!startDateStr || !endDateStr) {
      return { start: new Date(), end: new Date() };
    }

    const start = parseDateSafe(startDateStr);
    let end = parseDateSafe(endDateStr);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isLiquidated = loan?.status === "Liquidado";

    if (!isLiquidated && today > end) {
      end = today;
    }

    if (details?.installments && details.installments.length > 0) {
      details.installments.forEach((inst) => {
        const instDate = parseDateSafe(inst.date);
        if (instDate > end) end = instDate;
      });
    }

    return { start, end };
  }, [
    startDateStr,
    endDateStr,
    parseDateSafe,
    loan?.status,
    details?.installments,
  ]);

  const days = useMemo(() => {
    if (!parsedDates.start || !parsedDates.end) return [];
    return eachDayOfInterval({
      start: startOfWeek(parsedDates.start, { weekStartsOn: 1 }),
      end: endOfWeek(parsedDates.end, { weekStartsOn: 1 }),
    });
  }, [parsedDates.start, parsedDates.end]);

  const monthLabel = useMemo(() => {
    if (
      format(parsedDates.start, "MMM yyyy") ===
      format(parsedDates.end, "MMM yyyy")
    ) {
      return format(parsedDates.start, "MMMM yyyy", { locale: es });
    }
    return `${format(parsedDates.start, "MMMM", { locale: es })} - ${format(parsedDates.end, "MMMM yyyy", { locale: es })}`;
  }, [parsedDates.start, parsedDates.end]);

  const getInstallmentForDay = useCallback(
    (day: Date) => {
      const normalizedDay = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
      ).getTime();
      const dayInstallments = details?.installments?.filter((inst) => {
        const instDate = new Date(inst.date);
        const instDay = new Date(
          instDate.getFullYear(),
          instDate.getMonth(),
          instDate.getDate(),
        ).getTime();
        return instDay === normalizedDay;
      });

      if (!dayInstallments || dayInstallments.length === 0) return undefined;

      const totalAmount = dayInstallments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
      
      return {
        ...dayInstallments[0],
        amount: totalAmount,
      };
    },
    [details?.installments],
  );

  const isLoanDate = useCallback(
    (day: Date) => {
      const withinInterval = isWithinInterval(day, {
        start: parsedDates.start,
        end: parsedDates.end,
      });
      const isSunday = getDay(day) === 0;
      return withinInterval && !isSunday;
    },
    [parsedDates.start, parsedDates.end],
  );

  const isStartDate = useCallback(
    (day: Date) => isSameDay(parsedDates.start, day),
    [parsedDates.start],
  );
  const isEndDate = useCallback(
    (day: Date) => isSameDay(parsedDates.end, day),
    [parsedDates.end],
  );
  const isToday = useCallback((day: Date) => isSameDay(new Date(), day), []);

  const handleShare = async () => {
    if (loan && shareRef?.current) {
      setIsSharing(true);
      try {
        await shareRef.current.shareLoan(loan, activeTab);
      } catch (error) {
        logger.error("Error al compartir ficha:", error);
      } finally {
        setIsSharing(false);
      }
    }
  };

  const openConfirmDelete = (paymentDate: string) => {
    setPaymentToDelete(paymentDate);
    setIsConfirmOpen(true);
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;

    const result = await deleteInstallmentUseCase.execute(paymentToDelete);

    result.match(
      () => {
        loadDetails();
        setIsConfirmOpen(false);
        setPaymentToDelete(null);
      },
      (err) => {
        logger.error("Error deleting payment:", err);
        alert("Error al eliminar el pago: " + err.message);
      },
    );
  };

  if (!isOpen || !loan) return null;

  const totalAmount = loan.amount + loan.interest;
  const remainingAmount = loan.remainingAmount ?? (totalAmount - (loan.paidToday || 0)); // fallback if needed
  const paidAmount = totalAmount - remainingAmount;
  const progressPercent = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  
  const totalDays = loan.days;
  const paidDays = Math.max(0, Math.min(totalDays, paidAmount / loan.fee));

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isMobile ? "#f8fafc" : "rgba(15, 23, 42, 0.4)",
          display: "flex",
          justifyContent: isMobile ? "flex-start" : "flex-end",
          alignItems: "stretch",
          flexDirection: isMobile ? "column" : "row",
          zIndex: 1000,
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
        onClick={(e) => {
          if (!isMobile && e.target === e.currentTarget) onClose();
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            maxWidth: isMobile ? "100%" : "480px",
            margin: "0",
            backgroundColor: "#f8fafc",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            borderLeft: isMobile ? "none" : "1px solid #e2e8f0",
            borderRight: "none",
            boxShadow: isMobile ? "none" : "-10px 0 30px rgba(0, 0, 0, 0.15)",
            animation: isMobile ? "none" : "slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <style>
            {`
              @keyframes slideLeft {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
            `}
          </style>
          {/* Header */}
          <header
            style={{
              position: "sticky",
              top: 0,
              zIndex: 30,
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid #f1f5f9",
              paddingTop: "max(12px, env(safe-area-inset-top))",
              paddingLeft: "1rem",
              paddingRight: "1rem",
              paddingBottom: "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button
                onClick={onClose}
                aria-label="Volver"
                style={{
                  padding: "0.5rem",
                  marginLeft: "-0.25rem",
                  color: "#475569",
                  background: "transparent",
                  border: "none",
                  borderRadius: "9999px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowLeft size={20} strokeWidth={2.4} />
              </button>
              <div>
                <h1 style={{ fontSize: "1rem", fontWeight: "bold", color: "#0f172a", margin: 0, lineHeight: 1.25 }}>
                  Detalle de Pagos
                </h1>
                <p style={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b", margin: 0 }}>
                  Préstamo Activo #{loan.id}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <button
                onClick={handleShare}
                disabled={isSharing}
                aria-label="Compartir estado"
                style={{
                  padding: "0.5rem",
                  color: "#475569",
                  background: "transparent",
                  border: "none",
                  borderRadius: "9999px",
                  cursor: isSharing ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Share2 size={20} strokeWidth={2} />
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {/* Error Banner */}
            {error && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  color: "#b91c1c",
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  fontSize: "0.75rem",
                  textAlign: "center",
                  border: "1px solid #fecaca",
                }}
              >
                {error}
              </div>
            )}

            {/* Hero Financial Summary Card */}
            <section
              style={{
                background: "linear-gradient(to bottom right, #4f46e5, #4338ca, #3730a3)",
                borderRadius: "1rem",
                padding: "1.25rem",
                color: "white",
                boxShadow: "0 10px 15px -3px rgba(99, 102, 241, 0.2), 0 4px 6px -2px rgba(99, 102, 241, 0.1)",
                position: "relative",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "10px", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600, color: "#c7d2fe" }}>
                      Cliente
                    </span>
                    <span style={{ padding: "2px 8px", borderRadius: "9999px", backgroundColor: "rgba(255,255,255,0.2)", fontSize: "10px", fontWeight: "bold", backdropFilter: "blur(4px)" }}>
                      ID: #{loan.id}
                    </span>
                  </div>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "white", margin: 0, letterSpacing: "-0.025em" }}>
                    {loan.clientName}
                  </h2>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "9999px", backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", fontSize: "11px", fontWeight: 500, color: "white" }}>
                    <Calendar size={14} color="#c7d2fe" />
                    <span>
                      {format(parsedDates.start, "dd/MM/yy")} - {format(parsedDates.end, "dd/MM/yy")}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ position: "relative", zIndex: 10, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", padding: "0.75rem 0", borderTop: "1px solid rgba(255,255,255,0.15)", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
                <div>
                  <span style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#c7d2fe", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total</span>
                  <p style={{ fontSize: "0.875rem", fontWeight: "bold", marginTop: "2px", color: "white", margin: 0 }}>
                    S/ {totalAmount.toFixed(0)}
                  </p>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#c7d2fe", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cuota</span>
                  <p style={{ fontSize: "0.875rem", fontWeight: "bold", marginTop: "2px", color: "white", margin: 0 }}>
                    S/ {loan.fee.toFixed(0)}
                  </p>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#fde047", textTransform: "uppercase", letterSpacing: "0.05em" }}>Saldo</span>
                  <p style={{ fontSize: "0.875rem", fontWeight: 800, marginTop: "2px", color: "#fde047", margin: 0 }}>
                    S/ {remainingAmount.toFixed(0)}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#c7d2fe", textTransform: "uppercase", letterSpacing: "0.05em" }}>Progreso</span>
                  <p style={{ fontSize: "0.875rem", fontWeight: "bold", marginTop: "2px", color: "white", margin: 0 }}>
                    {paidDays.toFixed(0)} <span style={{ fontSize: "0.75rem", fontWeight: 300, color: "#c7d2fe" }}>/ {totalDays} d</span>
                  </p>
                </div>
              </div>

              <div style={{ position: "relative", zIndex: 10, marginTop: "0.875rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", marginBottom: "6px", color: "#c7d2fe" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <CheckCircle2 size={14} color="#34d399" /> Pagado: S/ {paidAmount.toFixed(2)}
                  </span>
                  <span style={{ fontWeight: 500, color: "white" }}>{progressPercent.toFixed(1)}% amortizado</span>
                </div>
                <div style={{ width: "100%", backgroundColor: "rgba(0,0,0,0.2)", borderRadius: "9999px", height: "8px", padding: "2px" }}>
                  <div style={{ background: "linear-gradient(to right, #34d399, #5eead4)", height: "100%", borderRadius: "9999px", transition: "width 0.5s ease", width: `${Math.min(100, progressPercent)}%` }}></div>
                </div>
              </div>
            </section>

            {/* View Controller Tabs */}
            <section style={{ backgroundColor: "rgba(226, 232, 240, 0.8)", padding: "4px", borderRadius: "0.75rem", display: "flex", alignItems: "center", fontSize: "0.75rem", fontWeight: 600, flexShrink: 0 }}>
              <button
                onClick={() => setActiveTab("calendar")}
                style={{
                  flex: 1,
                  padding: "0.5rem 0",
                  borderRadius: "0.5rem",
                  backgroundColor: activeTab === "calendar" ? "white" : "transparent",
                  color: activeTab === "calendar" ? "#4338ca" : "#475569",
                  boxShadow: activeTab === "calendar" ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)" : "none",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <Calendar size={16} strokeWidth={2.2} />
                <span>Calendario</span>
              </button>
              <button
                onClick={() => setActiveTab("list")}
                style={{
                  flex: 1,
                  padding: "0.5rem 0",
                  borderRadius: "0.5rem",
                  backgroundColor: activeTab === "list" ? "white" : "transparent",
                  color: activeTab === "list" ? "#4338ca" : "#475569",
                  boxShadow: activeTab === "list" ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)" : "none",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <Receipt size={16} strokeWidth={2} />
                <span>Historial</span>
              </button>
            </section>

            {/* Content Area */}
            {activeTab === "calendar" ? (
              <section style={{ backgroundColor: "white", borderRadius: "1rem", padding: "1rem", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", border: "1px solid rgba(226, 232, 240, 0.8)" }}>
                {/* Month Title */}
                <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#1e293b", textTransform: "capitalize" }}>
                    {format(parsedDates.start, "MMMM yyyy", { locale: es })}
                    {parsedDates.start.getMonth() !== parsedDates.end.getMonth() && (
                      <>
                        <span style={{ color: "#94a3b8", margin: "0 0.3rem" }}>-</span>
                        {format(parsedDates.end, "MMMM yyyy", { locale: es })}
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "4px", textAlign: "center" }}>
                  {["LU", "MA", "MI", "JU", "VI", "SÁ", "DO"].map((d, i) => (
                    <span key={d} style={{ fontSize: "11px", fontWeight: "bold", color: i === 6 ? "#fb7185" : "#94a3b8" }}>{d}</span>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center" }}>
                  {days.map((day) => {
                    const installment = getInstallmentForDay(day);
                    const isRelevant = isLoanDate(day);
                    const isStart = isStartDate(day);
                    const isEnd = isEndDate(day);
                    const isTodayDate = isToday(day);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isOverdueUnpaid = isRelevant && day < today && !installment;
                    const isSunday = getDay(day) === 0;

                    let bgColor = "transparent";
                    let textColor = "#cbd5e1"; // default inactive
                    let borderColor = "transparent";
                    let shadow = "none";
                    let label = "";

                    if (isStart) {
                      bgColor = "#4f46e5"; // indigo-600
                      textColor = "white";
                      borderColor = "#4f46e5";
                      shadow = "0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 0 0 2px #4f46e5, 0 0 0 4px white"; // ring effect
                      label = "INI";
                    } else if (isEnd) {
                      bgColor = "#f43f5e"; // rose-500
                      textColor = "white";
                      borderColor = "#f43f5e";
                      shadow = "0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 0 0 2px #f43f5e, 0 0 0 4px white";
                      label = "FIN";
                    } else if (installment) {
                      bgColor = "#ecfdf5"; // emerald-50
                      textColor = "#065f46"; // emerald-800
                      borderColor = "#10b981"; // emerald-500
                      label = `S/ ${installment.amount?.toFixed(0)}`;
                    } else if (isOverdueUnpaid) {
                      bgColor = "#fff1f2"; // rose-50
                      textColor = "#e11d48"; // rose-600
                      borderColor = "#ffe4e6"; // rose-100
                      label = `${loan.fee.toFixed(0)}`;
                    } else if (isRelevant) {
                      bgColor = "#f0f9ff"; // sky-50
                      textColor = "#0c4a6e"; // sky-900
                      borderColor = "#e0f2fe"; // sky-100
                      label = `${loan.fee.toFixed(0)}`;
                    }

                    return (
                      <div
                        key={day.toISOString()}
                        style={{
                          minHeight: "3.5rem",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "0.75rem",
                          padding: "0.25rem",
                          backgroundColor: bgColor,
                          color: textColor,
                          border: `1px solid ${borderColor}`,
                          boxShadow: shadow,
                          fontWeight: (installment || isStart || isEnd || isOverdueUnpaid) ? "bold" : "600",
                          opacity: isSunday ? 0.6 : 1,
                        }}
                      >
                        <span style={{ fontSize: "0.875rem", lineHeight: 1 }}>{format(day, "d")}</span>
                        {label && (
                          <span style={{ fontSize: "9px", marginTop: "4px", color: isStart ? "#c7d2fe" : (isEnd ? "#ffe4e6" : (installment ? "#047857" : (isOverdueUnpaid ? "#f43f5e" : "#0284c7"))), fontWeight: (isStart || isEnd || installment) ? 800 : 700 }}>
                            {label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", fontSize: "11px", fontWeight: 500, color: "#475569" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#4f46e5" }}></span>
                    <span>Inicio / Fin</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#10b981" }}></span>
                    <span>Cobrado</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#e0f2fe", border: "1px solid #bae6fd" }}></span>
                    <span>Pendiente</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}></span>
                    <span>Mora</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "transparent" }}></span>
                    <span>Inactivo</span>
                  </div>
                </div>
              </section>
            ) : (
              <section>
                {!details?.installments.length ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "#64748b", backgroundColor: "white", borderRadius: "1rem", border: "1px solid #e2e8f0" }}>
                    No hay abonos aún.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {[...details.installments]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((inst) => (
                        <div
                          key={inst.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0.75rem",
                            backgroundColor: "white",
                            borderRadius: "0.75rem",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.875rem" }}>
                              {formatMoney(inst.amount)}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                              {formatDateUTC(inst.date)}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {canDeletePayment(inst.date, inst.registeredByUserId) && (
                              <button
                                onClick={() => openConfirmDelete(inst.date)}
                                title="Eliminar Pago"
                                style={{
                                  background: "#fee2e2",
                                  border: "none",
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  color: "#b91c1c",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                }}
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </section>
            )}
          </main>
        </div>
      </div>
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDeletePayment}
        title="Eliminar Pago"
        message="¿Estás seguro de que deseas eliminar este pago?"
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDestructive={true}
      />
    </>
  );
}

export default memo(LoanDetailsModal);
