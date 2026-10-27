"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

export interface DatePickerProps {
  date: string; // 'YYYY-MM-DD'
  onChange: (date: string) => void;
  isMobile?: boolean;
  width?: string;
  triggerStyle?: React.CSSProperties;
  showTodayButton?: boolean;
  align?: "left" | "right" | "center";
  minDate?: string;
  maxDate?: string;
}

// Helpers para manejo seguro de fechas puras YYYY-MM-DD sin desfase horario
function parseDateString(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateStr?: string | null): string {
  const d = parseDateString(dateStr);
  if (!d) return "Seleccionar fecha";
  
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "set", "oct", "nov", "dic",
  ];
  const dateFormatted = `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
  return isToday ? `Hoy, ${dateFormatted}` : dateFormatted;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DAY_NAMES = ["LU", "MA", "MI", "JU", "VI", "SÁ", "DO"];

export default function DatePicker({
  date,
  onChange,
  isMobile = false,
  width,
  triggerStyle,
  showTodayButton = true,
  align,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsedCurrent = useMemo(() => parseDateString(date) || new Date(), [date]);
  const [viewYear, setViewYear] = useState(parsedCurrent.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedCurrent.getMonth());

  // Sincronizar mes visible al abrir
  useEffect(() => {
    if (isOpen) {
      const d = parseDateString(date) || new Date();
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [isOpen, date]);

  // Click outside y tecla Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Navegación de meses
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Cuadrícula de días
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Días del mes previo
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(viewYear, viewMonth - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Días del mes actual
    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      days.push({
        date: new Date(viewYear, viewMonth, d),
        isCurrentMonth: true,
      });
    }

    // Días del mes siguiente
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        days.push({
          date: new Date(viewYear, viewMonth + 1, d),
          isCurrentMonth: false,
        });
      }
    }

    return days;
  }, [viewYear, viewMonth]);

  const handleDaySelect = (d: Date) => {
    onChange(formatDateString(d));
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    onChange(formatDateString(new Date()));
    setIsOpen(false);
  };

  const isSelectedDate = (d: Date) => {
    const current = parseDateString(date);
    if (!current) return false;
    return (
      d.getDate() === current.getDate() &&
      d.getMonth() === current.getMonth() &&
      d.getFullYear() === current.getFullYear()
    );
  };

  const isTodayDate = (d: Date) => {
    const t = new Date();
    return (
      d.getDate() === t.getDate() &&
      d.getMonth() === t.getMonth() &&
      d.getFullYear() === t.getFullYear()
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: width || (isMobile ? "100%" : "auto"),
        boxSizing: "border-box",
      }}
    >
      {/* Botón Trigger Píldora */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#ffffff",
          borderRadius: "2rem",
          padding: isMobile ? "0.45rem 0.75rem" : "0.5rem 0.95rem",
          border: isOpen
            ? "1px solid var(--color-primary, #4147eb)"
            : "1px solid var(--border-color, #e2e8f0)",
          gap: "8px",
          boxShadow: isOpen
            ? "0 0 0 3px color-mix(in srgb, var(--color-primary, #4147eb) 12%, transparent)"
            : "0 1px 3px rgba(0,0,0,0.03)",
          width: width || (isMobile ? "100%" : "auto"),
          boxSizing: "border-box",
          cursor: "pointer",
          transition: "all 0.2s ease",
          outline: "none",
          ...triggerStyle,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor: "color-mix(in srgb, var(--color-primary, #4147eb) 10%, transparent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-primary, #4147eb)",
              flexShrink: 0,
            }}
          >
            <Calendar size={13} strokeWidth={2.3} />
          </div>
          <span
            style={{
              fontSize: isMobile ? "12px" : "13px",
              fontWeight: 650,
              color: "#0f172a",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {formatDisplayDate(date)}
          </span>
        </div>

        <ChevronDown
          size={15}
          strokeWidth={2.2}
          color="#64748b"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            flexShrink: 0,
            marginLeft: "4px",
          }}
        />
      </button>

      {/* Popover Flotante */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: isMobile || align === "center" ? "50%" : align === "right" ? "auto" : "0",
            right: isMobile || align === "center" ? "auto" : align === "right" ? "0" : "auto",
            transform: isMobile || align === "center" ? "translateX(-50%)" : "none",
            backgroundColor: "#ffffff",
            borderRadius: "1.25rem",
            boxShadow:
              "0 14px 35px -5px rgba(0, 0, 0, 0.12), 0 8px 16px -6px rgba(0, 0, 0, 0.05)",
            border: "1px solid var(--border-color, #e2e8f0)",
            padding: "1rem",
            zIndex: 9999,
            width: isMobile ? "min(310px, calc(100vw - 32px))" : "300px",
            maxWidth: "calc(100vw - 24px)",
            boxSizing: "border-box",
            animation: isMobile || align === "center"
              ? "ncFadeInScaleCentered 0.18s ease-out"
              : "ncFadeInScale 0.18s ease-out",
          }}
        >
          {/* Header del Calendario: Mes y Controles */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.75rem",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 750,
                color: "#0f172a",
                letterSpacing: "-0.01em",
              }}
            >
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <div style={{ display: "flex", gap: "2px" }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Mes anterior"
                style={{
                  border: "none",
                  backgroundColor: "#f8fafc",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#475569",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e2e8f0")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Mes siguiente"
                style={{
                  border: "none",
                  backgroundColor: "#f8fafc",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#475569",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e2e8f0")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Días de la semana */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              textAlign: "center",
              marginBottom: "4px",
            }}
          >
            {DAY_NAMES.map((d, i) => (
              <span
                key={d}
                style={{
                  fontSize: "10px",
                  fontWeight: 750,
                  color: i === 6 ? "#fb7185" : "#94a3b8",
                  padding: "4px 0",
                }}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Cuadrícula de Días */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "2px",
            }}
          >
            {calendarDays.map(({ date: dayDate, isCurrentMonth }) => {
              const isSelected = isSelectedDate(dayDate);
              const isToday = isTodayDate(dayDate);
              const isSunday = dayDate.getDay() === 0;

              let bg = "transparent";
              let color = isCurrentMonth ? "#1e293b" : "#cbd5e1";
              let fontWeight = isCurrentMonth ? 500 : 400;

              if (isSelected) {
                bg = "var(--color-primary, #4147eb)";
                color = "#ffffff";
                fontWeight = 750;
              }

              return (
                <button
                  key={dayDate.toISOString()}
                  type="button"
                  onClick={() => handleDaySelect(dayDate)}
                  style={{
                    aspectRatio: "1",
                    border: isToday && !isSelected ? "1px solid var(--color-primary, #4147eb)" : "none",
                    backgroundColor: bg,
                    color: color,
                    fontWeight: fontWeight,
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    transition: "all 0.15s ease",
                    padding: 0,
                    opacity: isSunday && !isSelected ? 0.75 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = "#f1f5f9";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  {dayDate.getDate()}
                </button>
              );
            })}
          </div>

          {/* Botón rápido "Hoy" */}
          {showTodayButton && (
            <div
              style={{
                marginTop: "0.85rem",
                paddingTop: "0.6rem",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                onClick={handleSelectToday}
                style={{
                  border: "none",
                  backgroundColor: "#f8fafc",
                  color: "var(--color-primary, #4147eb)",
                  fontWeight: 650,
                  fontSize: "11px",
                  padding: "4px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e2e8f0")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
              >
                Ir a Hoy
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
