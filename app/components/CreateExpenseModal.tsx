"use client";

import { useState, useEffect } from "react";
import { createExpenseUseCase } from "@/app/features/expenses";
import { authService } from "@/lib/auth";
import { X, Receipt } from "lucide-react";
import styles from "./CreateLoanModal.module.css";

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateExpenseModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateExpenseModalProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    const timer = setTimeout(checkMobile, 0);
    window.addEventListener("resize", checkMobile);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    try {
      setLoading(true);
      const user = authService.getUser();
      if (!user) throw new Error("No user found");

      const result = await createExpenseUseCase.execute({
        description,
        amount: parseFloat(amount),
        userId: user.id,
        companyId: user.idCompany,
      });

      result.match(
        () => {
          setDescription("");
          setAmount("");
          setSelectedSuggestion(null);
          onSuccess();
          onClose();
        },
        (err) => {
          console.error("Error creating expense:", err);
          alert(`Error al registrar el gasto: ${err.message}`);
        },
      );
    } catch (error) {
      console.error("Unexpected error creating expense:", error);
      alert("Error inesperado al registrar el gasto");
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    { label: "⛽ Gasolina", value: "Combustible / Gasolina" },
    { label: "🍽️ Almuerzo / Comida", value: "Almuerzo / Comida" },
    { label: "🔧 Taller / Moto", value: "Taller / Moto" },
    { label: "🎫 Pasajes / Peaje", value: "Pasajes / Peaje" },
    { label: "⚙️ Mantenimiento", value: "Mantenimiento" },
    { label: "⚠️ Imprevisto", value: "Imprevisto" },
  ];

  const handleSuggestionClick = (val: string) => {
    setDescription(val);
    setSelectedSuggestion(val);
  };

  // Obtenemos la fecha de hoy para mostrarla en el header
  const todayDate = new Date().toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "short"
  });

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>

        {/* TopBar Homologada */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconContainer}>
              <Receipt size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className={styles.title}>Registrar Gasto</h1>
              <p className={styles.subtitle}>
                Registro manual de salida
              </p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            <X size={18} strokeWidth={2.5} />
          </button>
        </header>

        {/* Form Content */}
        <main style={{ flex: 1, padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem", overflowX: "hidden" }}>
          
          <form id="expense-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Amount Card */}
            <section
              style={{
                backgroundColor: "white",
                borderRadius: "1rem",
                padding: "1rem",
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                border: "1px solid rgba(226, 232, 240, 0.8)",
              }}
            >
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
                Monto del Gasto
              </label>
              <div style={{ display: "flex", alignItems: "center", marginTop: "0.5rem" }}>
                <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#4f46e5", marginRight: "0.5rem", userSelect: "none" }}>
                  S/
                </span>
                <input
                  type="number"
                  step="0.10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  style={{
                    width: "100%",
                    fontSize: "1.875rem",
                    fontWeight: 800,
                    color: "#0f172a",
                    border: "none",
                    padding: 0,
                    outline: "none",
                    backgroundColor: "transparent",
                    letterSpacing: "-0.025em"
                  }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9", fontSize: "0.75rem", color: "#64748b" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#10b981", flexShrink: 0 }}>
                  <path d="M4.5 12.75l6 6 9-13.5"></path>
                </svg>
                <span>Se deducirá automáticamente de la caja.</span>
              </div>
            </section>

            {/* Description Card */}
            <section
              style={{
                backgroundColor: "white",
                borderRadius: "1rem",
                padding: "1rem",
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                border: "1px solid rgba(226, 232, 240, 0.8)",
              }}
            >
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>
                Descripción del Gasto
              </label>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setSelectedSuggestion(null);
                }}
                placeholder="Detalla el motivo del gasto o servicio pagado..."
                required
                rows={3}
                style={{
                  width: "100%",
                  fontSize: "0.875rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #e2e8f0",
                  padding: "0.75rem 0.875rem",
                  color: "#1e293b",
                  outline: "none",
                  resize: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit"
                }}
                onFocus={(e) => e.target.style.borderColor = "#4f46e5"}
                onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
              ></textarea>

              <div style={{ marginTop: "1rem" }}>
                <span style={{ display: "block", fontSize: "0.6875rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                  Sugerencias rápidas
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {suggestions.map((s) => {
                    const isSelected = selectedSuggestion === s.value;
                    return (
                      <button
                        type="button"
                        key={s.value}
                        onClick={() => handleSuggestionClick(s.value)}
                        style={{
                          padding: "0.375rem 0.75rem",
                          borderRadius: "9999px",
                          border: isSelected ? "2px solid #4f46e5" : "1px solid #e2e8f0",
                          backgroundColor: isSelected ? "#eef2ff" : "#f8fafc",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          color: isSelected ? "#312e81" : "#475569",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          textAlign: "left",
                        }}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </form>
        </main>

        {/* Footer actions */}
        <footer
          style={{
            position: "sticky",
            bottom: 0,
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid #e2e8f0",
            padding: "1rem",
            display: "flex",
            gap: "0.75rem",
            zIndex: 40,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: "1",
              padding: "0.875rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid #e2e8f0",
              backgroundColor: "white",
              color: "#334155",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Cancelar
          </button>
          <button
            form="expense-form"
            type="submit"
            disabled={loading}
            style={{
              flex: "2",
              padding: "0.875rem 1rem",
              borderRadius: "0.75rem",
              backgroundColor: loading ? "#94a3b8" : "var(--color-primary, #4147eb)",
              color: "white",
              fontWeight: "bold",
              fontSize: "0.875rem",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              boxShadow: "0 4px 6px -1px color-mix(in srgb, var(--color-primary, #4147eb) 20%, transparent)",
            }}
          >
            <span>{loading ? "Registrando..." : "Guardar Gasto"}</span>
            {!loading && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "white" }}>
                <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"></path>
              </svg>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
