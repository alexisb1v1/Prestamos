"use client";

import { useState, useEffect } from "react";
import {
  getAllCompaniesUseCase,
  companyMutationsUseCase,
  Company,
} from "@/app/features/companies";
import CreateCompanyModal from "@/app/components/CreateCompanyModal";
import ConfirmModal from "@/app/components/ConfirmModal";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { logger } from "@/lib/logging-service";
import { RotateCcw, ShieldCheck } from "lucide-react";

interface MobileCompanyCardProps {
  company: Company;
  onEdit: (company: Company) => void;
  onToggleStatus: (company: Company) => void;
  onRefreshKeyToken: (company: Company) => void;
  getStatusColor: (status: string) => { bg: string; text: string };
}

const MobileCompanyCard = ({
  company,
  onEdit,
  onToggleStatus,
  onRefreshKeyToken,
  getStatusColor,
}: MobileCompanyCardProps) => (
  <div className="card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "1rem",
      }}
    >
      <div>
        <div
          style={{
            fontWeight: "800",
            fontSize: "1.1rem",
            color: "var(--text-primary)",
          }}
        >
          {company.companyName}
        </div>
        {company.subdomain && (
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
            {company.subdomain}.neocobros.com
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.4rem" }}>
          {company.label && (
            <span
              style={{
                display: "inline-block",
                padding: "0.2rem 0.6rem",
                backgroundColor: "var(--bg-app)",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: "700",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-color)",
              }}
            >
              {company.label}
            </span>
          )}
          {company.settings?.features?.risk_scoring && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.2rem 0.6rem",
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                color: "#10b981",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: "700",
                border: "1px solid rgba(16, 185, 129, 0.25)",
              }}
            >
              <ShieldCheck size={12} />
              Scoring Activo
            </span>
          )}
        </div>
      </div>
      <span
        style={{
          padding: "0.35rem 0.75rem",
          borderRadius: "999px",
          fontSize: "0.7rem",
          fontWeight: "800",
          backgroundColor: getStatusColor(company.status).bg,
          color: getStatusColor(company.status).text,
          letterSpacing: "0.025em",
        }}
      >
        {company.status === "ACTIVE"
          ? "ACTIVA"
          : company.status === "SUSPENDED" || company.status === "SUSPENDIDO"
            ? "SUSPENDIDA"
            : "INACTIVA"}
      </span>
    </div>

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: "1rem",
        borderTop: "1px solid var(--border-color)",
      }}
    >
      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
        Registrada: {new Date(company.createdAt).toLocaleDateString()}
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() => onRefreshKeyToken(company)}
          className="btn-icon"
          title="Regenerar Llave de Seguridad (Kill-Switch: Forzar Cierre de Sesiones)"
          style={{
            padding: "0.5rem",
            borderRadius: "0.75rem",
            color: "#f59e0b",
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
          }}
        >
          <RotateCcw size={18} />
        </button>
        <button
          onClick={() => onEdit(company)}
          className="btn-icon primary"
          style={{ padding: "0.5rem", borderRadius: "0.75rem" }}
        >
          <svg
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
        <button
          onClick={() => onToggleStatus(company)}
          className={`btn-icon ${company.status === "ACTIVE" ? "danger" : "success"}`}
          style={{ padding: "0.5rem", borderRadius: "0.75rem" }}
        >
          {company.status === "ACTIVE" ? (
            <svg
              width="20"
              height="20"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  </div>
);

export default function EmpresasPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    company: Company | null;
    targetStatus: string;
  }>({ isOpen: false, company: null, targetStatus: "" });
  const [keyTokenConfirmation, setKeyTokenConfirmation] = useState<{
    isOpen: boolean;
    company: Company | null;
  }>({ isOpen: false, company: null });
  const [keyTokenLoading, setKeyTokenLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const result = await getAllCompaniesUseCase.execute();
      result.match(
        (data) => setCompanies(data),
        () => {
          logger.error("Error loading companies");
          setError("Error al cargar la lista de empresas.");
        },
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter(
    (c) =>
      c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.label?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleStatusUpdate = async () => {
    if (!confirmation.company || !confirmation.targetStatus) return;
    try {
      setLoading(true);
      const result = await companyMutationsUseCase.updateStatus(
        confirmation.company.id,
        confirmation.targetStatus,
      );

      result.match(
        () => {
          loadCompanies();
          setConfirmation({ isOpen: false, company: null, targetStatus: "" });
        },
        (err) => {
          logger.error("Error updating status:", err);
          setError(
            "Error al actualizar el estado de la empresa: " + err.message,
          );
        },
      );
    } catch {
      setError("Error al actualizar el estado de la empresa.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshKeyToken = async () => {
    if (!keyTokenConfirmation.company) return;
    try {
      setKeyTokenLoading(true);
      setError("");
      const result = await companyMutationsUseCase.refreshKeyToken(
        keyTokenConfirmation.company.id,
      );

      result.match(
        () => {
          const compName = keyTokenConfirmation.company?.companyName;
          setSuccessMessage(
            `Llave de seguridad rotada exitosamente para "${compName}". Todas las sesiones activas han sido revocadas al instante.`,
          );
          setKeyTokenConfirmation({ isOpen: false, company: null });
          loadCompanies();
          setTimeout(() => setSuccessMessage(""), 6000);
        },
        (err) => {
          logger.error("Error refreshing key token:", err);
          setError("Error al regenerar la llave de seguridad: " + err.message);
        },
      );
    } catch {
      setError("Error al regenerar la llave de seguridad.");
    } finally {
      setKeyTokenLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return { bg: "rgba(34, 197, 94, 0.1)", text: "var(--color-success)" };
      case "INACTIVE":
        return { bg: "rgba(239, 68, 68, 0.1)", text: "var(--color-danger)" };
      case "SUSPENDED":
      case "SUSPENDIDO":
        return { bg: "rgba(245, 158, 11, 0.1)", text: "#f59e0b" };
      default:
        return { bg: "var(--bg-app)", text: "var(--text-secondary)" };
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Sticky Header Section for Mobile */}
      <div
        style={{
          position: isMobile ? "sticky" : "static",
          top: isMobile ? "0" : "auto",
          zIndex: isMobile ? 30 : "auto",
          backgroundColor: isMobile ? "var(--bg-app)" : "transparent",
          margin: isMobile ? "0 -1rem 0.5rem -1rem" : "0 0 2rem 0",
          padding: isMobile ? "0.5rem 1rem" : "0",
          borderBottom: isMobile ? "1px solid var(--border-color)" : "none",
          boxShadow: isMobile ? "0 4px 6px -1px rgba(0,0,0,0.05)" : "none",
          transition: "all 0.3s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: isMobile ? "0.5rem" : "2rem",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: isMobile ? "1.25rem" : "1.875rem",
                fontWeight: "bold",
              }}
            >
              Empresas
            </h1>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingCompany(null);
              setIsModalOpen(true);
            }}
            style={{
              width: "auto",
              whiteSpace: "nowrap",
              padding: isMobile ? "0.4rem 0.75rem" : "0.5rem 1rem",
              fontSize: isMobile ? "0.8rem" : "1rem",
            }}
          >
            + Nueva {isMobile ? "" : "Empresa"}
          </button>
        </div>

        {/* Search / Filters - Part of Sticky Header */}
        <div
          className={isMobile ? "" : "card"}
          style={{
            marginBottom: isMobile ? "0" : "2rem",
            padding: isMobile ? "0" : "1.5rem",
            backgroundColor: isMobile ? "transparent" : "var(--bg-card)",
            border: isMobile ? "none" : "1px solid var(--border-color)",
            boxShadow: isMobile ? "none" : "var(--shadow-sm)",
          }}
        >
          <div style={{ width: "100%" }}>
            <input
              type="text"
              className="input"
              placeholder="Buscar por nombre o etiqueta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                maxWidth: isMobile ? "none" : "500px",
                height: "3rem",
                backgroundColor: isMobile ? "var(--bg-card)" : "var(--bg-app)",
              }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1.5rem",
            backgroundColor: "rgba(220, 38, 38, 0.1)",
            border: "1px solid var(--color-danger)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-danger)",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1.5rem",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            border: "1px solid #10b981",
            borderRadius: "var(--radius-md)",
            color: "#059669",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <ShieldCheck size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {loading ? (
            <LoadingSpinner message="Cargando datos..." />
          ) : filteredCompanies.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              No se encontraron registros.
            </div>
          ) : (
            filteredCompanies.map((company) => (
              <MobileCompanyCard
                key={company.id}
                company={company}
                onEdit={(c) => {
                  setEditingCompany(c);
                  setIsModalOpen(true);
                }}
                onToggleStatus={(c) =>
                  setConfirmation({
                    isOpen: true,
                    company: c,
                    targetStatus: c.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                  })
                }
                onRefreshKeyToken={(c) =>
                  setKeyTokenConfirmation({
                    isOpen: true,
                    company: c,
                  })
                }
                getStatusColor={getStatusColor}
              />
            ))
          )}
        </div>
      ) : (
        /* Desktop View: Table */
        <div
          className="card"
          style={{
            padding: 0,
            overflow: "hidden",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "800px",
              }}
            >
              <thead
                style={{ backgroundColor: "var(--bg-app)", textAlign: "left" }}
              >
                <tr>
                  <th style={{ padding: "1rem" }}>Empresa</th>
                  <th style={{ padding: "1rem" }}>Subdominio</th>
                  <th style={{ padding: "1rem" }}>Etiqueta</th>
                  <th style={{ padding: "1rem" }}>Estado</th>
                  <th style={{ padding: "1rem" }}>Fecha Registro</th>
                  <th style={{ padding: "1rem", textAlign: "right" }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6}>
                      <LoadingSpinner message="Cargando datos..." />
                    </td>
                  </tr>
                ) : filteredCompanies.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: "4rem",
                        textAlign: "center",
                        color: "var(--text-secondary)",
                        fontWeight: 500,
                      }}
                    >
                      No se encontraron registros.
                    </td>
                  </tr>
                ) : (
                  filteredCompanies.map((company) => (
                    <tr
                      key={company.id}
                      style={{
                        borderTop: "1px solid var(--border-color)",
                        transition: "background-color 0.2s",
                      }}
                    >
                      <td style={{ padding: "1.5rem" }}>
                        <div
                          style={{
                            fontWeight: "700",
                            color: "var(--text-primary)",
                            fontSize: "1.05rem",
                          }}
                        >
                          {company.companyName}
                        </div>
                        {company.settings?.features?.risk_scoring && (
                          <div style={{ marginTop: "0.35rem" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                padding: "0.15rem 0.5rem",
                                backgroundColor: "rgba(16, 185, 129, 0.1)",
                                color: "#10b981",
                                borderRadius: "6px",
                                fontSize: "0.72rem",
                                fontWeight: "700",
                                border: "1px solid rgba(16, 185, 129, 0.25)",
                              }}
                            >
                              <ShieldCheck size={12} />
                              Central de Riesgos
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "1.5rem" }}>
                        {company.subdomain ? (
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                            {company.subdomain}.neocobros.com
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: "1.5rem" }}>
                        {company.label ? (
                          <span
                            style={{
                              padding: "0.3rem 0.75rem",
                              backgroundColor: "var(--bg-app)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "8px",
                              fontSize: "0.8rem",
                              fontWeight: "800",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {company.label}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span
                          style={{
                            padding: "0.4rem 1rem",
                            borderRadius: "999px",
                            fontSize: "0.8rem",
                            fontWeight: "700",
                            backgroundColor: getStatusColor(company.status).bg,
                            color: getStatusColor(company.status).text,
                            letterSpacing: "0.025em",
                          }}
                        >
                          {company.status === "ACTIVE"
                            ? "ACTIVA"
                            : company.status === "SUSPENDED" ||
                                company.status === "SUSPENDIDO"
                              ? "SUSPENDIDA"
                              : "INACTIVA"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "1rem",
                          color: "var(--text-secondary)",
                          fontSize: "0.9rem",
                          fontWeight: 500,
                        }}
                      >
                        {new Date(company.createdAt).toLocaleDateString()}
                      </td>
                      <td
                        style={{ padding: "0.75rem 1rem", textAlign: "right" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            onClick={() =>
                              setKeyTokenConfirmation({
                                isOpen: true,
                                company,
                              })
                            }
                            className="btn-icon"
                            title="Regenerar Llave de Seguridad (Kill-Switch: Forzar Cierre de Sesiones)"
                            style={{
                              padding: "0.6rem",
                              borderRadius: "10px",
                              color: "#f59e0b",
                              backgroundColor: "rgba(245, 158, 11, 0.1)",
                              border: "1px solid rgba(245, 158, 11, 0.25)",
                            }}
                          >
                            <RotateCcw size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingCompany(company);
                              setIsModalOpen(true);
                            }}
                            className="btn-icon primary"
                            title="Editar"
                            style={{ padding: "0.6rem", borderRadius: "10px" }}
                          >
                            <svg
                              width="20"
                              height="20"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() =>
                              setConfirmation({
                                isOpen: true,
                                company,
                                targetStatus:
                                  company.status === "ACTIVE"
                                    ? "INACTIVE"
                                    : "ACTIVE",
                              })
                            }
                            className={`btn-icon ${company.status === "ACTIVE" ? "danger" : "success"}`}
                            title={
                              company.status === "ACTIVE"
                                ? "Desactivar"
                                : "Activar"
                            }
                            style={{ padding: "0.6rem", borderRadius: "10px" }}
                          >
                            {company.status === "ACTIVE" ? (
                              <svg
                                width="20"
                                height="20"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            ) : (
                              <svg
                                width="20"
                                height="20"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateCompanyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadCompanies}
        companyToEdit={editingCompany}
      />

      <ConfirmModal
        isOpen={confirmation.isOpen}
        onClose={() =>
          setConfirmation({ isOpen: false, company: null, targetStatus: "" })
        }
        onConfirm={handleStatusUpdate}
        title={
          confirmation.targetStatus === "ACTIVE"
            ? "Activar Empresa"
            : "Desactivar Empresa"
        }
        message={`¿Estás seguro de que deseas ${confirmation.targetStatus === "ACTIVE" ? "activar" : "desactivar"} la empresa "${confirmation.company?.companyName}"?`}
      />

      <ConfirmModal
        isOpen={keyTokenConfirmation.isOpen}
        onClose={() =>
          setKeyTokenConfirmation({ isOpen: false, company: null })
        }
        onConfirm={handleRefreshKeyToken}
        title="Regenerar Llave de Seguridad (Kill-Switch)"
        message={`¿Estás seguro de regenerar el token de seguridad para la empresa "${keyTokenConfirmation.company?.companyName}"? Al confirmar, la clave secreta del tenant se actualizará en la base de datos y la caché en Redis será eliminada de inmediato. Todas las sesiones activas de cobradores y administradores de esta empresa serán cerradas forzosamente en todos sus dispositivos al instante.`}
        confirmText="Regenerar y Cerrar Sesiones"
        cancelText="Cancelar"
        isDestructive={true}
        isLoading={keyTokenLoading}
      />
    </div>
  );
}
