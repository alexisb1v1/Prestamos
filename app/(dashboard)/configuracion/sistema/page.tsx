"use client";

import { useState, useEffect } from "react";
import {
  Server,
  PlayCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { cronService, CronExecution } from "@/app/features/cron/cron.service";
import ConfirmModal from "@/app/components/ConfirmModal";
import Link from "next/link";

export default function SistemaConfiguracionPage() {
  const { isOwner } = usePermissions();
  const [isMounted, setIsMounted] = useState(false);
  const [executions, setExecutions] = useState<CronExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCron, setRunningCron] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [runningDemoCleanup, setRunningDemoCleanup] = useState(false);
  const [isDemoCleanupOpen, setIsDemoCleanupOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
    details?: any;
  } | null>(null);

  const fetchExecutions = () => {
    setLoading(true);
    cronService.getExecutions(25).match(
      (data) => {
        setExecutions(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error al cargar historial de crons:", err);
        setLoading(false);
      },
    );
  };

  useEffect(() => {
    setIsMounted(true);
    fetchExecutions();
  }, []);

  const handleTriggerClosing = () => {
    setIsConfirmOpen(true);
  };

  const handleConfirmRun = () => {
    setIsConfirmOpen(false);
    setRunningCron(true);
    setActionMessage(null);

    cronService.triggerDailyClosing().match(
      (res) => {
        setRunningCron(false);
        setActionMessage({
          type: "success",
          text: `Cierre masivo completado con éxito en ${res.durationMs} ms.`,
          details: {
            liquidatedProcessed: res.liquidatedProcessed,
            activeProcessed: res.activeProcessed,
            totalProcessed: res.totalProcessed,
          },
        });
        fetchExecutions();
      },
      (err) => {
        setRunningCron(false);
        setActionMessage({
          type: "error",
          text: `Error al ejecutar el cierre masivo: ${err.message || "Ocurrió una falla en el servidor"}`,
        });
        fetchExecutions();
      },
    );
  };

  const handleConfirmDemoCleanup = () => {
    setIsDemoCleanupOpen(false);
    setRunningDemoCleanup(true);
    setActionMessage(null);

    cronService.triggerDemoCleanup().match(
      (res) => {
        setRunningDemoCleanup(false);
        setActionMessage({
          type: "success",
          text: `Limpieza de entorno Demo completada con éxito en ${res.durationMs} ms.`,
          details: {
            liquidatedProcessed: res.loansDeleted,
            activeProcessed: res.installmentsDeleted,
            totalProcessed: res.totalProcessed,
          },
        });
        fetchExecutions();
      },
      (err) => {
        setRunningDemoCleanup(false);
        setActionMessage({
          type: "error",
          text: `Error al ejecutar purga demo: ${err.message || "Ocurrió una falla en el servidor"}`,
        });
        fetchExecutions();
      },
    );
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* Cabecera */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div
            style={{
              padding: "0.5rem",
              borderRadius: "0.75rem",
              background: "linear-gradient(135deg, #1e1b4b, #312e81)",
              color: "#a5b4fc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Server size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Configuración y Mantenimiento del Sistema
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Panel exclusivo de Superadmin (OWNER) para gestión masiva de tareas programadas y auditoría.
            </p>
          </div>
        </div>

        {/* Alerta de permisos si no es Owner */}
        {isMounted && !isOwner && (
          <div
            style={{
              padding: "1rem",
              borderRadius: "0.75rem",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginTop: "1rem",
            }}
          >
            <AlertTriangle size={20} />
            <span>
              Atención: Esta sección requiere privilegios de <strong>Superadmin (OWNER)</strong> para ejecutar acciones.
            </span>
          </div>
        )}
      </div>

      {/* Banner de Feedback de Acción */}
      {actionMessage && (
        <div
          style={{
            padding: "1.25rem",
            borderRadius: "0.75rem",
            marginBottom: "1.75rem",
            border: actionMessage.type === "success" ? "1px solid #86efac" : "1px solid #fca5a5",
            backgroundColor: actionMessage.type === "success" ? "#f0fdf4" : "#fef2f2",
            color: actionMessage.type === "success" ? "#166534" : "#991b1b",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          }}
        >
          {actionMessage.type === "success" ? (
            <CheckCircle2 size={24} color="#16a34a" style={{ flexShrink: 0, marginTop: "0.15rem" }} />
          ) : (
            <XCircle size={24} color="#dc2626" style={{ flexShrink: 0, marginTop: "0.15rem" }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: "1rem" }}>{actionMessage.text}</div>
            {actionMessage.details && (
              <div
                style={{
                  marginTop: "0.5rem",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "1rem",
                  fontSize: "0.875rem",
                  color: "#15803d",
                }}
              >
                <span>
                  • Liquidados consolidados: <strong>{actionMessage.details.liquidatedProcessed}</strong>
                </span>
                <span>
                  • Préstamos activos evaluados: <strong>{actionMessage.details.activeProcessed}</strong>
                </span>
                <span>
                  • Total registros actualizados: <strong>{actionMessage.details.totalProcessed}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sección 1: Control de Cierre Masivo a Demanda */}
      <section
        className="card"
        style={{
          padding: "1.75rem",
          borderRadius: "1rem",
          marginBottom: "2rem",
          background: "linear-gradient(180deg, #ffffff, #fafafa)",
          border: "1px solid var(--border-color)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Database size={20} color="#4147eb" />
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Cierre Diario Masivo de Cartera (Cron)
              </h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: "650px", lineHeight: 1.5 }}>
              Calcula y consolida de forma masiva los días de retraso, cuotas vencidas, días de extensión y calificación
              crediticia (A+, A, B, C) para todos los préstamos activos y liquidados del sistema.
            </p>
            <div
              style={{
                marginTop: "0.75rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8rem",
                color: "#6366f1",
                backgroundColor: "#eef2ff",
                padding: "0.35rem 0.75rem",
                borderRadius: "2rem",
                fontWeight: 600,
              }}
            >
              <Clock size={14} /> Ejecución automática diaria programada: 11:00 PM (23:00 hrs)
            </div>
          </div>

          <div>
            <button
              onClick={handleTriggerClosing}
              disabled={runningCron || (isMounted && !isOwner)}
              className="btn btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.75rem 1.5rem",
                fontSize: "0.95rem",
                fontWeight: 600,
                borderRadius: "0.75rem",
                boxShadow: "0 4px 12px rgba(65, 71, 235, 0.25)",
                cursor: runningCron || (isMounted && !isOwner) ? "not-allowed" : "pointer",
                opacity: runningCron || (isMounted && !isOwner) ? 0.7 : 1,
              }}
            >
              {runningCron ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Procesando Cierre Masivo...</span>
                </>
              ) : (
                <>
                  <PlayCircle size={19} />
                  <span>Ejecutar Cierre Diario Masivo Ahora</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Sección 1.B: Control de Purga de Entorno Demo (Empresa 102) */}
      <section
        className="card"
        style={{
          padding: "1.75rem",
          borderRadius: "1rem",
          marginBottom: "2rem",
          background: "linear-gradient(180deg, #ffffff, #fafafa)",
          border: "1px solid var(--border-color)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Trash2 size={20} color="#ef4444" />
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Mantenimiento y Purga de Entorno Demo (Empresa 102)
              </h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: "650px", lineHeight: 1.5 }}>
              Depura de forma automática y segura los préstamos, cuotas y gastos con más de 4 días de antigüedad pertenecientes exclusivamente a la empresa DEMO para prevenir saturación y optimizar el rendimiento.
            </p>
            <div
              style={{
                marginTop: "0.75rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8rem",
                color: "#b91c1c",
                backgroundColor: "#fef2f2",
                padding: "0.35rem 0.75rem",
                borderRadius: "2rem",
                fontWeight: 600,
              }}
            >
              <Clock size={14} /> Ejecución automática diaria programada: 02:00 AM (02:00 hrs)
            </div>
          </div>

          <div>
            <button
              onClick={() => setIsDemoCleanupOpen(true)}
              disabled={runningDemoCleanup || (isMounted && !isOwner)}
              className="btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.75rem 1.5rem",
                fontSize: "0.95rem",
                fontWeight: 600,
                borderRadius: "0.75rem",
                backgroundColor: "#dc2626",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.2)",
                cursor: runningDemoCleanup || (isMounted && !isOwner) ? "not-allowed" : "pointer",
                opacity: runningDemoCleanup || (isMounted && !isOwner) ? 0.7 : 1,
                border: "none",
              }}
            >
              {runningDemoCleanup ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Purgando Entorno Demo...</span>
                </>
              ) : (
                <>
                  <Trash2 size={19} />
                  <span>Ejecutar Purga Demo Ahora</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Sección 2: Historial y Resumen de Ejecuciones */}
      <section
        className="card"
        style={{
          padding: "1.75rem",
          borderRadius: "1rem",
          background: "#ffffff",
          border: "1px solid var(--border-color)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
            borderBottom: "1px solid var(--border-color)",
            paddingBottom: "1rem",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Layers size={20} color="#4147eb" />
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Historial y Resumen de Ejecuciones
            </h2>
          </div>

          <button
            onClick={fetchExecutions}
            disabled={loading}
            className="btn btn-secondary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.45rem 0.9rem",
              fontSize: "0.85rem",
              borderRadius: "0.5rem",
            }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>Refrescar</span>
          </button>
        </div>

        {/* Tabla de Auditoría */}
        {loading && executions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
            <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 1rem", color: "#4147eb" }} />
            <p>Cargando historial de ejecuciones...</p>
          </div>
        ) : executions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
            <Database size={40} style={{ margin: "0 auto 1rem", opacity: 0.3 }} />
            <p style={{ fontWeight: 600, fontSize: "1rem" }}>Aún no se registran ejecuciones de cron.</p>
            <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
              Ejecuta el cierre masivo a demanda para generar el primer registro de auditoría.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: "0",
                fontSize: "0.875rem",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", color: "#64748b", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border-color)", fontWeight: 600 }}>
                    Fecha y Hora
                  </th>
                  <th style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border-color)", fontWeight: 600 }}>
                    Tarea / Tipo
                  </th>
                  <th style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border-color)", fontWeight: 600 }}>
                    Estado
                  </th>
                  <th style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border-color)", fontWeight: 600 }}>
                    Duración
                  </th>
                  <th style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border-color)", fontWeight: 600 }}>
                    Liquidados
                  </th>
                  <th style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border-color)", fontWeight: 600 }}>
                    Activos
                  </th>
                  <th style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border-color)", fontWeight: 600 }}>
                    Total Actualizados
                  </th>
                </tr>
              </thead>
              <tbody>
                {executions.map((item) => {
                  const isSuccess = item.status === "SUCCESS";
                  const isRunning = item.status === "RUNNING";
                  const isFailed = item.status === "FAILED";

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background-color 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {/* Fecha / Hora */}
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-primary)", fontWeight: 500 }}>
                        {formatDate(item.startedAt)}
                      </td>

                      {/* Tarea / Tipo */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.jobName}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {item.triggerType === "MANUAL" ? (
                            <span style={{ color: "#7c3aed", fontWeight: 600 }}>Manual a Demanda</span>
                          ) : (
                            <span style={{ color: "#0284c7" }}>Programado (23:00)</span>
                          )}
                        </div>
                      </td>

                      {/* Estado */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        {isSuccess && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              backgroundColor: "#dcfce7",
                              color: "#15803d",
                              padding: "0.25rem 0.6rem",
                              borderRadius: "2rem",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                            }}
                          >
                            <CheckCircle2 size={13} /> Normal (Éxito)
                          </span>
                        )}
                        {isRunning && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              backgroundColor: "#e0f2fe",
                              color: "#0369a1",
                              padding: "0.25rem 0.6rem",
                              borderRadius: "2rem",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                            }}
                          >
                            <RefreshCw size={13} className="animate-spin" /> En Curso...
                          </span>
                        )}
                        {isFailed && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              backgroundColor: "#fee2e2",
                              color: "#b91c1c",
                              padding: "0.25rem 0.6rem",
                              borderRadius: "2rem",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                            }}
                            title={item.errorMessage || "Fallo en la ejecución"}
                          >
                            <XCircle size={13} /> Falló
                          </span>
                        )}
                      </td>

                      {/* Duración */}
                      <td style={{ padding: "0.85rem 1rem", color: "#64748b" }}>
                        {item.durationMs !== undefined && item.durationMs !== null
                          ? item.durationMs > 1000
                            ? `${(item.durationMs / 1000).toFixed(2)} s`
                            : `${item.durationMs} ms`
                          : "—"}
                      </td>

                      {/* Liquidados */}
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                        {item.liquidatedProcessed ?? 0}
                      </td>

                      {/* Activos */}
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                        {item.activeProcessed ?? 0}
                      </td>

                      {/* Total */}
                      <td style={{ padding: "0.85rem 1rem", color: "var(--color-primary)", fontWeight: 700 }}>
                        {item.totalProcessed ?? 0} registros
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Estandarizado de Confirmación */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmRun}
        title="Confirmar Cierre Diario Masivo"
        confirmText="Sí, Ejecutar Cierre Ahora"
        cancelText="Cancelar"
        isDestructive={false}
        isLoading={runningCron}
        icon={
          <div
            style={{
              padding: "0.5rem",
              borderRadius: "0.75rem",
              backgroundColor: "#e0e7ff",
              color: "var(--color-primary, #4147eb)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Database size={22} />
          </div>
        }
        message={
          <div>
            <p style={{ marginBottom: "1rem", lineHeight: 1.5, color: "var(--text-secondary)" }}>
              ¿Estás seguro de forzar la ejecución masiva del cierre diario de cartera en este momento?
            </p>
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "0.75rem",
                padding: "0.85rem 1rem",
                fontSize: "0.875rem",
                color: "#334155",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.2rem" }}>
                Acciones que ejecutará el sistema:
              </div>
              <div>• Consolidación de cuotas vencidas y cálculo de mora en préstamos activos.</div>
              <div>• Cálculo de prórrogas y asignación de calificación crediticia (A+, A, B, C).</div>
              <div>• Consolidación de préstamos liquidados pendientes de evaluación.</div>
            </div>
            <p style={{ marginTop: "0.85rem", fontSize: "0.8rem", color: "#64748b" }}>
              ⚠️ Este proceso abarca todas las empresas del sistema y puede tomar unos segundos según el volumen de datos.
            </p>
          </div>
        }
      />

      {/* Modal de Confirmación para Purga de Entorno Demo */}
      <ConfirmModal
        isOpen={isDemoCleanupOpen}
        onClose={() => setIsDemoCleanupOpen(false)}
        onConfirm={handleConfirmDemoCleanup}
        title="Confirmar Purga de Entorno Demo"
        confirmText="Sí, Purgar Entorno Demo"
        cancelText="Cancelar"
        isDestructive={true}
        isLoading={runningDemoCleanup}
        icon={
          <div
            style={{
              padding: "0.5rem",
              borderRadius: "0.75rem",
              backgroundColor: "#fee2e2",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Trash2 size={22} />
          </div>
        }
        message={
          <div>
            <p style={{ marginBottom: "1rem", lineHeight: 1.5, color: "var(--text-secondary)" }}>
              ¿Estás seguro de purgar los registros de la empresa Demo (ID 102) con más de 4 días de antigüedad?
            </p>
            <div
              style={{
                backgroundColor: "#fff1f2",
                border: "1px solid #fecdd3",
                borderRadius: "0.75rem",
                padding: "0.85rem 1rem",
                fontSize: "0.875rem",
                color: "#9f1239",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              <div style={{ fontWeight: 600, color: "#881337", marginBottom: "0.2rem" }}>
                Alcance exclusivo de la operación:
              </div>
              <div>• Afecta únicamente a la empresa DEMO (ID 102). Las demás empresas están totalmente aisladas.</div>
              <div>• Elimina préstamos, abonos y cuotas cuya antigüedad sea mayor a 4 días.</div>
              <div>• Elimina registros de gastos asociados a la empresa Demo con más de 4 días.</div>
            </div>
            <p style={{ marginTop: "0.85rem", fontSize: "0.8rem", color: "#e11d48" }}>
              ⚠️ Esta acción no se puede deshacer. Se recomienda ejecutarla periódicamente para mantener el sistema ligero.
            </p>
          </div>
        }
      />
    </div>
  );
}
