"use client";

import { useState } from "react";
import { createExpenseUseCase } from "@/app/features/expenses";
import { authService } from "@/lib/auth";

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          // Reset form
          setDescription("");
          setAmount("");

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

  return (
    <div
      className="create-expense-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="create-expense-modal">
        <div className="create-expense-header">
          <h2 className="create-expense-title">Registrar Gasto</h2>
          <button className="create-expense-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="create-expense-group">
            <label className="create-expense-label">Descripción</label>
            <input
              type="text"
              className="create-expense-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Pasajes, Almuerzo"
              required
            />
          </div>

          <div className="create-expense-group">
            <label className="create-expense-label">Monto (S/)</label>
            <input
              type="number"
              step="0.10"
              className="create-expense-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <button
            type="submit"
            className="create-expense-submit"
            disabled={loading}
          >
            {loading ? "Registrando..." : "Guardar Gasto"}
          </button>
        </form>
      </div>
    </div>
  );
}
