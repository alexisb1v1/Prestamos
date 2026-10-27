"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { formatMoney, getLoanStatus, formatDateUTC, formatDateLocal, calculateLoanPerformance } from "@/lib/loanUtils";
import {
  format,
  parseISO,
  eachDayOfInterval,
  isSameDay,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  getDay,
  differenceInCalendarDays,
} from "date-fns";
import { es } from "date-fns/locale";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { logger } from "@/lib/logging-service";
import { trackEvent } from "@/lib/analytics";
import {
  CheckCircle2,
  Award,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Calendar,
  Receipt,
  MessageCircle,
  AlertTriangle,
} from "lucide-react";

interface Installment {
  id: string;
  date: string;
  amount: number;
  status: string;
}

interface PublicLoanDetails {
  clientName: string;
  tenantName?: string;
  isExpired?: boolean;
  isLiquidated?: boolean;
  amount: number;
  interest: number;
  fee: number;
  days: number;
  remainingAmount: number;
  startDate: string;
  endDate: string;
  status: string;
  installments: Installment[];
  completedOnTime?: boolean;
  earlyLiquidationDays?: number;
  extensionDays?: number;
  delayDays?: number;
  creditRating?: string | null;
}

export default function PublicSharePage() {
  const params = useParams();
  const token = params?.token as string;

  const [details, setDetails] = useState<PublicLoanDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"calendar" | "list">("calendar");
  const [showAuditHistory, setShowAuditHistory] = useState(false);

  const fetchLoanDetails = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const data = await apiRequest<PublicLoanDetails>(
        `/loan/public-share/${token}`,
      );
      setDetails(data);
      trackEvent("public_link_view", {
        estado: data.status,
        liquidado: data.isLiquidated,
        expirado: data.isExpired,
      });
    } catch (err: any) {
      logger.error("Error al cargar detalles públicos del préstamo:", err);
      setError(
        err.message ||
        "El enlace de préstamo no es válido, ha expirado o ha sido modificado.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLoanDetails();
  }, [fetchLoanDetails]);

  const parseDateSafe = useCallback((dateStr: string) => {
    if (!dateStr) return new Date();
    const date = new Date(dateStr);
    return new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    );
  }, []);

  const startDateStr = details?.startDate || "";
  const endDateStr = details?.endDate || "";

  // Saldo restante real (calculado defensivamente sumando abonos)
  const remainingAmount = useMemo(() => {
    if (!details) return 0;
    if (details.installments && details.installments.length > 0) {
      const paidSum = details.installments.reduce(
        (sum, inst) => sum + Number(inst.amount || 0),
        0,
      );
      const totalAmount = Number(details.amount || 0) + Number(details.interest || 0);
      return Math.max(0, totalAmount - paidSum);
    }
    return details.remainingAmount ?? (Number(details.amount || 0) + Number(details.interest || 0));
  }, [details]);

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

    // Si la fecha fin pactada en la BD cae domingo, normalizar al sábado anterior
    if (contractEnd.getDay() === 0) {
      contractEnd.setDate(contractEnd.getDate() - 1);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isLiquidated =
      details?.isLiquidated ||
      details?.status === "Liquidado" ||
      remainingAmount === 0;

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
        // Moroso prolongado: NO extender el calendario indefinidamente (se acota al fin pactado o último abono)
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
    details?.status,
    details?.isLiquidated,
    remainingAmount,
    details?.installments,
  ]);

  const performance = useMemo(() => {
    if (!details) return null;
    const tempLoan = {
      status: details.status,
      startDate: details.startDate,
      endDate: details.endDate,
      fee: details.fee,
      amount: details.amount,
      interest: details.interest,
      remainingAmount: remainingAmount,
      days: details.days,
      completedOnTime: details.completedOnTime,
      earlyLiquidationDays: details.earlyLiquidationDays,
      extensionDays: details.extensionDays,
      delayDays: details.delayDays,
      creditRating: details.creditRating,
    } as any;
    return calculateLoanPerformance(tempLoan, details.installments || []);
  }, [details, remainingAmount]);

  const days = useMemo(() => {
    if (!parsedDates.start || !parsedDates.calendarEnd) return [];
    return eachDayOfInterval({
      start: startOfWeek(parsedDates.start, { weekStartsOn: 1 }),
      end: endOfWeek(parsedDates.calendarEnd, { weekStartsOn: 1 }),
    });
  }, [parsedDates.start, parsedDates.calendarEnd]);

  const monthLabel = useMemo(() => {
    if (!details) return "";
    if (
      format(parsedDates.start, "MMM yyyy") ===
      format(parsedDates.calendarEnd, "MMM yyyy")
    ) {
      return format(parsedDates.start, "MMMM yyyy", { locale: es });
    }
    return `${format(parsedDates.start, "MMMM", { locale: es })} - ${format(
      parsedDates.calendarEnd,
      "MMMM yyyy",
      { locale: es },
    )}`;
  }, [parsedDates.start, parsedDates.calendarEnd, details]);

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

      const totalAmount = dayInstallments.reduce(
        (sum, inst) => sum + (inst.amount || 0),
        0,
      );

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

  const loanStatus = useMemo(() => {
    if (!details) return null;
    const tempLoan = {
      status: details.status,
      startDate: details.startDate,
      endDate: details.endDate,
      fee: details.fee,
      amount: details.amount,
      interest: details.interest,
      remainingAmount: remainingAmount,
      installments: details.installments,
    } as any;
    return getLoanStatus(tempLoan, new Date());
  }, [details, remainingAmount]);

  const isLiquidated = useMemo(() => {
    if (!details) return false;
    return (
      details.isLiquidated ||
      details.status === "Liquidado" ||
      remainingAmount <= 0
    );
  }, [details, remainingAmount]);

  const isExpired = useMemo(() => {
    if (!details) return false;
    return Boolean(details.isExpired);
  }, [details]);

  const tenantName = useMemo(() => {
    return details?.tenantName || "NeoCobros";
  }, [details]);

  const whatsappUrl = useMemo(() => {
    if (!details) return "";
    const phone = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "51999999999";
    let text = "";
    if (isLiquidated) {
      text = encodeURIComponent(
        `Hola, me comunico sobre mi préstamo cancelado.\nCliente: ${details.clientName}\nEmpresa: ${tenantName}\nDeseo consultar sobre una renovación de crédito.`,
      );
    } else if (isExpired) {
      text = encodeURIComponent(
        `Hola, mi enlace de consulta de préstamo ha expirado.\nCliente: ${details.clientName}\nEmpresa: ${tenantName}\n¿Podrían facilitarme un nuevo enlace de consulta actualizado?`,
      );
    } else {
      text = encodeURIComponent(
        `Hola, tengo una consulta sobre mi préstamo.\nCliente: ${details.clientName}\nEmpresa: ${tenantName}\nSaldo Pendiente: ${formatMoney(remainingAmount)}`,
      );
    }
    return `https://wa.me/${phone}?text=${text}`;
  }, [details, isLiquidated, isExpired, tenantName, remainingAmount]);

  if (loading) {
    return (
      <div className="nc-page-layout">
        <LoadingSpinner message="Obteniendo estado de cuenta..." />
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="nc-page-layout">
        <div className="nc-error-card">
          <div className="nc-error-icon-wrapper">
            <ShieldCheck size={36} strokeWidth={2.2} />
          </div>
          <h2 className="nc-error-title">Enlace No Disponible</h2>
          <p className="nc-error-message">
            {error ||
              "El token es inválido o no se pudo recuperar la información del préstamo."}
          </p>
          <div className="nc-error-divider" />
          <p className="nc-error-help">
            Si crees que esto es un error, por favor contacta a tu asesor para
            que te comparta un nuevo enlace.
          </p>
        </div>

        {/* Powered by NeoCobros */}
        <PoweredByFooter />
      </div>
    );
  }

  return (
    <div className="nc-page-layout">
      <div className="nc-container">
        {/* Header Tenant / Empresa */}
        <div className="nc-header">
          <div className="nc-brand">
            <div className="nc-brand-logo">
              {tenantName.charAt(0).toUpperCase()}
            </div>
            <span className="nc-brand-text">{tenantName}</span>
          </div>
          {isLiquidated ? (
            <div
              className="nc-badge"
              style={{
                color: "#059669",
                backgroundColor: "#ecfdf5",
                borderColor: "#a7f3d0",
              }}
            >
              <CheckCircle2 size={14} strokeWidth={2.5} />
              <span>Liquidado</span>
            </div>
          ) : loanStatus ? (
            <div className="nc-badge" style={{ color: loanStatus.color }}>
              <span>{loanStatus.icon}</span>
              <span>{loanStatus.label}</span>
            </div>
          ) : null}
        </div>

        {/* ============================================================ */}
        {/* CASO 1: PRÉSTAMO LIQUIDADO (PANTALLA DE AGRADECIMIENTO)       */}
        {/* ============================================================ */}
        {isLiquidated ? (
          <div className="nc-card" style={{ padding: "1.75rem 1.25rem" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              {/* Badge Circular de Agradecimiento */}
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.4)",
                  marginBottom: "1rem",
                }}
              >
                <Award size={38} strokeWidth={2.2} />
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "9999px",
                  backgroundColor: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  color: "#047857",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                  marginBottom: "0.5rem",
                }}
              >
                <Sparkles size={13} />
                Préstamo 100% Cancelado
              </div>

              <h2
                style={{
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  lineHeight: 1.25,
                  margin: "0 0 0.5rem 0",
                }}
              >
                ¡Gracias por su puntualidad y confianza!
              </h2>

              <p
                style={{
                  fontSize: "0.9rem",
                  color: "#475569",
                  lineHeight: 1.5,
                  margin: "0 0 1rem 0",
                  maxWidth: "460px",
                }}
              >
                Estimado(a){" "}
                <strong style={{ color: "#0f172a" }}>
                  {details.clientName}
                </strong>
                , de parte de todo el equipo de{" "}
                <strong style={{ color: "#4147eb" }}>{tenantName}</strong>,
                queremos agradecerle sinceramente su compromiso en el pago de sus cuotas.
              </p>

              {/* Badges de Desempeño y Cumplimiento de Plazo */}
              {performance && (
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      backgroundColor: performance.completionBadge.bgColor,
                      border: `1px solid ${performance.completionBadge.borderColor}`,
                      color: performance.completionBadge.color,
                      fontSize: "0.75rem",
                      fontWeight: 800,
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
                      padding: "4px 10px",
                      borderRadius: "8px",
                      backgroundColor: performance.punctualityBadge.bgColor,
                      border: `1px solid ${performance.punctualityBadge.borderColor}`,
                      color: performance.punctualityBadge.color,
                      fontSize: "0.75rem",
                      fontWeight: 800,
                    }}
                    title="Puntualidad en el Cronograma de Pagos"
                  >
                    <span>{performance.punctualityBadge.icon}</span>
                    <span>{performance.punctualityBadge.label}</span>
                  </div>
                </div>
              )}

              {/* Resumen Financiero de Liquidación */}
              <div
                style={{
                  width: "100%",
                  backgroundColor: "#f8fafc",
                  borderRadius: "0.875rem",
                  border: "1px solid #e2e8f0",
                  padding: "1rem",
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "0.75rem",
                  marginBottom: "0.75rem",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.625rem",
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Monto Total
                  </div>
                  <div
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: 800,
                      color: "#0f172a",
                      marginTop: "0.15rem",
                    }}
                  >
                    {formatMoney(details.amount + details.interest)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.625rem",
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Cuotas Pagadas
                  </div>
                  <div
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: 800,
                      color: "#059669",
                      marginTop: "0.15rem",
                    }}
                  >
                    {details.installments?.length || 0} de {details.days}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.625rem",
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Saldo Final
                  </div>
                  <div
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: 800,
                      color: "#059669",
                      marginTop: "0.15rem",
                    }}
                  >
                    S/ 0.00
                  </div>
                </div>
              </div>

              {/* Vigencia pactada y fecha de cancelación */}
              <div
                style={{
                  width: "100%",
                  backgroundColor: "#ffffff",
                  borderRadius: "0.65rem",
                  border: "1px solid #e2e8f0",
                  padding: "0.6rem 0.85rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.75rem",
                  color: "#64748b",
                  marginBottom: "1.25rem",
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: "#94a3b8" }}>Plazo Pactado: </span>
                  <span style={{ fontWeight: 700, color: "#1e293b" }}>
                    {formatDateLocal(details.startDate)} al {formatDateLocal(parsedDates.contractEnd)}
                  </span>
                </div>
                {performance?.lastPaymentDate && (
                  <div>
                    <span style={{ fontWeight: 600, color: "#94a3b8" }}>Cancelado el: </span>
                    <span style={{ fontWeight: 700, color: "#15803d" }}>
                      {formatDateLocal(performance.lastPaymentDate)}
                    </span>
                  </div>
                )}
              </div>

              {/* Botón WhatsApp de Renovación */}

              {/* Botón para alternar historial de comprobantes */}
              <button
                type="button"
                onClick={() => setShowAuditHistory(!showAuditHistory)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#4147eb",
                  fontWeight: 700,
                  fontSize: "0.825rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.4rem 0.75rem",
                  borderRadius: "0.5rem",
                  transition: "background-color 0.2s",
                }}
              >
                {showAuditHistory ? (
                  <>
                    <ChevronUp size={16} /> Ocultar comprobantes de abonos
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} /> Ver historial y comprobantes de
                    pago
                  </>
                )}
              </button>
            </div>

            {/* Contenido auditado desplegable */}
            {showAuditHistory && (
              <div
                style={{
                  marginTop: "1.25rem",
                  paddingTop: "1.25rem",
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                {/* Selector de Pestañas */}
                <div className="nc-tab-container">
                  <button
                    className={`nc-tab-button ${activeTab === "calendar" ? "nc-tab-button-active" : ""}`}
                    onClick={() => setActiveTab("calendar")}
                  >
                    Calendario de Pagos
                  </button>
                  <button
                    className={`nc-tab-button ${activeTab === "list" ? "nc-tab-button-active" : ""}`}
                    onClick={() => setActiveTab("list")}
                  >
                    Historial de Abonos
                  </button>
                </div>

                <div style={{ marginTop: "1rem" }}>
                  {activeTab === "calendar" ? (
                    <CalendarView
                      monthLabel={monthLabel}
                      days={days}
                      getInstallmentForDay={getInstallmentForDay}
                      isLoanDate={isLoanDate}
                      isStartDate={isStartDate}
                      isContractEndDate={isContractEndDate}
                      contractEndDate={parsedDates.contractEnd}
                      performance={performance}
                      isToday={isToday}
                      fee={details.fee}
                      isStalledOverdue={parsedDates.isStalledOverdue}
                      daysOverdue={parsedDates.daysOverdue}
                      remainingAmount={details.remainingAmount}
                    />
                  ) : (
                    <InstallmentsListView
                      installments={details.installments}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        ) : isExpired ? (
          /* ============================================================ */
          /* CASO 2: ENLACE EXPIRADO (PANTALLA DE AGRADECIMIENTO / VENCIDO)*/
          /* ============================================================ */
          <div className="nc-card" style={{ padding: "2rem 1.25rem" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "68px",
                  height: "68px",
                  borderRadius: "50%",
                  backgroundColor: "#eff6ff",
                  border: "2px solid #bfdbfe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#2563eb",
                  marginBottom: "1rem",
                }}
              >
                <Clock size={34} strokeWidth={2.2} />
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "9999px",
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  color: "#1d4ed8",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                  marginBottom: "0.5rem",
                }}
              >
                Enlace de Consulta Concluido
              </div>

              <h2
                style={{
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  lineHeight: 1.25,
                  margin: "0 0 0.5rem 0",
                }}
              >
                Sesión temporal finalizada
              </h2>

              <p
                style={{
                  fontSize: "0.9rem",
                  color: "#475569",
                  lineHeight: 1.5,
                  margin: "0 0 1.5rem 0",
                  maxWidth: "460px",
                }}
              >
                Estimado(a){" "}
                <strong style={{ color: "#0f172a" }}>
                  {details.clientName}
                </strong>
                , por medidas de privacidad y seguridad, este enlace ha
                expirado. De parte de{" "}
                <strong style={{ color: "#4147eb" }}>{tenantName}</strong>, le
                agradecemos su preferencia. Para obtener un nuevo enlace
                actualizado o consultar el estado de su cuenta, comuníquese
                directamente con su asesor.
              </p>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="nc-btn-whatsapp"
              >
                <MessageCircle size={18} strokeWidth={2.3} />
                Solicitar nuevo enlace a mi asesor de {tenantName}
              </a>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* CASO 3: PRÉSTAMO ACTIVO Y ENLACE VIGENTE (VISTA COMPLETA)    */
          /* ============================================================ */
          <div className="nc-card">
            {/* Ficha Resumen Gradiente */}
            <div className="nc-card-gradient">
              <div className="nc-card-gradient-inner">
                <div className="nc-card-gradient-header">
                  <div>
                    <div className="nc-client-label">Cliente</div>
                    <h3 className="nc-client-name">
                      {details.clientName.toLowerCase()}
                    </h3>
                  </div>
                  <div className="nc-date-badge">
                    {formatDateLocal(details.startDate)} al{" "}
                    {formatDateLocal(parsedDates.contractEnd)}
                  </div>
                </div>

                <div className="nc-divider" />

                <div className="nc-loan-summary-grid">
                  {/* Total */}
                  <div>
                    <div className="nc-summary-label">Monto Total</div>
                    <div className="nc-summary-value">
                      {formatMoney(details.amount + details.interest)}
                    </div>
                  </div>
                  {/* Cuota */}
                  <div>
                    <div className="nc-summary-label">Cuota Diaria</div>
                    <div className="nc-summary-value">
                      {formatMoney(details.fee)}
                    </div>
                  </div>
                  {/* Saldo Restante */}
                  <div style={{ textAlign: "right" }}>
                    <div
                      className="nc-summary-label"
                      style={{ color: "#fef08a" }}
                    >
                      Saldo Pendiente
                    </div>
                    <div className="nc-summary-value-highlight">
                      {formatMoney(remainingAmount)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Selector de Pestañas (Tabs) */}
            <div className="nc-tab-container">
              <button
                className={`nc-tab-button ${activeTab === "calendar" ? "nc-tab-button-active" : ""}`}
                onClick={() => setActiveTab("calendar")}
              >
                Calendario de Pagos
              </button>
              <button
                className={`nc-tab-button ${activeTab === "list" ? "nc-tab-button-active" : ""}`}
                onClick={() => setActiveTab("list")}
              >
                Historial de Pagos
              </button>
            </div>

            {/* Contenido de la pestaña activa */}
            <div>
              {activeTab === "calendar" ? (
                <CalendarView
                  monthLabel={monthLabel}
                  days={days}
                  getInstallmentForDay={getInstallmentForDay}
                  isLoanDate={isLoanDate}
                  isStartDate={isStartDate}
                  isContractEndDate={isContractEndDate}
                  contractEndDate={parsedDates.contractEnd}
                  performance={performance}
                  isToday={isToday}
                  fee={details.fee}
                  isStalledOverdue={parsedDates.isStalledOverdue}
                  daysOverdue={parsedDates.daysOverdue}
                  remainingAmount={remainingAmount}
                />
              ) : (
                <InstallmentsListView installments={details.installments} />
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* FOOTER: POWERED BY NEOCOBROS (CON DOS COLORES Y SUBTÍTULO)   */}
        {/* ============================================================ */}
        <PoweredByFooter />
      </div>
    </div>
  );
}

/**
 * Componente de pie de página institucional "Powered by NeoCobros"
 * con dos colores y "SAAS DE COBRANZA" en la parte inferior.
 */
function PoweredByFooter() {
  return (
    <footer
      style={{
        textAlign: "center",
        marginTop: "1.5rem",
        paddingBottom: "1.5rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.25rem",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          fontSize: "0.8125rem",
          color: "#64748b",
          fontWeight: 600,
        }}
      >
        <span>Potenciado por</span>
        <span
          style={{
            fontWeight: 800,
            color: "#0f172a",
            fontSize: "0.95rem",
            letterSpacing: "-0.02em",
          }}
        >
          Neo<span style={{ color: "#4147eb" }}>Cobros</span>
        </span>
      </div>
      <span
        style={{
          fontSize: "0.625rem",
          fontWeight: 700,
          color: "#94a3b8",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        SAAS DE COBRANZA
      </span>
      <span
        style={{
          fontSize: "0.6875rem",
          color: "#cbd5e1",
          marginTop: "0.25rem",
        }}
      >
        © {new Date().getFullYear()} Todos los derechos reservados.
      </span>
    </footer>
  );
}

/**
 * Subcomponente de Calendario de Cuotas
 */
function CalendarView({
  monthLabel,
  days,
  getInstallmentForDay,
  isLoanDate,
  isStartDate,
  isContractEndDate,
  contractEndDate,
  performance,
  isToday,
  fee,
  isStalledOverdue,
  daysOverdue,
  remainingAmount,
}: {
  monthLabel: string;
  days: Date[];
  getInstallmentForDay: (day: Date) => Installment | undefined;
  isLoanDate: (day: Date) => boolean;
  isStartDate: (day: Date) => boolean;
  isContractEndDate: (day: Date) => boolean;
  contractEndDate: Date;
  performance?: any;
  isToday: (day: Date) => boolean;
  fee: number;
  isStalledOverdue?: boolean;
  daysOverdue?: number;
  remainingAmount?: number;
}) {
  return (
    <div className="nc-calendar-container">
      <div className="nc-calendar-title-wrapper">
        <span className="nc-calendar-title">{monthLabel}</span>
      </div>
      {/* Cuadrícula Calendario */}
      <div className="nc-calendar-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "6px" }}>
        {["LU", "MA", "MI", "JU", "VI", "SÁ", "DO"].map((dayName, i) => (
          <div
            key={dayName}
            className="nc-calendar-header-day"
            style={{ color: i === 6 ? "#fb7185" : "#94a3b8" }}
          >
            {dayName}
          </div>
        ))}
        {days.map((day) => {
          const installment = getInstallmentForDay(day);
          const isRelevant = isLoanDate(day);
          const isStart = isStartDate(day);
          const isContractEnd = isContractEndDate(day);
          const isSunday = getDay(day) === 0;
          const isExtension = day > contractEndDate && !isSunday;
          const referenceDate = new Date();
          referenceDate.setHours(0, 0, 0, 0);
          const isLastPayment =
            performance?.isLiquidated &&
            performance?.lastPaymentDate &&
            isSameDay(day, performance.lastPaymentDate);

          let bgColor = "transparent";
          let textColor = "#cbd5e1";
          let borderColor = "transparent";
          let shadow = "none";
          let label = "";
          let labelColor = "#94a3b8";

          if (isSunday) {
            bgColor = "transparent";
            textColor = "#cbd5e1";
            borderColor = "transparent";
          } else if (isRelevant) {
            if (installment) {
              bgColor = "#ecfdf5";
              textColor = "#065f46";
              borderColor = "#10b981";
              label = `S/ ${installment.amount.toFixed(0)}`;
              labelColor = "#047857";
            } else if (day < referenceDate) {
              bgColor = "#fef2f2";
              textColor = "#e11d48";
              borderColor = "#fecaca";
              label = `S/ ${fee.toFixed(0)}`;
              labelColor = "#f43f5e";
            } else {
              bgColor = "#f8fafc";
              textColor = "#334155";
              borderColor = "#e2e8f0";
              label = `S/ ${fee.toFixed(0)}`;
              labelColor = "#64748b";
            }

            if (isStart) {
              borderColor = "#4f46e5";
              shadow = "0 0 0 2px #4f46e5, 0 0 0 3px white";
            } else if (isContractEnd) {
              borderColor = "#6366f1";
              shadow = "0 0 0 2px #6366f1, 0 0 0 3px white";
            }
          } else if (isExtension) {
            if (installment) {
              bgColor = "#fefce8";
              textColor = "#854d0e";
              borderColor = "#ca8a04";
              shadow = "none";
              label = `S/ ${installment.amount.toFixed(0)}`;
              labelColor = "#a16207";
            } else {
              bgColor = "transparent";
              textColor = "#cbd5e1";
              borderColor = "transparent";
            }
          }

          return (
            <div
              key={day.toISOString()}
              style={{
                aspectRatio: "1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: bgColor,
                color: textColor,
                border: `1px solid ${borderColor}`,
                boxShadow: shadow,
                borderRadius: "0.5rem",
                fontWeight: (installment || isStart || isContractEnd || (isRelevant && day < referenceDate)) ? 800 : 500,
                opacity: isSunday ? 0.4 : 1,
                overflow: "hidden",
                padding: "2px",
              }}
            >
              <span className="nc-day-number" style={{ fontSize: "0.85rem", lineHeight: 1.1 }}>
                {format(day, "d")}
              </span>
              {label ? (
                <span
                  style={{
                    fontSize: "8.5px",
                    fontWeight: 800,
                    color: labelColor,
                    marginTop: "2px",
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
      {isStalledOverdue && (
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
                Deuda pendiente: S/ {(remainingAmount ?? 0).toFixed(2)}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#e11d48", fontWeight: 500 }}>
                {(daysOverdue ?? 0) > 0
                  ? `${daysOverdue} días fuera del plazo contractual`
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

      {/* Leyenda del Calendario */}
      <div className="nc-legend" style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", fontSize: "11px", fontWeight: 500, color: "#475569" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#4f46e5" }} />
          <span>Inicio / Fin Pactado</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#10b981" }} />
          <span>Cobrado</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#ca8a04" }} />
          <span>Prórroga</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#fef2f2", border: "1px solid #fecaca" }} />
          <span>Mora</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "transparent", border: "1px solid #cbd5e1" }} />
          <span>Inactivo</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Subcomponente de Historial de Pagos
 */
function InstallmentsListView({
  installments,
}: {
  installments?: Installment[];
}) {
  if (!installments || installments.length === 0) {
    return (
      <div className="nc-payment-empty">
        No se han registrado abonos en este préstamo todavía.
      </div>
    );
  }

  const sorted = [...installments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <div className="nc-payment-list">
      {sorted.map((inst, idx) => (
        <div key={inst.id} className="nc-payment-card">
          <div className="nc-payment-left">
            <span className="nc-payment-index">{sorted.length - idx}</span>
            <div className="nc-payment-info">
              <span className="nc-payment-date">
                {formatDateLocal(inst.date)}
              </span>
              <span className="nc-payment-time">
                {format(parseISO(inst.date), "hh:mm a")}
              </span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="nc-payment-amount">
              {formatMoney(inst.amount)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
