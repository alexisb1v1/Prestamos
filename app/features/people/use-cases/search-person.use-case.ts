import { ResultAsync } from "neverthrow";
import { DomainError } from "@/lib/domain-error";
import { Person } from "../models/person.model";
import { PersonRepository } from "../repositories/person.repository";

export class SearchPersonUseCase {
  constructor(private personRepository: PersonRepository) {}

  /**
   * Busca una persona por tipo y número de documento.
   * @param documentType Tipo de documento (DNI, RUC, etc.)
   * @param documentNumber Número de documento
   * @returns ResultAsync con la persona o un error de dominio.
   */
  execute(
    documentType: string,
    documentNumber: string,
  ): ResultAsync<Person, DomainError> {
    return this.personRepository.search(documentType, documentNumber);
  }
}
