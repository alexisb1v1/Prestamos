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
} from "date-fns";
import { es } from "date-fns/locale";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { logger } from "@/lib/logging-service";
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

  const parsedDates = useMemo(() => {
    if (!startDateStr || !endDateStr) {
      return { start: new Date(), contractEnd: new Date(), calendarEnd: new Date() };
    }

    const start = parseDateSafe(startDateStr);
    let contractEnd = parseDateSafe(endDateStr);

    // Si la fecha fin pactada en la BD cae domingo, normalizar al sábado anterior
    if (contractEnd.getDay() === 0) {
      contractEnd.setDate(contractEnd.getDate() - 1);
    }

    let calendarEnd = new Date(contractEnd);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isLiquidated =
      details?.isLiquidated ||
      details?.status === "Liquidado" ||
      details?.remainingAmount === 0;

    if (!isLiquidated && today > calendarEnd) {
      calendarEnd = today;
    }

    if (details?.installments && details.installments.length > 0) {
      details.installments.forEach((inst) => {
        const instDate = parseDateSafe(inst.date);
        if (instDate > calendarEnd) calendarEnd = instDate;
      });
    }

    return { start, contractEnd, calendarEnd };
  }, [
    startDateStr,
    endDateStr,
    parseDateSafe,
    details?.status,
    details?.isLiquidated,
    details?.remainingAmount,
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
      remainingAmount: details.remainingAmount,
      days: details.days,
      completedOnTime: details.completedOnTime,
      earlyLiquidationDays: details.earlyLiquidationDays,
      extensionDays: details.extensionDays,
      delayDays: details.delayDays,
      creditRating: details.creditRating,
    } as any;
    return calculateLoanPerformance(tempLoan, details.installments || []);
  }, [details]);

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
        end: parsedDates.calendarEnd,
      });
      const isSunday = getDay(day) === 0;
      return withinInterval && !isSunday;
    },
    [parsedDates.start, parsedDates.calendarEnd],
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
      remainingAmount: details.remainingAmount,
    } as any;
    return getLoanStatus(tempLoan, new Date());
  }, [details]);

  const isLiquidated = useMemo(() => {
    if (!details) return false;
    return (
      details.isLiquidated ||
      details.status === "Liquidado" ||
      details.remainingAmount <= 0
    );
  }, [details]);

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
        `Hola, tengo una consulta sobre mi préstamo.\nCliente: ${details.clientName}\nEmpresa: ${tenantName}\nSaldo Pendiente: ${formatMoney(details.remainingAmount)}`,
      );
    }
    return `https://wa.me/${phone}?text=${text}`;
  }, [details, isLiquidated, isExpired, tenantName]);

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
                      {formatMoney(details.remainingAmount)}
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
}) {
  return (
    <div className="nc-calendar-container">
      <div className="nc-calendar-title-wrapper">
        <span className="nc-calendar-title">{monthLabel}</span>
      </div>
      {/* Cuadrícula Calendario */}
      <div className="nc-calendar-grid">
        {["LU", "MA", "MI", "JU", "VI", "SÁ", "DO"].map((dayName) => (
          <div key={dayName} className="nc-calendar-header-day">
            {dayName}
          </div>
        ))}
        {days.map((day) => {
          const installment = getInstallmentForDay(day);
          const isRelevant = isLoanDate(day);
          const isStart = isStartDate(day);
          const isContractEnd = isContractEndDate(day);
          const isExtension = day > contractEndDate && getDay(day) !== 0;
          const isTodayDate = isToday(day);
          const referenceDate = new Date();
          referenceDate.setHours(0, 0, 0, 0);
          const isOverdueUnpaid =
            isRelevant && day < referenceDate && !installment;
          const isLastPayment =
            performance?.isLiquidated &&
            performance?.lastPaymentDate &&
            isSameDay(day, performance.lastPaymentDate);

          let statusClass = "";
          let customLabel = "";

          if (isContractEnd) {
            statusClass = installment ? "nc-day-paid" : "nc-day-end";
            customLabel = "Pactado";
          } else if (isExtension && installment) {
            statusClass = isLastPayment ? "nc-day-liquidated-ext" : "nc-day-extension";
            customLabel = isLastPayment ? "Liquidado" : "Prórroga";
          } else if (installment) {
            statusClass = "nc-day-paid";
          } else if (isOverdueUnpaid) {
            statusClass = "nc-day-overdue";
          } else if (isRelevant) {
            statusClass = "nc-day-pending";
          }

          if (isStart) {
            statusClass = "nc-day-start";
            customLabel = "Inicio";
          }

          return (
            <div
              key={day.toISOString()}
              className={`nc-calendar-day ${statusClass} ${isTodayDate ? "nc-calendar-day-today" : ""}`}
              style={{
                opacity: isRelevant || installment ? 1 : 0.35,
                border: isContractEnd ? "2px solid #6366f1" : undefined,
              }}
            >
              <span className="nc-day-number">{format(day, "d")}</span>
              {installment ? (
                <span className="nc-day-fee" style={{ fontWeight: 800 }}>
                  {installment.amount.toFixed(0)}
                </span>
              ) : isRelevant && !isStart && !isContractEnd ? (
                <span className="nc-day-fee">{fee.toFixed(0)}</span>
              ) : null}
              {customLabel && (
                <span
                  className="nc-day-label"
                  style={{
                    fontSize: "8px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: isContractEnd && installment ? "#4f46e5" : undefined,
                  }}
                >
                  {customLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Leyenda del Calendario */}
      <div className="nc-legend">
        <div className="nc-legend-item">
          <div
            className="nc-legend-color nc-day-paid"
            style={{ border: "1px solid #15803d" }}
          />
          <span className="nc-legend-label">Pagado</span>
        </div>
        <div className="nc-legend-item">
          <div
            className="nc-legend-color"
            style={{ backgroundColor: "#ecfdf5", border: "2px solid #6366f1" }}
          />
          <span className="nc-legend-label">Fin Pactado</span>
        </div>
        <div className="nc-legend-item">
          <div
            className="nc-legend-color nc-day-extension"
          />
          <span className="nc-legend-label">Prórroga</span>
        </div>
        <div className="nc-legend-item">
          <div
            className="nc-legend-color nc-day-overdue"
            style={{ border: "1px solid #b91c1c" }}
          />
          <span className="nc-legend-label">Atrasado</span>
        </div>
        <div className="nc-legend-item">
          <div
            className="nc-legend-color nc-day-pending"
            style={{ border: "1px solid #0369a1" }}
          />
          <span className="nc-legend-label">Pendiente</span>
        </div>
        <div className="nc-legend-item">
          <div className="nc-legend-color nc-day-start" />
          <span className="nc-legend-label">Inicio</span>
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
