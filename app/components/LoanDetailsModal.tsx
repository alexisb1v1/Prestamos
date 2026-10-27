"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import {
  getLoanDetailsUseCase,
  deleteInstallmentUseCase,
  generateShareLinkUseCase,
} from "@/app/features/loans";
import { formatMoney, getLoanStatus, formatDateLocal, calculateLoanPerformance } from "@/lib/loanUtils";
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
  differenceInCalendarDays,
} from "date-fns";
import { es } from "date-fns/locale";
import { usePermissions } from "@/hooks/usePermissions";
import { LoanShareGeneratorRef } from "./LoanShareGenerator";
import ConfirmModal from "./ConfirmModal";
import LoadingSpinner from "./LoadingSpinner";
import { logger } from "@/lib/logging-service";
import { trackEvent } from "@/lib/analytics";
import {
  ArrowLeft,
  Share2,
  Calendar,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  X,
  Link2,
  Check,
  AlertTriangle,
} from "lucide-react";

interface LoanDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  shareRef?: React.RefObject<LoanShareGeneratorRef | null>;
  onPaymentDeleted?: () => void;
}

function LoanDetailsModal({
  isOpen,
  onClose,
  loan,
  shareRef,
  onPaymentDeleted,
}: LoanDetailsModalProps) {
  const [details, setDetails] = useState<LoanDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"calendar" | "list">("calendar");
  const [isSharing, setIsSharing] = useState(false);
  const { canDeletePayment } = usePermissions();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

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

  const performance = useMemo(() => {
    if (!loan) return null;
    return calculateLoanPerformance(
      {
        startDate: startDateStr,
        endDate: endDateStr,
        status: loan.status,
        remainingAmount: loan.remainingAmount,
        liquidationDate: (loan as any).liquidationDate,
        fee: loan.fee,
        completedOnTime: details?.completedOnTime ?? loan?.completedOnTime,
        earlyLiquidationDays: details?.earlyLiquidationDays ?? loan?.earlyLiquidationDays,
        extensionDays: details?.extensionDays ?? loan?.extensionDays,
        delayDays: details?.delayDays ?? loan?.delayDays,
        creditRating: details?.creditRating ?? loan?.creditRating,
      },
      details?.installments
    );
  }, [loan, details, startDateStr, endDateStr]);

  const parsedDates = useMemo(() => {
    if (!startDateStr || !endDateStr) {
      return {
        start: new Date(),
        contractEnd: new Date(),
        calendarEnd: new Date(),
        isStalledOverdue: false,
        daysOverdue: 0,
      };
    }

    const start = parseDateSafe(startDateStr);
    let contractEnd = parseDateSafe(endDateStr);
    if (contractEnd.getDay() === 0) {
      contractEnd.setDate(contractEnd.getDate() - 1);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isLiquidated = loan?.status === "Liquidado" || (loan?.remainingAmount ?? 0) <= 0;

    // Buscar fecha del último abono registrado
    let lastPaymentDate: Date | null = null;
    if (details?.installments && details.installments.length > 0) {
      for (const inst of details.installments) {
        const instDate = parseDateSafe(inst.date);
        if (!lastPaymentDate || instDate.getTime() > lastPaymentDate.getTime()) {
          lastPaymentDate = instDate;
        }
      }
    }

    // Límite del calendario (calendarEnd):
    // 1. Por defecto, cubre hasta la fecha fin del contrato pactado
    let calendarEnd = new Date(contractEnd);

    // 2. Si hubo abonos en prórroga (posteriores a contractEnd), extendemos hasta el último abono
    const hasLatePayments = lastPaymentDate ? lastPaymentDate.getTime() > contractEnd.getTime() : false;
    if (lastPaymentDate && hasLatePayments) {
      calendarEnd = new Date(lastPaymentDate);
    }

    // 3. Evaluar clientes que ya no pagan (morosos con > 7 días sin amortizar tras el plazo)
    let isStalledOverdue = false;
    let daysOverdue = 0;

    if (!isLiquidated && today.getTime() > contractEnd.getTime()) {
      daysOverdue = differenceInCalendarDays(today, contractEnd);
      const referenceDate = (lastPaymentDate && hasLatePayments) ? lastPaymentDate : contractEnd;
      const daysSinceLastActivity = differenceInCalendarDays(today, referenceDate);

      if (daysSinceLastActivity > 7) {
        // Moroso prolongado: NO extender el calendario indefinidamente (se acota a contractEnd o último abono)
        isStalledOverdue = true;
      } else {
        // Sigue pagando o vencimiento muy reciente (<= 7 días): extender hasta hoy
        calendarEnd = new Date(today);
      }
    }

    return {
      start,
      contractEnd,
      calendarEnd,
      isStalledOverdue,
      daysOverdue,
    };
  }, [
    startDateStr,
    endDateStr,
    parseDateSafe,
    loan?.status,
    loan?.remainingAmount,
    details?.installments,
  ]);

  const days = useMemo(() => {
    if (!parsedDates.start || !parsedDates.calendarEnd) return [];
    return eachDayOfInterval({
      start: startOfWeek(parsedDates.start, { weekStartsOn: 1 }),
      end: endOfWeek(parsedDates.calendarEnd, { weekStartsOn: 1 }),
    });
  }, [parsedDates.start, parsedDates.calendarEnd]);

  const monthLabel = useMemo(() => {
    if (
      format(parsedDates.start, "MMM yyyy") ===
      format(parsedDates.calendarEnd, "MMM yyyy")
    ) {
      return format(parsedDates.start, "MMMM yyyy", { locale: es });
    }
    return `${format(parsedDates.start, "MMMM", { locale: es })} - ${format(parsedDates.calendarEnd, "MMMM yyyy", { locale: es })}`;
  }, [parsedDates.start, parsedDates.calendarEnd]);

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
      // El rango contractual original es estrictamente entre start y contractEnd (sin domingos)
      const withinInterval = isWithinInterval(day, {
        start: parsedDates.start,
        end: parsedDates.contractEnd,
      });
      const isSunday = getDay(day) === 0;
      return withinInterval && !isSunday;
    },
    [parsedDates.start, parsedDates.contractEnd],
  );

  const isStartDate = useCallback(
    (day: Date) => isSameDay(parsedDates.start, day),
    [parsedDates.start],
  );
  const isContractEndDate = useCallback(
    (day: Date) => isSameDay(parsedDates.contractEnd, day),
    [parsedDates.contractEnd],
  );
  const isToday = useCallback((day: Date) => isSameDay(new Date(), day), []);

  const handleShare = async () => {
    if (loan && shareRef?.current) {
      trackEvent("click_compartir_ficha", {
        prestamoId: loan.id,
        modo: activeTab,
        origen: "modal_detalle",
      });
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

  const handleShareLink = async () => {
    if (!loan || isGeneratingLink) return;
    trackEvent("click_compartir_link", {
      prestamoId: loan.id,
      origen: "modal_detalle",
    });
    setIsGeneratingLink(true);
    const result = await generateShareLinkUseCase.execute(loan.id.toString());

    result.match(
      async ({ shareUrl }) => {
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(shareUrl);
          } else {
            const textArea = document.createElement("textarea");
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            textArea.remove();
          }
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 3000);

          if (navigator.share && isMobile) {
            try {
              await navigator.share({
                title: `Estado de Préstamo - ${loan.clientName}`,
                text: `Hola ${loan.clientName}, aquí puedes consultar tu estado de cuenta:`,
                url: shareUrl,
              });
            } catch (err) { }
          }
        } catch (err) {
          logger.error("Error al copiar enlace:", err);
        } finally {
          setIsGeneratingLink(false);
        }
      },
      (err) => {
        logger.error("Error al generar enlace de préstamo:", err);
        setIsGeneratingLink(false);
      },
    );
  };

  const openConfirmDelete = (paymentId: string) => {
    setPaymentToDelete(paymentId);
    setIsConfirmOpen(true);
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete || isDeletingPayment) return;

    setIsDeletingPayment(true);
    const result = await deleteInstallmentUseCase.execute(paymentToDelete);

    result.match(
      async () => {
        await loadDetails();
        setIsConfirmOpen(false);
        setPaymentToDelete(null);
        setIsDeletingPayment(false);
        onPaymentDeleted?.();
      },
      (err) => {
        setIsDeletingPayment(false);
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
              paddingBottom: "1rem",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem", backgroundColor: "#e0e7ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Receipt size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h1 style={{ fontSize: "1rem", fontWeight: "bold", color: "#0f172a", margin: 0, lineHeight: 1.25 }}>
                  Detalle de Pagos
                </h1>
                <p style={{ fontSize: "0.75rem", fontWeight: 500, color: "#64748b", margin: 0 }}>
                  Préstamo Activo #{loan.id}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              type="button"
              style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "50%",
                backgroundColor: "#f1f5f9",
                color: "#64748b",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <X size={18} strokeWidth={2.5} />
            </button>
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
                      {format(parsedDates.start, "dd/MM/yy")} - {format(parsedDates.contractEnd, "dd/MM/yy")}
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

                {/* Indicadores de Desempeño y Cumplimiento de Plazo */}
                {performance && (
                  <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        backgroundColor: performance.completionBadge.bgColor,
                        border: `1px solid ${performance.completionBadge.borderColor}`,
                        color: performance.completionBadge.color,
                        fontSize: "10px",
                        fontWeight: 700,
                      }}
                      title="Cumplimiento del Plazo Final Pactado"
                    >
                      <span>{performance.completionBadge.icon}</span>
                      <span>{performance.completionBadge.label}</span>
                    </div>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        backgroundColor: performance.punctualityBadge.bgColor,
                        border: `1px solid ${performance.punctualityBadge.borderColor}`,
                        color: performance.punctualityBadge.color,
                        fontSize: "10px",
                        fontWeight: 700,
                      }}
                      title="Puntualidad en el Cronograma de Pagos"
                    >
                      <span>{performance.punctualityBadge.icon}</span>
                      <span>{performance.punctualityBadge.label}</span>
                    </div>
                  </div>
                )}
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
            {loading ? (
              <div
                style={{
                  padding: "3rem 1rem",
                  backgroundColor: "white",
                  borderRadius: "1rem",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <LoadingSpinner message="Cargando información de pagos..." />
              </div>
            ) : activeTab === "calendar" ? (
              <section style={{ backgroundColor: "white", borderRadius: "1rem", padding: "1rem", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", border: "1px solid rgba(226, 232, 240, 0.8)" }}>
                {/* Month Title */}
                <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#1e293b", textTransform: "capitalize" }}>
                    {format(parsedDates.start, "MMMM yyyy", { locale: es })}
                    {parsedDates.start.getMonth() !== parsedDates.calendarEnd.getMonth() && (
                      <>
                        <span style={{ color: "#94a3b8", margin: "0 0.3rem" }}>-</span>
                        {format(parsedDates.calendarEnd, "MMMM yyyy", { locale: es })}
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "4px", marginBottom: "4px", textAlign: "center" }}>
                  {["LU", "MA", "MI", "JU", "VI", "SÁ", "DO"].map((d, i) => (
                    <span key={d} style={{ fontSize: "11px", fontWeight: "bold", color: i === 6 ? "#fb7185" : "#94a3b8" }}>{d}</span>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "4px", textAlign: "center" }}>
                  {days.map((day) => {
                    const installment = getInstallmentForDay(day);
                    const isRelevant = isLoanDate(day);
                    const isStart = isStartDate(day);
                    const isContractEnd = isContractEndDate(day);
                    const isSunday = getDay(day) === 0;
                    const isExtension = day > parsedDates.contractEnd && !isSunday;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isOverdueUnpaid = isRelevant && day < today && !installment;

                    const isLastPayment = performance?.isLiquidated && performance?.lastPaymentDate && isSameDay(day, performance.lastPaymentDate);

                    let bgColor = "transparent";
                    let textColor = "#cbd5e1"; // default inactive / gris
                    let borderColor = "transparent";
                    let shadow = "none";
                    let label = "";
                    let labelColor = "#94a3b8";

                    if (isSunday) {
                      // Domingo: inactivo en gris
                      bgColor = "transparent";
                      textColor = "#cbd5e1";
                      borderColor = "transparent";
                    } else if (isRelevant) {
                      // 1. DENTRO DEL RANGO PACTADO
                      if (installment) {
                        // Pagó: VERDE
                        bgColor = "#ecfdf5";
                        textColor = "#065f46";
                        borderColor = "#10b981";
                        label = `S/ ${installment.amount?.toFixed(0)}`;
                        labelColor = "#047857";
                      } else if (day < today) {
                        // No pagó dentro de fecha y ya venció: ROJO (Mora)
                        bgColor = "#fef2f2";
                        textColor = "#e11d48";
                        borderColor = "#fecaca";
                        label = `${loan.fee.toFixed(0)}`;
                        labelColor = "#f43f5e";
                      } else {
                        // Día de hoy o futuro dentro del rango: NEUTRO / PENDIENTE
                        bgColor = "#f8fafc";
                        textColor = "#334155";
                        borderColor = "#e2e8f0";
                        label = `${loan.fee.toFixed(0)}`;
                        labelColor = "#64748b";
                      }

                      // Inicio o Fin pactado: anillo sutil sin texto
                      if (isStart) {
                        borderColor = "#4f46e5";
                        shadow = "0 0 0 2px #4f46e5, 0 0 0 3px white";
                      } else if (isContractEnd) {
                        borderColor = "#6366f1";
                        shadow = "0 0 0 2px #6366f1, 0 0 0 3px white";
                      }
                    } else if (isExtension) {
                      // 2. FUERA DEL RANGO PACTADO (PRÓRROGA)
                      if (installment) {
                        // Pagó en prórroga: SIEMPRE AMARILLO (incluso si es liquidación)
                        bgColor = "#fefce8";
                        textColor = "#854d0e";
                        borderColor = "#ca8a04";
                        shadow = "none";
                        label = `S/ ${installment.amount?.toFixed(0)}`;
                        labelColor = "#a16207";
                      } else {
                        // No pagó en prórroga: GRIS como los domingos (no saturar de rojo)
                        bgColor = "transparent";
                        textColor = "#cbd5e1";
                        borderColor = "transparent";
                      }
                    }

                    return (
                      <div
                        key={day.toISOString()}
                        style={{
                          minHeight: "3.25rem",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "0.625rem",
                          padding: "0.2rem",
                          backgroundColor: bgColor,
                          color: textColor,
                          border: `1px solid ${borderColor}`,
                          boxShadow: shadow,
                          fontWeight: (installment || isStart || isContractEnd || isOverdueUnpaid) ? 700 : 500,
                          opacity: isSunday ? 0.45 : 1,
                          overflow: "hidden",
                        }}
                      >
                        <span style={{ fontSize: "0.8125rem", lineHeight: 1.1 }}>
                          {format(day, "d")}
                        </span>
                        {label ? (
                          <span
                            style={{
                              fontSize: "8.5px",
                              marginTop: "2px",
                              color: labelColor,
                              fontWeight: 800,
                              whiteSpace: "nowrap",
                              letterSpacing: "-0.02em",
                            }}
                          >
                            {label}
                          </span>
                        ) : (
                          <span style={{ height: "10px" }} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Franja de Deuda Pendiente para Morosos Prolongados (> 7 o 14 días sin abonos) */}
                {parsedDates.isStalledOverdue && (
                  <div
                    style={{
                      marginTop: "0.875rem",
                      padding: "0.75rem 1rem",
                      background: "linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)",
                      border: "1px solid #fecaca",
                      borderRadius: "0.75rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      boxShadow: "0 1px 2px rgba(225, 29, 72, 0.05)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          backgroundColor: "#ffe4e6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#e11d48",
                          flexShrink: 0,
                        }}
                      >
                        <AlertTriangle size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#9f1239" }}>
                          Deuda pendiente: S/ {remainingAmount.toFixed(2)}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#e11d48", fontWeight: 500 }}>
                          {parsedDates.daysOverdue > 0
                            ? `${parsedDates.daysOverdue} días fuera del plazo contractual`
                            : "Saldo pendiente sin abonos recientes"}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 800,
                        backgroundColor: "#e11d48",
                        color: "white",
                        padding: "0.25rem 0.55rem",
                        borderRadius: "999px",
                        letterSpacing: "0.025em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      MORA ACTIVA
                    </span>
                  </div>
                )}

                {/* Legend */}
                <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", fontSize: "11px", fontWeight: 500, color: "#475569" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#4f46e5" }}></span>
                    <span>Inicio / Fin Pactado</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#10b981" }}></span>
                    <span>Cobrado</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#ca8a04" }}></span>
                    <span>Prórroga</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}></span>
                    <span>Mora</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "transparent", border: "1px solid #cbd5e1" }}></span>
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
                              {formatDateLocal(inst.date)}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {canDeletePayment(inst.date, inst.registeredByUserId) && (
                              <button
                                onClick={() => openConfirmDelete(inst.id)}
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

          {/* Footer */}
          <footer
            style={{
              padding: "1rem",
              backgroundColor: "white",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              zIndex: 20,
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.75rem",
                backgroundColor: "#f1f5f9",
                color: "#475569",
                fontWeight: 600,
                fontSize: "0.875rem",
                border: "none",
                cursor: "pointer",
              }}
            >
              Cerrar
            </button>
            <button
              onClick={handleShareLink}
              disabled={isGeneratingLink}
              title="Enlace web"
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                borderRadius: "0.75rem",
                backgroundColor: linkCopied ? "#ecfdf5" : "color-mix(in srgb, var(--color-primary, #4147eb) 10%, transparent)",
                color: linkCopied ? "#059669" : "var(--color-primary, #4147eb)",
                border: linkCopied ? "1px solid #a7f3d0" : "1px solid color-mix(in srgb, var(--color-primary, #4147eb) 30%, transparent)",
                fontWeight: 700,
                fontSize: "0.875rem",
                cursor: isGeneratingLink ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                transition: "all 0.2s",
              }}
            >
              {linkCopied ? (
                <>
                  <Check size={18} strokeWidth={2.5} />
                  <span>¡Enlace Copiado!</span>
                </>
              ) : isGeneratingLink ? (
                <span>Generando...</span>
              ) : (
                <>
                  <Link2 size={18} strokeWidth={2.5} />
                  <span>Enlace Web</span>
                </>
              )}
            </button>
            <button
              onClick={handleShare}
              disabled={isSharing}
              title="Compartir imagen de la tarjeta"
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.75rem",
                backgroundColor: "var(--color-primary, #4147eb)",
                color: "white",
                fontWeight: 600,
                fontSize: "0.875rem",
                border: "none",
                cursor: isSharing ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                opacity: isSharing ? 0.7 : 1,
              }}
            >
              {isSharing ? (
                <LoadingSpinner message="" />
              ) : (
                <Share2 size={18} />
              )}
              <span>Ficha</span>
            </button>
          </footer>
        </div>
      </div>
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          if (!isDeletingPayment) {
            setIsConfirmOpen(false);
            setPaymentToDelete(null);
          }
        }}
        onConfirm={handleDeletePayment}
        title="Eliminar Pago"
        message="¿Estás seguro de que deseas eliminar este pago?"
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDestructive={true}
        isLoading={isDeletingPayment}
      />
    </>
  );
}

export default memo(LoanDetailsModal);
