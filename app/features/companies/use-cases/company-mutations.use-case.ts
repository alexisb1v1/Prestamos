import { ResultAsync } from "neverthrow";
import { DomainError } from "@/lib/domain-error";
import { CompanyRepository } from "../repositories/company.repository";
import {
  CreateCompanyRequestDto,
  UpdateCompanyRequestDto,
} from "../dto/company.dto";

/**
 * Caso de uso agrupado para mutaciones de empresas (Crear, Actualizar, Cambiar Estado).
 */
export class CompanyMutationsUseCase {
  constructor(private companyRepository: CompanyRepository) {}

  /**
   * Ejecuta el registro de una nueva empresa.
   * @param data Datos de la empresa a crear.
   * @returns ResultAsync con el ID de la empresa creada o un error de dominio.
   */
  create(
    data: CreateCompanyRequestDto,
  ): ResultAsync<{ id: string }, DomainError> {
    return this.companyRepository.create(data);
  }

  /**
   * Ejecuta la actualización de información de una empresa.
   * @param id ID de la empresa.
   * @param data Datos actualizados.
   * @returns ResultAsync con mensaje de confirmación o un error de dominio.
   */
  update(
    id: string,
    data: UpdateCompanyRequestDto,
  ): ResultAsync<{ message: string }, DomainError> {
    return this.companyRepository.update(id, data);
  }

  /**
   * Ejecuta el cambio de estado (activo/inactivo) de una empresa.
   * @param id ID de la empresa.
   * @param status Nuevo estado de la empresa.
   * @returns ResultAsync con mensaje de confirmación o un error de dominio.
   */
  updateStatus(
    id: string,
    status: string,
  ): ResultAsync<{ message: string }, DomainError> {
    return this.companyRepository.updateStatus(id, status);
  }
}
