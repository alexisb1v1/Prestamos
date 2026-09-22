"use client";

import { useState, useEffect } from "react";
import {
  X,
  AlertCircle,
  HelpCircle,
  ChevronLeft
} from "lucide-react";
import { paymentService } from "@/lib/paymentService";
import { Loan } from "@/lib/types";
import { authService } from "@/lib/auth";

interface CreatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  loan: Loan | null;
}

export default function CreatePaymentModal({
  isOpen,
  onClose,
  onSuccess,
  loan,
}: CreatePaymentModalProps) {
  // State for amount
  const [amount, setAmount] = useState<number | "">("");
  const [paymentType, setPaymentType] = useState<"EFECTIVO" | "YAPE">("YAPE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    const timer = setTimeout(checkMobile, 0);
    window.addEventListener("resize", checkMobile);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // When modal opens
  useEffect(() => {
    if (isOpen && loan) {
      setAmount(Math.round(loan.fee || 0));
      setError("");
      setPaymentType("YAPE");
    }
  }, [isOpen, loan]);

  const handlePayment = async () => {
    if (!loan || !amount) return;

    const user = authService.getUser();
    if (!user) {
      setError("Usuario no autenticado");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await paymentService.createInstallment({
        loanId: String(loan.id),
        amount: Number(Number(amount).toFixed(2)), // Ensure up to 2 decimals
        userId: String(user.id),
        paymentType: paymentType as any,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Error al registrar el pago.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !loan) return null;

  // Derived Values
  const initial = loan.clientName?.substring(0, 2).toUpperCase() || "CL";
  const remainingAmount = loan.remainingAmount ?? 0;
  
  // Predict new remaining balance
  const parsedAmount = Number(amount) || 0;
  const newRemainingAmount = Math.max(0, remainingAmount - parsedAmount);

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
            .shortcut-chip:active { transform: scale(0.95); }
          `}
        </style>

        {/* TopBar */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid #f1f5f9",
            padding: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              onClick={onClose}
              style={{
                width: "2.25rem",
                height: "2.25rem",
                borderRadius: "9999px",
                backgroundColor: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#334155",
                border: "none",
                cursor: "pointer"
              }}
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            <div style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: "1rem", fontWeight: "bold", color: "#0f172a", margin: 0 }}>Registrar Abono</h1>
              <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#4338ca" }}>
                Préstamo #{loan.id} • {loan.days} días
              </span>
            </div>
            <button
              style={{
                width: "2.25rem",
                height: "2.25rem",
                borderRadius: "9999px",
                backgroundColor: "#f8fafc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94a3b8",
                border: "none"
              }}
            >
              <HelpCircle size={20} />
            </button>
          </div>
        </header>

        {/* MainContent */}
        <main style={{ flex: 1, padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem", overflowX: "hidden" }}>
          
          {/* ClientContextCard */}
          <section
            style={{
              background: "linear-gradient(to bottom right, #4f46e5, #4338ca, #3730a3)",
              borderRadius: "1rem",
              padding: "1rem",
              color: "white",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
            }}
          >
            {/* Watermark circle */}
            <div style={{ position: "absolute", right: "-1.5rem", bottom: "-1.5rem", width: "7rem", height: "7rem", borderRadius: "9999px", backgroundColor: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
            
            <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem", backgroundColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1rem", border: "1px solid rgba(255,255,255,0.2)" }}>
                  {initial}
                </div>
                <div>
                  <h2 style={{ fontSize: "1rem", fontWeight: "bold", margin: 0, textTransform: "uppercase", letterSpacing: "-0.025em" }}>{loan.clientName}</h2>
                  <p style={{ fontSize: "0.75rem", color: "#c7d2fe", margin: "0.1rem 0 0 0" }}>DNI: {loan.documentNumber} • {loan.address}</p>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.15)" }}>
              <div style={{ backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "0.75rem", padding: "0.5rem 0.6rem" }}>
                <span style={{ fontSize: "0.6rem", color: "#c7d2fe", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500, display: "block" }}>Cuota del Día</span>
                <span style={{ fontSize: "0.875rem", fontWeight: "bold", color: "white" }}>S/ {loan.fee.toFixed(2)}</span>
              </div>
              <div style={{ backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "0.75rem", padding: "0.5rem 0.6rem" }}>
                <span style={{ fontSize: "0.6rem", color: "#c7d2fe", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500, display: "block" }}>Saldo Pendiente</span>
                <span style={{ fontSize: "0.875rem", fontWeight: "bold", color: "#6ee7b7" }}>S/ {remainingAmount.toFixed(2)}</span>
              </div>
            </div>
          </section>

          {/* PaymentMethodSection */}
          <section style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tipo de Pago</label>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
              {/* Efectivo */}
              <button
                type="button"
                onClick={() => setPaymentType("EFECTIVO")}
                style={{
                  position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0.6rem", borderRadius: "0.75rem",
                  border: paymentType === "EFECTIVO" ? "2px solid #10b981" : "2px solid #e2e8f0",
                  backgroundColor: paymentType === "EFECTIVO" ? "#ecfdf5" : "white",
                  cursor: "pointer", transition: "all 0.15s"
                }}
              >
                {paymentType === "EFECTIVO" && (
                  <div style={{ position: "absolute", top: "-6px", right: "-6px", width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#10b981", color: "white", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  </div>
                )}
                <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", backgroundColor: "#d1fae5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px" }}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect height="12" rx="2" strokeWidth="2" width="20" x="2" y="6"></rect><circle cx="12" cy="12" r="2.5" strokeWidth="2"></circle><path d="M6 12h.01M18 12h.01" strokeLinecap="round" strokeWidth="2"></path></svg>
                </div>
                <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: paymentType === "EFECTIVO" ? "#047857" : "#1e293b" }}>Efectivo</span>
              </button>

              {/* Yape */}
              <button
                type="button"
                onClick={() => setPaymentType("YAPE")}
                style={{
                  position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0.6rem", borderRadius: "0.75rem",
                  border: paymentType === "YAPE" ? "2px solid #742384" : "2px solid #e2e8f0",
                  backgroundColor: paymentType === "YAPE" ? "rgba(116, 35, 132, 0.05)" : "white",
                  cursor: "pointer", transition: "all 0.15s"
                }}
              >
                {paymentType === "YAPE" && (
                  <div style={{ position: "absolute", top: "-6px", right: "-6px", width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#742384", color: "white", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  </div>
                )}
                <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", backgroundColor: "#f3e8f5", color: "#742384", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px" }}>
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M17 2H7C5.9 2 5 2.9 5 4v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 18c-.8 0-1.5-.7-1.5-1.5S11.2 17 12 17s1.5.7 1.5 1.5S12.8 20 12 20zm5-4H7V5h10v11z"></path></svg>
                </div>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: paymentType === "YAPE" ? "#742384" : "#1e293b" }}>Yape</span>
              </button>

            </div>
          </section>

          {/* AmountDisplaySection */}
          <section style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }}>Monto a Cobrar</label>
            
            <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "0.75rem", border: "2px solid rgba(67, 56, 202, 0.7)", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 0 0 4px #eef2ff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flex: 1, paddingLeft: "0.25rem" }}>
                <span style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#94a3b8" }}>S/</span>
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") setAmount("");
                    else setAmount(Number(val));
                  }}
                  step="1"
                  min="0"
                  inputMode="decimal"
                  placeholder="0.00"
                  style={{
                    width: "100%",
                    fontSize: "1.875rem",
                    fontWeight: 800,
                    color: "#0f172a",
                    letterSpacing: "-0.025em",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    padding: 0,
                    margin: 0
                  }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#64748b", backgroundColor: "#f1f5f9", border: "1px solid #e2e8f0", padding: "0.25rem 0.5rem", borderRadius: "0.5rem" }}>PEN</span>
                <button
                  type="button"
                  onClick={() => setAmount("")}
                  style={{ color: "#cbd5e1", padding: "0.25rem", background: "transparent", border: "none", cursor: "pointer" }}
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="no-scrollbar" style={{ display: "flex", alignItems: "center", gap: "0.375rem", overflowX: "auto", padding: "0.125rem 0", fontSize: "0.75rem", fontWeight: 600 }}>
              <button
                type="button"
                className="shortcut-chip"
                onClick={() => setAmount(Math.round(loan.fee))}
                style={{ whiteSpace: "nowrap", padding: "0.375rem 0.75rem", borderRadius: "9999px", cursor: "pointer", 
                  backgroundColor: amount === Math.round(loan.fee) ? "#4f46e5" : "white", 
                  color: amount === Math.round(loan.fee) ? "white" : "#334155", 
                  border: amount === Math.round(loan.fee) ? "none" : "1px solid #e2e8f0", 
                  fontWeight: amount === Math.round(loan.fee) ? "bold" : 600 
                }}
              >
                Cuota: S/ {Math.round(loan.fee)}
              </button>
              <button
                type="button"
                className="shortcut-chip"
                onClick={() => setAmount(Math.round(loan.fee * 2))}
                style={{ whiteSpace: "nowrap", padding: "0.375rem 0.75rem", borderRadius: "9999px", cursor: "pointer",
                  backgroundColor: amount === Math.round(loan.fee * 2) ? "#4f46e5" : "white", 
                  color: amount === Math.round(loan.fee * 2) ? "white" : "#334155", 
                  border: amount === Math.round(loan.fee * 2) ? "none" : "1px solid #e2e8f0", 
                  fontWeight: amount === Math.round(loan.fee * 2) ? "bold" : 600 
                 }}
              >
                2 cuotas (S/ {Math.round(loan.fee * 2)})
              </button>
              <button
                type="button"
                className="shortcut-chip"
                onClick={() => setAmount(50)}
                style={{ whiteSpace: "nowrap", padding: "0.375rem 0.75rem", borderRadius: "9999px", cursor: "pointer",
                  backgroundColor: amount === 50 ? "#4f46e5" : "white", 
                  color: amount === 50 ? "white" : "#334155", 
                  border: amount === 50 ? "none" : "1px solid #e2e8f0", 
                  fontWeight: amount === 50 ? "bold" : 600 
                 }}
              >
                S/ 50
              </button>
              <button
                type="button"
                className="shortcut-chip"
                onClick={() => setAmount(100)}
                style={{ whiteSpace: "nowrap", padding: "0.375rem 0.75rem", borderRadius: "9999px", cursor: "pointer",
                  backgroundColor: amount === 100 ? "#4f46e5" : "white", 
                  color: amount === 100 ? "white" : "#334155", 
                  border: amount === 100 ? "none" : "1px solid #e2e8f0", 
                  fontWeight: amount === 100 ? "bold" : 600 
                 }}
              >
                S/ 100
              </button>
              <button
                type="button"
                className="shortcut-chip"
                onClick={() => setAmount(Math.ceil(remainingAmount))}
                style={{ whiteSpace: "nowrap", padding: "0.375rem 0.75rem", borderRadius: "9999px", cursor: "pointer",
                  backgroundColor: amount === Math.ceil(remainingAmount) ? "#4f46e5" : "#eef2ff", 
                  color: amount === Math.ceil(remainingAmount) ? "white" : "#4338ca", 
                  border: amount === Math.ceil(remainingAmount) ? "none" : "1px solid #c7d2fe", 
                  fontWeight: "bold"
                 }}
              >
                Saldo total S/ {Math.ceil(remainingAmount)}
              </button>
            </div>

            <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "0.875rem", border: "1px solid rgba(226, 232, 240, 0.8)", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", marginTop: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem" }}>
                <span style={{ color: "#64748b", fontWeight: 500 }}>Nuevo saldo restante:</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  <span style={{ textDecoration: "line-through", color: "#94a3b8", fontSize: "0.6875rem" }}>S/ {remainingAmount.toFixed(2)}</span>
                  <span style={{ color: "#94a3b8" }}>→</span>
                  <span style={{ fontWeight: "bold", color: "#059669", fontSize: "0.875rem" }}>S/ {newRemainingAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </section>
          
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#dc2626", backgroundColor: "#fef2f2", padding: "0.75rem", borderRadius: "0.5rem", fontSize: "0.875rem" }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

        </main>

        {/* FooterActionTray */}
        <footer style={{ position: "sticky", bottom: 0, zIndex: 30, backgroundColor: "white", borderTop: "1px solid #f1f5f9", padding: "0.75rem 1rem 1.25rem 1rem", display: "flex", flexDirection: "column", gap: "0.625rem", boxShadow: "0 -4px 6px -1px rgba(0, 0, 0, 0.05)" }}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{ padding: "0.75rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0", backgroundColor: "white", color: "#334155", fontWeight: "bold", fontSize: "0.875rem", cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handlePayment}
              disabled={loading || !amount || amount <= 0}
              style={{ padding: "0.75rem", borderRadius: "0.75rem", border: "none", backgroundColor: loading || !amount || amount <= 0 ? "#818cf8" : "#4f46e5", color: "white", fontWeight: "bold", fontSize: "0.875rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", cursor: (loading || !amount || amount <= 0) ? "not-allowed" : "pointer" }}
            >
              {loading ? "Procesando..." : `Confirmar S/ ${Number(amount || 0).toFixed(2)}`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
