"use client";

import { useState, useEffect } from "react";
import {
  Banknote,
  Smartphone,
  X,
  AlertCircle,
  ChevronsUpDown,
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
  // State for amount - user requested ONLY integers
  const [amount, setAmount] = useState<number | "">("");
  const [paymentType, setPaymentType] = useState<"EFECTIVO" | "YAPE">("YAPE"); // Yape is default in design
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && loan) {
      // Default to fee, but rounded to nearest integer as requested
      setAmount(Math.round(loan.fee || 0));
      setError("");
      // Set YAPE as default matched with design image
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
        amount: Math.floor(Number(amount)), // Ensure integer just in case
        userId: String(user.id),
        paymentType: paymentType,
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

  return (
    <div
      className="create-payment-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="create-payment-modal">
        {/* Mobile Handle */}
        <div className="create-payment-handle-bar"></div>

        <div className="create-payment-header">
          <h2 className="create-payment-title">Registrar Pago</h2>
          <button
            onClick={onClose}
            className="create-payment-close"
            aria-label="Cerrar"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Client Info */}
        <div className="create-payment-section">
          <div className="create-payment-label">CLIENTE</div>
          <div className="create-payment-value">{loan.clientName}</div>
        </div>

        {error && (
          <div className="create-payment-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Payment Type Selection */}
        <div className="create-payment-section">
          <label className="create-payment-label">TIPO DE PAGO</label>
          <div className="create-payment-type-container">
            <label className="create-payment-type-card">
              <input
                type="radio"
                name="paymentType"
                value="EFECTIVO"
                checked={paymentType === "EFECTIVO"}
                onChange={() => setPaymentType("EFECTIVO")}
              />
              <div className="create-payment-card-content">
                <div className="create-payment-icon-wrapper">
                  <Banknote size={24} strokeWidth={2.5} />
                </div>
                <span className="create-payment-type-name">Efectivo</span>
              </div>
            </label>
            <label className="create-payment-type-card">
              <input
                type="radio"
                name="paymentType"
                value="YAPE"
                checked={paymentType === "YAPE"}
                onChange={() => setPaymentType("YAPE")}
              />
              <div className="create-payment-card-content">
                <div className="create-payment-icon-wrapper">
                  <Smartphone size={24} strokeWidth={2.5} />
                </div>
                <span className="create-payment-type-name">Yape</span>
              </div>
            </label>
          </div>
        </div>

        {/* Amount Input */}
        <div className="create-payment-section">
          <label className="create-payment-label">MONTO A PAGAR (S/)</label>
          <div className="create-payment-input-wrapper">
            <input
              type="number"
              className="create-payment-input"
              value={amount}
              onChange={(e) => {
                // Only allow integers
                const val = e.target.value;
                if (val === "") setAmount("");
                else setAmount(Math.floor(Number(val)));
              }}
              step="1"
              placeholder="0"
              inputMode="numeric"
              autoFocus
            />
            <div className="create-payment-currency">
              PEN
              <ChevronsUpDown size={14} />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="create-payment-actions">
          <button
            className="create-payment-secondary-btn"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="create-payment-primary-btn"
            onClick={handlePayment}
            disabled={loading || !amount}
          >
            {loading ? "Procesando..." : "Abonar"}
          </button>
        </div>
      </div>
    </div>
  );
}
