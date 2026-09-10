import { ResultAsync } from "neverthrow";
import { LoanRepository } from "../repositories/loan.repository";
import {
  Loan,
  LoanDetails,
  DashboardData,
  ReportData,
} from "../models/loan.model";
import { DomainError } from "@/lib/domain-error";

/**
 * Caso de uso para obtener el listado de todos los préstamos.
 */
export class GetAllLoansUseCase {
  constructor(private readonly repository: LoanRepository) {}

  /**
   * Ejecuta la obtención de préstamos con filtros opcionales.
   * @param userId ID del usuario (cobrador) para filtrar.
   * @param searchQuery Término de búsqueda (por nombre de cliente).
   * @param companyId ID de la empresa para filtrar.
   * @param isLiquidated Filtrar por préstamos liquidados o activos.
   * @returns ResultAsync con el listado de préstamos o un error de dominio.
   */
  execute(
    userId?: string,
    searchQuery?: string,
    companyId?: string,
    isLiquidated?: boolean,
  ): ResultAsync<Loan[], DomainError> {
    return this.repository.getAll(userId, searchQuery, companyId, isLiquidated);
  }
}

/**
 * Caso de uso para obtener los detalles de un préstamo específico, incluyendo su cronograma de abonos.
 */
export class GetLoanDetailsUseCase {
  constructor(private readonly repository: LoanRepository) {}

  /**
   * Ejecuta la consulta de detalles por ID.
   * @param id ID del préstamo.
   * @returns ResultAsync con los detalles del préstamo o un error de dominio.
   */
  execute(id: string): ResultAsync<LoanDetails, DomainError> {
    return this.repository.getDetails(id);
  }
}

/**
 * Caso de uso para obtener los datos agregados del dashboard.
 */
export class GetDashboardDataUseCase {
  constructor(private readonly repository: LoanRepository) {}

  /**
   * Ejecuta la consulta de estadísticas para el dashboard.
   * @param userId ID del usuario (opcional).
   * @param companyId ID de la empresa (opcional).
   * @returns ResultAsync con los datos del dashboard o un error de dominio.
   */
  execute(
    userId?: string,
    companyId?: string,
  ): ResultAsync<DashboardData, DomainError> {
    return this.repository.getDashboardData(userId, companyId);
  }
}

/**
 * Caso de uso para generar el reporte de préstamos y cobranza.
 */
export class GetLoanReportUseCase {
  constructor(private readonly repository: LoanRepository) {}

  /**
   * Ejecuta la generación del reporte en un rango de fechas.
   * @param startDate Fecha de inicio (ISO).
   * @param endDate Fecha de fin (ISO).
   * @param companyId ID de la empresa (opcional).
   * @param userId ID del usuario (opcional).
   * @returns ResultAsync con los datos del reporte o un error de dominio.
   */
  execute(
    startDate: string,
    endDate: string,
    companyId?: string,
    userId?: string,
  ): ResultAsync<ReportData, DomainError> {
    return this.repository.getLoanReport(startDate, endDate, companyId, userId);
  }
}
