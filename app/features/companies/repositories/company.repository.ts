import { ResultAsync } from "neverthrow";
import { DomainError } from "@/lib/domain-error";
import { Company } from "../models/company.model";
import {
  CreateCompanyRequestDto,
  UpdateCompanyRequestDto,
} from "../dto/company.dto";

/**
 * Interfaz para el repositorio de gestión de empresas.
 */
export interface CompanyRepository {
  /**
   * Obtiene todas las empresas.
   */
  getAll(): ResultAsync<Company[], DomainError>;

  /**
   * Registra una nueva empresa.
   */
  create(
    data: CreateCompanyRequestDto,
  ): ResultAsync<{ id: string }, DomainError>;

  /**
   * Actualiza los datos de una empresa.
   */
  update(
    id: string,
    data: UpdateCompanyRequestDto,
  ): ResultAsync<{ message: string }, DomainError>;

  /**
   * Cambia el estado (activo/inactivo) de una empresa.
   */
  updateStatus(
    id: string,
    status: string,
  ): ResultAsync<{ message: string }, DomainError>;

  /**
   * Regenera el token de seguridad (key_token) del tenant para forzar el cierre de sesión masivo.
   */
  refreshKeyToken(
    id: string,
  ): ResultAsync<{ message: string; newKeyToken?: string }, DomainError>;

  /**
   * Obtiene la empresa y configuraciones del usuario autenticado (o la empresa especificada si es OWNER).
   */
  getMyCompany(companyId?: string): ResultAsync<Company, DomainError>;

  /**
   * Actualiza las configuraciones de branding y préstamos de la empresa.
   */
  updateMyCompanySettings(
    settings: any,
    companyId?: string,
  ): ResultAsync<{ message: string; settings: any }, DomainError>;
}
