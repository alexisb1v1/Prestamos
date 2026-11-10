"use client";

import React, { useState, useEffect } from "react";
import { Landmark, ArrowRight, ShieldCheck, DollarSign, Sparkles } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { CompanyRepositoryImpl } from "@/app/features/companies/repositories/company.repository.impl";

const companyRepo = new CompanyRepositoryImpl();

export default function InitialCapitalModal() {
  const { user, isAdmin } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Solo aplica para administradores
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const checkCompanyCapital = async () => {
      try {
        const res = await companyRepo.getMyCompany();
        if (res.isOk()) {
          const comp = res.value;
          // Si initialCapital es null o undefined (o 0 sin historial), requerir onboarding obligatorio
          const hasCapital =
            comp.initialCapital !== null &&
            comp.initialCapital !== undefined &&
            Number(comp.initialCapital) > 0;

          if (!hasCapital) {
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error("Error validando capital inicial:", err);
      } finally {
        setLoading(false);
      }
    };

    checkCompanyCapital();
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Por favor ingresa un monto válido mayor a cero (ej. 2000)");
      return;
    }

    try {
      setSaving(true);
      const res = await companyRepo.updateCapital(
        numericAmount,
        note.trim() || "Declaración de capital inicial de operaciones",
      );

      if (res.isOk()) {
        setIsOpen(false);
        // Recargar la ventana suavemente para sincronizar métricas y reportes
        window.location.reload();
      } else {
        setError("Error al registrar el capital inicial. Intenta nuevamente.");
      }
    } catch (err) {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !isAdmin) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "stretch",
        justifyContent: isMobile ? "center" : "flex-end", // En Desktop se alinea al lado derecho
      }}
    >
      {/* Contenedor Modal: Pantalla completa en Mobile (< 768px) o Drawer Lateral Derecho en Desktop (>= 768px) */}
      <div
        style={{
          width: isMobile ? "100vw" : "480px",
          maxWidth: isMobile ? "100vw" : "100%",
          height: "100vh",
          maxHeight: "100vh",
          overflowY: "auto",
          backgroundColor: "#ffffff",
          borderRadius: "0px",
          padding: isMobile ? "36px 20px 28px" : "48px 36px 36px",
          boxShadow: isMobile ? "none" : "-10px 0 35px rgba(0, 0, 0, 0.2)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: "24px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Cabecera / Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, var(--color-primary, #4147eb), #312e81)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 8px 16px -4px color-mix(in srgb, var(--color-primary, #4147eb) 40%, transparent)",
            }}
          >
            <Landmark size={24} />
          </div>
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--color-primary, #4147eb)",
              }}
            >
              Onboarding Financiero
            </div>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: "#0f172a",
                margin: 0,
              }}
            >
              Fondo de Capital Inicial
            </h2>
          </div>
        </div>

        {/* Mensaje descriptivo */}
        <p style={{ fontSize: "14px", color: "#475569", lineHeight: 1.5, margin: 0 }}>
          Bienvenido al portal de administración. Para activar el libro de caja, cuadre de cobros y tus reportes de patrimonio,
          declara el <strong>monto total de dinero</strong> con el que inicia tu financiera o ruta de préstamos.
        </p>

        {/* Formulario Obligatorio (Sin botón cerrar) */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 600,
                color: "#1e293b",
                marginBottom: "8px",
              }}
            >
              Capital Inicial de Trabajo (S/) *
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#64748b",
                }}
              >
                S/
              </span>
              <input
                type="number"
                step="0.01"
                min="1"
                autoFocus
                required
                placeholder="Ej. 2000.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 42px",
                  fontSize: "18px",
                  fontWeight: 700,
                  borderRadius: "12px",
                  border: "1.5px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                  color: "#0f172a",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 600,
                color: "#64748b",
                marginBottom: "6px",
              }}
            >
              Nota u Observación (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Fondo de apertura en Yape / Efectivo"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: "13px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#f8fafc",
                color: "#1e293b",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                color: "#991b1b",
                border: "1px solid #fecaca",
                padding: "10px 12px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "12px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            <ShieldCheck size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: "2px" }} />
            <span style={{ fontSize: "12px", color: "#166534", lineHeight: 1.5 }}>
              <strong>Nota Importante:</strong> Este valor quedará registrado como el inicio de tu historial de inversión. <strong>Podrás modificar o inyectar más capital en cualquier momento desde el menú "Configuración de Empresa"</strong>, donde se guardará el registro cronológico detallado de cada aporte.
            </span>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              width: "100%",
              padding: "14px 20px",
              background: "linear-gradient(135deg, var(--color-primary, #4147eb), #312e81)",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              fontSize: "15px",
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 10px 20px -5px color-mix(in srgb, var(--color-primary, #4147eb) 40%, transparent)",
              transition: "transform 0.15s ease",
            }}
          >
            {saving ? (
              <span>Registrando fondo...</span>
            ) : (
              <>
                <span>Declarar Capital y Empezar</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}

