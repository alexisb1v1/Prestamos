import { ResultAsync } from "neverthrow";
import { DomainError } from "@/lib/domain-error";
import { ExpenseRepository } from "./expense.repository";
import { Expense } from "../expense.model";
import { ExpenseMapper } from "../expense.mapper";
import { api } from "@/lib/api";
import { CreateExpenseRequestDto, ExpenseDto } from "../expense.dto";

/**
 * Implementación del repositorio de gastos usando la API centralizada.
 */
export class ExpenseRepositoryImpl implements ExpenseRepository {
  /**
   * Crea un nuevo gasto enviando la petición a la API.
   * @param expense Datos del gasto.
   * @returns ResultAsync con el gasto mapeado a dominio.
   */
  create(expense: CreateExpenseRequestDto): ResultAsync<Expense, DomainError> {
    return api.safe
      .post<ExpenseDto>("/expense", expense)
      .map((response) => ExpenseMapper.toDomain(response));
  }

  /**
   * Obtiene todos los gastos filtrados.
   * @param date Fecha opcional.
   * @param userId ID de usuario opcional.
   * @param companyId ID de empresa opcional.
   * @returns ResultAsync con el listado mapeado a dominio.
   */
  getAll(
    date?: string,
    userId?: string,
    companyId?: string,
  ): ResultAsync<Expense[], DomainError> {
    const params = new URLSearchParams();
    if (date) params.append("date", date);
    if (userId) params.append("userId", userId);
    if (companyId) params.append("companyId", companyId);

    return api.safe
      .get<ExpenseDto[]>(`/expense?${params.toString()}`)
      .map((response) => ExpenseMapper.toDomainList(response));
  }

  /**
   * Elimina un gasto físicamente (vía API).
   * @param id ID del gasto.
   * @returns ResultAsync indicando éxito.
   */
  delete(id: string): ResultAsync<void, DomainError> {
    return api.safe.delete<void>(`/expense/${id}`);
  }
}
