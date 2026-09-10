import { ResultAsync } from "neverthrow";
import { DomainError } from "@/lib/domain-error";
import { Company } from "../models/company.model";
import { CompanyRepository } from "../repositories/company.repository";

/**
 * Caso de uso para obtener el listado de todas las empresas registradas.
 */
export class GetAllCompaniesUseCase {
  constructor(private companyRepository: CompanyRepository) {}

  /**
   * Ejecuta la consulta de empresas.
   * @returns ResultAsync con el listado de empresas o un error de dominio.
   */
  execute(): ResultAsync<Company[], DomainError> {
    return this.companyRepository.getAll();
  }
}
