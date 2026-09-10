import { ResultAsync } from "neverthrow";
import { DomainError } from "@/lib/domain-error";
import {
  Loan,
  LoanDetails,
  DashboardData,
  ReportData,
} from "../models/loan.model";
import {
  CreateLoanRequestDto,
  UpdateLoanInfoRequestDto,
} from "../dto/loan.dto";

/**
 * Interfaz abstracta para el repositorio de préstamos.
 * Define las operaciones permitidas sobre la entidad Loan.
 */
export abstract class LoanRepository {
  /**
   * Obtiene el listado de préstamos con filtros.
   */
  abstract getAll(
    userId?: string,
    searchQuery?: string,
    companyId?: string,
    isLiquidated?: boolean,
  ): ResultAsync<Loan[], DomainError>;

  /**
   * Crea un nuevo préstamo.
   */
  abstract create(loan: CreateLoanRequestDto): ResultAsync<Loan, DomainError>;

  /**
   * Obtiene los detalles específicos de un préstamo y sus abonos.
   */
  abstract getDetails(id: string): ResultAsync<LoanDetails, DomainError>;

  /**
   * Reasigna un préstamo a otro cobrador.
   */
  abstract reassign(
    loanId: string,
    newUserId: string,
  ): ResultAsync<void, DomainError>;

  /**
   * Elimina lógicamente un préstamo.
   */
  abstract delete(loanId: string): ResultAsync<void, DomainError>;

  /**
   * Elimina un abono específico.
   */
  abstract deleteInstallment(
    installmentId: string,
  ): ResultAsync<void, DomainError>;

  /**
   * Obtiene datos consolidados para el dashboard.
   */
  abstract getDashboardData(
    userId?: string,
    companyId?: string,
  ): ResultAsync<DashboardData, DomainError>;

  /**
   * Genera el reporte de préstamos y cuotas.
   */
  abstract getLoanReport(
    startDate: string,
    endDate: string,
    companyId?: string,
    userId?: string,
  ): ResultAsync<ReportData, DomainError>;

  /**
   * Actualiza la información de contacto y domicilio del préstamo.
   */
  abstract updateInfo(
    loanId: string,
    info: UpdateLoanInfoRequestDto,
  ): ResultAsync<void, DomainError>;
}
