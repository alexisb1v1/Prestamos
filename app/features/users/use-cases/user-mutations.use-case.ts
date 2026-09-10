import { ResultAsync } from "neverthrow";
import { DomainError } from "@/lib/domain-error";
import { UserRepository } from "../repositories/user.repository";
import { CreateUserRequestDto, UpdateUserRequestDto } from "../dto/user.dto";

/**
 * Caso de uso para crear un nuevo usuario en el sistema.
 */
export class CreateUserUseCase {
  constructor(private userRepository: UserRepository) {}

  /**
   * Ejecuta el registro de un nuevo usuario.
   * @param user Datos de creación del usuario y su ficha personal.
   * @returns ResultAsync indicando éxito o un error de dominio.
   */
  execute(user: CreateUserRequestDto): ResultAsync<void, DomainError> {
    return this.userRepository.create(user);
  }
}

/**
 * Caso de uso para actualizar la información de un usuario existente.
 */
export class UpdateUserUseCase {
  constructor(private userRepository: UserRepository) {}

  /**
   * Ejecuta la actualización del usuario.
   * @param id ID del usuario a actualizar.
   * @param user Datos actualizados del perfil y ficha personal.
   * @returns ResultAsync indicando éxito o un error de dominio.
   */
  execute(
    id: string,
    user: UpdateUserRequestDto,
  ): ResultAsync<void, DomainError> {
    return this.userRepository.update(id, user);
  }
}

/**
 * Caso de uso para realizar la eliminación lógica de un usuario.
 */
export class DeleteUserUseCase {
  constructor(private userRepository: UserRepository) {}

  /**
   * Ejecuta la eliminación del usuario.
   * @param id ID del usuario a eliminar.
   * @returns ResultAsync indicando éxito o un error de dominio.
   */
  execute(id: string): ResultAsync<void, DomainError> {
    return this.userRepository.delete(id);
  }
}

/**
 * Caso de uso para cambiar el estado de cierre de día de un cobrador.
 */
export class ToggleDayStatusUseCase {
  constructor(private userRepository: UserRepository) {}

  /**
   * Ejecuta el cambio de estado del día.
   * @param id ID del usuario cobrador.
   * @param isDayClosed Nuevo estado del día (verdadero para cerrado).
   * @returns ResultAsync indicando éxito o un error de dominio.
   */
  execute(id: string, isDayClosed: boolean): ResultAsync<void, DomainError> {
    return this.userRepository.toggleDayStatus(id, isDayClosed);
  }
}
