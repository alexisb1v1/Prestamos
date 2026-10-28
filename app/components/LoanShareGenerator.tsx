"use client";

import { useState, useImperativeHandle, forwardRef, useEffect } from "react";
import { getLoanDetailsUseCase } from "@/app/features/loans";
import { getLoanStatus, calculateLoanPerformance, formatDateLocal } from "@/lib/loanUtils";
import { Loan, LoanDetails } from "@/lib/types";
import {
  format,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  subMonths,
  addMonths,
  isSameDay,
  parseISO,
  isWithinInterval,
  getDay,
  differenceInCalendarDays,
} from "date-fns";
import { es } from "date-fns/locale";
import html2canvas from "html2canvas";
import { logger } from "@/lib/logging-service";

// Helper to manage date caching (simplified from Modal)
let cachedDays: Date[] | null = null;
function getCachedDays(start: Date, end: Date) {
  if (!cachedDays) {
    const now = new Date();
    cachedDays = eachDayOfInterval({
      start: startOfWeek(subMonths(now, 6), { weekStartsOn: 1 }),
      end: endOfWeek(addMonths(now, 6), { weekStartsOn: 1 }),
    });
  }
  return cachedDays.filter((day) => day >= start && day <= end);
}

// Helper para parsear fechas ISO como UTC sin conversión de zona horaria
function parseISOasUTC(dateString: string): Date {
  const date = new Date(dateString);
  // Crear una fecha local usando los valores UTC para evitar desfase de zona horaria
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

async function resolveCompanyName(loan?: any): Promise<string> {
  if (loan && loan.companyName) return loan.companyName;
  if (typeof window === "undefined") return "Empresa de Cobranza";
  
  try {
    const user = JSON.parse(localStorage.getItem("auth_user") || "{}");
    if (user && user.companyName) return user.companyName;
  } catch (e) {}

  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  const isLocalWithSub = hostname.endsWith(".localhost") && parts.length >= 2;
  
  let tenant = "";
  if (hostname === "localhost" || parts[0] === "central" || (!isLocalWithSub && parts.length < 3)) {
    const devTenant = process.env.NEXT_PUBLIC_DEV_TENANT;
    if (hostname === "localhost" && devTenant && devTenant !== "central") {
      tenant = devTenant;
    }
  } else {
    tenant = parts[0];
  }
  
  if (tenant) {
    const cacheKey = `tenant_name_${tenant}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      try {
        const { name, timestamp } = JSON.parse(cachedData);
        const now = new Date().getTime();
        const oneDay = 24 * 60 * 60 * 1000;
        if (now - timestamp < oneDay) {
          return name;
        }
      } catch (e) {}
    }
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
      const response = await fetch(`${apiUrl}/company/public-info/${tenant}`);
      if (response.ok) {
        const data = await response.json();
        const companyName = data.companyName;
        localStorage.setItem(cacheKey, JSON.stringify({ name: companyName, timestamp: new Date().getTime() }));
        return companyName;
      }
    } catch (error) {}

    return tenant.charAt(0).toUpperCase() + tenant.slice(1);
  }
  
  return "Empresa de Cobranza";
}

export interface LoanShareGeneratorRef {
  shareLoan: (loan: Loan, mode?: "calendar" | "list") => Promise<void>;
}

const LoanShareGenerator = forwardRef<LoanShareGeneratorRef, object>(
  (_, ref) => {
    const [auditData, setAuditData] = useState<{
      loan: Loan;
      details: LoanDetails;
      companyName: string;
    } | null>(null);
    const [generating, setGenerating] = useState(false);
    const [readyToCapture, setReadyToCapture] = useState(false);
    const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

    useImperativeHandle(ref, () => ({
      shareLoan: async (loan: Loan, mode: "calendar" | "list" = "calendar") => {
        if (generating) return;

        try {
          setGenerating(true);
          setViewMode(mode);
          
          const resolvedCompanyName = await resolveCompanyName(loan);

          // 1. Fetch Details
          const result = await getLoanDetailsUseCase.execute(
            loan.id.toString(),
          );

          result.match(
            (details) => {
              setAuditData({ loan, details, companyName: resolvedCompanyName });
              setReadyToCapture(true); // Signal that data is ready for render & capture
            },
            (err) => {
              logger.error("Error fetching details for share", err);
              setGenerating(false);
              setAuditData(null);
            },
          );
        } catch (err) {
          logger.error("Unexpected error fetching details", err);
          setGenerating(false);
          setAuditData(null);
        }
      },
    }));
    useEffect(() => {
      if (!readyToCapture || !auditData) return;

      const captureImage = async () => {
        // Wait a tick for the DOM to update with new data
        await new Promise((resolve) => setTimeout(resolve, 100));

        const container = document.getElementById("loan-share-container");
        const element = document.getElementById("global-loan-share-card");

        if (container && element) {
          try {
            // Save original styles
            const originalContainerStyle =
              container.getAttribute("style") || "";

            // Make container visible but keep it behind the page (invisible to user, fully measurable by html2canvas)
            container.style.position = "fixed";
            container.style.top = "0px";
            container.style.left = "0px";
            container.style.zIndex = "-9999";
            container.style.opacity = "1";
            container.style.visibility = "visible";
            container.style.pointerEvents = "none";
            container.style.transform = "none";

            // Wait for rendering visibility
            await new Promise((resolve) => setTimeout(resolve, 250));

            const canvas = await html2canvas(element, {
              scale: 2,
              backgroundColor: "#ffffff",
              logging: false,
              useCORS: true,
              allowTaint: true,
              scrollX: 0,
              scrollY: 0,
              windowWidth: element.scrollWidth || 450,
              windowHeight: element.scrollHeight,
            } as any);

            // Restore original styles
            container.setAttribute("style", originalContainerStyle);

            const blob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob(resolve, "image/png")
            );

            if (!blob) {
              logger.error("Failed to create blob");
              return;
            }

            const { loan } = auditData;
            const fileName = `Ficha_${loan.clientName.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.png`;
            const file = new File([blob], fileName, { type: "image/png" });

            let sharedSuccessfully = false;

            if (
              typeof navigator !== "undefined" &&
              navigator.share &&
              navigator.canShare &&
              navigator.canShare({ files: [file] })
            ) {
              try {
                await navigator.share({
                  files: [file],
                  title: "Ficha de Préstamo",
                  text: `Detalles del préstamo de ${loan.clientName}`,
                });
                sharedSuccessfully = true;
              } catch (shareErr) {
                logger.warn(
                  "navigator.share failed or was cancelled, falling back to download",
                  shareErr,
                );
              }
            }

            if (!sharedSuccessfully) {
              const link = document.createElement("a");
              link.href = canvas.toDataURL("image/png");
              link.download = fileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }

            // Cleanup
            const tempCanvases = document.querySelectorAll(
              'canvas[style*="position"][style*="absolute"]',
            );
            tempCanvases.forEach((c) => c.remove());

            // Reset
            setReadyToCapture(false);
            setGenerating(false);
            setAuditData(null);
          } catch (e) {
            logger.error("Error capturing:", e);
            setReadyToCapture(false);
            setGenerating(false);
            setAuditData(null);
          }
        } else {
          logger.error("Elements not found for capture");
          setReadyToCapture(false);
          setGenerating(false);
          setAuditData(null);
        }
      };

      captureImage();
    }, [readyToCapture, auditData]);

    if (!auditData) return null;

    const { loan, details } = auditData;

    // --- Render Logic (Copied/Adapted from Modal) ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseStartDate = parseISOasUTC(details.startDate || loan.startDate);
    let contractEndDate = parseISOasUTC(details.endDate || loan.endDate);
    if (contractEndDate.getDay() === 0) {
      contractEndDate.setDate(contractEndDate.getDate() - 1);
    }

    // Obtener estado detallado y desempeño usando la utilidad del sistema
    const statusInfo = getLoanStatus(loan, today);
    const isLiquidated =
      statusInfo.value === "blue" ||
      loan.status === "Liquidado" ||
      (loan as { remainingAmount?: number }).remainingAmount === 0;

    const performance = calculateLoanPerformance(
      loan,
      details.installments || [],
    );

    // Buscar fecha del último abono registrado
    let lastPaymentDate: Date | null = null;
    if (details.installments && details.installments.length > 0) {
      for (const inst of details.installments) {
        const instDate = parseISOasUTC(inst.date);
        if (!lastPaymentDate || instDate.getTime() > lastPaymentDate.getTime()) {
          lastPaymentDate = instDate;
        }
      }
    }

    // Límite del calendario (calendarEnd):
    // 1. Por defecto, cubre hasta la fecha fin del contrato pactado
    let calendarEnd = new Date(contractEndDate);

    // 2. Si hubo abonos en prórroga (posteriores a contractEndDate), extendemos hasta el último abono
    const hasLatePayments = lastPaymentDate ? lastPaymentDate.getTime() > contractEndDate.getTime() : false;
    if (lastPaymentDate && hasLatePayments) {
      calendarEnd = new Date(lastPaymentDate);
    }

    // 3. Evaluar clientes que ya no pagan (morosos con > 7 días sin amortizar tras el plazo)
    let isStalledOverdue = false;
    let daysOverdue = 0;

    if (!isLiquidated && today.getTime() > contractEndDate.getTime()) {
      daysOverdue = differenceInCalendarDays(today, contractEndDate);
      const referenceDate = (lastPaymentDate && hasLatePayments) ? lastPaymentDate : contractEndDate;
      const daysSinceLastActivity = differenceInCalendarDays(today, referenceDate);

      if (daysSinceLastActivity > 7) {
        // Moroso prolongado: NO extender el calendario indefinidamente (se acota al fin contractual o último abono)
        isStalledOverdue = true;
      } else {
        // Sigue pagando o vencimiento muy reciente (<= 7 días): extender hasta hoy
        calendarEnd = new Date(today);
      }
    }

    const calendarStart = startOfWeek(baseStartDate, { weekStartsOn: 1 });
    const calendarEndFormatted = endOfWeek(calendarEnd, { weekStartsOn: 1 });
    const days = getCachedDays(calendarStart, calendarEndFormatted);

    // Cálculos dinámicos de progreso
    const remainingAmount =
      (loan as { remainingAmount?: number }).remainingAmount || 0;
    const totalAmount = loan.amount + loan.interest;
    const paidAmount = totalAmount - remainingAmount;
    const totalCuotas = loan.days;
    const paidCuotas = Math.max(
      0,
      Math.min(totalCuotas, paidAmount / loan.fee),
    );
    const progress = (paidAmount / totalAmount) * 100;

    return (
      <div
        id="loan-share-container"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: -9999,
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        <div
          id="global-loan-share-card"
          style={{
            width: "450px",
            backgroundColor: "#ffffff",
            padding: "24px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "#1e293b",
            pointerEvents: "none",
            borderRadius: "0px",
          }}
        >
          {/* Header Compacto */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "0.75rem",
              borderBottom: "2px solid #f1f5f9",
              paddingBottom: "0.75rem",
            }}
          >
            <h1
              style={{
                fontSize: "1rem",
                fontWeight: 800,
                margin: 0,
                color: "#1e293b",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Ficha de Préstamo
            </h1>
            <h2
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "#475569",
                margin: "0.25rem 0 0 0",
              }}
            >
              {auditData.companyName}
            </h2>
            <p
              style={{
                margin: "0.2rem 0 0 0",
                color: "#94a3b8",
                fontSize: "0.7rem",
              }}
            >
              Generado el {format(new Date(), "dd/MM/yyyy hh:mm a")}
            </p>
          </div>

          {/* Datos del Cliente y Vigencia */}
          <div
            style={{
              marginBottom: "0.75rem",
              backgroundColor: "#f8fafc",
              padding: "0.85rem",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: 800,
                    color: "#6366f1",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "0.25rem",
                  }}
                >
                  Información del Cliente
                </div>
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 800,
                    color: "#1e293b",
                    textTransform: "capitalize",
                  }}
                >
                  {loan.clientName?.toLowerCase()}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    color: "#64748b",
                    fontSize: "0.75rem",
                    marginTop: "0.15rem",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  {loan.address}
                </div>
              </div>
              <div
                style={{
                  textAlign: "right",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: "0.25rem",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 800,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Vigencia
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#1e293b",
                    }}
                  >
                    {format(baseStartDate, "dd/MM/yy")} -{" "}
                    {format(contractEndDate, "dd/MM/yy")}
                  </div>
                </div>

                {/* Badge de Estado Reubicado */}
                <div
                  style={{
                    backgroundColor: statusInfo.color.startsWith("var")
                      ? statusInfo.value === "red"
                        ? "#fee2e2"
                        : statusInfo.value === "blue"
                          ? "#e0e7ff"
                          : "#fef3c7"
                      : statusInfo.color + "22",
                    color: statusInfo.color.startsWith("var")
                      ? statusInfo.value === "red"
                        ? "#b91c1c"
                        : statusInfo.value === "blue"
                          ? "#4338ca"
                          : "#92400e"
                      : statusInfo.color,
                    padding: "2px 8px",
                    borderRadius: "6px",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    border: `1px solid ${statusInfo.color.startsWith("var") ? "transparent" : statusInfo.color + "44"}`,
                    width: "fit-content",
                  }}
                >
                  {statusInfo.label.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Progreso Visual */}
          <div style={{ marginBottom: "1rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.4rem",
                alignItems: "flex-end",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: 800,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Progreso de Pago
                </span>
                <div
                  style={{
                    fontSize: "1rem",
                    fontWeight: 900,
                    color: "#1e293b",
                  }}
                >
                  {progress.toFixed(1)}%
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 900,
                    color: "#6366f1",
                    textTransform: "uppercase",
                    backgroundColor: "rgba(99, 102, 241, 0.1)",
                    padding: "2px 8px",
                    borderRadius: "10px",
                  }}
                >
                  {paidCuotas.toLocaleString("es-PE", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 1,
                  })}
                  /{totalCuotas} cuotas
                </span>
              </div>
            </div>
            <div
              style={{
                width: "100%",
                height: "8px",
                backgroundColor: "#f1f5f9",
                borderRadius: "10px",
                overflow: "hidden",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  backgroundColor: "#4f46e5",
                  borderRadius: "10px",
                }}
              ></div>
            </div>

            {/* Indicadores de Desempeño y Cumplimiento de Plazo */}
            {performance && (
              <div
                style={{
                  marginTop: "0.5rem",
                  display: "flex",
                  gap: "0.4rem",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "2px 7px",
                    borderRadius: "6px",
                    backgroundColor: performance.completionBadge.bgColor,
                    border: `1px solid ${performance.completionBadge.borderColor}`,
                    color: performance.completionBadge.color,
                    fontSize: "0.62rem",
                    fontWeight: 800,
                  }}
                >
                  <span>{performance.completionBadge.icon}</span>
                  <span>{performance.completionBadge.label}</span>
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "2px 7px",
                    borderRadius: "6px",
                    backgroundColor: performance.punctualityBadge.bgColor,
                    border: `1px solid ${performance.punctualityBadge.borderColor}`,
                    color: performance.punctualityBadge.color,
                    fontSize: "0.62rem",
                    fontWeight: 800,
                  }}
                >
                  <span>{performance.punctualityBadge.icon}</span>
                  <span>{performance.punctualityBadge.label}</span>
                </div>
              </div>
            )}
          </div>

          {/* Resumen Financiero en UNA SOLA LÍNEA */}
          <div
            style={{
              marginBottom: "1rem",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "0.4rem",
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                padding: "0.5rem",
                borderRadius: "10px",
                border: "1px solid #f1f5f9",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  color: "#94a3b8",
                  display: "block",
                  fontSize: "0.55rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  marginBottom: "0.15rem",
                }}
              >
                Prestado
              </span>
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  color: "#1e293b",
                }}
              >
                S/{Math.round(loan.amount)}
              </span>
            </div>
            <div
              style={{
                backgroundColor: "#ffffff",
                padding: "0.5rem",
                borderRadius: "10px",
                border: "1px solid #f1f5f9",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  color: "#94a3b8",
                  display: "block",
                  fontSize: "0.55rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  marginBottom: "0.15rem",
                }}
              >
                A Pagar
              </span>
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  color: "#1e293b",
                }}
              >
                S/{Math.round(totalAmount)}
              </span>
            </div>
            <div
              style={{
                backgroundColor: "#f0fdf4",
                padding: "0.5rem",
                borderRadius: "10px",
                border: "1px solid #dcfce7",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  color: "#15803d",
                  display: "block",
                  fontSize: "0.55rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  marginBottom: "0.15rem",
                }}
              >
                Pagado
              </span>
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  color: "#15803d",
                }}
              >
                S/{Math.round(paidAmount)}
              </span>
            </div>
            <div
              style={{
                backgroundColor: "#fef2f2",
                padding: "0.5rem",
                borderRadius: "10px",
                border: "1px solid #fee2e2",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  color: "#b91c1c",
                  display: "block",
                  fontSize: "0.55rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  marginBottom: "0.15rem",
                }}
              >
                Saldo
              </span>
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  color: "#b91c1c",
                }}
              >
                S/{Math.round(remainingAmount)}
              </span>
            </div>
          </div>

          {/* Contenido Dinámico: Calendario o Listado */}
          {viewMode === "calendar" ? (
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
                <div
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: 800,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Calendario de Pagos
                </div>
                <div
                  style={{
                    fontWeight: 800,
                    textTransform: "capitalize",
                    fontSize: "0.9rem",
                    color: "#1e293b",
                  }}
                >
                  {format(baseStartDate, "MMMM yyyy", { locale: es })}
                  {format(baseStartDate, "MMMM yyyy") !==
                    format(calendarEnd, "MMMM yyyy") && (
                    <span style={{ color: "#94a3b8" }}>
                      {" "}
                      - {format(calendarEnd, "MMMM yyyy", { locale: es })}
                    </span>
                  )}
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                  gap: "4px",
                  padding: "6px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                }}
              >
                {["LU", "MA", "MI", "JU", "VI", "SÁ", "DO"].map((d, i) => (
                  <div
                    key={i + d}
                    style={{
                      textAlign: "center",
                      fontSize: "0.55rem",
                      fontWeight: 800,
                      color: i === 6 ? "#fb7185" : "#94a3b8",
                    }}
                  >
                    {d}
                  </div>
                ))}
                {days.map((day) => {
                  const dateStr = day.toISOString();
                  const dayInstallments = details.installments.filter((i) =>
                    isSameDay(parseISO(i.date), day),
                  );
                  let installment =
                    dayInstallments.length > 0
                      ? {
                          ...dayInstallments[0],
                          amount: dayInstallments.reduce(
                            (sum, inst) => sum + (inst.amount || 0),
                            0,
                          ),
                        }
                      : undefined;

                  const isSunday = getDay(day) === 0;
                  const isRelevant =
                    isWithinInterval(day, {
                      start: baseStartDate,
                      end: contractEndDate,
                    }) && !isSunday;

                  const isStart = isSameDay(baseStartDate, day);
                  const isContractEnd = isSameDay(contractEndDate, day);
                  const isExtension = day > contractEndDate && !isSunday;
                  const isLastPayment =
                    performance?.isLiquidated &&
                    performance?.lastPaymentDate &&
                    isSameDay(day, performance.lastPaymentDate);

                  let bg = "transparent";
                  let textColor = "#cbd5e1";
                  let border = "1px solid transparent";
                  let shadow = "none";
                  let label = "";
                  let labelColor = "#94a3b8";

                  if (isSunday) {
                    bg = "transparent";
                    textColor = "#cbd5e1";
                    border = "1px solid transparent";
                  } else if (isRelevant) {
                    if (installment) {
                      bg = "#ecfdf5";
                      textColor = "#065f46";
                      border = "1px solid #10b981";
                      label = `S/ ${installment.amount.toFixed(0)}`;
                      labelColor = "#047857";
                    } else if (day < today) {
                      bg = "#fef2f2";
                      textColor = "#e11d48";
                      border = "1px solid #fecaca";
                      label = `S/ ${loan.fee.toFixed(0)}`;
                      labelColor = "#f43f5e";
                    } else {
                      bg = "#ffffff";
                      textColor = "#334155";
                      border = "1px solid #e2e8f0";
                      label = `S/ ${loan.fee.toFixed(0)}`;
                      labelColor = "#64748b";
                    }

                    if (isStart) {
                      border = "1px solid #4f46e5";
                      shadow = "0 0 0 2px #4f46e5, 0 0 0 3px white";
                    } else if (isContractEnd) {
                      border = "1px solid #6366f1";
                      shadow = "0 0 0 2px #6366f1, 0 0 0 3px white";
                    }
                  } else if (isExtension) {
                    if (installment) {
                      bg = "#fefce8";
                      textColor = "#854d0e";
                      border = "1px solid #ca8a04";
                      shadow = "none";
                      label = `S/ ${installment.amount.toFixed(0)}`;
                      labelColor = "#a16207";
                    } else {
                      bg = "transparent";
                      textColor = "#cbd5e1";
                      border = "1px solid transparent";
                    }
                  }

                  return (
                    <div
                      key={dateStr}
                      style={{
                        height: "44px",
                        backgroundColor: bg,
                        borderRadius: "8px",
                        border: border,
                        boxShadow: shadow,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.65rem",
                        fontWeight: (installment || isStart || isContractEnd || (isRelevant && day < today)) ? 800 : 500,
                        color: textColor,
                        position: "relative",
                        overflow: "hidden",
                        opacity: isSunday ? 0.45 : 1,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.72rem",
                          lineHeight: 1.1,
                        }}
                      >
                        {format(day, "d")}
                      </span>
                      {label ? (
                        <span
                          style={{
                            fontSize: "7.5px",
                            fontWeight: 800,
                            color: labelColor,
                            lineHeight: 1.1,
                            marginTop: "2px",
                            whiteSpace: "nowrap",
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {label}
                        </span>
                      ) : (
                        <span style={{ height: "9px" }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Franja de Deuda Pendiente para Morosos Prolongados (> 7 o 14 días sin abonos) */}
              {isStalledOverdue && (
                <div
                  style={{
                    marginTop: "0.65rem",
                    padding: "0.6rem 0.8rem",
                    background: "linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)",
                    border: "1px solid #fecaca",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div
                      style={{
                        width: "26px",
                        height: "26px",
                        borderRadius: "6px",
                        backgroundColor: "#ffe4e6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#e11d48"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#9f1239" }}>
                        Deuda pendiente: S/ {remainingAmount.toFixed(2)}
                      </div>
                      <div style={{ fontSize: "0.62rem", color: "#e11d48", fontWeight: 500 }}>
                        {daysOverdue > 0
                          ? `${daysOverdue} días fuera del plazo contractual`
                          : "Saldo pendiente sin abonos recientes"}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "0.55rem",
                      fontWeight: 800,
                      backgroundColor: "#e11d48",
                      color: "white",
                      padding: "0.2rem 0.45rem",
                      borderRadius: "999px",
                      letterSpacing: "0.025em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    MORA ACTIVA
                  </span>
                </div>
              )}

              {/* Leyenda Moderna */}
              <div
                style={{
                  marginTop: "0.75rem",
                  display: "flex",
                  gap: "0.6rem",
                  fontSize: "0.55rem",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <div style={{ width: "6px", height: "6px", backgroundColor: "#4f46e5", borderRadius: "50%" }} />
                  <span style={{ fontWeight: 800, color: "#475569" }}>INICIO / FIN PACTADO</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <div style={{ width: "6px", height: "6px", backgroundColor: "#10b981", borderRadius: "50%" }} />
                  <span style={{ fontWeight: 800, color: "#475569" }}>COBRADO</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <div style={{ width: "6px", height: "6px", backgroundColor: "#ca8a04", borderRadius: "50%" }} />
                  <span style={{ fontWeight: 800, color: "#475569" }}>PRÓRROGA</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <div style={{ width: "6px", height: "6px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "50%" }} />
                  <span style={{ fontWeight: 800, color: "#475569" }}>MORA</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <div style={{ width: "6px", height: "6px", border: "1px solid #cbd5e1", borderRadius: "50%" }} />
                  <span style={{ fontWeight: 800, color: "#475569" }}>INACTIVO</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
                <div
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: 800,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Historial de Abonos
                </div>
              </div>

              {details.installments.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    padding: "10px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "14px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {details.installments
                    .sort(
                      (a, b) =>
                        parseISO(a.date).getTime() - parseISO(b.date).getTime(),
                    )
                    .map((inst, idx) => (
                      <div
                        key={inst.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          backgroundColor: "#ffffff",
                          borderRadius: "8px",
                          border: "1px solid #f1f5f9",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.55rem",
                              fontWeight: 900,
                              color: "#6366f1",
                              backgroundColor: "rgba(99, 102, 241, 0.1)",
                              width: "16px",
                              height: "16px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "4px",
                            }}
                          >
                            {idx + 1}
                          </span>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              color: "#1e293b",
                            }}
                          >
                            {formatDateLocal(inst.date)}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 900,
                            color: "#10b981",
                          }}
                        >
                          S/{inst.amount}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    backgroundColor: "#f8fafc",
                    borderRadius: "14px",
                    border: "1px dashed #cbd5e1",
                    color: "#94a3b8",
                    fontSize: "0.7rem",
                  }}
                >
                  No se registran pagos realizados.
                </div>
              )}
            </div>
          )}

          {/* Footer Logo */}
          <div
            style={{
              marginTop: "1rem",
              textAlign: "center",
              borderTop: "2px dashed #f1f5f9",
              paddingTop: "1rem",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <span
              style={{
                fontSize: "0.6rem",
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.1rem",
              }}
            >
              Potenciado por
            </span>
            <span
              style={{
                fontSize: "0.9rem",
                fontWeight: 900,
                color: "#0f172a",
                letterSpacing: "-0.04em",
              }}
            >
              Neo<span style={{ color: "#4f46e5" }}>Cobros</span>
            </span>
          </div>
        </div>
      </div>
    );
  },
);

LoanShareGenerator.displayName = "LoanShareGenerator";
export default LoanShareGenerator;
