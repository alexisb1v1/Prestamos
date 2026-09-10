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
import { getExpensesUseCase } from "@/app/features/expenses";
import { userService } from "@/lib/userService";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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
    setDate(new Date().toISOString().split("T")[0]);
    setSelectedCollector("");
    setTimeout(
      () =>
        loadExpenses(
          currentUser,
          selectedCompanyId,
          new Date().toISOString().split("T")[0],
          "",
        ),
      0,
    );
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: isMobile ? "sticky" : "static",
          top: isMobile ? "0" : "auto",
          zIndex: isMobile ? 30 : "auto",
          backgroundColor: isMobile ? "var(--bg-app)" : "transparent",
          margin: isMobile ? "0 -2rem 1rem -2rem" : "0 0 2rem 0",
          padding: isMobile ? "0.75rem 2rem 1rem 2rem" : "0",
          borderBottom: isMobile ? "1px solid var(--border-color)" : "none",
          boxShadow: isMobile ? "var(--shadow-md)" : "none",
          transition: "all 0.3s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: isMobile ? "1rem" : "2rem",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: isMobile ? "1.5rem" : "1.875rem",
                fontWeight: "bold",
              }}
            >
              Gastos
            </h1>
          </div>
        </div>

        <div
          className={isMobile ? "" : "card"}
          style={{
            marginBottom: isMobile ? "0" : "2rem",
            padding: isMobile ? "0" : "1.5rem",
            backgroundColor: isMobile ? "transparent" : "var(--bg-card)",
            border: isMobile ? "none" : "1px solid var(--border-color)",
            boxShadow: isMobile ? "none" : "var(--shadow-sm)",
          }}
        >
          <form
            onSubmit={handleSearch}
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ width: isMobile ? "100%" : "auto" }}>
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: isMobile ? "none" : "200px",
                  backgroundColor: isMobile
                    ? "var(--bg-card)"
                    : "var(--bg-app)",
                }}
              />
            </div>

            {currentUser?.profile === "OWNER" && (
              <div style={{ width: isMobile ? "100%" : "auto" }}>
                <select
                  className="input"
                  value={selectedCompanyId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedCompanyId(val);
                    loadCollectors(val);
                    loadExpenses(currentUser, val);
                  }}
                  style={{
                    width: "100%",
                    maxWidth: isMobile ? "none" : "200px",
                    backgroundColor: isMobile
                      ? "var(--bg-card)"
                      : "var(--bg-app)",
                  }}
                >
                  <option value="">Todas las empresas</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(currentUser?.profile === "ADMIN" ||
              currentUser?.profile === "OWNER") && (
              <div style={{ width: isMobile ? "100%" : "auto" }}>
                <select
                  className="input"
                  value={selectedCollector}
                  onChange={(e) => setSelectedCollector(e.target.value)}
                  style={{
                    width: "100%",
                    maxWidth: isMobile ? "none" : "250px",
                    backgroundColor: isMobile
                      ? "var(--bg-card)"
                      : "var(--bg-app)",
                  }}
                >
                  <option value="">Todos los cobradores</option>
                  {collectors.map((collector) => (
                    <option key={collector.id} value={collector.id}>
                      {collector.username} ({collector.firstName}{" "}
                      {collector.lastName})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                width: isMobile ? "100%" : "auto",
              }}
            >
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: isMobile ? 1 : "initial" }}
              >
                Buscar
              </button>
              {(date !== new Date().toISOString().split("T")[0] ||
                selectedCollector) && (
                <button
                  type="button"
                  className="btn"
                  onClick={handleClearFilters}
                  style={{
                    flex: isMobile ? 1 : "initial",
                    backgroundColor: "transparent",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  Limpiar
                </button>
              )}
            </div>
          </form>
        </div>

        {!loading && expenses.length > 0 && (
          <div
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

      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
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
                <div
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "bold",
                    color: "#ef4444",
                  }}
                >
                  - S/ {Number(expense.amount).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
