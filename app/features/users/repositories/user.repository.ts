import { ResultAsync } from "neverthrow";
import { User } from "../models/user.model";
import { DomainError } from "@/lib/domain-error";
import { CreateUserRequestDto } from "../dto/user.dto";
import { Person } from "@/lib/types";

export abstract class UserRepository {
    abstract getAll(username?: string, idCompany?: string): ResultAsync<User[], DomainError>;
    abstract getById(id: string): ResultAsync<User, DomainError>;
    abstract create(user: CreateUserRequestDto): ResultAsync<void, DomainError>;
    abstract update(id: string, user: any): ResultAsync<void, DomainError>;
    abstract delete(id: string): ResultAsync<void, DomainError>;
    abstract toggleDayStatus(id: string, isDayClosed: boolean): ResultAsync<void, DomainError>;
    abstract searchPerson(documentType: string, documentNumber: string): ResultAsync<Person, DomainError>;
}
