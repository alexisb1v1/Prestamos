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
import { Loan } from "@/lib/types";
import LoanShareGenerator, { LoanShareGeneratorRef } from "./LoanShareGenerator";
import {
  Search,
  Wallet,
  X,
  AlertCircle,
  MapPin,
  Phone,
  CheckCircle2,
  Share2,
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

  // --- Control de Flujo Continuo ---
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [createdLoan, setCreatedLoan] = useState<Loan | null>(null);
  
  const shareRef = useRef<LoanShareGeneratorRef>(null);

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
    setCreatedLoan(null);
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
        if (p.phone) setPhone(p.phone);
        if (p.address) setAddress(p.address);
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
      (loan) => {
        onSuccess();
        setCreatedLoan(loan);
        // Ya no cerramos inmediatamente el modal, sino que mostramos el paso 3
      },
      (err) => {
        setError(err.message || "Error al crear el préstamo.");
      },
    );
    setLoading(false);
  };

  const addAmount = (val: number) => {
    setAmount((prev) => {
      const current = typeof prev === "number" ? prev : 0;
      const next = current + val;
      if (next < 1000) setDays(24);
      return next;
    });
  };
  
  const handleShare = async () => {
    if (createdLoan && shareRef.current) {
      setLoading(true);
      try {
        await shareRef.current.shareLoan(createdLoan, "calendar");
      } catch (err) {
        console.error("Error al compartir", err);
      }
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalToPayNum = amount ? Number(amount) * (1 + interestRate) : 0;
  const totalToPay = amount ? totalToPayNum.toFixed(2) : "0.00";
  const dailyQuota = amount ? (totalToPayNum / days).toFixed(2) : "0.00";
  const interestTotal = amount ? (Number(amount) * interestRate).toFixed(2) : "0.00";

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        {/* HEADER PRINCIPAL */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconContainer}>
              <Wallet size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className={styles.title}>Nuevo Préstamo</h1>
              <p className={styles.subtitle}>
                {createdLoan 
                  ? "Paso 3: Confirmación"
                  : searchPerformed && person
                  ? "Paso 2: Detalles & Confirmación"
                  : "Búsqueda o registro rápido"}
              </p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            <X size={18} strokeWidth={2.5} />
          </button>
        </header>

        {error && (
          <div
            style={{
              padding: "0.75rem",
              background: "#fee2e2",
              color: "#b91c1c",
              fontSize: "0.75rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className={styles.contentWrapper}>
          <div
            className={`${styles.slidesContainer} ${
              createdLoan ? styles.step3 : searchPerformed && person ? styles.step2 : styles.step1
            }`}
          >
            {/* ============================================================== */}
            {/* PASO 1: BÚSQUEDA / REGISTRO COMPACTO                           */}
            {/* ============================================================== */}
            <div className={styles.slide}>
              {/* Indicador de paso */}
              <div className={styles.stepIndicatorBox}>
                <div className={styles.stepInfo}>
                  <span className={styles.stepCircle}>1</span>
                  <span className={styles.stepTitle}>Identificación</span>
                  <span className={styles.stepCount}>de 2</span>
                </div>
                <div className={styles.stepDots}>
                  <div className={styles.dotActive}></div>
                  <div className={styles.dotInactive}></div>
                </div>
              </div>

              {/* Tarjeta de Búsqueda */}
              <section className={styles.searchCard}>
                <div className={styles.searchHeader}>
                  <label className={styles.searchLabel}>Documento de Identidad</label>
                  <span className={styles.onlineBadge}>En línea</span>
                </div>
                
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearch();
                  }}
                  style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
                >
                  <div className={styles.integratedInput}>
                    <select
                      className={styles.docTypeSelect}
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                    >
                      <option value="DNI">DNI</option>
                      <option value="CE">C.E.</option>
                      <option value="RUC">RUC</option>
                    </select>
                    <div className={styles.docInputWrapper}>
                      <input
                        className={styles.docNumberInput}
                        type="tel"
                        inputMode="numeric"
                        placeholder="Número de documento"
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                      />
                      <Search className={styles.searchIconInside} size={18} />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className={styles.primaryBtn}
                    disabled={loading || !docNumber}
                  >
                    {loading ? "Buscando..." : "BUSCAR CLIENTE"}
                  </button>
                </form>

                <div className={styles.registerPrompt}>
                  <span>¿No existe el cliente?</span>
                  <button
                    type="button"
                    className={styles.registerBtn}
                    onClick={() => setIsRegistering(true)}
                  >
                    + Registrar aquí
                  </button>
                </div>
              </section>

              {/* Registro embebido (si decide registrar) */}
              {isRegistering && (
                <section className={styles.registerForm}>
                  <h4>Registro Rápido</h4>
                  <input
                    type="text"
                    className={styles.fieldInput}
                    placeholder="Nombres"
                    value={newPerson.firstName}
                    onChange={(e) =>
                      setNewPerson({ ...newPerson, firstName: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    className={styles.fieldInput}
                    placeholder="Apellidos"
                    value={newPerson.lastName}
                    onChange={(e) =>
                      setNewPerson({ ...newPerson, lastName: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={handleCreatePerson}
                    disabled={
                      loading || !newPerson.firstName || !newPerson.lastName
                    }
                  >
                    {loading ? "Registrando..." : "Guardar y Continuar"}
                  </button>
                </section>
              )}

              {/* Footer de información extra */}
              <footer className={styles.infoFooter}>
                <div className={styles.infoIcon}>
                  <AlertCircle size={14} strokeWidth={2.5} />
                </div>
                <p className={styles.infoText}>
                  NeoCobros valida la identidad automáticamente con RENIEC para
                  agilizar la evaluación de crédito.
                </p>
              </footer>
            </div>

            {/* ============================================================== */}
            {/* PASO 2: DETALLES COMPACTO                                      */}
            {/* ============================================================== */}
            <div className={styles.slide}>
              {person && (
                <>
                  <div className={styles.stepHeader}>
                    <span className={styles.stepCircle} style={{width: 20, height: 20}}>1</span>
                    <h2>Identificación del Cliente</h2>
                  </div>

                  {/* Tarjeta de Cliente Validado */}
                  <div className={styles.verifiedClientCard}>
                    <div className={styles.verifiedLeft}>
                      <div className={styles.verifiedLabel}>
                        <svg
                          className="w-3.5 h-3.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          style={{width: 14, height: 14}}
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                            clipRule="evenodd"
                          ></path>
                        </svg>
                        Cliente Confirmado
                      </div>
                      <div className={styles.verifiedName}>
                        {person.firstName} {person.lastName}
                      </div>
                      <div className={styles.verifiedDni}>
                        DNI: <strong>{person.documentNumber}</strong>
                      </div>
                    </div>
                    <button
                      className={styles.changeClientBtn}
                      onClick={() => setSearchPerformed(false)}
                      type="button"
                    >
                      Cambiar
                    </button>
                  </div>

                  <div className={styles.stepHeader}>
                    <span className={styles.stepCircle} style={{width: 20, height: 20}}>2</span>
                    <h2>Detalles del Préstamo</h2>
                  </div>

                  {/* Formulario de Préstamo */}
                  <div className={styles.loanForm}>
                    {/* Celular */}
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>N° Celular (Personal)</label>
                      <div className={styles.fieldInputWrapper}>
                        <input
                          type="tel"
                          className={styles.fieldInput}
                          placeholder="999 999 999"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                        <Phone className={styles.fieldIcon} size={16} />
                      </div>
                    </div>

                    {/* Dirección */}
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>Dirección / Domicilio</label>
                      <div className={styles.fieldInputWrapper}>
                        <input
                          type="text"
                          className={styles.fieldInput}
                          placeholder="Calle, Jr, Av..."
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                        />
                        <MapPin className={styles.fieldIcon} size={16} />
                      </div>
                    </div>

                    {/* Monto Central */}
                    <div className={styles.fieldGroup} style={{ marginTop: "0.25rem" }}>
                      <div className={styles.amountHeader}>
                        <label className={styles.fieldLabel}>Monto a Prestar (S/.)</label>
                        <span className={styles.rateBadge}>Tasa: 20%</span>
                      </div>
                      <div className={styles.amountInputWrapper}>
                        <span className={styles.currencySymbol}>S/.</span>
                        <input
                          type="number"
                          className={styles.amountInput}
                          value={amount}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                              setAmount("");
                              return;
                            }
                            const val = Number(raw);
                            if (!isNaN(val)) {
                              setAmount(val);
                              if (val < 1000) setDays(24);
                            }
                          }}
                        />
                      </div>
                      <div className={styles.amountHelpers}>
                        <div className={styles.quickBtns}>
                          <button type="button" className={styles.quickBtn} onClick={() => addAmount(50)}>+50</button>
                          <button type="button" className={styles.quickBtn} onClick={() => addAmount(100)}>+100</button>
                          <button type="button" className={styles.quickBtn} onClick={() => addAmount(200)}>+200</button>
                        </div>
                        <div className={styles.interestBadge}>
                          Interés: <strong>S/. {interestTotal}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Período */}
                    <div className={styles.fieldGroup} style={{ marginTop: "0.25rem" }}>
                      <div className={styles.amountHeader}>
                        <label className={styles.fieldLabel}>Período de Pago</label>
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>Frecuencia Diaria</span>
                      </div>
                      <div className={styles.fieldInputWrapper}>
                        <input
                          type="number"
                          className={styles.fieldInput}
                          value={days}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                              setDays("" as any);
                              return;
                            }
                            const val = Number(raw);
                            if (!isNaN(val)) setDays(val);
                          }}
                          disabled={!!amount && Number(amount) < 1000}
                        />
                        <span className={styles.periodSuffix}>Días</span>
                      </div>
                    </div>

                    {/* Tarjeta Resumen */}
                    <div className={styles.financialSummary}>
                      <div className={styles.summaryRowTop}>
                        <span className={styles.summaryLabelTop}>Total a Cobrar</span>
                        <span className={styles.summaryValueTop}>S/. {totalToPay}</span>
                      </div>
                      <div className={styles.summaryRowBottom}>
                        <div>
                          <span className={styles.summaryLabelBottom}>Cuota Diaria</span>
                          <span className={styles.summarySubBottom}>Cobro de Lunes a Sábado</span>
                        </div>
                        <div className={styles.summaryValueBottom}>
                          S/. {dailyQuota}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ============================================================== */}
            {/* PASO 3: ÉXITO Y COMPARTIR                                      */}
            {/* ============================================================== */}
            <div className={styles.slide}>
              <div className={styles.successContainer}>
                <div className={styles.successIconWrapper}>
                  <CheckCircle2 size={40} strokeWidth={2.5} />
                </div>
                
                <div>
                  <h3 className={styles.successTitle}>¡Préstamo Creado!</h3>
                  <p className={styles.successSubtitle}>El crédito ha sido registrado correctamente.</p>
                </div>
                
                <div className={styles.successSummaryCard}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Cliente</span>
                    <span className={styles.summaryValue}>{person?.firstName} {person?.lastName}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Monto prestado</span>
                    <span className={styles.summaryValue}>S/. {amount}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Total a pagar</span>
                    <span className={styles.summaryValue} style={{color: '#10b981'}}>S/. {totalToPay}</span>
                  </div>
                </div>

                <div className={styles.successActions}>
                  <button 
                    type="button" 
                    className={styles.shareBtn} 
                    onClick={handleShare}
                    disabled={loading}
                  >
                    <Share2 size={18} />
                    {loading ? "Generando..." : "Compartir Tarjeta"}
                  </button>
                  <button 
                    type="button" 
                    className={styles.doneBtn} 
                    onClick={() => {
                      onClose();
                      // Reiniciar después de que la animación termine
                      setTimeout(resetState, 400); 
                    }}
                  >
                    Finalizar
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ============================================================== */}
        {/* FOOTER ACCIÓN (Solo visible en Paso 2)                         */}
        {/* ============================================================== */}
        {searchPerformed && person && !createdLoan && (
          <footer className={styles.actionFooter}>
            <button
              className={styles.confirmBtn}
              onClick={handleCreateLoan}
              disabled={loading || !amount || Number(amount) <= 0 || !days}
            >
              <span>{loading ? "CONFIRMANDO..." : "CONFIRMAR PRÉSTAMO"}</span>
              <svg
                className="w-4 h-4 stroke-[2.5]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ width: 16, height: 16, strokeWidth: 2.5 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                ></path>
              </svg>
            </button>
            <p className={styles.actionSubtext}>
              Al confirmar, se registrará el préstamo y podrás imprimir el comprobante.
            </p>
          </footer>
        )}
      </div>
      
      {/* Componente invisible para generar imágenes de compartir */}
      <LoanShareGenerator ref={shareRef} />
    </div>
  );
}
