"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  searchPersonUseCase,
  createPersonUseCase,
  Person,
} from "@/app/features/people";
import { createLoanUseCase } from "@/app/features/loans";
import { authService } from "@/lib/auth";
import { User } from "@/app/features/users";
import {
  Search,
  UserPlus,
  Wallet,
  ChevronRight,
  AlertCircle,
  Verified,
  MapPin,
  Phone,
  X,
} from "lucide-react";

import styles from "./CreateLoanModal.module.css";

interface CreateLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  loanToRenew?: {
    personId?: string | number;
    idPeople?: string | number;
    documentNumber: string;
    clientName: string;
    amount: number;
    address: string;
    phone?: string;
  } | null;
  companyId?: string;
}

/**
 * Modal Premium "Luminous" con flujo vertical continuo (Single-Scroll).
 * Alineado con la documentación de la API v2: el teléfono es exclusivo del préstamo.
 */
export default function CreateLoanModal({
  isOpen,
  onClose,
  onSuccess,
  loanToRenew,
  companyId,
}: CreateLoanModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Control de Flujo Continuo ---
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // --- State: Cliente ---
  const [docType, setDocType] = useState("DNI");
  const [docNumber, setDocNumber] = useState("");
  const [person, setPerson] = useState<Person | null>(null);

  // Formulario Registro (Sin phone, según documentación v2 / Módulo Persona)
  const [newPerson, setNewPerson] = useState({
    documentType: "DNI",
    documentNumber: "",
    firstName: "",
    lastName: "",
    birthday: null as string | null,
  });

  // --- State: Préstamo ---
  const [amount, setAmount] = useState<number | "">("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [days, setDays] = useState<number>(24);

  const interestRate = 0.2;

  const resetState = useCallback(() => {
    setLoading(false);
    setError("");
    setSearchPerformed(false);
    setIsRegistering(false);
    setDocType("DNI");
    setDocNumber("");
    setPerson(null);
    setAmount("");
    setAddress("");
    setPhone("");
    setDays(24);
    setNewPerson({
      documentType: "DNI",
      documentNumber: "",
      firstName: "",
      lastName: "",
      birthday: null,
    });
  }, []);

  // Auto-scroll al fondo cuando aparece nuevo contenido o se ingresa monto
  useEffect(() => {
    if (person || amount !== "" || isRegistering) {
      const timer = setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [person, amount, isRegistering]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setCurrentUser(authService.getUser());
        if (loanToRenew) {
          const pid = loanToRenew.personId || loanToRenew.idPeople;
          setPerson({
            id: pid?.toString() || "",
            documentType: "DNI",
            documentNumber: loanToRenew.documentNumber,
            firstName: loanToRenew.clientName?.split(" ")[0] || "",
            lastName:
              loanToRenew.clientName?.split(" ").slice(1).join(" ") || "",
            birthday: "",
          });
          setAmount(loanToRenew.amount);
          setAddress(loanToRenew.address);
          setPhone(loanToRenew.phone || "");
          setDays(24);
          setSearchPerformed(true);
        } else {
          resetState();
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, loanToRenew, resetState]);

  const handleSearch = async () => {
    if (!docNumber) return;
    setLoading(true);
    setError("");
    const result = await searchPersonUseCase.execute(docType, docNumber);

    result.match(
      (p) => {
        setPerson(p);
        setSearchPerformed(true);
        setIsRegistering(false);
      },
      () => {
        setIsRegistering(true);
        setNewPerson((prev) => ({
          ...prev,
          documentType: docType,
          documentNumber: docNumber,
        }));
      },
    );
    setLoading(false);
  };

  const handleCreatePerson = async () => {
    setLoading(true);
    setError("");
    const result = await createPersonUseCase.execute(newPerson);

    result.match(
      (p) => {
        setPerson({
          id: String(p.id),
          documentType: newPerson.documentType,
          documentNumber: newPerson.documentNumber,
          firstName: newPerson.firstName,
          lastName: newPerson.lastName,
          birthday: newPerson.birthday,
        });
        setIsRegistering(false);
        setSearchPerformed(true);
      },
      (err) => {
        setError(err.message || "Error al registrar persona.");
      },
    );
    setLoading(false);
  };

  const handleCreateLoan = async () => {
    if (!person || !amount || !currentUser) return;

    setLoading(true);
    setError("");

    const result = await createLoanUseCase.execute({
      idPeople: Number(person.id),
      amount: Number(amount),
      phone,
      address,
      userId: Number(currentUser.id),
      days,
      companyId: companyId || currentUser.idCompany,
    });

    result.match(
      () => {
        onSuccess();
        onClose();
        resetState();
      },
      (err) => {
        setError(err.message || "Error al crear el préstamo.");
      },
    );
    setLoading(false);
  };

  if (!isOpen) return null;

  const totalToPay = amount ? Number(amount) * (1 + interestRate) : "...";

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal} ref={scrollRef}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={20} />
        </button>

        <div className={styles.header}>
          <div className={styles.iconContainer}>
            <Wallet size={24} color="#4f46e5" />
          </div>
          <div>
            <h2 className={styles.title}>
              {loanToRenew ? "Renovación de Préstamo" : "Nuevo Préstamo"}
            </h2>
            <p className={styles.subtitle}>Sigue los pasos verticales</p>
          </div>
        </div>

        <div className={styles.content}>
          {/* PASO 1: Búsqueda del Cliente */}
          <div className={styles.sectionHeader}>
            <div className={styles.stepCircle}>1</div>
            <h3>Identificación del Cliente</h3>
          </div>

          {!searchPerformed && !isRegistering ? (
            <div className={styles.card}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 1fr",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                <select
                  className={styles.select}
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                >
                  <option value="DNI">DNI</option>
                  <option value="CE">CE</option>
                </select>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Número de documento"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Search className={styles.inputIcon} size={16} />
                </div>
              </div>
              <button
                className={styles.primaryBtn}
                onClick={handleSearch}
                disabled={loading || !docNumber}
              >
                {loading ? "Buscando..." : "BUSCAR CLIENTE"}
              </button>
            </div>
          ) : null}

          {/* PASO 1B: Registro si no existe */}
          {isRegistering && (
            <div className={`${styles.card} ${styles.animateIn}`}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "#eab308",
                  marginBottom: "1rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={16} /> Cliente no encontrado, regístralo:
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Nombres"
                  value={newPerson.firstName}
                  onChange={(e) =>
                    setNewPerson({ ...newPerson, firstName: e.target.value })
                  }
                />
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Apellidos"
                  value={newPerson.lastName}
                  onChange={(e) =>
                    setNewPerson({ ...newPerson, lastName: e.target.value })
                  }
                />
                <button
                  className={styles.primaryBtn}
                  onClick={handleCreatePerson}
                  disabled={
                    loading || !newPerson.firstName || !newPerson.lastName
                  }
                >
                  {loading ? "Registrando..." : "REGISTRAR Y CONTINUAR"}
                  <UserPlus size={18} />
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: Confirmación Cliente y Datos Préstamo */}
          {searchPerformed && person && (
            <>
              <div className={`${styles.confirmedCard} ${styles.animateIn}`}>
                <div className={styles.confirmedHeader}>
                  <Verified size={18} color="#22c55e" />
                  <span>CLIENTE CONFIRMADO</span>
                </div>
                <div className={styles.clientName}>
                  {person.firstName} {person.lastName}
                </div>
                <div className={styles.clientDoc}>
                  {person.documentType}: {person.documentNumber}
                </div>
              </div>

              <div className={styles.sectionHeader}>
                <div className={styles.stepCircle}>2</div>
                <h3>Detalles del Préstamo</h3>
              </div>

              <div className={`${styles.card} ${styles.animateIn}`}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>N° Celular (Personal)</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="999 999 999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                    <Phone className={styles.inputIcon} size={16} />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Dirección / Domicilio</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Calle, Jr, Av..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                    <MapPin className={styles.inputIcon} size={16} />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Monto a Prestar (S/.)</label>
                  <input
                    type="number"
                    className={styles.inputMain}
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setAmount(val);
                      if (val < 1000) setDays(24);
                    }}
                  />
                  <div className={styles.amountBadge}>
                    Interés (20%): S/.{" "}
                    {amount
                      ? (Number(amount) * interestRate).toFixed(2)
                      : "0.00"}
                  </div>
                </div>

                <div
                  className={styles.inputGroup}
                  style={{ marginBottom: "0.5rem" }}
                >
                  <label className={styles.label}>Periodo de Pago (Días)</label>
                  <input
                    type="number"
                    className={`${styles.input} ${amount && Number(amount) < 1000 ? styles.disabledInput : ""}`}
                    placeholder="Ej: 24 o 30"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    min={24}
                    disabled={!!amount && Number(amount) < 1000}
                  />
                </div>

                {amount && (
                  <div className={styles.summaryBox}>
                    <div className={styles.summaryRow}>
                      <span>Total a Cobrar</span>
                      <strong>S/. {totalToPay}</strong>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Cuota Diaria</span>
                      <strong>
                        S/. {(Number(totalToPay) / days).toFixed(2)}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div
                  className={styles.errorBox}
                  onClick={() => setError("")}
                  style={{ animation: "shake 0.4s ease" }}
                >
                  <AlertCircle size={18} /> {error}
                </div>
              )}

              <div style={{ marginTop: "1rem" }}>
                <button
                  className={styles.finalBtn}
                  onClick={handleCreateLoan}
                  disabled={loading || !amount || !address || !phone}
                >
                  {loading ? "CREANDO..." : "CONFIRMAR"}
                  <ChevronRight size={20} />
                </button>
                <div className={styles.helperText}>
                  Al confirmar, se registrará el préstamo y se abrirá la vista
                  de impresión.
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
