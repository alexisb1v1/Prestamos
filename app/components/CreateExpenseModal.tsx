"use client";

import { useState, useEffect } from "react";
import { createExpenseUseCase } from "@/app/features/expenses";
import { authService } from "@/lib/auth";
import { ChevronLeft } from "lucide-react";

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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        backgroundColor: isMobile ? "rgba(15, 23, 42, 0.8)" : "rgba(15, 23, 42, 0.4)",
        display: "flex",
        justifyContent: isMobile ? "center" : "flex-end",
        alignItems: isMobile ? "flex-end" : "stretch",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: isMobile ? "100%" : "420px",
          backgroundColor: "#f8fafc",
          height: "100%",
          maxHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          animation: isMobile ? "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" : "slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          overflowY: "auto",
          boxShadow: isMobile ? "none" : "-10px 0 30px rgba(0,0,0,0.15)",
        }}
      >
        <style>
          {`
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
            @keyframes slideLeft {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}
        </style>

        {/* TopBar */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            backgroundColor: "rgba(248, 250, 252, 0.9)",
            backdropFilter: "blur(12px)",
            padding: "1rem",
            borderBottom: "1px solid rgba(226, 232, 240, 0.7)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              onClick={onClose}
              style={{
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "9999px",
                backgroundColor: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#475569",
                border: "1px solid rgba(226, 232, 240, 0.8)",
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                cursor: "pointer",
              }}
            >
              <ChevronLeft size={20} strokeWidth={2.2} />
            </button>
            <div style={{ textAlign: "center", flex: 1, padding: "0 0.5rem" }}>
              <h1 style={{ fontSize: "1rem", fontWeight: "bold", color: "#0f172a", margin: 0, lineHeight: 1.2 }}>
                Registrar Gasto
              </h1>
              <p style={{ fontSize: "0.6875rem", fontWeight: 500, color: "#64748b", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", marginTop: "2px", textTransform: "capitalize" }}>
                <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#10b981" }}></span>
                {todayDate}
              </p>
            </div>
            <div style={{ width: "2.5rem" }}></div> {/* Placeholder for balance */}
          </div>
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
              backgroundColor: loading ? "#94a3b8" : "#4147eb",
              color: "white",
              fontWeight: "bold",
              fontSize: "0.875rem",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.2)",
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
