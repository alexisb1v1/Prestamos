import { ResultAsync } from "neverthrow";
import { User } from "../models/user.model";
import { DomainError } from "@/lib/domain-error";
import { UserRepository } from "../repositories/user.repository";

/**
 * Caso de uso para obtener el listado de usuarios del sistema.
 */
export class GetAllUsersUseCase {
  constructor(private userRepository: UserRepository) {}

  /**
   * Ejecuta la consulta de usuarios con filtros opcionales.
   * @param username Nombre de usuario para filtrar (opcional).
   * @param idCompany ID de la empresa para filtrar (opcional).
   * @returns ResultAsync con el listado de usuarios o un error de dominio.
   */
  execute(
    username?: string,
    idCompany?: string,
  ): ResultAsync<User[], DomainError> {
    return this.userRepository.getAll(username, idCompany);
  }
}

/**
 * Caso de uso para obtener los detalles de un usuario por su ID.
 */
export class GetUserByIdUseCase {
  constructor(private userRepository: UserRepository) {}

  /**
   * Ejecuta la consulta de usuario por ID.
   * @param id ID del usuario.
   * @returns ResultAsync con el modelo de usuario o un error de dominio.
   */
  execute(id: string): ResultAsync<User, DomainError> {
    return this.userRepository.getById(id);
  }
}
