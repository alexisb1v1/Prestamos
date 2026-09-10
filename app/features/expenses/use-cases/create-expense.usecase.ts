import { ResultAsync } from "neverthrow";
import { DomainError } from "@/lib/domain-error";
import { Expense } from "../expense.model";
import { ExpenseRepository } from "../repositories/expense.repository";
import { CreateExpenseRequestDto } from "../expense.dto";

/**
 * Caso de uso para registrar un nuevo gasto en el sistema.
 */
export class CreateExpenseUseCase {
  constructor(private readonly repository: ExpenseRepository) {}

  /**
   * Ejecuta el registro del gasto.
   * @param expense Datos del gasto (descripción, monto, usuario).
   * @returns ResultAsync con el gasto creado o un error de dominio.
   */
  execute(expense: CreateExpenseRequestDto): ResultAsync<Expense, DomainError> {
    return this.repository.create(expense);
  }
}
