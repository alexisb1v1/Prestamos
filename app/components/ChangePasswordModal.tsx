"use client";

import { useState, useEffect } from "react";
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import styles from "./CreateLoanModal.module.css";
import { changePasswordUseCase } from "@/app/features/users";
import { authService } from "@/lib/auth";
import { formatUserName } from "@/lib/utils";
import { User } from "@/lib/types";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
  onSuccess,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isMobile, setIsMobile] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    const timer = setTimeout(checkMobile, 0);
    window.addEventListener("resize", checkMobile);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open");
      const user = authService.getUser();
      const timer = setTimeout(() => {
        setCurrentUser(user);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.body.classList.remove("modal-open");
      };
    } else {
      document.body.classList.remove("modal-open");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccessMessage("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!currentPassword) {
      setError("Por favor ingresa tu contraseña actual.");
      return;
    }

    if (!newPassword) {
      setError("Por favor ingresa tu nueva contraseña.");
      return;
    }

    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword === currentPassword) {
      setError("La nueva contraseña debe ser diferente de la contraseña actual.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden. Por favor verifícalas.");
      return;
    }

    setLoading(true);

    const result = await changePasswordUseCase.execute(
      currentPassword,
      newPassword,
    );

    result.match(
      () => {
        setLoading(false);
        setSuccessMessage("¡Contraseña actualizada correctamente!");
        setTimeout(() => {
          resetForm();
          onClose();
          if (onSuccess) onSuccess();
        }, 1200);
      },
      (err) => {
        setLoading(false);
        setError(
          err.message ||
            "Error al cambiar la contraseña. Verifica tu clave actual.",
        );
      },
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 101,
        backgroundColor: isMobile
          ? "rgba(15, 23, 42, 0.8)"
          : "rgba(15, 23, 42, 0.4)",
        display: "flex",
        justifyContent: isMobile ? "center" : "flex-end",
        alignItems: isMobile ? "flex-end" : "stretch",
      }}
      onClick={(e) => {
        if (!loading && e.target === e.currentTarget) handleClose();
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
          animation: isMobile
            ? "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
            : "slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
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
          `}
        </style>

        {/* TopBar */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconContainer}>
              <KeyRound size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className={styles.title}>Cambiar Contraseña</h1>
              <p className={styles.subtitle}>Actualiza tu clave de acceso</p>
            </div>
          </div>
          <button
            className={styles.closeBtn}
            onClick={handleClose}
            type="button"
            disabled={loading}
            style={{
              opacity: loading ? 0.4 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </header>

        {/* Form con scroll y footer sticky */}
        <form
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflowY: "auto",
          }}
        >
          {/* Main Content */}
          <main
            style={{
              flex: 1,
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              overflowX: "hidden",
            }}
          >
            {/* User Profile Context Card */}
            {currentUser && (
              <section
                style={{
                  background:
                    "linear-gradient(to bottom right, #4f46e5, #4338ca, #3730a3)",
                  borderRadius: "1rem",
                  padding: "1rem",
                  color: "white",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.2)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.875rem",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "0.75rem",
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.1rem",
                      fontWeight: 800,
                      color: "white",
                      flexShrink: 0,
                    }}
                  >
                    {(
                      currentUser.firstName?.[0] ||
                      currentUser.username[0] ||
                      "U"
                    ).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "1.05rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "-0.01em",
                        lineHeight: 1.2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {formatUserName(currentUser)}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#c7d2fe",
                        marginTop: "0.2rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span>@{currentUser.username}</span>
                      <span>•</span>
                      <span
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.2)",
                          padding: "0.1rem 0.4rem",
                          borderRadius: "4px",
                          fontWeight: 600,
                          fontSize: "0.7rem",
                        }}
                      >
                        {currentUser.profile}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Error Message */}
            {error && (
              <div
                style={{
                  padding: "0.875rem 1rem",
                  borderRadius: "0.875rem",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div
                style={{
                  padding: "0.875rem 1rem",
                  borderRadius: "0.875rem",
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#166534",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                }}
              >
                <CheckCircle size={18} style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 600 }}>{successMessage}</span>
              </div>
            )}

            {/* Form Fields Card */}
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "1rem",
                border: "1px solid #e2e8f0",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.1rem",
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
              }}
            >
              {/* Contraseña Actual */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "#475569",
                    marginBottom: "0.4rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.025em",
                  }}
                >
                  Contraseña Actual <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "0.875rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <Lock size={18} />
                  </div>
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Ingresa tu clave actual"
                    required
                    disabled={loading || Boolean(successMessage)}
                    style={{
                      width: "100%",
                      padding: "0.75rem 2.6rem 0.75rem 2.6rem",
                      borderRadius: "0.75rem",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9375rem",
                      outline: "none",
                      backgroundColor: "#f8fafc",
                      boxSizing: "border-box",
                      transition: "all 0.2s",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{
                      position: "absolute",
                      right: "0.875rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      color: "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                    }}
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* Nueva Contraseña */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "#475569",
                    marginBottom: "0.4rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.025em",
                  }}
                >
                  Nueva Contraseña <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "0.875rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <Lock size={18} />
                  </div>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    disabled={loading || Boolean(successMessage)}
                    style={{
                      width: "100%",
                      padding: "0.75rem 2.6rem 0.75rem 2.6rem",
                      borderRadius: "0.75rem",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9375rem",
                      outline: "none",
                      backgroundColor: "#f8fafc",
                      boxSizing: "border-box",
                      transition: "all 0.2s",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: "absolute",
                      right: "0.875rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      color: "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                    }}
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#64748b",
                    marginTop: "0.3rem",
                    display: "block",
                  }}
                >
                  Debe contener al menos 6 caracteres.
                </span>
              </div>

              {/* Confirmar Nueva Contraseña */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "#475569",
                    marginBottom: "0.4rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.025em",
                  }}
                >
                  Confirmar Contraseña <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "0.875rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <Lock size={18} />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la nueva clave"
                    required
                    disabled={loading || Boolean(successMessage)}
                    style={{
                      width: "100%",
                      padding: "0.75rem 2.6rem 0.75rem 2.6rem",
                      borderRadius: "0.75rem",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9375rem",
                      outline: "none",
                      backgroundColor: "#f8fafc",
                      boxSizing: "border-box",
                      transition: "all 0.2s",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    style={{
                      position: "absolute",
                      right: "0.875rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      color: "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                    }}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </main>

          {/* Sticky Actions Footer */}
          <footer
            style={{
              padding: "1rem",
              backgroundColor: "white",
              borderTop: "1px solid #f1f5f9",
              position: "sticky",
              bottom: 0,
              zIndex: 10,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
              }}
            >
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "white",
                  color: "#334155",
                  fontWeight: "bold",
                  fontSize: "0.875rem",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || Boolean(successMessage)}
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  backgroundColor:
                    loading || Boolean(successMessage) ? "#818cf8" : "#4f46e5",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "0.875rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  cursor:
                    loading || Boolean(successMessage)
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {loading ? "Actualizando..." : "Guardar Contraseña"}
              </button>
            </div>
          </footer>
        </form>

        {/* Loading Overlay Shield */}
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(4px)",
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              borderRadius: "inherit",
              cursor: "wait",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              style={{
                width: "36px",
                height: "36px",
                color: "#4f46e5",
                animation: "spin_password 1s linear infinite",
              }}
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                style={{ opacity: 0.2 }}
              ></circle>
              <path
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                style={{ opacity: 0.9 }}
              ></path>
            </svg>
            <span
              style={{
                fontSize: "0.9375rem",
                fontWeight: 700,
                color: "#1e293b",
              }}
            >
              Actualizando contraseña...
            </span>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Por favor espera un momento
            </span>
            <style>
              {`
                @keyframes spin_password {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}
            </style>
          </div>
        )}
      </div>
    </div>
  );
}
