import { ResultAsync } from "neverthrow";
import { DomainError } from "@/lib/domain-error";
import { RecalculateScoreResponseDto } from "../dto/person.dto";
import { PersonRepository } from "../repositories/person.repository";

export class RecalculateScoreUseCase {
  constructor(private personRepository: PersonRepository) {}

  /**
   * Recalcula a demanda el score crediticio y sus 3 pilares para una persona.
   * @param id ID de la persona
   * @returns ResultAsync con el nuevo score y el detalle de evaluación.
   */
  execute(id: string): ResultAsync<RecalculateScoreResponseDto, DomainError> {
    return this.personRepository.recalculateScore(id);
  }
}
