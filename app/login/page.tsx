"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/auth";
import { getLandingRoute } from "@/lib/utils";
import { User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberUser, setRememberUser] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tenantName, setTenantName] = useState("Cargando...");
  const [showPassword, setShowPassword] = useState(false);

  // Cargar usuario guardado al iniciar y extraer el nombre de la empresa
  useEffect(() => {
    const savedUsername = localStorage.getItem("remembered_username");
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberUser(true);
    }

    // Extraer subdominio de la URL
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const parts = hostname.split(".");
      
      // Si estamos en localhost, o en central.neocobros, o sin subdominio
      if (hostname === "localhost" || parts.length < 3 || parts[0] === "central") {
        setTenantName("NeoCobros");
      } else {
        // Ejemplo: empresa1.neocobros.com -> empresa1 -> Empresa1
        const sub = parts[0];
        setTenantName(sub.charAt(0).toUpperCase() + sub.slice(1));
      }
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authService.login(username, password);

      if (rememberUser) {
        localStorage.setItem("remembered_username", username);
      } else {
        localStorage.removeItem("remembered_username");
      }

      router.push(getLandingRoute(response));
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(
        error.message || "Error al iniciar sesión. Verifica tus credenciales.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-layout">
      {/* Background with blurred blobs */}
      <div className="login-background">
        <div className="login-bg-blob-1"></div>
        <div className="login-bg-blob-2"></div>
        <div className="login-bg-blob-3"></div>
      </div>

      <main className="login-wrapper">
        <div className="login-card">
          <header style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1.75rem" }}>
            <div style={{ marginBottom: "1rem", position: "relative" }} className="group">
              <div className="login-brand-icon">
                <div className="login-brand-icon-inner">
                  <span aria-label="Bolsa de dinero" style={{ fontSize: "1.875rem", userSelect: "none" }} role="img">💰</span>
                </div>
              </div>
              <span 
                style={{ 
                  position: "absolute", bottom: "-4px", right: "-4px", 
                  backgroundColor: "#10b981", color: "white", 
                  borderRadius: "50%", padding: "4px", border: "2px solid white",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}
                title="Conexión segura verificada"
              >
                <ShieldCheck size={14} strokeWidth={3} />
              </span>
            </div>

            <div className="login-badge">
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981", display: "inline-block" }}></span>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#312e81", letterSpacing: "0.025em", textTransform: "uppercase" }}>
                Portal Seguro de Cobranza
              </span>
            </div>

            <h1 style={{ fontSize: "1.875rem", fontWeight: 800, letterSpacing: "-0.025em", marginBottom: "0.25rem", textTransform: "capitalize", color: "#0f172a", textAlign: "center" }}>
              {tenantName === "NeoCobros" ? (
                <>Neo<span style={{ color: "#4147eb" }}>Cobros</span></>
              ) : (
                tenantName
              )}
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", textAlign: "center", margin: 0 }}>
              Accede a tu panel y gestión de cobros
            </p>
          </header>

          {error && (
            <div
              style={{
                padding: "0.75rem",
                marginBottom: "1.25rem",
                backgroundColor: "#fef2f2",
                border: "1px solid #f87171",
                borderRadius: "8px",
                color: "#b91c1c",
                fontSize: "0.875rem",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }} autoComplete="off">
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }} htmlFor="usuario">
                Usuario o ID de Agente
              </label>
              <div className="login-input-group">
                <span className="login-input-icon">
                  <User size={20} />
                </span>
                <input
                  id="usuario"
                  name="usuario"
                  type="text"
                  className="login-input"
                  placeholder="ej. cobrador.norte"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }} htmlFor="contrasena">
                Contraseña
              </label>
              <div className="login-input-group">
                <span className="login-input-icon">
                  <Lock size={20} />
                </span>
                <input
                  id="contrasena"
                  name="contrasena"
                  type={showPassword ? "text" : "password"}
                  className="login-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  style={{ paddingRight: "2.75rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute", right: "0.5rem", background: "none", border: "none", 
                    color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", 
                    justifyContent: "center", padding: "0.25rem"
                  }}
                  aria-label="Mostrar u ocultar contraseña"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.25rem" }}>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={rememberUser}
                  onChange={(e) => setRememberUser(e.target.checked)}
                  style={{ width: "1rem", height: "1rem", borderRadius: "0.25rem", border: "1px solid #cbd5e1", accentColor: "#4f46e5", cursor: "pointer" }}
                />
                <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", fontWeight: 500, color: "#475569" }}>
                  Recordar sesión
                </span>
              </label>
            </div>

            <div style={{ paddingTop: "0.5rem" }}>
              <button
                type="submit"
                disabled={loading}
                className="login-btn"
              >
                <span>{loading ? "Ingresando..." : "Iniciar Sesión"}</span>
                {!loading && <ArrowRight size={18} />}
              </button>
            </div>
          </form>

          <footer style={{ marginTop: "1.75rem", paddingTop: "1rem", borderTop: "1px solid #f1f5f9", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>Cifrado TLS 256-bit de grado bancario</span>
            </div>
            <p style={{ fontSize: "10px", color: "#94a3b8", letterSpacing: "0.025em", marginTop: "0.125rem" }}>
              Potenciado por <strong>NeoCobros</strong>
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
