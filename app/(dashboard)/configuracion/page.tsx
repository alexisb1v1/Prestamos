"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import ChangePasswordModal from "@/app/components/ChangePasswordModal";

export default function ConfiguracionPage() {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  return (
    <div style={{ maxWidth: "800px" }}>
      <h1
        style={{
          fontSize: "1.875rem",
          fontWeight: "bold",
          marginBottom: "2rem",
        }}
      >
        Configuración
      </h1>

      <div style={{ display: "grid", gap: "2rem" }}>
        {/* Seguridad y Contraseña */}
        <section className="card">
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              marginBottom: "1rem",
              borderBottom: "1px solid var(--border-color)",
              paddingBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <ShieldCheck size={22} color="#4f46e5" />
            Seguridad de la Cuenta
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
              marginBottom: "1.25rem",
              lineHeight: 1.5,
            }}
          >
            Mantén tu cuenta protegida actualizando periódicamente tu contraseña de acceso a la plataforma.
          </p>
          <div>
            <button
              onClick={() => setIsChangePasswordOpen(true)}
              className="btn btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.65rem 1.25rem",
                fontWeight: 600,
              }}
            >
              <KeyRound size={18} />
              Cambiar mi Contraseña
            </button>
          </div>
        </section>

        {/* General Settings */}
        <section className="card">
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              marginBottom: "1.5rem",
              borderBottom: "1px solid var(--border-color)",
              paddingBottom: "1rem",
            }}
          >
            Parámetros Generales
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.5rem",
            }}
          >
            <div>
              <label className="label">Tasa de Interés Default (%)</label>
              <input type="number" className="input" defaultValue="20" />
            </div>
            <div>
              <label className="label">Días de Gracia</label>
              <input type="number" className="input" defaultValue="3" />
            </div>
            <div>
              <label className="label">Moneda</label>
              <select className="input">
                <option>USD ($)</option>
                <option>MXN ($)</option>
                <option>EUR (€)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Profile Settings */}
        <section className="card">
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              marginBottom: "1.5rem",
              borderBottom: "1px solid var(--border-color)",
              paddingBottom: "1rem",
            }}
          >
            Empresa
          </h2>
          <div style={{ display: "grid", gap: "1.5rem" }}>
            <div>
              <label className="label">Nombre de la Empresa</label>
              <input
                type="text"
                className="input"
                defaultValue="Prestamos Rápidos S.A."
              />
            </div>
            <div>
              <label className="label">Dirección</label>
              <input
                type="text"
                className="input"
                defaultValue="Av. Siempre Viva 123"
              />
            </div>
          </div>
          <div style={{ marginTop: "1.5rem", textAlign: "right" }}>
            <button className="btn btn-primary">Guardar Cambios</button>
          </div>
        </section>
      </div>

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
}
