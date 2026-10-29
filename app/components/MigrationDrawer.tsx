"use client";

import { useState, useRef } from "react";
import styles from "./MigrationDrawer.module.css";
import { downloadMigrationTemplate } from "@/lib/migrationTemplate";
import { apiRequest } from "@/lib/api";
import { formatMoney } from "@/lib/loanUtils";

interface MigrationLoanItem {
  codigoRef: string;
  dniCliente: string;
  nombresApellidos: string;
  telefono: string;
  direccion: string;
  montoPrestado: number;
  interesPorcentaje: number;
  totalPagar: number;
  numeroCuotas: number;
  valorCuota: number;
  fechaInicio: string;
  cuotasPagadas: number;
  cobradorUsuario: string;
  cobradorId?: string;
  amortizadoCalculado: number;
  saldoPendiente: number;
  statusResultante: "Activo" | "Liquidado";
  isExistingClient: boolean;
  isValid: boolean;
  errors: string[];
}

interface MigrationPaymentItem {
  codigoRef: string;
  fechaPago: string;
  montoAbonado: number;
  metodoPago: "EFECTIVO" | "YAPE";
  isValid: boolean;
  errors: string[];
}

interface CollectorOption {
  id: string;
  username: string;
  fullName: string;
}

interface MigrationPreviewData {
  totalLoans: number;
  validLoansCount: number;
  warningLoansCount: number;
  errorLoansCount: number;
  totalPayments: number;
  validPaymentsCount: number;
  errorPaymentsCount: number;
  hasPaymentsSheet: boolean;
  loans: MigrationLoanItem[];
  payments: MigrationPaymentItem[];
  availableCollectors: CollectorOption[];
  unmappedCollectors: string[];
}

interface MigrationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companyId?: string;
}

export default function MigrationDrawer({
  isOpen,
  onClose,
  onSuccess,
  companyId,
}: MigrationDrawerProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<MigrationPreviewData | null>(null);
  const [activeTab, setActiveTab] = useState<"loans" | "payments">("loans");

  // Mapeo manual de cobradores en caso de advertencias
  const [collectorOverrides, setCollectorOverrides] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (companyId) {
        formData.append("companyId", companyId);
      }

      const data = await apiRequest<MigrationPreviewData>("/loans/migration/preview", {
        method: "POST",
        headers: {
          // Vaciar Content-Type para que el navegador agregue el boundary multipart automáticamente
          "Content-Type": "",
        },
        body: formData,
      });

      setPreview(data);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "No se pudo leer el archivo. Verifica el formato.");
    } finally {
      setLoading(false);
    }
  };

  const handleCollectorChange = (loanCodigoRef: string, newCollectorId: string) => {
    setCollectorOverrides((prev) => ({
      ...prev,
      [loanCodigoRef]: newCollectorId,
    }));

    // Actualizar reactivamente el estado de validez del préstamo en la pantalla
    if (preview) {
      setPreview((prevPreview) => {
        if (!prevPreview) return null;

        const updatedLoans = prevPreview.loans.map((loan) => {
          if (loan.codigoRef === loanCodigoRef) {
            // Eliminar error de cobrador previo
            const remainingErrors = loan.errors.filter(
              (err) => !err.toLowerCase().includes("cobrador"),
            );

            // Si seleccionó la opción vacía "Seleccione..."
            if (!newCollectorId) {
              remainingErrors.push("Debe seleccionar un cobrador.");
            }

            return {
              ...loan,
              cobradorId: newCollectorId || undefined,
              errors: remainingErrors,
              isValid: remainingErrors.length === 0,
            };
          }
          return loan;
        });

        const validLoansCount = updatedLoans.filter((l) => l.isValid).length;
        const errorLoansCount = updatedLoans.filter((l) => !l.isValid).length;
        const warningLoansCount = updatedLoans.filter((l) => l.isValid && l.isExistingClient).length;

        return {
          ...prevPreview,
          loans: updatedLoans,
          validLoansCount,
          errorLoansCount,
          warningLoansCount,
        };
      });
    }
  };

  const handleExecuteMigration = async () => {
    if (!preview) return;
    setExecuting(true);
    setError(null);

    try {
      // Aplicar overrides de cobradores y filtrar válidos
      const loansToExecute = preview.loans.map((loan) => {
        const effectiveCollectorId =
          collectorOverrides[loan.codigoRef] || loan.cobradorId || preview.availableCollectors[0]?.id;

        return {
          codigoRef: loan.codigoRef,
          dniCliente: loan.dniCliente,
          nombresApellidos: loan.nombresApellidos,
          telefono: loan.telefono,
          direccion: loan.direccion,
          montoPrestado: loan.montoPrestado,
          interesPorcentaje: loan.interesPorcentaje,
          totalPagar: loan.totalPagar,
          numeroCuotas: loan.numeroCuotas,
          valorCuota: loan.valorCuota,
          fechaInicio: loan.fechaInicio,
          cuotasPagadas: loan.cuotasPagadas,
          cobradorId: effectiveCollectorId,
        };
      });

      const paymentsToExecute = preview.hasPaymentsSheet
        ? preview.payments
            .filter((p) => p.isValid)
            .map((p) => ({
              codigoRef: p.codigoRef,
              fechaPago: p.fechaPago,
              montoAbonado: p.montoAbonado,
              metodoPago: p.metodoPago,
            }))
        : [];

      const payload = {
        companyId,
        hasPaymentsSheet: preview.hasPaymentsSheet,
        loans: loansToExecute,
        payments: paymentsToExecute,
      };

      await apiRequest<{ success: boolean; message: string }>("/loans/migration/execute", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Fallo en la ejecución de la migración.");
    } finally {
      setExecuting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setStep(1);
    setError(null);
    setCollectorOverrides({});
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className={styles.header}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  width: "2rem",
                  height: "2rem",
                  borderRadius: "0.5rem",
                  backgroundColor: "rgba(65, 71, 235, 0.1)",
                  color: "var(--color-primary, #4147eb)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </span>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Migración Masiva de Cartera
              </h2>
            </div>
            <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0.25rem 0 0 2.5rem" }}>
              Importa préstamos activos e históricos desde Excel sin alterar el arqueo diario
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "0.5rem",
              width: "2rem",
              height: "2rem",
              cursor: "pointer",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className={styles.body}>
          {error && (
            <div
              style={{
                padding: "0.875rem 1rem",
                borderRadius: "0.75rem",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                fontSize: "0.8125rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <>
              {/* Tarjeta de Prerrequisito de Cobradores */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "1rem",
                  padding: "1rem 1.25rem",
                  display: "flex",
                  gap: "1rem",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "0.75rem",
                    backgroundColor: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <h4 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
                    Prerrequisito: Registrar Cobradores
                  </h4>
                  <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0.25rem 0 0 0", lineHeight: 1.4 }}>
                    Cada crédito debe asignarse a un cobrador. Si aún no los creaste, regístralos primero en el menú de Cobradores.
                  </p>
                </div>
              </div>

              {/* Botón de descarga de plantilla */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "1rem",
                  padding: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#0f172a", display: "block" }}>
                    Plantilla Oficial de Excel (.xlsx)
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Contiene la Hoja 1 (PRESTAMOS) y Hoja 2 (PAGOS) pre-formateadas.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => downloadMigrationTemplate()}
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    color: "#334155",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.75rem",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Descargar Plantilla
                </button>
              </div>

              {/* Dropzone */}
              <div
                className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  const droppedFiles = e.dataTransfer.files;
                  if (droppedFiles && droppedFiles[0]) {
                    handleFileSelect(droppedFiles[0]);
                  }
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept=".xlsx, .xls"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files[0]) handleFileSelect(files[0]);
                  }}
                />
                <div
                  style={{
                    width: "3rem",
                    height: "3rem",
                    borderRadius: "1rem",
                    backgroundColor: "rgba(65, 71, 235, 0.08)",
                    color: "var(--color-primary, #4147eb)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1rem auto",
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.25rem 0" }}>
                  {loading ? "Analizando archivo..." : "Arrastra tu Excel aquí o haz clic para subir"}
                </h3>
                <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>
                  Formatos soportados: .xlsx y .xls (Máximo 10MB)
                </p>
              </div>
            </>
          )}

          {step === 2 && preview && (
            <>
              {/* Tarjetas de Semáforo */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                <div style={{ backgroundColor: "#ffffff", padding: "0.875rem", borderRadius: "0.875rem", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669", display: "block" }}>VÁLIDOS</span>
                  <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>{preview.validLoansCount}</span>
                  <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Listos para ingresar</span>
                </div>

                <div style={{ backgroundColor: "#ffffff", padding: "0.875rem", borderRadius: "0.875rem", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#d97706", display: "block" }}>CLIENTES EXISTENTES</span>
                  <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>{preview.warningLoansCount}</span>
                  <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Se reutiliza ficha</span>
                </div>

                <div style={{ backgroundColor: "#ffffff", padding: "0.875rem", borderRadius: "0.875rem", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#dc2626", display: "block" }}>CON ERRORES</span>
                  <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>{preview.errorLoansCount}</span>
                  <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Requieren corrección</span>
                </div>
              </div>

              {/* Selector de Pestañas Preview */}
              <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setActiveTab("loans")}
                  style={{
                    padding: "0.375rem 0.875rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    backgroundColor: activeTab === "loans" ? "var(--color-primary, #4147eb)" : "transparent",
                    color: activeTab === "loans" ? "white" : "#64748b",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Hoja 1: Préstamos ({preview.loans.length})
                </button>
                {preview.hasPaymentsSheet && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("payments")}
                    style={{
                      padding: "0.375rem 0.875rem",
                      borderRadius: "0.5rem",
                      border: "none",
                      backgroundColor: activeTab === "payments" ? "var(--color-primary, #4147eb)" : "transparent",
                      color: activeTab === "payments" ? "white" : "#64748b",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Hoja 2: Pagos ({preview.payments.length})
                  </button>
                )}
              </div>

              {/* Contenido Tabla Préstamos */}
              {activeTab === "loans" && (
                <div className={styles.tableContainer} style={{ maxHeight: "350px", overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", textAlign: "left" }}>
                    <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 1 }}>
                      <tr>
                        <th style={{ padding: "0.625rem 0.75rem", color: "#475569", fontWeight: 700 }}>REF / DNI</th>
                        <th style={{ padding: "0.625rem 0.75rem", color: "#475569", fontWeight: 700 }}>CLIENTE</th>
                        <th style={{ padding: "0.625rem 0.75rem", color: "#475569", fontWeight: 700 }}>TOTAL / SALDO</th>
                        <th style={{ padding: "0.625rem 0.75rem", color: "#475569", fontWeight: 700 }}>ESTADO</th>
                        <th style={{ padding: "0.625rem 0.75rem", color: "#475569", fontWeight: 700 }}>COBRADOR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.loans.map((loan, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: !loan.isValid ? "#fef2f2" : "transparent" }}>
                          <td style={{ padding: "0.625rem 0.75rem" }}>
                            <span style={{ fontWeight: 700, color: "#1e293b", display: "block" }}>{loan.codigoRef}</span>
                            <span style={{ color: "#64748b", fontSize: "11px" }}>{loan.dniCliente}</span>
                          </td>
                          <td style={{ padding: "0.625rem 0.75rem" }}>
                            <span style={{ fontWeight: 600, color: "#334155", display: "block" }}>{loan.nombresApellidos}</span>
                            {loan.isExistingClient && (
                              <span style={{ fontSize: "10px", color: "#d97706", fontWeight: 700 }}>Cliente Recurrente</span>
                            )}
                            {!loan.isValid && (
                              <span style={{ fontSize: "10px", color: "#dc2626", display: "block", fontWeight: 600 }}>
                                {loan.errors.join(" | ")}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "0.625rem 0.75rem" }}>
                            <span style={{ fontWeight: 700, color: "#0f172a", display: "block" }}>{formatMoney(loan.totalPagar)}</span>
                            <span style={{ color: "var(--color-primary, #4147eb)", fontSize: "11px", fontWeight: 600 }}>
                              Saldo: {formatMoney(loan.saldoPendiente)}
                            </span>
                          </td>
                          <td style={{ padding: "0.625rem 0.75rem" }}>
                            <span className={`${styles.badge} ${loan.statusResultante === "Activo" ? styles.badgeSuccess : styles.badgeWarning}`}>
                              {loan.statusResultante}
                            </span>
                          </td>
                          <td style={{ padding: "0.625rem 0.75rem" }}>
                            <select
                              value={collectorOverrides[loan.codigoRef] ?? loan.cobradorId ?? ""}
                              onChange={(e) => handleCollectorChange(loan.codigoRef, e.target.value)}
                              style={{
                                fontSize: "11px",
                                padding: "0.25rem 0.5rem",
                                borderRadius: "0.5rem",
                                border: !loan.cobradorId && !collectorOverrides[loan.codigoRef]
                                  ? "1px solid #ef4444"
                                  : "1px solid #cbd5e1",
                                backgroundColor: "white",
                                color: !loan.cobradorId && !collectorOverrides[loan.codigoRef]
                                  ? "#dc2626"
                                  : "#1e293b",
                                maxWidth: "150px",
                              }}
                            >
                              <option value="">-- Seleccione --</option>
                              {Array.from(
                                new Map(
                                  preview.availableCollectors.map((c) => [c.username.toLowerCase(), c])
                                ).values()
                              ).map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.fullName && c.fullName !== c.username
                                    ? `${c.fullName} (${c.username})`
                                    : c.username}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Contenido Tabla Pagos */}
              {activeTab === "payments" && (
                <div className={styles.tableContainer} style={{ maxHeight: "350px", overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", textAlign: "left" }}>
                    <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 1 }}>
                      <tr>
                        <th style={{ padding: "0.625rem 0.75rem", color: "#475569", fontWeight: 700 }}>REF PRÉSTAMO</th>
                        <th style={{ padding: "0.625rem 0.75rem", color: "#475569", fontWeight: 700 }}>FECHA PAGO</th>
                        <th style={{ padding: "0.625rem 0.75rem", color: "#475569", fontWeight: 700 }}>MONTO</th>
                        <th style={{ padding: "0.625rem 0.75rem", color: "#475569", fontWeight: 700 }}>MÉTODO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.payments.map((pay, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: !pay.isValid ? "#fef2f2" : "transparent" }}>
                          <td style={{ padding: "0.625rem 0.75rem", fontWeight: 700, color: "#1e293b" }}>{pay.codigoRef}</td>
                          <td style={{ padding: "0.625rem 0.75rem", color: "#475569" }}>{pay.fechaPago}</td>
                          <td style={{ padding: "0.625rem 0.75rem", fontWeight: 700, color: "#059669" }}>{formatMoney(pay.montoAbonado)}</td>
                          <td style={{ padding: "0.625rem 0.75rem" }}>
                            <span style={{ fontSize: "11px", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "0.375rem", backgroundColor: pay.metodoPago === "YAPE" ? "#fdf2f8" : "#f1f5f9", color: pay.metodoPago === "YAPE" ? "#db2777" : "#475569" }}>
                              {pay.metodoPago}
                            </span>
                            {!pay.isValid && (
                              <span style={{ fontSize: "10px", color: "#dc2626", display: "block", marginTop: "2px" }}>
                                {pay.errors.join(" | ")}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className={styles.footer}>
          {step === 2 && (
            <button
              type="button"
              onClick={handleReset}
              disabled={executing}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.75rem",
                border: "1px solid #cbd5e1",
                backgroundColor: "white",
                color: "#475569",
                fontSize: "0.75rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Subir otro archivo
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            disabled={executing}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid #cbd5e1",
              backgroundColor: "white",
              color: "#475569",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>

          {step === 2 && (
            <button
              type="button"
              onClick={handleExecuteMigration}
              disabled={executing || preview?.errorLoansCount! > 0}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "0.75rem",
                border: "none",
                backgroundColor: preview?.errorLoansCount! > 0 ? "#94a3b8" : "var(--color-primary, #4147eb)",
                color: "white",
                fontSize: "0.75rem",
                fontWeight: 700,
                cursor: preview?.errorLoansCount! > 0 || executing ? "not-allowed" : "pointer",
                boxShadow: "0 2px 4px rgba(65, 71, 235, 0.2)",
              }}
            >
              {executing ? "Importando Cartera..." : "Confirmar e Importar Cartera"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
