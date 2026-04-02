import { ResultAsync } from "neverthrow";
import { User } from "../models/user.model";
import { DomainError } from "@/lib/domain-error";
import { UserRepository } from "../repositories/user.repository";

export class GetAllUsersUseCase {
    constructor(private userRepository: UserRepository) {}

    execute(username?: string, idCompany?: string): ResultAsync<User[], DomainError> {
        return this.userRepository.getAll(username, idCompany);
    }
}

export class GetUserByIdUseCase {
    constructor(private userRepository: UserRepository) {}

    execute(id: string): ResultAsync<User, DomainError> {
        return this.userRepository.getById(id);
    }
}

export class SearchPersonUseCase {
    constructor(private userRepository: UserRepository) {}

    execute(documentType: string, documentNumber: string): ResultAsync<any, DomainError> {
        return this.userRepository.searchPerson(documentType, documentNumber);
    }
}
