"use client";

import { useState, useEffect } from "react";
import { companyMutationsUseCase, Company } from "@/app/features/companies";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companyToEdit?: Company | null;
}

export default function CreateCompanyModal({
  isOpen,
  onClose,
  onSuccess,
  companyToEdit,
}: Props) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (companyToEdit) {
      setName(companyToEdit.companyName);
      setLabel(companyToEdit.label || "");
      setSubdomain(companyToEdit.subdomain || "");
    } else {
      setName("");
      setLabel("");
      setSubdomain("");
    }
    setError("");
  }, [companyToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = companyToEdit
        ? await companyMutationsUseCase.update(companyToEdit.id, {
            companyName: name,
            subdomain: subdomain || undefined,
          })
        : await companyMutationsUseCase.create({
            companyName: name,
            label: label || undefined,
            subdomain: subdomain || undefined,
          });

      result.match(
        () => {
          onSuccess();
          onClose();
        },
        (err) => {
          setError(err.message || "Error al procesar la solicitud");
        },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="create-company-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="create-company-modal">
        <h2 className="create-company-title">
          {companyToEdit ? "Editar Empresa" : "Nueva Empresa"}
        </h2>
        <p className="create-company-subtitle">
          {companyToEdit
            ? "Actualiza la información de la empresa."
            : "Crea una nueva organización en el sistema."}
        </p>

        <form onSubmit={handleSubmit} className="create-company-form">
          <div>
            <label className="label">Nombre de la Empresa</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Inversiones Globales S.A.C."
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="label">Subdominio</label>
            <div style={{ display: "flex" }}>
              <input
                type="text"
                className="input"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="mi-empresa"
                required
                disabled={loading}
                style={{ flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 1rem",
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderLeft: "none",
                  borderTopRightRadius: "8px",
                  borderBottomRightRadius: "8px",
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                  fontSize: "0.95rem"
                }}
              >
                .neocobros.com
              </div>
            </div>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--text-secondary)",
                marginTop: "0.25rem",
              }}
            >
              Usado para el acceso de los clientes (ej: mi-empresa.neocobros.com)
            </p>
          </div>

          {!companyToEdit && (
            <div>
              <label className="label">Etiqueta (Opcional)</label>
              <input
                type="text"
                className="input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ej: IG"
                maxLength={5}
                disabled={loading}
              />
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  marginTop: "0.25rem",
                }}
              >
                Nombre corto para identificar rápido a la empresa.
              </p>
            </div>
          )}

          {error && (
            <div
              style={{
                color: "var(--color-danger)",
                fontSize: "0.875rem",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          <div className="create-company-actions">
            <button
              type="button"
              className="btn"
              onClick={onClose}
              disabled={loading}
              style={{ border: "1px solid var(--border-color)" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !name}
            >
              {loading
                ? "Procesando..."
                : companyToEdit
                  ? "Guardar Cambios"
                  : "Crear Empresa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
