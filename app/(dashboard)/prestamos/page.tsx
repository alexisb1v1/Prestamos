"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getAllLoansUseCase, Loan } from "@/app/features/loans";
import { userService } from "@/lib/userService";
import { getAllCompaniesUseCase, Company } from "@/app/features/companies";
import { authService } from "@/lib/auth";
import { User } from "@/app/features/users";
import { getLoanStatus, formatDateUTC, formatMoney } from "@/lib/loanUtils";
import CreateLoanModal from "../../components/CreateLoanModal";
import CreatePaymentModal from "../../components/CreatePaymentModal";
import LoanDetailsModal from "../../components/LoanDetailsModal";
import ReassignLoanModal from "../../components/ReassignLoanModal";
import DeleteLoanConfirmModal from "../../components/DeleteLoanConfirmModal";
import { logger } from "@/lib/logging-service";
import LoanShareGenerator, {
  LoanShareGeneratorRef,
} from "../../components/LoanShareGenerator";
import LoanActions from "../../components/LoanActions";
import LoadingSpinner from "../../components/LoadingSpinner";
import LoanMobileCard from "../../components/LoanMobileCard";
import DashboardFilterModal from "../../components/DashboardFilterModal";

export default function PrestamosPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const today = useMemo(() => new Date(), []);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [isLiquidated, setIsLiquidated] = useState(false);
  const [selectedCollector, setSelectedCollector] = useState("");
  const [collectors, setCollectors] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Multi-tenancy state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLoanForRenewal, setSelectedLoanForRenewal] =
    useState<Loan | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedLoanForPayment, setSelectedLoanForPayment] =
    useState<Loan | null>(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedLoanForDetails, setSelectedLoanForDetails] =
    useState<Loan | null>(null);

  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [selectedLoanForReassign, setSelectedLoanForReassign] =
    useState<Loan | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLoanForDelete, setSelectedLoanForDelete] =
    useState<Loan | null>(null);

  const shareRef = useRef<LoanShareGeneratorRef>(null);

  const handleOpenDetails = (loan: Loan) => {
    setSelectedLoanForDetails(loan);
    setIsDetailsModalOpen(true);
  };

  const handleOpenPayment = (loan: Loan) => {
    setSelectedLoanForPayment(loan);
    setIsPaymentModalOpen(true);
  };

  const handleRenewLoan = (loan: Loan) => {
    setSelectedLoanForRenewal(loan);
    setIsCreateModalOpen(true);
  };

  const handleOpenReassign = (loan: Loan) => {
    setSelectedLoanForReassign(loan);
    setIsReassignModalOpen(true);
  };

  const handleOpenDelete = (loan: Loan) => {
    setSelectedLoanForDelete(loan);
    setIsDeleteModalOpen(true);
  };

  const loadLoans = useCallback(
    async (
      userContext?: User | null,
      companyId?: string,
      liquidatedFilter?: boolean,
      collectorId?: string,
    ) => {
      const user = userContext || currentUser;
      const compId = companyId !== undefined ? companyId : selectedCompanyId;
      const liquidated =
        liquidatedFilter !== undefined ? liquidatedFilter : isLiquidated;
      const colId = collectorId !== undefined ? collectorId : selectedCollector;

      try {
        setLoading(true);
        let userIdFilter = colId;

        if (user?.profile === "COBRADOR") {
          userIdFilter = user.id;
        }

        const result = await getAllLoansUseCase.execute(
          userIdFilter,
          searchQuery,
          compId,
          liquidated,
        );

        result.match(
          (data) => setLoans(data),
          (err) => {
            logger.error("Error loading loans:", err);
            setError("Error al cargar la lista de préstamos.");
          },
        );
      } finally {
        setLoading(false);
      }
    },
    [
      currentUser,
      isLiquidated,
      searchQuery,
      selectedCollector,
      selectedCompanyId,
    ],
  );

  const loadCollectors = useCallback(
    async (companyId?: string) => {
      try {
        const compId = companyId !== undefined ? companyId : selectedCompanyId;
        const allUsers = await userService.getAll(undefined, false, compId);
        const activeCollectors = allUsers.filter(
          (u) => u.status === "ACTIVE" && u.profile === "COBRADOR",
        );
        setCollectors(activeCollectors);
      } catch (err) {
        logger.error("Error loading collectors:", err);
      }
    },
    [selectedCompanyId],
  );

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const user = authService.getUser();
      if (!isMounted) return;
      setCurrentUser(user);

      let companyIdToUse = user?.idCompany;

      if (user?.profile === "OWNER") {
        const result = await getAllCompaniesUseCase.execute();
        result.match(
          (data) => {
            if (!isMounted) return;
            setCompanies(data);
            if (data.length > 0) {
              setSelectedCompanyId("");
              companyIdToUse = "";
            }
          },
          (err) => logger.error("Error loading companies:", err),
        );
      } else {
        setSelectedCompanyId(user?.idCompany || "");
      }

      if (user?.profile === "ADMIN" || user?.profile === "OWNER") {
        const filterCompany =
          user.profile === "OWNER" ? companyIdToUse : user.idCompany;
        loadCollectors(filterCompany);
      }

      loadLoans(user, companyIdToUse);
    };
    init();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Montaje único para evitar bucles infinitos

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadLoans();
  };

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

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Cálculo de Métricas
  const capitalColocado = loans.reduce((acc, loan) => acc + loan.amount, 0);
  const saldoPorCobrar = loans.reduce((acc, loan) => acc + ((loan as any).remainingAmount || 0), 0);
  
  const moraAcumulada = loans.reduce((acc, loan) => {
    const status = getLoanStatus(loan, today);
    if (status.value === "yellow" || status.value === "red") {
       return acc + loan.fee; // Aproximación
    }
    return acc;
  }, 0);

  const cuotasPagadasHoy = loans.filter((l) => (l as any).paidToday > 0).length;
  const totalActivos = loans.length;

  return (
    <div style={{ position: 'relative' }}>

      {/* HEADER DESKTOP */}
      {!isMobile && (
        <div style={{ padding: "0 0 1.5rem 0" }}>
          {/* View Header: Title, Segmented States and New Loan CTA */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.025em", margin: 0 }}>Préstamos</h1>
                <span style={{ padding: "0.125rem 0.625rem", backgroundColor: "rgba(226, 232, 240, 0.7)", color: "#334155", fontSize: "0.75rem", fontWeight: 700, borderRadius: "9999px" }}>
                  {loans.length}
                </span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem", margin: 0 }}>Supervisa créditos otorgados, recaudación diaria y cuotas pendientes</p>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {/* Segmented Filter Control */}
              <div style={{ backgroundColor: "rgba(226, 232, 240, 0.7)", padding: "0.25rem", borderRadius: "0.75rem", display: "flex", alignItems: "center", fontSize: "0.75rem", fontWeight: 600 }}>
                <button 
                  onClick={() => { setIsLiquidated(false); loadLoans(currentUser, selectedCompanyId, false); }}
                  style={{ padding: "0.375rem 0.875rem", borderRadius: "0.5rem", border: "none", backgroundColor: !isLiquidated ? "#4f46e5" : "transparent", color: !isLiquidated ? "white" : "#475569", cursor: "pointer", transition: "all 0.2s", boxShadow: !isLiquidated ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)" : "none" }}>
                  ACTIVOS
                </button>
                <button 
                  onClick={() => { setIsLiquidated(true); loadLoans(currentUser, selectedCompanyId, true); }}
                  style={{ padding: "0.375rem 0.875rem", borderRadius: "0.5rem", border: "none", backgroundColor: isLiquidated ? "#4f46e5" : "transparent", color: isLiquidated ? "white" : "#475569", cursor: "pointer", transition: "all 0.2s", boxShadow: isLiquidated ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)" : "none" }}>
                  LIQUIDADOS
                </button>
              </div>
              
              {/* Create Button */}
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", backgroundColor: "#4f46e5", color: "white", fontWeight: 600, fontSize: "0.75rem", padding: "0.625rem 1rem", borderRadius: "0.75rem", border: "none", cursor: "pointer", boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.25)" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
                <span>Nuevo Préstamo</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Summary Bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "1rem", border: "1px solid rgba(226, 232, 240, 0.8)", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Capital Colocado</p>
                <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", marginTop: "0.125rem", margin: 0 }}>{formatMoney(capitalColocado)}</p>
              </div>
              <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem", backgroundColor: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><path d="M12 18V6"></path></svg>
              </div>
            </div>
            
            <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "1rem", border: "1px solid rgba(226, 232, 240, 0.8)", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Saldo Por Cobrar</p>
                <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "#4f46e5", marginTop: "0.125rem", margin: 0 }}>{formatMoney(saldoPorCobrar)}</p>
              </div>
              <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem", backgroundColor: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              </div>
            </div>
            
            <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "1rem", border: "1px solid rgba(226, 232, 240, 0.8)", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Mora Acumulada</p>
                <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "#d97706", marginTop: "0.125rem", margin: 0 }}>{formatMoney(moraAcumulada)}</p>
              </div>
              <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem", backgroundColor: "#fffbeb", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
            </div>

            <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "1rem", border: "1px solid rgba(226, 232, 240, 0.8)", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Cuotas Hoy</p>
                <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "#059669", marginTop: "0.125rem", margin: 0 }}>{cuotasPagadasHoy} / {totalActivos}</p>
              </div>
              <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem", backgroundColor: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div style={{ backgroundColor: "white", padding: "0.875rem", borderRadius: "1rem", border: "1px solid rgba(226, 232, 240, 0.8)", display: "flex", alignItems: "center", gap: "0.75rem", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: "28rem" }}>
              <div style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", display: "flex", alignItems: "center" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
              <form onSubmit={handleSearch} style={{ margin: 0, display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  placeholder="Buscar por Nombre, DNI o N° Préstamo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    height: "2.375rem",
                    borderRadius: "0.75rem",
                    fontSize: "0.75rem",
                    paddingLeft: "2.5rem",
                    paddingRight: "1rem",
                    color: "#334155",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
                <button
                  type="button"
                  onClick={() => loadLoans(currentUser, selectedCompanyId, isLiquidated)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "2.375rem",
                    width: "2.375rem",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                    color: "#64748b",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                  title="Actualizar datos"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                </button>
              </form>
            </div>
            
            {/* Solo mantenemos los filtros si es owner o admin */}
            {(currentUser?.profile === "ADMIN" || currentUser?.profile === "OWNER") && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto" }}>
                {currentUser?.profile === "OWNER" && (
                  <button
                    onClick={() => setIsFilterModalOpen(true)}
                    style={{ backgroundColor: "#f8fafc", padding: "0.5rem 0.75rem", borderRadius: "0.75rem", fontSize: "0.75rem", fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: "0.375rem", border: "1px solid #e2e8f0", cursor: "pointer" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#64748b" }}><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path></svg>
                    <span style={{ maxWidth: "120px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {selectedCompanyId ? companies.find((c) => c.id === selectedCompanyId)?.companyName : "Todas las empresas"}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#94a3b8" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </button>
                )}
                
                <button
                  onClick={() => setIsFilterModalOpen(true)}
                  style={{ backgroundColor: "#f8fafc", padding: "0.5rem 0.75rem", borderRadius: "0.75rem", fontSize: "0.75rem", fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: "0.375rem", border: "1px solid #e2e8f0", cursor: "pointer" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#64748b" }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  <span style={{ maxWidth: "120px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {selectedCollector ? collectors.find((c) => c.id === selectedCollector)?.username : "Todos los cobradores"}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#94a3b8" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}


      {/* HEADER MÓVIL (Listado de Préstamos - NeoCobros) */}
      {isMobile && (
        <div style={{ margin: "0 -1rem", padding: "0 1rem 0.5rem 1rem", position: "sticky", top: "4rem", zIndex: 20, backgroundColor: "var(--bg-app)", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)" }}>
          {/* Selector rápido de cobrador o empresa */}
          {(currentUser?.profile === "ADMIN" || currentUser?.profile === "OWNER") && (
            <div style={{ marginBottom: "1rem", marginTop: "-0.5rem" }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {currentUser?.profile === "OWNER" && (
                  <button
                    onClick={() => setIsFilterModalOpen(true)}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "white", border: "1px solid rgba(226, 232, 240, 0.9)", borderRadius: "1rem", padding: "0.5rem 0.75rem", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", textAlign: "left", transition: "colors 0.2s" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden" }}>
                      <span style={{ padding: "0.25rem", borderRadius: "0.5rem", backgroundColor: "#f1f5f9", color: "#475569" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path></svg>
                      </span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {selectedCompanyId ? companies.find((c) => c.id === selectedCompanyId)?.companyName : "Todas las empresas"}
                      </span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#94a3b8", flexShrink: 0 }}><path d="m6 9 6 6 6-6"></path></svg>
                  </button>
                )}
                <button
                  onClick={() => setIsFilterModalOpen(true)}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "white", border: "1px solid rgba(226, 232, 240, 0.9)", borderRadius: "1rem", padding: "0.5rem 0.75rem", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", textAlign: "left", transition: "colors 0.2s" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden" }}>
                    <span style={{ padding: "0.25rem", borderRadius: "0.5rem", backgroundColor: "#f1f5f9", color: "#475569" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {selectedCollector ? collectors.find((c) => c.id === selectedCollector)?.username : "Todos los cobradores"}
                    </span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#94a3b8", flexShrink: 0 }}><path d="m6 9 6 6 6-6"></path></svg>
                </button>
              </div>
            </div>
          )}

          {/* Resumen de Métricas Clave */}
          <section style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.625rem", marginBottom: "1rem" }}>
            <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "0.75rem", border: "1px solid rgba(226, 232, 240, 0.8)", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
              <div>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>Capital Colocado</span>
                <p style={{ fontSize: "0.875rem", fontWeight: 800, color: "#0f172a", marginTop: "0.125rem", margin: 0 }}>{formatMoney(capitalColocado)}</p>
              </div>
              <div style={{ width: "2rem", height: "2rem", borderRadius: "0.75rem", backgroundColor: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
              </div>
            </div>
            <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "0.75rem", border: "1px solid rgba(226, 232, 240, 0.8)", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
              <div>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>Saldo Por Cobrar</span>
                <p style={{ fontSize: "0.875rem", fontWeight: 800, color: "#4f46e5", marginTop: "0.125rem", margin: 0 }}>{formatMoney(saldoPorCobrar)}</p>
              </div>
              <div style={{ width: "2rem", height: "2rem", borderRadius: "0.75rem", backgroundColor: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
            </div>
            <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "0.75rem", border: "1px solid rgba(226, 232, 240, 0.8)", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
              <div>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>Mora Acumulada</span>
                <p style={{ fontSize: "0.875rem", fontWeight: 800, color: "#d97706", marginTop: "0.125rem", margin: 0 }}>{formatMoney(moraAcumulada)}</p>
              </div>
              <div style={{ width: "2rem", height: "2rem", borderRadius: "0.75rem", backgroundColor: "#fffbeb", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              </div>
            </div>
            <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "0.75rem", border: "1px solid rgba(226, 232, 240, 0.8)", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
              <div>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>Cuotas Hoy</span>
                <p style={{ fontSize: "0.875rem", fontWeight: 800, color: "#059669", marginTop: "0.125rem", margin: 0 }}>{cuotasPagadasHoy} / {totalActivos}</p>
              </div>
              <div style={{ width: "2rem", height: "2rem", borderRadius: "0.75rem", backgroundColor: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
              </div>
            </div>
          </section>

          {/* Cabecera de listado y filtros de estado */}
          <section style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.025em", margin: 0 }}>Préstamos</h2>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.125rem 0.5rem", borderRadius: "9999px", backgroundColor: "rgba(226, 232, 240, 0.7)", color: "#475569" }}>
                  {loans.length}
                </span>
              </div>
              
              {/* Filtros Tipo Pill */}
              <div style={{ display: "flex", alignItems: "center", backgroundColor: "rgba(226, 232, 240, 0.7)", padding: "0.25rem", borderRadius: "0.75rem", gap: "0.25rem", fontSize: "11px", fontWeight: 700 }}>
                <button
                  onClick={() => { setIsLiquidated(false); loadLoans(currentUser, selectedCompanyId, false); }}
                  style={{ padding: "0.25rem 0.75rem", borderRadius: "0.5rem", backgroundColor: !isLiquidated ? "#4f46e5" : "transparent", color: !isLiquidated ? "white" : "#475569", boxShadow: !isLiquidated ? "0 1px 2px rgba(0,0,0,0.05)" : "none", border: "none", cursor: "pointer", transition: "colors 0.2s" }}
                >
                  ACTIVOS
                </button>
                <button
                  onClick={() => { setIsLiquidated(true); loadLoans(currentUser, selectedCompanyId, true); }}
                  style={{ padding: "0.25rem 0.625rem", borderRadius: "0.5rem", backgroundColor: isLiquidated ? "#4f46e5" : "transparent", color: isLiquidated ? "white" : "#475569", boxShadow: isLiquidated ? "0 1px 2px rgba(0,0,0,0.05)" : "none", border: "none", cursor: "pointer", transition: "colors 0.2s" }}
                >
                  LIQ
                </button>
              </div>
            </div>

            {/* Barra de Búsqueda */}
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: "0", top: "0", bottom: "0", paddingLeft: "0.875rem", display: "flex", alignItems: "center", pointerEvents: "none", color: "#94a3b8" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
              </div>
              <form onSubmit={handleSearch} style={{ margin: 0, display: "flex", gap: "0.5rem" }}>
                <input
                  type="search"
                  placeholder="Buscar por Nombre o DNI..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.625rem 1rem 0.625rem 2.5rem",
                    backgroundColor: "white",
                    border: "1px solid rgba(226, 232, 240, 0.9)",
                    borderRadius: "1rem",
                    fontSize: "0.875rem",
                    color: "#0f172a",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    outline: "none"
                  }}
                />
                <button
                  type="button"
                  onClick={() => loadLoans(currentUser, selectedCompanyId, isLiquidated)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "2.5rem", height: "2.5rem", flexShrink: 0, backgroundColor: "white", border: "1px solid rgba(226, 232, 240, 0.9)", borderRadius: "1rem", color: "#64748b", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                </button>
              </form>
            </div>
          </section>
        </div>
      )}

      <DashboardFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        companies={companies}
        collectors={collectors}
        selectedCompanyId={selectedCompanyId}
        onCompanyChange={(newId) => {
          setSelectedCompanyId(newId);
          setSelectedCollector("");
          loadCollectors(newId);
        }}
        selectedUserId={selectedCollector}
        onUserChange={setSelectedCollector}
        onApply={() =>
          loadLoans(
            currentUser,
            selectedCompanyId,
            isLiquidated,
            selectedCollector,
          )
        }
        isOwner={currentUser?.profile === "OWNER"}
        isAdmin={
          currentUser?.profile === "ADMIN" || currentUser?.profile === "OWNER"
        }
      />

      {error && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            backgroundColor: "rgba(220, 38, 38, 0.1)",
            border: "1px solid var(--color-danger)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-danger)",
          }}
        >
          {error}
        </div>
      )}

      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {loading ? (
            <LoadingSpinner message="Cargando préstamos..." />
          ) : loans.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "2rem",
                color: "var(--text-secondary)",
              }}
            >
              No se encontraron préstamos.
            </div>
          ) : (
            loans.map((loan) => (
              <LoanMobileCard
                key={loan.id}
                loan={loan}
                today={today}
                currentUser={currentUser}
                onRenew={handleRenewLoan}
                onPay={handleOpenPayment}
                onDetails={handleOpenDetails}
                onReassign={handleOpenReassign}
                onDelete={handleOpenDelete}
                shareRef={shareRef}
              />
            ))
          )}
        </div>
      ) : (
<div id="tabla-prestamos" style={{ position: "relative", backgroundColor: "#ffffff", borderRadius: "1rem", border: "1px solid rgba(226, 232, 240, 0.8)", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
          <div style={{ overflowX: "auto", overflowY: "visible", position: "relative" }}>
            <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", minWidth: "900px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(226, 232, 240, 0.8)", backgroundColor: "rgba(248, 250, 252, 0.7)", fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "0.875rem 1rem 0.875rem 1.5rem" }}>Cliente</th>
                  <th style={{ padding: "0.875rem 1rem" }}>Vigencia</th>
                  <th style={{ padding: "0.875rem 1rem" }}>Detalle del Préstamo</th>
                  <th style={{ padding: "0.875rem 1rem" }}>Total / Saldo</th>
                  <th style={{ padding: "0.875rem 1rem" }}>Cobrador</th>
                  <th style={{ padding: "0.875rem 1.5rem 0.875rem 1rem", textAlign: "center" }}>Acción</th>
                </tr>
              </thead>
              <tbody style={{ borderTopWidth: "1px", borderTopColor: "#f1f5f9" }}>
                {loading ? (
                  <tr>
                    <td colSpan={6}>
                      <LoadingSpinner message="Cargando préstamos..." />
                    </td>
                  </tr>
                ) : loans.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ padding: "3rem 0", textAlign: "center", color: "#94a3b8", fontWeight: 500 }}
                    >
                      No se encontraron préstamos.
                    </td>
                  </tr>
                ) : (
                  loans.map((loan) => {
                    const status = getLoanStatus(loan, today);
                    
                    const getStatusColor = (val: string) => {
                      switch (val) {
                        case "green": return "#10b981";
                        case "yellow": return "#f59e0b";
                        case "red": return "#f43f5e";
                        case "blue": return "#4f46e5";
                        default: return "#94a3b8";
                      }
                    };

                    const getStatusBadge = (val: string) => {
                      switch (val) {
                        case "green":
                          return { bg: "#ecfdf5", text: "#047857", border: "rgba(167,243,208,0.7)", dot: "#10b981" };
                        case "yellow":
                          return { bg: "#fffbeb", text: "#b45309", border: "rgba(253,230,138,0.7)", dot: "#f59e0b" };
                        case "red":
                          return { bg: "#fff1f2", text: "#be123c", border: "rgba(254,205,211,0.7)", dot: "#f43f5e" };
                        case "blue":
                          return { bg: "#eef2ff", text: "#4338ca", border: "rgba(199,210,254,0.7)", dot: "#4f46e5" };
                        default:
                          return { bg: "#f8fafc", text: "#334155", border: "rgba(226,232,240,0.7)", dot: "#94a3b8" };
                      }
                    };

                    const statusColor = getStatusColor(status.value);
                    const badgeColors = getStatusBadge(status.value);
                    
                    const remainingAmount = (loan as any).remainingAmount || 0;
                    const totalAmount = loan.amount + loan.interest;
                    const paidAmount = totalAmount - remainingAmount;
                    const progress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
                    const totalCuotas = loan.days;
                    const paidCuotas = totalCuotas > 0 ? paidAmount / loan.fee : 0;

                    return (
                      <tr
                        key={loan.id}
                        style={{ position: "relative", transition: "background-color 0.2s", borderBottom: "1px solid #f8fafc" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(248, 250, 252, 0.5)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        {/* Columna: Cliente */}
                        <td style={{ padding: "1rem 1rem 1rem 1.5rem", verticalAlign: "top", position: "relative" }}>
                          {/* Indicador lateral sutil */}
                          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", backgroundColor: statusColor }}></div>
                          
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.25rem" }}>
                            {/* Punto de estado alineado al texto */}
                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: badgeColors.dot, marginTop: "6px", flexShrink: 0 }}></div>
                            <div>
                              <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px", lineHeight: 1.25 }}>
                                {loan.clientName?.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) || "SIN NOMBRE"}
                              </div>
                              <div style={{ fontSize: "12px", fontWeight: 500, color: "#94a3b8", marginTop: "0.125rem" }}>
                                DNI: {loan.documentNumber || "Sin Documento"}
                              </div>
                            </div>
                          </div>
                          
                          {(loan.address || loan.phone) && (
                            <div style={{ marginTop: "0.375rem", paddingLeft: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                              {loan.address && (
                                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "#64748b", fontSize: "12px" }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>{loan.address}</span>
                                </div>
                              )}
                              {loan.phone && (
                                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "#4f46e5", fontSize: "12px", fontWeight: 600 }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                  <span>{loan.phone}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Columna: Vigencia */}
                        <td style={{ padding: "1rem", verticalAlign: "top" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            <div style={{ fontSize: "13px", fontWeight: 500, color: "#64748b", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                              <span>Inicio:</span>
                              <span style={{ color: "#4f46e5" }}>{formatDateUTC(loan.startDate)}</span>
                            </div>
                            <div style={{ fontSize: "13px", fontWeight: 500, color: "#64748b", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                              <span>Fin:</span>
                              <span style={{ color: "#4f46e5" }}>{formatDateUTC(loan.endDate)}</span>
                            </div>
                            <div style={{ marginTop: "0.5rem" }}>
                                <span style={{
                                  display: "inline-flex", alignItems: "center", padding: "0.125rem 0.625rem", borderRadius: "9999px",
                                  fontSize: "11px", fontWeight: 700, backgroundColor: badgeColors.bg, color: badgeColors.text, border: `1px solid ${badgeColors.border}`
                                }}>
                                  {status.label}
                                </span>
                            </div>
                          </div>
                        </td>

                        {/* Columna: Detalle del Préstamo */}
                        <td style={{ padding: "1rem", verticalAlign: "top" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "0.75rem", columnGap: "1rem" }}>
                            <div>
                              <span style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>Monto:</span>
                              <div style={{ fontSize: "14px", fontWeight: 600, color: "#334155" }}>{formatMoney(loan.amount)}</div>
                            </div>
                            <div>
                              <span style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>Interés:</span>
                              <div style={{ fontSize: "14px", fontWeight: 600, color: "#334155" }}>{formatMoney(loan.interest)} <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>({Math.round((loan.interest / loan.amount) * 100)}%)</span></div>
                            </div>
                            <div>
                              <span style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>Cuota:</span>
                              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>{formatMoney(loan.fee)}</div>
                            </div>
                            <div>
                              <span style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>Plazo:</span>
                              <div style={{ fontSize: "14px", fontWeight: 600, color: "#334155" }}>{loan.days} Días</div>
                            </div>
                          </div>
                        </td>

                        {/* Columna: Total / Saldo */}
                        <td style={{ padding: "1rem", verticalAlign: "top" }}>
                          <div style={{ marginBottom: "0.5rem" }}>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>Total:</span>
                            <div style={{ fontSize: "16px", fontWeight: 700, color: "#4f46e5", lineHeight: 1.1 }}>{formatMoney(totalAmount)}</div>
                          </div>
                          
                          <div style={{ marginBottom: "0.375rem" }}>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>Restante:</span>
                            <div style={{ fontSize: "16px", fontWeight: 700, color: loan.status === 'Liquidado' ? "#0f172a" : "#e11d48", lineHeight: 1.1 }}>{formatMoney(remainingAmount)}</div>
                          </div>
                          
                          <div style={{ marginTop: "0.5rem", width: "120px" }}>
                            <div style={{ width: "100%", height: "6px", backgroundColor: "#e2e8f0", borderRadius: "9999px", overflow: "hidden" }}>
                              <div style={{ height: "100%", backgroundColor: "#4f46e5", borderRadius: "9999px", width: `${progress}%`, transition: 'width 0.5s ease' }}></div>
                            </div>
                            <div style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", marginTop: "0.25rem" }}>
                              {paidCuotas.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 1 })} de {totalCuotas} cuotas
                            </div>
                          </div>
                        </td>

                        {/* Columna: Cobrador */}
                        <td style={{ padding: "1rem", verticalAlign: "top" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", backgroundColor: "#f1f5f9", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0, border: "1px solid #e2e8f0" }}>
                              {(loan.collectorName || "??").substring(0, 2).toUpperCase()}
                            </div>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "120px" }}>
                              <div style={{ fontSize: "13px", fontWeight: 600, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2 }} title={loan.collectorName}>
                                {(loan.collectorName || "??").split(" ").slice(0,2).join(" ")}
                              </div>
                              <div style={{ fontSize: "11px", fontWeight: 500, color: "#94a3b8" }}>{loan.collectorDocumentNumber || loan.collectorId || "???"}</div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "1rem", verticalAlign: "top", position: "static" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", position: "relative" }}>
                            <LoanActions
                              loan={loan}
                              currentUser={currentUser}
                              isMobile={false}
                              today={today}
                              onPay={handleOpenPayment}
                              onDetails={handleOpenDetails}
                              onRenew={handleRenewLoan}
                              onReassign={handleOpenReassign}
                              onDelete={handleOpenDelete}
                              shareRef={shareRef}
                              minimal={false}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <CreateLoanModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedLoanForRenewal(null);
        }}
        onSuccess={() => {
          if (currentUser) loadLoans(currentUser);
        }}
        loanToRenew={selectedLoanForRenewal}
        companyId={selectedCompanyId || currentUser?.idCompany}
      />
      <CreatePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => {
          if (currentUser) loadLoans(currentUser);
        }}
        loan={selectedLoanForPayment}
      />
      <LoanDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        loan={selectedLoanForDetails}
        shareRef={shareRef}
      />
      <ReassignLoanModal
        isOpen={isReassignModalOpen}
        onClose={() => {
          setIsReassignModalOpen(false);
          setSelectedLoanForReassign(null);
        }}
        onSuccess={() => {
          if (currentUser) loadLoans(currentUser);
        }}
        loan={selectedLoanForReassign}
      />
      <DeleteLoanConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedLoanForDelete(null);
        }}
        onSuccess={() => {
          if (currentUser) loadLoans(currentUser);
        }}
        loan={selectedLoanForDelete}
      />
      <LoanShareGenerator ref={shareRef} />
    </div>
  );
}
