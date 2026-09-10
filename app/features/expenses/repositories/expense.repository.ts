import { ResultAsync } from "neverthrow";
import { DomainError } from "@/lib/domain-error";
import { Expense } from "../expense.model";
import { CreateExpenseRequestDto } from "../expense.dto";

/**
 * Interfaz para el repositorio de gastos.
 */
export interface ExpenseRepository {
  /**
   * Crea un nuevo gasto.
   * @param expense Datos del gasto.
   */
  create(expense: CreateExpenseRequestDto): ResultAsync<Expense, DomainError>;

  /**
   * Obtiene todos los gastos con filtros opcionales.
   */
  getAll(
    date?: string,
    userId?: string,
    companyId?: string,
  ): ResultAsync<Expense[], DomainError>;

  /**
   * Elimina un gasto por ID.
   */
  delete(id: string): ResultAsync<void, DomainError>;
}
