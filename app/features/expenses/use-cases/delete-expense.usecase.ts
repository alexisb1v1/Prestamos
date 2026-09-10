import { ResultAsync } from "neverthrow";
import { DomainError } from "@/lib/domain-error";
import { ExpenseRepository } from "../repositories/expense.repository";

/**
 * Caso de uso para eliminar un gasto registrado.
 */
export class DeleteExpenseUseCase {
  constructor(private readonly repository: ExpenseRepository) {}

  /**
   * Ejecuta la eliminación de un gasto por ID.
   * @param id ID del gasto a eliminar.
   * @returns ResultAsync indicando éxito o un error de dominio.
   */
  execute(id: string): ResultAsync<void, DomainError> {
    return this.repository.delete(id);
  }
}
