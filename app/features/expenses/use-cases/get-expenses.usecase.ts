import { ResultAsync } from "neverthrow";
import { DomainError } from "@/lib/domain-error";
import { Expense } from "../expense.model";
import { ExpenseRepository } from "../repositories/expense.repository";

/**
 * Caso de uso para obtener el listado de gastos filtrados.
 */
export class GetExpensesUseCase {
  constructor(private readonly repository: ExpenseRepository) {}

  /**
   * Ejecuta la consulta de gastos.
   * @param date Fecha para filtrar (YYYY-MM-DD).
   * @param userId ID del usuario para filtrar (opcional).
   * @param companyId ID de la empresa para filtrar (opcional).
   * @returns ResultAsync con el listado de gastos o un error de dominio.
   */
  execute(
    date?: string,
    userId?: string,
    companyId?: string,
  ): ResultAsync<Expense[], DomainError> {
    return this.repository.getAll(date, userId, companyId);
  }
}
