"use client";

import { useState, useEffect } from "react";
import { getAllCompaniesUseCase, Company } from "@/app/features/companies";
import { authService } from "@/lib/auth";
import { Expense } from "@/app/features/expenses";
import { User } from "@/app/features/users";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import LoadingSpinner from "../../components/LoadingSpinner";
import { logger } from "@/lib/logging-service";
import { getExpensesUseCase, deleteExpenseUseCase } from "@/app/features/expenses";
import { userService } from "@/lib/userService";
import { Trash2, Plus } from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";
import CreateExpenseModal from "../../components/CreateExpenseModal";
import CollectorDropdown from "../../components/CollectorDropdown";
import DatePicker from "../../components/DatePicker";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);


  // Delete confirmation state
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  // User filter states
  const [collectors, setCollectors] = useState<User[]>([]);
  const [selectedCollector, setSelectedCollector] = useState("");

  // Multi-tenancy state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const loadExpenses = async (
    userContext?: User | null,
    companyId?: string,
    dateFilter?: string,
    collectorId?: string,
  ) => {
    const user = userContext || currentUser;
    const compId = companyId !== undefined ? companyId : selectedCompanyId;
    const dFilter = dateFilter !== undefined ? dateFilter : date;
    const cId = collectorId !== undefined ? collectorId : selectedCollector;

    try {
      setLoading(true);
      let userIdFilter = cId;
      if (user?.profile === "COBRADOR") {
        userIdFilter = user.id;
      }

      const result = await getExpensesUseCase.execute(
        dFilter,
        userIdFilter,
        compId,
      );
      result.match(
        (data) => setExpenses(data),
        (err) => {
          logger.error("Error loading expenses:", err);
        },
      );
    } finally {
      setLoading(false);
    }
  };

  const loadCollectors = async (companyId?: string) => {
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
  };

  useEffect(() => {
    const init = async () => {
      const user = authService.getUser();
      if (user) {
        setCurrentUser(user);
        setIsAdmin(user.profile === "ADMIN" || user.profile === "OWNER");

        let companyIdToUse = user.idCompany;

        if (user.profile === "OWNER") {
          const result = await getAllCompaniesUseCase.execute();
          result.match(
            (data) => {
              setCompanies(data);
              if (data.length > 0) {
                setSelectedCompanyId("");
                companyIdToUse = "";
              }
            },
            (err) => logger.error("Error companies:", err),
          );
        } else {
          setSelectedCompanyId(user.idCompany || "");
        }

        if (user.profile === "ADMIN" || user.profile === "OWNER") {
          const filterCompany =
            user.profile === "OWNER" ? companyIdToUse : user.idCompany;
          loadCollectors(filterCompany);
        }

        loadExpenses(user, companyIdToUse);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadExpenses();
  };

  const handleClearFilters = () => {
    const today = new Date().toISOString().split("T")[0];
    setDate(today);
    setSelectedCollector("");
    setTimeout(
      () =>
        loadExpenses(
          currentUser,
          selectedCompanyId,
          today,
          "",
        ),
      0,
    );
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete || isDeleting) return;
    try {
      setIsDeleting(true);
      const result = await deleteExpenseUseCase.execute(expenseToDelete);
      await result.match(
        async () => {
          setExpenseToDelete(null);
          await loadExpenses(currentUser, selectedCompanyId, date, selectedCollector);
        },
        (err) => {
          console.error("Error al eliminar gasto:", err);
          alert(`Error al eliminar gasto: ${err.message}`);
        }
      );
    } catch (err) {
      console.error("Excepción al eliminar gasto:", err);
      alert("Ocurrió un error inesperado al eliminar el gasto.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <ConfirmModal
        isOpen={!!expenseToDelete}
        isLoading={isDeleting}
        onClose={() => {
          if (!isDeleting) setExpenseToDelete(null);
        }}
        onConfirm={confirmDeleteExpense}
        title="Eliminar Gasto"
        message="¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        isDestructive={true}
      />


      <div
        style={{
          margin: isMobile ? "0 0 1rem 0" : "0 0 1.75rem 0",
        }}
      >
        {/* Header Principal: Título y Acción */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: isMobile ? "12px" : "16px",
          }}
        >
          <div>
            <h1
              id="header-gastos"
              style={{
                fontSize: isMobile ? "1.35rem" : "1.875rem",
                fontWeight: 800,
                color: "#0f172a",
                margin: 0,
              }}
            >
              Gastos
            </h1>
          </div>
          <div>
            <button
              id="btn-accion"
              onClick={() => setIsCreateModalOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                backgroundColor: "var(--color-primary, #4147eb)",
                color: "white",
                padding: isMobile ? "0.45rem 0.85rem" : "0.55rem 1.15rem",
                borderRadius: "0.75rem",
                fontWeight: 650,
                fontSize: isMobile ? "0.8rem" : "0.875rem",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 6px -1px color-mix(in srgb, var(--color-primary, #4147eb) 25%, transparent)",
                transition: "all 0.2s",
              }}
            >
              <Plus size={16} />
              <span>Registrar Gasto</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros - Alineada y ordenada */}
        <div
          id="filtro-gastos"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            width: "100%",
          }}
        >
          {/* Date Filter */}
          <div style={{ flex: isMobile ? "1 1 100%" : "0 0 auto" }}>
            <DatePicker
              date={date}
              onChange={(val) => {
                setDate(val);
                loadExpenses(currentUser, selectedCompanyId, val, selectedCollector);
              }}
              isMobile={isMobile}
              width={isMobile ? "100%" : "auto"}
            />
          </div>

          {/* Company Filter Pill */}
          {currentUser?.profile === "OWNER" && (
            <div
              style={{
                flex: isMobile ? "1 1 100%" : "0 0 auto",
                backgroundColor: "white",
                padding: "0.45rem 0.75rem",
                borderRadius: "2rem",
                fontSize: "13px",
                fontWeight: 600,
                color: "#475569",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                border: "1px solid var(--border-color, #e2e8f0)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                position: "relative",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#64748b" }}>
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                <path d="M9 22v-4h6v4"></path>
              </svg>
              <select
                value={selectedCompanyId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCompanyId(val);
                  loadCollectors(val);
                  loadExpenses(currentUser, val, date, selectedCollector);
                }}
                style={{
                  border: "none",
                  backgroundColor: "transparent",
                  outline: "none",
                  appearance: "none",
                  color: "#0f172a",
                  fontWeight: 650,
                  fontSize: "13px",
                  cursor: "pointer",
                  paddingRight: "1.25rem",
                  width: "100%",
                }}
              >
                <option value="">Todas las empresas</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#94a3b8", pointerEvents: "none", position: "absolute", right: "8px" }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          )}

          {/* Collector Filter Pill */}
          {(currentUser?.profile === "ADMIN" || currentUser?.profile === "OWNER") && (
            <div style={{ flex: isMobile ? "1 1 100%" : "0 0 auto" }}>
              <CollectorDropdown
                collectors={collectors}
                selectedCollectorId={selectedCollector}
                onSelectCollector={(val) => {
                  setSelectedCollector(val);
                  loadExpenses(currentUser, selectedCompanyId, date, val);
                }}
                allowAll={true}
                allLabel="Todos los cobradores"
                isMobile={isMobile}
                width={isMobile ? "100%" : "240px"}
              />
            </div>
          )}

          {/* Clear Filters Button (Only show if date is not today or collector is selected) */}
          {(date !== new Date().toISOString().split("T")[0] || selectedCollector) && (
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                flex: "0 0 auto",
                backgroundColor: "rgba(239, 68, 68, 0.08)",
                padding: "0.45rem 0.85rem",
                borderRadius: "2rem",
                fontSize: "12px",
                fontWeight: 650,
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                transition: "all 0.15s ease",
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

        {!loading && expenses.length > 0 && (
          <div
            id="total-gastos"
            style={{
              marginTop: isMobile ? "1rem" : "1.5rem",
              marginBottom: isMobile ? "0.5rem" : "0",
              padding: "1rem",
              borderTop: "2px solid #e2e8f0",
              borderBottom: isMobile ? "2px solid #e2e8f0" : "none",
              backgroundColor: isMobile ? "var(--bg-card)" : "transparent",
              borderRadius: isMobile ? "0.5rem" : "0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontWeight: "bold",
              fontSize: "1.125rem",
            }}
          >
            <span>Total Gastos</span>
            <span style={{ color: "#ef4444", fontSize: "1.25rem" }}>
              S/{" "}
              {expenses
                .reduce((sum, item) => sum + Number(item.amount), 0)
                .toFixed(2)}
            </span>
          </div>
        )}

      <div id="lista-gastos" style={{ maxWidth: "800px", margin: "0 auto" }}>
        {loading ? (
          <LoadingSpinner message="Cargando gastos..." />
        ) : expenses.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              backgroundColor: "white",
              borderRadius: "1rem",
              color: "#64748b",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            No hay gastos registrados para esta fecha.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "1rem",
            }}
          >
            {expenses.map((expense) => (
              <div
                key={expense.id}
                style={{
                  backgroundColor: "white",
                  padding: "1.5rem",
                  borderRadius: "1rem",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontWeight: "600",
                      fontSize: "1.125rem",
                      color: "#0f172a",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {expense.description}
                  </h3>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "#64748b",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      flexWrap: "wrap",
                      marginTop: "0.25rem",
                    }}
                  >
                    <span>
                      {format(
                        new Date(expense.expenseDate || date),
                        "dd/MM/yyyy HH:mm:ss",
                        { locale: es },
                      )}
                    </span>
                    {(expense.userFullName || expense.userName || expense.user?.username) && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          backgroundColor: "#eff6ff",
                          color: "#1e40af",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "9999px",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          marginLeft: "0.25rem",
                          border: "1px solid #dbeafe",
                        }}
                      >
                        <span style={{ color: "#64748b" }}>Por:</span>
                        <strong>
                          {expense.userFullName || expense.userName || expense.user?.username}
                        </strong>
                        {expense.userFullName && expense.userName && (
                          <span style={{ color: "#6b7280", fontSize: "0.7rem" }}>
                            (@{expense.userName})
                          </span>
                        )}
                      </span>
                    )}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                  <div
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "bold",
                      color: "#ef4444",
                    }}
                  >
                    - S/ {Number(expense.amount).toFixed(2)}
                  </div>
                  <button
                    onClick={() => setExpenseToDelete(String(expense.id))}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "32px",
                      height: "32px",
                      borderRadius: "0.5rem",
                      backgroundColor: "#fee2e2",
                      color: "#ef4444",
                      border: "none",
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                    }}
                    title="Eliminar gasto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateExpenseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          loadExpenses(currentUser, selectedCompanyId, date, selectedCollector);
        }}
      />
    </div>
  );
}
