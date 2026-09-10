"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { formatMoney, getLoanStatus, formatDateUTC } from "@/lib/loanUtils";
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

interface Installment {
  id: string;
  date: string;
  amount: number;
  status: string;
}

interface PublicLoanDetails {
  clientName: string;
  amount: number;
  interest: number;
  fee: number;
  days: number;
  remainingAmount: number;
  startDate: string;
  endDate: string;
  status: string;
  installments: Installment[];
}

export default function PublicSharePage() {
  const params = useParams();
  const token = params?.token as string;

  const [details, setDetails] = useState<PublicLoanDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"calendar" | "list">("calendar");

  const fetchLoanDetails = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const data = await apiRequest<PublicLoanDetails>(`/loan/public-share/${token}`);
      setDetails(data);
    } catch (err: any) {
      logger.error("Error al cargar detalles públicos del préstamo:", err);
      setError(
        err.message || "El enlace de préstamo no es válido, ha expirado o ha sido modificado."
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
      date.getUTCDate()
    );
  }, []);

  const startDateStr = details?.startDate || "";
  const endDateStr = details?.endDate || "";

  const parsedDates = useMemo(() => {
    if (!startDateStr || !endDateStr) {
      return { start: new Date(), end: new Date() };
    }

    const start = parseDateSafe(startDateStr);
    let end = parseDateSafe(endDateStr);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isLiquidated = details?.status === "Liquidado" || details?.remainingAmount === 0;

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
  }, [startDateStr, endDateStr, parseDateSafe, details?.status, details?.remainingAmount, details?.installments]);

  const days = useMemo(() => {
    if (!parsedDates.start || !parsedDates.end) return [];
    return eachDayOfInterval({
      start: startOfWeek(parsedDates.start, { weekStartsOn: 1 }),
      end: endOfWeek(parsedDates.end, { weekStartsOn: 1 }),
    });
  }, [parsedDates.start, parsedDates.end]);

  const monthLabel = useMemo(() => {
    if (!details) return "";
    if (
      format(parsedDates.start, "MMM yyyy") ===
      format(parsedDates.end, "MMM yyyy")
    ) {
      return format(parsedDates.start, "MMMM yyyy", { locale: es });
    }
    return `${format(parsedDates.start, "MMMM", { locale: es })} - ${format(
      parsedDates.end,
      "MMMM yyyy",
      { locale: es }
    )}`;
  }, [parsedDates.start, parsedDates.end, details]);

  const getInstallmentForDay = useCallback(
    (day: Date) => {
      const normalizedDay = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate()
      ).getTime();
      return details?.installments?.find((inst) => {
        const instDate = new Date(inst.date);
        const instDay = new Date(
          instDate.getFullYear(),
          instDate.getMonth(),
          instDate.getDate()
        ).getTime();
        return instDay === normalizedDay;
      });
    },
    [details?.installments]
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
    [parsedDates.start, parsedDates.end]
  );

  const isStartDate = useCallback(
    (day: Date) => isSameDay(parsedDates.start, day),
    [parsedDates.start]
  );
  const isEndDate = useCallback(
    (day: Date) => isSameDay(parsedDates.end, day),
    [parsedDates.end]
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

  const whatsappUrl = useMemo(() => {
    if (!details) return "";
    const phone = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "51999999999";
    const text = encodeURIComponent(
      `Hola, tengo una consulta sobre mi préstamo.\nCliente: ${details.clientName}\nSaldo Pendiente: ${formatMoney(details.remainingAmount)}`
    );
    return `https://wa.me/${phone}?text=${text}`;
  }, [details]);

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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2 className="nc-error-title">Enlace No Disponible</h2>
          <p className="nc-error-message">
            {error || "El token es inválido o no pudimos recuperar la información del préstamo."}
          </p>
          <div className="nc-error-divider" />
          <p className="nc-error-help">
            Si crees que esto es un error, por favor contacta a tu asesor de NeoCobros para que te comparta un nuevo enlace.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="nc-page-layout">
      <div className="nc-container">
        {/* Header NeoCobros */}
        <div className="nc-header">
          <div className="nc-brand">
            <div className="nc-brand-logo">N</div>
            <span className="nc-brand-text">NeoCobros</span>
          </div>
          {loanStatus && (
            <div className="nc-badge" style={{ color: loanStatus.color }}>
              <span>{loanStatus.icon}</span>
              <span>{loanStatus.label}</span>
            </div>
          )}
        </div>

        {/* Card Principal */}
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
                  {formatDateUTC(details.startDate)} al {formatDateUTC(details.endDate)}
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
                  <div className="nc-summary-label" style={{ color: "#fef08a" }}>
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

          {/* Contenido de la pestaña */}
          <div>
            {activeTab === "calendar" ? (
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
                    const isEnd = isEndDate(day);
                    const isTodayDate = isToday(day);
                    const referenceDate = new Date();
                    referenceDate.setHours(0, 0, 0, 0);
                    const isOverdueUnpaid =
                      isRelevant && day < referenceDate && !installment;

                    let statusClass = "";

                    if (installment) {
                      statusClass = "nc-day-paid";
                    } else if (isOverdueUnpaid) {
                      statusClass = "nc-day-overdue";
                    } else if (isRelevant) {
                      statusClass = "nc-day-pending";
                    }

                    if (isStart) {
                      statusClass = "nc-day-start";
                    } else if (isEnd) {
                      statusClass = "nc-day-end";
                    }

                    return (
                      <div
                        key={day.toISOString()}
                        className={`nc-calendar-day ${statusClass} ${isTodayDate ? "nc-calendar-day-today" : ""}`}
                        style={{
                          opacity: isRelevant || installment ? 1 : 0.35,
                        }}
                      >
                        <span className="nc-day-number">{format(day, "d")}</span>
                        {isRelevant && !isStart && !isEnd && (
                          <span className="nc-day-fee">
                            {details.fee.toFixed(0)}
                          </span>
                        )}
                        {(isStart || isEnd) && (
                          <span className="nc-day-label">
                            {isStart ? "Inicio" : "Fin"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Leyenda del Calendario */}
                <div className="nc-legend">
                  <div className="nc-legend-item">
                    <div className="nc-legend-color nc-day-paid" style={{ border: "1px solid #15803d" }} />
                    <span className="nc-legend-label">Pagado</span>
                  </div>
                  <div className="nc-legend-item">
                    <div className="nc-legend-color nc-day-overdue" style={{ border: "1px solid #b91c1c" }} />
                    <span className="nc-legend-label">Atrasado</span>
                  </div>
                  <div className="nc-legend-item">
                    <div className="nc-legend-color nc-day-pending" style={{ border: "1px solid #0369a1" }} />
                    <span className="nc-legend-label">Pendiente</span>
                  </div>
                  <div className="nc-legend-item">
                    <div className="nc-legend-color nc-day-start" />
                    <span className="nc-legend-label">Inicio</span>
                  </div>
                  <div className="nc-legend-item">
                    <div className="nc-legend-color nc-day-end" />
                    <span className="nc-legend-label">Fin</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Historial de Pagos */
              <div>
                {!details.installments || details.installments.length === 0 ? (
                  <div className="nc-payment-empty">
                    No se han registrado abonos en este préstamo todavía.
                  </div>
                ) : (
                  (() => {
                    const sorted = [...details.installments].sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    );
                    return (
                      <div className="nc-payment-list">
                        {sorted.map((inst, idx) => (
                          <div key={inst.id} className="nc-payment-card">
                            <div className="nc-payment-left">
                              <span className="nc-payment-index">
                                {sorted.length - idx}
                              </span>
                              <div className="nc-payment-info">
                                <span className="nc-payment-date">
                                  {format(parseISO(inst.date), "dd/MM/yyyy")}
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
                  })()
                )}
              </div>
            )}
          </div>
        </div>

        {/* Botón WhatsApp & Soporte */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="nc-btn-whatsapp"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.458L0 24zm6.09-3.238c1.65.98 3.268 1.498 4.961 1.499 5.585.003 10.129-4.54 10.132-10.129.002-2.709-1.051-5.253-2.961-7.164C16.398 3.058 13.856 2.005 11.15 2.005 5.565 2.005 1.022 6.548 1.018 12.137c-.001 1.77.476 3.5 1.383 5.02L1.4 21.68l4.747-1.246-.001.002zM17.18 14.86c-.279-.14-1.653-.815-1.908-.908-.255-.093-.441-.14-.627.14-.186.281-.722.908-.885 1.093-.163.186-.326.21-.605.07-.279-.14-1.18-.435-2.247-1.387-.83-.74-1.39-1.653-1.553-1.933-.163-.28-.018-.431.122-.571.125-.125.279-.326.419-.489.14-.163.186-.28.279-.465.093-.186.046-.35-.023-.49-.07-.14-.627-1.512-.86-2.07-.227-.546-.458-.472-.627-.48-.163-.008-.35-.01-.536-.01-.186 0-.488.07-.744.35-.255.281-.976.953-.976 2.325 0 1.372 1 2.7 1.14 2.884.14.186 1.967 3.005 4.766 4.21.667.287 1.186.459 1.593.589.67.213 1.28.183 1.763.11.539-.08 1.653-.675 1.884-1.326.23-.65.23-1.21.163-1.326-.07-.11-.255-.21-.536-.35z" />
          </svg>
          ¿Tienes dudas con tu cuenta? Contáctanos
        </a>

        {/* Footer */}
        <div className="nc-footer">
          <span className="nc-footer-text">
            © {new Date().getFullYear()} NeoCobros. Todos los derechos reservados.
          </span>
        </div>
      </div>
    </div>
  );
}
