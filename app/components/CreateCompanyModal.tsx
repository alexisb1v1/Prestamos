"use client";

import { useState, useEffect } from "react";
import { companyMutationsUseCase, Company } from "@/app/features/companies";
import { Building2, X, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import styles from "./CreateCompanyModal.module.css";

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
  const [riskScoringEnabled, setRiskScoringEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (companyToEdit) {
      setName(companyToEdit.companyName);
      setLabel(companyToEdit.label || "");
      setSubdomain(companyToEdit.subdomain || "");
      setRiskScoringEnabled(companyToEdit.settings?.features?.risk_scoring === true);
    } else {
      setName("");
      setLabel("");
      setSubdomain("");
      setRiskScoringEnabled(false);
    }
    setError("");
  }, [companyToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const settings = {
        ...(companyToEdit?.settings || {}),
        features: {
          ...(companyToEdit?.settings?.features || {}),
          risk_scoring: riskScoringEnabled,
        },
      };

      const result = companyToEdit
        ? await companyMutationsUseCase.update(companyToEdit.id, {
            companyName: name,
            subdomain: subdomain || undefined,
            settings,
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
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.modal}>
        {/* HEADER PRINCIPAL (Icono a la izquierda, cerrar a la derecha) */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconContainer}>
              <Building2 size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className={styles.title}>
                {companyToEdit ? "Editar Empresa" : "Nueva Empresa"}
              </h1>
              <p className={styles.subtitle}>
                {companyToEdit
                  ? "Actualiza la configuración y acceso de la empresa"
                  : "Crea una nueva organización en la plataforma"}
              </p>
            </div>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            type="button"
            disabled={loading}
            aria-label="Cerrar modal"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </header>

        {/* CONTENIDO SCROLLEABLE */}
        <div className={styles.contentWrapper}>
          {error && (
            <div className={styles.errorBanner}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form id="company-form" onSubmit={handleSubmit} className={styles.form}>
            {/* Campo: Nombre de la Empresa */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Nombre de la Empresa</span>
                <span className={styles.requiredTag}>Requerido</span>
              </label>
              <input
                type="text"
                className={styles.fieldInput}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Inversiones Globales S.A.C."
                required
                disabled={loading}
              />
            </div>

            {/* Campo: Subdominio */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Subdominio Multi-Tenant</span>
                <span className={styles.requiredTag}>Requerido</span>
              </label>
              <div className={styles.subdomainInputGroup}>
                <input
                  type="text"
                  className={styles.subdomainInput}
                  value={subdomain}
                  onChange={(e) =>
                    setSubdomain(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                    )
                  }
                  placeholder="mi-empresa"
                  required
                  disabled={loading}
                />
                <span className={styles.subdomainSuffix}>.neocobros.com</span>
              </div>
              <p className={styles.fieldHelper}>
                Acceso web directo:{" "}
                <strong>
                  https://{subdomain || "mi-empresa"}.neocobros.com
                </strong>
              </p>
            </div>

            {/* Campo: Etiqueta (solo en creación) */}
            {!companyToEdit && (
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  <span>Etiqueta Abreviada (Opcional)</span>
                </label>
                <input
                  type="text"
                  className={styles.fieldInput}
                  value={label}
                  onChange={(e) => setLabel(e.target.value.toUpperCase())}
                  placeholder="Ej: IG"
                  maxLength={5}
                  disabled={loading}
                />
                <p className={styles.fieldHelper}>
                  Acrónimo de 2 a 5 letras para identificar rápidamente a la empresa en badges.
                </p>
              </div>
            )}

            {/* Sección: Módulos & Configuración Dinámica */}
            <div
              className={`${styles.settingsCard} ${
                riskScoringEnabled ? styles.settingsCardActive : ""
              }`}
            >
              <div className={styles.settingsCardHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    className={`${styles.settingsIconBox} ${
                      riskScoringEnabled ? styles.settingsIconBoxActive : ""
                    }`}
                  >
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div className={styles.settingsTitleRow}>
                      <span>Central de Riesgos & Scoring</span>
                      {riskScoringEnabled && (
                        <span className={styles.activeBadge}>ACTIVO</span>
                      )}
                    </div>
                    <div className={styles.settingsDescription}>
                      Evaluación previa de morosidad y scoring crediticio (3 pilares) en tiempo real al crear préstamos.
                    </div>
                  </div>
                </div>

                {/* Switch Toggle */}
                <label className={styles.switchContainer}>
                  <input
                    type="checkbox"
                    className={styles.switchInput}
                    checked={riskScoringEnabled}
                    onChange={(e) => setRiskScoringEnabled(e.target.checked)}
                    disabled={loading}
                  />
                  <span
                    className={`${styles.switchSlider} ${
                      riskScoringEnabled ? styles.switchSliderActive : ""
                    }`}
                  >
                    <span
                      className={`${styles.switchKnob} ${
                        riskScoringEnabled ? styles.switchKnobActive : ""
                      }`}
                    />
                  </span>
                </label>
              </div>
            </div>
          </form>
        </div>

        {/* FOOTER PRINCIPAL */}
        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="company-form"
            className={styles.submitBtn}
            disabled={loading || !name.trim() || !subdomain.trim()}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading
              ? "Guardando..."
              : companyToEdit
              ? "Guardar Cambios"
              : "Crear Empresa"}
          </button>
        </footer>
      </div>
    </div>
  );
}
