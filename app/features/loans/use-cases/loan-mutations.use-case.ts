import { ResultAsync } from "neverthrow";
import { LoanRepository } from "../repositories/loan.repository";
import { Loan } from "../models/loan.model";
import { CreateLoanRequestDto, UpdateLoanInfoRequestDto } from "../dto/loan.dto";
import { DomainError } from "@/lib/domain-error";

export class CreateLoanUseCase {
    constructor(private readonly repository: LoanRepository) {}

    execute(loan: CreateLoanRequestDto): ResultAsync<Loan, DomainError> {
        return this.repository.create(loan);
    }
}

export class ReassignLoanUseCase {
    constructor(private readonly repository: LoanRepository) {}

    execute(loanId: string, newUserId: string): ResultAsync<void, DomainError> {
        return this.repository.reassign(loanId, newUserId);
    }
}

export class DeleteLoanUseCase {
    constructor(private readonly repository: LoanRepository) {}

    execute(loanId: string): ResultAsync<void, DomainError> {
        return this.repository.delete(loanId);
    }
}

export class DeleteInstallmentUseCase {
    constructor(private readonly repository: LoanRepository) {}

    execute(installmentId: string): ResultAsync<void, DomainError> {
        return this.repository.deleteInstallment(installmentId);
    }
}

export class UpdateLoanInfoUseCase {
    constructor(private readonly repository: LoanRepository) {}

    execute(loanId: string, info: UpdateLoanInfoRequestDto): ResultAsync<void, DomainError> {
        return this.repository.updateInfo(loanId, info);
    }
}
