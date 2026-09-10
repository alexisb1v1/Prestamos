import { ResultAsync } from "neverthrow";
import { LoanRepository } from "../repositories/loan.repository";
import { Loan } from "../models/loan.model";
import {
  CreateLoanRequestDto,
  UpdateLoanInfoRequestDto,
} from "../dto/loan.dto";
import { DomainError } from "@/lib/domain-error";

/**
 * Caso de uso para crear un nuevo préstamo.
 */
export class CreateLoanUseCase {
  constructor(private readonly repository: LoanRepository) {}

  /**
   * Ejecuta el registro de un nuevo préstamo.
   * @param loan Datos para la creación del préstamo.
   * @returns ResultAsync con el préstamo creado o un error de dominio.
   */
  execute(loan: CreateLoanRequestDto): ResultAsync<Loan, DomainError> {
    return this.repository.create(loan);
  }
}

/**
 * Caso de uso para reasignar un préstamo a un nuevo cobrador.
 */
export class ReassignLoanUseCase {
  constructor(private readonly repository: LoanRepository) {}

  /**
   * Ejecuta la reasignación del préstamo.
   * @param loanId ID del préstamo a reasignar.
   * @param newUserId ID del nuevo usuario cobrador.
   * @returns ResultAsync indicando éxito o un error de dominio.
   */
  execute(loanId: string, newUserId: string): ResultAsync<void, DomainError> {
    return this.repository.reassign(loanId, newUserId);
  }
}

/**
 * Caso de uso para realizar la eliminación lógica de un préstamo.
 */
export class DeleteLoanUseCase {
  constructor(private readonly repository: LoanRepository) {}

  /**
   * Ejecuta la eliminación del préstamo.
   * @param loanId ID del préstamo a eliminar.
   * @returns ResultAsync indicando éxito o un error de dominio.
   */
  execute(loanId: string): ResultAsync<void, DomainError> {
    return this.repository.delete(loanId);
  }
}

/**
 * Caso de uso para eliminar un abono (cuota) realizado.
 */
export class DeleteInstallmentUseCase {
  constructor(private readonly repository: LoanRepository) {}

  /**
   * Ejecuta la eliminación de la cuota.
   * @param installmentId ID de la cuota a eliminar.
   * @returns ResultAsync indicando éxito o un error de dominio.
   */
  execute(installmentId: string): ResultAsync<void, DomainError> {
    return this.repository.deleteInstallment(installmentId);
  }
}

/**
 * Caso de uso para actualizar la información básica de un préstamo (ej: dirección, teléfono).
 */
export class UpdateLoanInfoUseCase {
  constructor(private readonly repository: LoanRepository) {}

  /**
   * Ejecuta la actualización de información.
   * @param loanId ID del préstamo.
   * @param info Datos de información a actualizar (dirección, teléfono).
   * @returns ResultAsync indicando éxito o un error de dominio.
   */
  execute(
    loanId: string,
    info: UpdateLoanInfoRequestDto,
  ): ResultAsync<void, DomainError> {
    return this.repository.updateInfo(loanId, info);
  }
}
