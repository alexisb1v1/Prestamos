import { ResultAsync } from "neverthrow";
import { api } from "@/lib/api";
import { DomainError } from "@/lib/domain-error";
import { Person } from "../models/person.model";
import {
  PersonDto,
  CreatePersonRequestDto,
  CreatePersonResponseDto,
} from "../dto/person.dto";
import { PersonMapper } from "../mappers/person.mapper";
import { PersonRepository } from "./person.repository";

export class PersonRepositoryImpl implements PersonRepository {
  search(
    documentType: string,
    documentNumber: string,
  ): ResultAsync<Person, DomainError> {
    return api.safe
      .get<PersonDto>(
        `/person/search?documentType=${documentType}&documentNumber=${documentNumber}`,
      )
      .map((dto) => PersonMapper.toDomain(dto));
  }

  create(
    person: CreatePersonRequestDto,
  ): ResultAsync<CreatePersonResponseDto, DomainError> {
    return api.safe.post<CreatePersonResponseDto>("/person", person);
  }
}
