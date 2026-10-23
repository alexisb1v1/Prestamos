import { ResultAsync } from "neverthrow";
import { DomainError } from "@/lib/domain-error";
import { Person } from "../models/person.model";
import {
  CreatePersonRequestDto,
  CreatePersonResponseDto,
  RecalculateScoreResponseDto,
} from "../dto/person.dto";

export interface PersonRepository {
  search(
    documentType: string,
    documentNumber: string,
  ): ResultAsync<Person, DomainError>;
  create(
    person: CreatePersonRequestDto,
  ): ResultAsync<CreatePersonResponseDto, DomainError>;
  recalculateScore(
    id: string,
  ): ResultAsync<RecalculateScoreResponseDto, DomainError>;
}
