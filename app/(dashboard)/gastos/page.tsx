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
import { Trash2 } from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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
    if (!expenseToDelete) return;

    try {
      const result = await deleteExpenseUseCase.execute(expenseToDelete);
      result.match(
        () => {
          setExpenseToDelete(null);
          loadExpenses(currentUser, selectedCompanyId, date, selectedCollector);
        },
        (err) => {
          console.error("Error al eliminar gasto:", err);
          alert(`Error al eliminar gasto: ${err.message}`);
        }
      );
    } catch (err) {
      console.error("Excepción al eliminar gasto:", err);
      alert("Ocurrió un error inesperado al eliminar el gasto.");
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <ConfirmModal
        isOpen={!!expenseToDelete}
        onClose={() => setExpenseToDelete(null)}
        onConfirm={confirmDeleteExpense}
        title="Eliminar Gasto"
        message="¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        isDestructive={true}
      />

      <div
        style={{
          position: isMobile ? "sticky" : "static",
          top: isMobile ? "0" : "auto",
          zIndex: isMobile ? 30 : "auto",
          backgroundColor: isMobile ? "var(--bg-app)" : "transparent",
          margin: isMobile ? "0 -1rem 0.5rem -1rem" : "0 0 2rem 0",
          padding: isMobile ? "0.5rem 1rem" : "0",
          borderBottom: isMobile ? "1px solid var(--border-color)" : "none",
          boxShadow: isMobile ? "0 4px 6px -1px rgba(0,0,0,0.05)" : "none",
          transition: "all 0.3s ease",
        }}
      >
        {/* Top Filter Bar - Aligned with dashboard/prestamos and reportes */}
        <div
          style={{
            backgroundColor: "var(--bg-app)",
            margin: "-1.5rem -1rem 1rem -1rem",
            padding: "0 1rem 0.6rem 1rem",
            display: "flex",
            gap: "0.5rem",
            borderBottom: "1px solid var(--border-color)",
            position: "relative",
            zIndex: 10,
            overflowX: "auto",
            whiteSpace: "nowrap"
          }}
        >
          <div style={{ position: "absolute", top: "-1px", left: 0, right: 0, height: "2px", backgroundColor: "var(--bg-app)" }}></div>
          
          {/* Date Filter Pill */}
          <div
            style={{
              flex: "0 0 auto",
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
              position: "relative",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#64748b" }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                const val = e.target.value;
                setDate(val);
                loadExpenses(currentUser, selectedCompanyId, val, selectedCollector);
              }}
              style={{
                border: "none",
                backgroundColor: "transparent",
                outline: "none",
                appearance: "none",
                color: "#475569",
                fontWeight: 600,
                fontSize: "0.7rem",
                cursor: "pointer",
              }}
            />
          </div>

          {/* Company Filter Pill */}
          {currentUser?.profile === "OWNER" && (
            <div
              style={{
                flex: "0 0 auto",
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
                  color: "#475569",
                  fontWeight: 600,
                  fontSize: "0.7rem",
                  cursor: "pointer",
                  paddingRight: "1rem",
                }}
              >
                <option value="">Todas las empresas</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#94a3b8", pointerEvents: "none", position: "absolute", right: "6px" }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          )}

          {/* Collector Filter Pill */}
          {(currentUser?.profile === "ADMIN" || currentUser?.profile === "OWNER") && (
            <div
              style={{
                flex: "0 0 auto",
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
                position: "relative",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#64748b" }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <select
                value={selectedCollector}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCollector(val);
                  loadExpenses(currentUser, selectedCompanyId, date, val);
                }}
                style={{
                  border: "none",
                  backgroundColor: "transparent",
                  outline: "none",
                  appearance: "none",
                  color: "#475569",
                  fontWeight: 600,
                  fontSize: "0.7rem",
                  cursor: "pointer",
                  paddingRight: "1rem",
                }}
              >
                <option value="">Todos los cobradores</option>
                {collectors.map((collector) => (
                  <option key={collector.id} value={collector.id}>
                    {collector.username} ({collector.firstName} {collector.lastName})
                  </option>
                ))}
              </select>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#94a3b8", pointerEvents: "none", position: "absolute", right: "6px" }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          )}
          
          {/* Clear Filters Button (Only show if date is not today or collector is selected) */}
          {(date !== new Date().toISOString().split("T")[0] || selectedCollector) && (
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                flex: "0 0 auto",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                padding: "0.45rem 0.6rem",
                borderRadius: "2rem",
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "#ef4444",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              Limpiar
            </button>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: isMobile ? "0.5rem" : "1.5rem",
          }}
        >
          <div>
            <h1
              id="header-gastos"
              style={{
                fontSize: isMobile ? "1.25rem" : "1.875rem",
                fontWeight: "bold",
              }}
            >
              Gastos
            </h1>
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
      </div>

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
                  <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                    {format(
                      new Date(expense.expenseDate || date),
                      "dd/MM/yyyy HH:mm:ss",
                      { locale: es },
                    )}
                    {isAdmin && expense.user && (
                      <span>
                        {" "}
                        • Por:{" "}
                        <span style={{ color: "#3b82f6" }}>
                          {expense.user.username || expense.userId}
                        </span>
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
    </div>
  );
}
