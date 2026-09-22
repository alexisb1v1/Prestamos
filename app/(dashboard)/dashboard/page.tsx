"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  getDashboardDataUseCase,
  DashboardData,
  Loan,
} from "@/app/features/loans";
import { userService } from "@/lib/userService";
import { getAllCompaniesUseCase, Company } from "@/app/features/companies";
import { authService } from "@/lib/auth";
import { User } from "@/app/features/users";
import { formatMoney } from "@/lib/loanUtils";
import { logger } from "@/lib/logging-service";
import CreatePaymentModal from "../../components/CreatePaymentModal";
import LoanDetailsModal from "../../components/LoanDetailsModal";
import CreateLoanModal from "../../components/CreateLoanModal";
import ReassignLoanModal from "../../components/ReassignLoanModal";
import DeleteLoanConfirmModal from "../../components/DeleteLoanConfirmModal";
import LoanShareGenerator, {
  LoanShareGeneratorRef,
} from "../../components/LoanShareGenerator";
import LoadingSpinner from "../../components/LoadingSpinner";
import AnimatedNumber from "../../components/AnimatedNumber";
import CollectionRouteCard from "../../components/CollectionRouteCard";
import DashboardFilterModal from "../../components/DashboardFilterModal";
import UpdateLoanInfoModal from "../../components/UpdateLoanInfoModal";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  saveCollectionOrder,
  getCollectionOrder,
  applySavedOrder,
  cleanupOldOrders,
} from "@/lib/collectionOrderStorage";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [searchTermLocal, setSearchTermLocal] = useState("");

  // Share Generator Ref
  const shareRef = useRef<LoanShareGeneratorRef>(null);

  // Drag & Drop state
  const [orderedLoans, setOrderedLoans] = useState<Loan[]>([]);

  // Optimization: Calculate today once per render to pass to helpers
  const today = useMemo(() => new Date(), []);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10, // 10px of movement required
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Long press requirement for mobile
        tolerance: 5, // Allow 5px of movement during delay
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Auth & Filtering state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [collectors, setCollectors] = useState<User[]>([]);

  // Multi-tenancy state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedLoanForPayment, setSelectedLoanForPayment] =
    useState<Loan | null>(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedLoanForDetails, setSelectedLoanForDetails] =
    useState<Loan | null>(null);

  // States for new actions
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isThermometerInfoOpen, setIsThermometerInfoOpen] = useState(false);
  const [selectedLoanForRenewal, setSelectedLoanForRenewal] =
    useState<Loan | null>(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [selectedLoanForReassign, setSelectedLoanForReassign] =
    useState<Loan | null>(null);
  const [selectedLoanForDelete, setSelectedLoanForDelete] =
    useState<Loan | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isUpdateInfoModalOpen, setIsUpdateInfoModalOpen] = useState(false);
  const [selectedLoanForUpdateInfo, setSelectedLoanForUpdateInfo] =
    useState<Loan | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Debounce timer for saving order to backend
  const saveOrderTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadDashboard = useCallback(
    async (userIdFilter?: string, companyId?: string) => {
      const compId = companyId !== undefined ? companyId : selectedCompanyId;
      const freshUser = authService.getUser(); // Obtener usuario fresco para evitar carreras de estado

      try {
        setLoading(true);
        const result = await getDashboardDataUseCase.execute(
          userIdFilter,
          compId,
        );

        result.match(
          (data) => {
            setData(data);
            // Apply saved order: Priority 1: LocalStorage, Priority 2: User profile (Backend)
            let savedOrder = getCollectionOrder(userIdFilter || "all");

            if (!savedOrder && freshUser?.collectionOrder) {
              savedOrder = freshUser.collectionOrder;
            }

            const ordered = applySavedOrder<Loan>(
              data.pendingLoans,
              savedOrder,
            );
            setOrderedLoans(ordered);
          },
          (err) => {
            logger.error("Error loading dashboard:", err);
            setError("Error al cargar los datos del dashboard.");
          },
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedCompanyId],
  );

  const loadCollectors = useCallback(async () => {
    try {
      const currentUser = authService.getUser();
      let companyFilter = undefined;

      if (currentUser?.profile === "OWNER") {
        companyFilter = selectedCompanyId;
      } else {
        companyFilter = currentUser?.idCompany;
      }

      // Only fetch if we have a company filter or we don't care (but we care about multi-tenancy)
      if (!companyFilter && currentUser?.profile !== "OWNER") return; // Should not happen for admin/cobrador

      const allUsers = await userService.getAll(
        undefined,
        false,
        companyFilter,
      );

      // Filter only active collectors
      const activeCollectors = allUsers.filter(
        (u) => u.status === "ACTIVE" && u.profile === "COBRADOR",
      );
      setCollectors(activeCollectors);
    } catch (err) {
      logger.error("Error loading collectors:", err);
    }
  }, [selectedCompanyId]);

  const loadCompanies = useCallback(async () => {
    const result = await getAllCompaniesUseCase.execute();
    return result.match(
      (data) => {
        setCompanies(data);
        if (data.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId("");
          return "";
        }
        return selectedCompanyId;
      },
      (err) => {
        logger.error("Failed to load companies", err);
        return null;
      },
    );
  }, [selectedCompanyId]);

  const handleOpenDetails = (loan: Loan) => {
    setSelectedLoanForDetails(loan);
    setIsDetailsModalOpen(true);
  };

  // Event Listener for updates (from FabMenu)
  useEffect(() => {
    const handleUpdate = () => {
      loadDashboard(selectedUserId, selectedCompanyId); // Reload with current filter
    };
    window.addEventListener("dashboard-update", handleUpdate);

    const handleOpenFilters = () => setIsFilterModalOpen(true);
    const filterBtn = document.getElementById("open-filters-btn");
    if (filterBtn) filterBtn.onclick = handleOpenFilters;

    return () => {
      window.removeEventListener("dashboard-update", handleUpdate);
    };
  }, [selectedUserId, selectedCompanyId, loadDashboard]);

  const handleOpenPayment = (loan: Loan) => {
    setSelectedLoanForPayment(loan);
    setIsPaymentModalOpen(true);
  };

  const handleOpenUpdateInfo = (loan: Loan) => {
    setSelectedLoanForUpdateInfo(loan);
    setIsUpdateInfoModalOpen(true);
  };


  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = orderedLoans.findIndex(
        (item) => String(item.id) === active.id,
      );
      const newIndex = orderedLoans.findIndex(
        (item) => String(item.id) === over.id,
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(orderedLoans, oldIndex, newIndex);

        // 1. Actualizar UI
        setOrderedLoans(newOrder);

        // 2. Persistir localmente (instantáneo)
        const loanIds = newOrder.map((loan) => String(loan.id));
        saveCollectionOrder(selectedUserId || "all", loanIds);

        // 3. Sincronizar con el Backend (con Debounce)
        if (saveOrderTimerRef.current) clearTimeout(saveOrderTimerRef.current);

        saveOrderTimerRef.current = setTimeout(async () => {
          try {
            logger.info("Sincronizando orden con el backend...");
            const response = await userService.updateCollectionOrder(loanIds);

            if (response.success) {
              // Actualizar para que el orden persista al recargar
              authService.updateUser({ collectionOrder: loanIds });
            }
          } catch (err) {
            logger.error("Error al sincronizar el orden con el backend:", err);
          }
        }, 800);
      }
    }
  };


  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const user = authService.getUser();
      if (!isMounted) return;
      setCurrentUser(user);

      // Clean up old orders on mount
      cleanupOldOrders();

      if (user) {
        let companyIdToUse = user.idCompany;

        if (user.profile === "OWNER") {
          // If owner, fetch companies and set default
          const defaultCompanyId = await loadCompanies();
          if (defaultCompanyId !== null) {
            companyIdToUse = defaultCompanyId;
          }
        } else {
          setSelectedCompanyId(user.idCompany || "");
        }

        if (user.profile === "ADMIN" || user.profile === "OWNER") {
          loadDashboard("", companyIdToUse);
          loadCollectors();
        } else {
          // For COBRADOR, always use their ID
          setSelectedUserId(user.id);
          loadDashboard(user.id, companyIdToUse);
        }
      }
    };
    init();

    const checkMobile = () => {
      if (isMounted) setIsMobile(window.innerWidth < 768);
    };
    const resizeTimer = setTimeout(checkMobile, 0);
    window.addEventListener("resize", checkMobile);

    return () => {
      isMounted = false;
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", checkMobile);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Montaje único

  // Local filtering logic for search
  const filteredLoans = (orderedLoans || []).filter((loan) => {
    if (!searchTermLocal.trim()) return true;
    const search = searchTermLocal.toLowerCase();
    return (
      loan.clientName?.toLowerCase().includes(search) ||
      loan.documentNumber?.toLowerCase().includes(search)
    );
  });

  // Effect to reload data when company changes (only for Owner mainly)
  useEffect(() => {
    if (currentUser?.profile === "OWNER") {
      loadCollectors(); // Reload collectors for new company
      loadDashboard(selectedUserId, selectedCompanyId);
    }
  }, [
    selectedCompanyId,
    currentUser?.profile,
    loadCollectors,
    loadDashboard,
    selectedUserId,
  ]);

  // formatMoney is now imported from lib/loanUtils above

  // Sortable Mobile Card Component
  function SortableMobileCard({ loan, index }: { loan: Loan; index: number }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: String(loan.id),
      disabled: !!searchTermLocal.trim(),
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.7 : 1,
      zIndex: isDragging ? 1000 : 1,
      position: "relative" as const,
    };

    return (
      <div ref={setNodeRef} style={style}>
        <CollectionRouteCard
          loan={loan}
          index={index}
          today={today}
          currentUser={currentUser}
          onPay={handleOpenPayment}
          onDetails={handleOpenDetails}
          onUpdateInfo={handleOpenUpdateInfo}
          shareRef={shareRef}
          showDragHandle={!searchTermLocal.trim()}
          dragHandleProps={{ ...attributes, ...listeners }}
          isDragging={isDragging}
        />
      </div>
    );
  }

  if (loading && !data) return <LoadingSpinner message="Cargando resumen..." />;
  if (error)
    return (
      <div style={{ padding: "2rem", color: "red", textAlign: "center" }}>
        {error}
      </div>
    );

  const isAdmin =
    currentUser?.profile === "ADMIN" || currentUser?.profile === "OWNER";

  return (
    <div>
      {isAdmin && (
        <div
          style={{
            backgroundColor: "var(--bg-app)",
            margin: "-1.5rem -1rem 1rem -1rem",
            padding: "0 1rem 0.6rem 1rem",
            display: "flex",
            gap: "0.5rem",
            borderBottom: "1px solid var(--border-color)",
            position: "relative",
            zIndex: 10
          }}
        >
          {/* Ocultar el borde del header para fusionarlos visualmente */}
          <div style={{ position: "absolute", top: "-1px", left: 0, right: 0, height: "2px", backgroundColor: "var(--bg-app)" }}></div>
          
          {currentUser?.profile === "OWNER" && (
            <button
              onClick={() => setIsFilterModalOpen(true)}
              style={{
                flex: 1,
                backgroundColor: "white",
                padding: "0.45rem 0.5rem",
                borderRadius: "2rem",
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "#475569",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                border: "1px solid var(--border-color)",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#64748b" }}>
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                <path d="M9 22v-4h6v4"></path>
              </svg>
              <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {selectedCompanyId ? companies.find((c) => c.id === selectedCompanyId)?.companyName : "Todas las empresas"}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#94a3b8" }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          )}

          <button
            onClick={() => setIsFilterModalOpen(true)}
            style={{
              flex: 1,
              backgroundColor: "white",
              padding: "0.45rem 0.5rem",
              borderRadius: "2rem",
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "#475569",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              border: "1px solid var(--border-color)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#64748b" }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {selectedUserId ? collectors.find((c) => c.id === selectedUserId)?.username : "Todos los cobradores"}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#94a3b8" }}>
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
      )}



      {loading ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: "var(--text-secondary)",
          }}
        >
          Actualizando datos...
        </div>
      ) : !data ? null : (
        <>
          <div
            id="stats-dashboard"
            className="card"
            style={{
              backgroundColor: "white",
              borderRadius: "1.25rem",
              padding: "1.25rem",
              marginBottom: "1.25rem",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
              border: "1px solid #f1f5f9"
            }}
          >
            {/* Header: Resumen del día */}
            <div style={{ marginBottom: "1rem", textAlign: "center" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                RESUMEN DEL DÍA
              </h2>
            </div>

            {/* Total Row */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.25rem" }}>
              <div>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "0.25rem" }}>TOTAL COBRADO</div>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>
                  <AnimatedNumber value={data.collectedToday} isCurrency />
                </div>
              </div>
              
              <div style={{ display: "flex", width: "100%", gap: "0.5rem" }}>
                {/* Yape Pill */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", backgroundColor: "#f5f3ff", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #ede9fe" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "0.25rem", backgroundColor: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.5rem", fontWeight: 800, color: "#8b5cf6", textTransform: "uppercase" }}>YAPE</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 900, color: "#0f172a" }}>{formatMoney(data.detailCollectedToday?.yape || 0).replace("S/ ", "S/")}</div>
                  </div>
                </div>

                {/* Efectivo Pill */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", backgroundColor: "#f0fdf4", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #dcfce7" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "0.25rem", backgroundColor: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.5rem", fontWeight: 800, color: "#10b981", textTransform: "uppercase" }}>EFECTIVO</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 900, color: "#0f172a" }}>{formatMoney(data.detailCollectedToday?.efectivo || 0).replace("S/ ", "S/")}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Row */}
            <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
              {/* Prestado */}
              <div style={{ flex: 1, minWidth: "90px", padding: "0.75rem", borderRadius: "0.75rem", border: "1px solid #f1f5f9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
                <div style={{ fontSize: "0.55rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "0.25rem" }}>PRESTADO</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "#0f172a" }}>{formatMoney(data.totalLentToday).replace("S/ ", "S/")}</div>
              </div>
              {/* Clientes */}
              <div style={{ flex: 1, minWidth: "90px", padding: "0.75rem", borderRadius: "0.75rem", border: "1px solid #f1f5f9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
                <div style={{ fontSize: "0.55rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "0.25rem" }}>CLIENTES</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "#4f46e5" }}>{data.activeClients}</div>
              </div>
              
              {/* Conditional Metrics for Admin */}
              {isAdmin && (
                <>
                  {/* Gastos */}
                  <div style={{ flex: 1, minWidth: "90px", padding: "0.75rem", borderRadius: "0.75rem", border: "1px solid #f1f5f9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
                    <div style={{ fontSize: "0.55rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "0.25rem" }}>GASTOS</div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "#ef4444" }}>{formatMoney(data.totalExpensesToday || 0).replace("S/ ", "S/")}</div>
                  </div>
                  {/* Inversión */}
                  <div style={{ flex: 1, minWidth: "90px", padding: "0.75rem", borderRadius: "0.75rem", border: "1px solid #f1f5f9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc", position: "relative" }}>
                    <div style={{ fontSize: "0.55rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                      INVERSIÓN
                      <button onClick={() => setIsThermometerInfoOpen(true)} style={{ background: "none", border: "none", padding: 0, color: "#94a3b8", cursor: "pointer", display: "flex" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                      </button>
                    </div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 900, color: getThermometerColor(data.thermometer || 0) }}>
                      {Math.round(data.thermometer || 0)}%
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div id="lista-rutas-dashboard" style={{ marginTop: "1.25rem" }}>
            {/* Sticky Header Container */}
            <div
              style={{
                position: "sticky",
                top: isMobile ? "4rem" : "0.5rem",
                zIndex: 20,
                backgroundColor: "white",
                margin: isMobile ? "0 -1rem" : "0",
                padding: "0.85rem 1rem",
                borderRadius: isMobile ? "0" : "1.25rem",
                borderTop: "1px solid #f1f5f9",
                borderBottom: "1px solid #f1f5f9",
                boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)",
                transition: "all 0.3s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.55rem",
                }}
              >
                <h2
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    color: "#1e293b",
                    margin: 0,
                  }}
                >
                  Ruta de Cobro
                </h2>
                <div
                  style={{
                    backgroundColor: "#fff1f2",
                    color: "#f43f5e",
                    padding: "0.25rem 0.6rem",
                    borderRadius: "2rem",
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    border: "1px solid #ffe4e6",
                  }}
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  {filteredLoans.length} PENDIENTES
                </div>
              </div>

              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Nombre o DNI..."
                  value={searchTermLocal}
                  onChange={(e) => setSearchTermLocal(e.target.value)}
                  style={{
                    width: "100%",
                    backgroundColor: "#f8fafc",
                    height: "2.4rem",
                    fontSize: "0.85rem",
                    paddingLeft: "2.5rem",
                    borderRadius: "0.85rem",
                    border: "1.5px solid #e2e8f0",
                    color: "#1e293b",
                    boxShadow: isMobile
                      ? "none"
                      : "inset 0 2px 4px rgba(0,0,0,0.02)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "0.9rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "0.75rem" }}>
              {orderedLoans.length === 0 ? (
                <div
                  className="card"
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                  }}
                >
                  No hay préstamos pendientes para cobrar hoy.
                </div>
              ) : isMobile ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredLoans.map((loan) => String(loan.id))}
                    strategy={verticalListSortingStrategy}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.85rem",
                      }}
                    >
                      {filteredLoans.map((loan, index) => (
                        <SortableMobileCard
                          key={loan.id}
                          loan={loan}
                          index={index}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(350px, 1fr))",
                      gap: "1rem",
                    }}
                  >
                    {filteredLoans.map((loan, index) => (
                      <SortableMobileCard
                        key={loan.id}
                        loan={loan}
                        index={index}
                      />
                    ))}
                  </div>
                </DndContext>
              )}

              <DashboardFilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                companies={companies}
                collectors={collectors}
                selectedCompanyId={selectedCompanyId}
                onCompanyChange={setSelectedCompanyId}
                selectedUserId={selectedUserId}
                onUserChange={setSelectedUserId}
                onApply={() => loadDashboard(selectedUserId, selectedCompanyId)}
                isOwner={currentUser?.profile === "OWNER"}
                isAdmin={
                  currentUser?.profile === "ADMIN" ||
                  currentUser?.profile === "OWNER"
                }
              />
            </div>
          </div>

          {/* All Global Modals */}
          <CreatePaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            onSuccess={() => {
              loadDashboard(selectedUserId, selectedCompanyId);
            }}
            loan={selectedLoanForPayment}
          />

          <LoanDetailsModal
            isOpen={isDetailsModalOpen}
            onClose={() => setIsDetailsModalOpen(false)}
            loan={selectedLoanForDetails}
            shareRef={shareRef}
          />

          <CreateLoanModal
            isOpen={isCreateModalOpen}
            onClose={() => {
              setIsCreateModalOpen(false);
              setSelectedLoanForRenewal(null); // Reset
            }}
            onSuccess={() => loadDashboard(selectedUserId, selectedCompanyId)}
            loanToRenew={selectedLoanForRenewal}
          />

          <ReassignLoanModal
            isOpen={isReassignModalOpen}
            onClose={() => {
              setIsReassignModalOpen(false);
              setSelectedLoanForReassign(null);
            }}
            onSuccess={() => loadDashboard(selectedUserId, selectedCompanyId)}
            loan={selectedLoanForReassign}
          />

          <DeleteLoanConfirmModal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setSelectedLoanForDelete(null);
            }}
            onSuccess={() => loadDashboard(selectedUserId, selectedCompanyId)}
            loan={selectedLoanForDelete}
          />

          <ThermometerInfoModal
            isOpen={isThermometerInfoOpen}
            onClose={() => setIsThermometerInfoOpen(false)}
          />

          {/* Componente invisible para generar imágenes de compartir */}
          <LoanShareGenerator ref={shareRef} />

          {isUpdateInfoModalOpen && selectedLoanForUpdateInfo && (
            <UpdateLoanInfoModal
              loan={selectedLoanForUpdateInfo}
              onClose={() => {
                setIsUpdateInfoModalOpen(false);
                setSelectedLoanForUpdateInfo(null);
              }}
              onSuccess={() => loadDashboard(selectedUserId, selectedCompanyId)}
            />
          )}
        </>
      )}
    </div>
  );
}

function getThermometerColor(percentage: number) {
  if (percentage <= 30) return "#3b82f6"; // Blue - Inversión Activa
  if (percentage <= 70) return "#f59e0b"; // Yellow/Orange - Retorno de Capital
  if (percentage <= 94) return "#22c55e"; // Green - Zona Segura
  return "#10b981"; // Darker Green - Éxito Total
}

function getThermometerLabel(percentage: number) {
  if (percentage <= 30) return "Inversión Activa";
  if (percentage <= 70) return "Retorno de Capital";
  if (percentage <= 94) return "Zona Segura";
  return "Éxito Total";
}

function ThermometerInfoModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.6)",
        padding: "1.5rem",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "1.5rem",
          padding: "1.5rem",
          maxWidth: "420px",
          width: "100%",
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              margin: 0,
              color: "#1e293b",
            }}
          >
            Retorno de Capital
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <p
          style={{
            color: "#64748b",
            fontSize: "0.9rem",
            lineHeight: 1.5,
            margin: "0 0 1.5rem 0",
          }}
        >
          Este termómetro mide el porcentaje de Retorno de Inversión sobre el
          capital total prestado históricamente.
        </p>

        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          {/* Inversión Activa */}
          <div
            style={{
              padding: "0.85rem 1rem",
              borderRadius: "0.85rem",
              borderLeft: "4px solid #3b82f6",
              backgroundColor: "#eff6ff",
              display: "flex",
              flexDirection: "column",
              gap: "0.2rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  color: "#1e40af",
                  fontSize: "0.9rem",
                }}
              >
                Inversión Activa
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: "#3b82f6",
                  fontSize: "0.85rem",
                }}
              >
                0% - 30%
              </span>
            </div>
            <div
              style={{ fontSize: "0.75rem", color: "#60a5fa", lineHeight: 1.4 }}
            >
              El capital está recién colocado; enfoque en colocación sana.
            </div>
          </div>

          {/* Retorno de Capital */}
          <div
            style={{
              padding: "0.85rem 1rem",
              borderRadius: "0.85rem",
              borderLeft: "4px solid #f59e0b",
              backgroundColor: "#fffbeb",
              display: "flex",
              flexDirection: "column",
              gap: "0.2rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  color: "#92400e",
                  fontSize: "0.9rem",
                }}
              >
                Retorno de Capital
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: "#d97706",
                  fontSize: "0.85rem",
                }}
              >
                31% - 70%
              </span>
            </div>
            <div
              style={{ fontSize: "0.75rem", color: "#b45309", lineHeight: 1.4 }}
            >
              Etapa crítica de cobranza para asegurar el punto de equilibrio.
            </div>
          </div>

          {/* Zona Segura */}
          <div
            style={{
              padding: "0.85rem 1rem",
              borderRadius: "0.85rem",
              borderLeft: "4px solid #22c55e",
              backgroundColor: "#f0fdf4",
              display: "flex",
              flexDirection: "column",
              gap: "0.2rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  color: "#166534",
                  fontSize: "0.9rem",
                }}
              >
                Zona Segura
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: "#16a34a",
                  fontSize: "0.85rem",
                }}
              >
                71% - 94%
              </span>
            </div>
            <div
              style={{ fontSize: "0.75rem", color: "#15803d", lineHeight: 1.4 }}
            >
              Casi todo el capital inicial ha vuelto; los cobros restantes son
              mayormente utilidad.
            </div>
          </div>

          {/* Éxito Total */}
          <div
            style={{
              padding: "0.85rem 1rem",
              borderRadius: "0.85rem",
              borderLeft: "4px solid #10b981",
              backgroundColor: "#f0fdf9",
              display: "flex",
              flexDirection: "column",
              gap: "0.2rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  color: "#065f46",
                  fontSize: "0.9rem",
                }}
              >
                Éxito Total
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: "#059669",
                  fontSize: "0.85rem",
                }}
              >
                +95%
              </span>
            </div>
            <div
              style={{ fontSize: "0.75rem", color: "#047857", lineHeight: 1.4 }}
            >
              Has recuperado prácticamente todo lo invertido históricamente.
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            marginTop: "1.25rem",
            padding: "0.85rem",
            backgroundColor: "#1e293b",
            color: "white",
            borderRadius: "0.85rem",
            border: "none",
            fontWeight: 800,
            fontSize: "0.95rem",
            cursor: "pointer",
          }}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
