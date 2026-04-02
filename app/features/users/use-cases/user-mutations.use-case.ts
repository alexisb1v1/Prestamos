import { ResultAsync } from "neverthrow";
import { DomainError } from "@/lib/domain-error";
import { UserRepository } from "../repositories/user.repository";
import { CreateUserRequestDto } from "../dto/user.dto";

export class CreateUserUseCase {
    constructor(private userRepository: UserRepository) {}
    execute(user: CreateUserRequestDto): ResultAsync<void, DomainError> {
        return this.userRepository.create(user);
    }
}

export class UpdateUserUseCase {
    constructor(private userRepository: UserRepository) {}
    execute(id: string, user: any): ResultAsync<void, DomainError> {
        return this.userRepository.update(id, user);
    }
}

export class DeleteUserUseCase {
    constructor(private userRepository: UserRepository) {}
    execute(id: string): ResultAsync<void, DomainError> {
        return this.userRepository.delete(id);
    }
}

export class ToggleDayStatusUseCase {
    constructor(private userRepository: UserRepository) {}
    execute(id: string, isDayClosed: boolean): ResultAsync<void, DomainError> {
        return this.userRepository.toggleDayStatus(id, isDayClosed);
    }
}
