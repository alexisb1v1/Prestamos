"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Check,
} from "lucide-react";

export interface DateRangePickerProps {
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  onChange: (startDate: string, endDate: string) => void;
  isMobile?: boolean;
  width?: string;
  triggerStyle?: React.CSSProperties;
  showPresets?: boolean;
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
  if (!d) return "--/--";
  const day = d.getDate();
  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "set", "oct", "nov", "dic",
  ];
  return `${day} ${months[d.getMonth()]}`;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DAY_NAMES = ["LU", "MA", "MI", "JU", "VI", "SÁ", "DO"];

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  isMobile = false,
  width,
  triggerStyle,
  showPresets = true,
  align,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Estado del mes visible en el calendario
  const initialDate = parseDateString(startDate) || new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  // Rango temporal mientras se selecciona
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // Sincronizar mes visible al abrir
  useEffect(() => {
    if (isOpen) {
      const s = parseDateString(startDate);
      if (s) {
        setViewYear(s.getFullYear());
        setViewMonth(s.getMonth());
      }
      setTempStart(null);
      setHoverDate(null);
    }
  }, [isOpen, startDate]);

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

  const parsedStart = useMemo(() => parseDateString(startDate), [startDate]);
  const parsedEnd = useMemo(() => parseDateString(endDate), [endDate]);

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

  // Generar la cuadrícula mensual
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);

    // Ajustar para que la semana empiece en Lunes (0=Lunes ... 6=Domingo)
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

    // Días del mes siguiente para completar cuadrícula (múltiplo de 7)
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

  // Manejador al hacer clic en un día del calendario
  const handleDayClick = (day: Date) => {
    if (!tempStart) {
      // Primer clic: seleccionar fecha de inicio
      setTempStart(day);
      setHoverDate(null);
    } else {
      // Segundo clic: definir fin del rango
      if (day.getTime() < tempStart.getTime()) {
        // Si seleccionó una fecha anterior, esa pasa a ser el nuevo inicio
        setTempStart(day);
        setHoverDate(null);
      } else {
        // Rango válido completado
        const newStartStr = formatDateString(tempStart);
        const newEndStr = formatDateString(day);
        onChange(newStartStr, newEndStr);
        setTempStart(null);
        setHoverDate(null);
        setIsOpen(false);
      }
    }
  };

  // Presets rápidos
  const handleApplyPreset = (presetKey: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let s = new Date(today);
    let e = new Date(today);

    if (presetKey === "today") {
      // Hoy
    } else if (presetKey === "yesterday") {
      s.setDate(s.getDate() - 1);
      e.setDate(e.getDate() - 1);
    } else if (presetKey === "last7") {
      s.setDate(s.getDate() - 6);
    } else if (presetKey === "last30") {
      s.setDate(s.getDate() - 29);
    } else if (presetKey === "thisMonth") {
      s = new Date(today.getFullYear(), today.getMonth(), 1);
      e = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (presetKey === "prevMonth") {
      s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      e = new Date(today.getFullYear(), today.getMonth(), 0);
    }

    onChange(formatDateString(s), formatDateString(e));
    setIsOpen(false);
  };

  const isToday = (day: Date) => {
    const t = new Date();
    return (
      day.getDate() === t.getDate() &&
      day.getMonth() === t.getMonth() &&
      day.getFullYear() === t.getFullYear()
    );
  };

  // Determinar visualización del rango en cada celda
  const getDayStatus = (day: Date) => {
    const dayTime = day.getTime();

    // Rango activo temporal (durante interacción)
    if (tempStart) {
      const startTime = tempStart.getTime();
      const targetHoverTime = hoverDate ? hoverDate.getTime() : startTime;

      if (dayTime === startTime) {
        return { isStart: true, isEnd: startTime === targetHoverTime, inRange: false };
      }
      if (startTime < targetHoverTime) {
        if (dayTime === targetHoverTime) {
          return { isStart: false, isEnd: true, inRange: false };
        }
        if (dayTime > startTime && dayTime < targetHoverTime) {
          return { isStart: false, isEnd: false, inRange: true };
        }
      }
      return { isStart: false, isEnd: false, inRange: false };
    }

    // Rango definitivo
    if (parsedStart && parsedEnd) {
      const startTime = parsedStart.getTime();
      const endTime = parsedEnd.getTime();

      const isStart = dayTime === startTime;
      const isEnd = dayTime === endTime;
      const inRange = dayTime > startTime && dayTime < endTime;

      return { isStart, isEnd, inRange };
    }

    return { isStart: false, isEnd: false, inRange: false };
  };

  const labelRange = useMemo(() => {
    if (!startDate || !endDate) return "Seleccionar rango";
    const s = formatDisplayDate(startDate);
    const e = formatDisplayDate(endDate);
    const endYear = parseDateString(endDate)?.getFullYear() || "";
    return `${s} — ${e}, ${endYear}`;
  }, [startDate, endDate]);

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
            <CalendarRange size={13} strokeWidth={2.3} />
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
            {labelRange}
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
            width: isMobile ? "min(330px, calc(100vw - 32px))" : "320px",
            maxWidth: "calc(100vw - 24px)",
            boxSizing: "border-box",
            animation: isMobile || align === "center"
              ? "ncFadeInScaleCentered 0.18s ease-out"
              : "ncFadeInScale 0.18s ease-out",
          }}
        >
          {/* Presets Rápidos */}
          {showPresets && (
            <div
              style={{
                display: "flex",
                gap: "4px",
                flexWrap: "wrap",
                marginBottom: "0.85rem",
                paddingBottom: "0.75rem",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              {[
                { key: "today", label: "Hoy" },
                { key: "yesterday", label: "Ayer" },
                { key: "last7", label: "7 días" },
                { key: "last30", label: "30 días" },
                { key: "thisMonth", label: "Este mes" },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handleApplyPreset(p.key)}
                  style={{
                    border: "none",
                    backgroundColor: "#f8fafc",
                    color: "#475569",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-primary, #4147eb)";
                    e.currentTarget.style.color = "#ffffff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                    e.currentTarget.style.color = "#475569";
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

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
            {calendarDays.map(({ date, isCurrentMonth }) => {
              const { isStart, isEnd, inRange } = getDayStatus(date);
              const todayFlag = isToday(date);
              const isSunday = date.getDay() === 0;

              let bg = "transparent";
              let color = isCurrentMonth ? "#1e293b" : "#cbd5e1";
              let fontWeight = isCurrentMonth ? 500 : 400;
              let borderRadius = "6px";

              if (isStart || isEnd) {
                bg = "var(--color-primary, #4147eb)";
                color = "#ffffff";
                fontWeight = 750;
                borderRadius = isStart && isEnd ? "50%" : isStart ? "8px 0 0 8px" : "0 8px 8px 0";
              } else if (inRange) {
                bg = "color-mix(in srgb, var(--color-primary, #4147eb) 12%, transparent)";
                color = "var(--color-primary, #4147eb)";
                fontWeight = 650;
                borderRadius = "0";
              }

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => handleDayClick(date)}
                  onMouseEnter={() => tempStart && setHoverDate(date)}
                  style={{
                    aspectRatio: "1",
                    border: todayFlag && !isStart && !isEnd ? "1px solid var(--color-primary, #4147eb)" : "none",
                    backgroundColor: bg,
                    color: color,
                    fontWeight: fontWeight,
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: borderRadius,
                    transition: "background 0.1s ease",
                    padding: 0,
                    opacity: isSunday && !isStart && !isEnd && !inRange ? 0.75 : 1,
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Ayuda y Estado en Selección */}
          <div
            style={{
              marginTop: "0.85rem",
              paddingTop: "0.6rem",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "11px",
              color: "#64748b",
            }}
          >
            <span>
              {tempStart ? "Seleccione fecha de fin..." : "Haga clic para iniciar rango"}
            </span>

            {tempStart && (
              <button
                type="button"
                onClick={() => {
                  setTempStart(null);
                  setHoverDate(null);
                }}
                style={{
                  border: "none",
                  backgroundColor: "transparent",
                  color: "#ef4444",
                  fontWeight: 650,
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
