import { ResultAsync } from "neverthrow";
import { DomainError } from "@/lib/domain-error";
import {
  CreatePersonRequestDto,
  CreatePersonResponseDto,
} from "../dto/person.dto";
import { PersonRepository } from "../repositories/person.repository";

export class CreatePersonUseCase {
  constructor(private personRepository: PersonRepository) {}

  /**
   * Registra una nueva persona en el sistema.
   * @param request Datos de la persona a crear
   * @returns ResultAsync con el ID de la persona creada o un error de dominio.
   */
  execute(
    request: CreatePersonRequestDto,
  ): ResultAsync<CreatePersonResponseDto, DomainError> {
    return this.personRepository.create(request);
  }
}
