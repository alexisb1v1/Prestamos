import { ResultAsync } from "neverthrow";
import { LoanRepository } from "../repositories/loan.repository";
import { Loan, LoanDetails, DashboardData, ReportData } from "../models/loan.model";
import { DomainError } from "@/lib/domain-error";

export class GetAllLoansUseCase {
    constructor(private readonly repository: LoanRepository) {}

    execute(userId?: string, searchQuery?: string, companyId?: string, isLiquidated?: boolean): ResultAsync<Loan[], DomainError> {
        return this.repository.getAll(userId, searchQuery, companyId, isLiquidated);
    }
}

export class GetLoanDetailsUseCase {
    constructor(private readonly repository: LoanRepository) {}

    execute(id: string): ResultAsync<LoanDetails, DomainError> {
        return this.repository.getDetails(id);
    }
}

export class GetDashboardDataUseCase {
    constructor(private readonly repository: LoanRepository) {}

    execute(userId?: string, companyId?: string): ResultAsync<DashboardData, DomainError> {
        return this.repository.getDashboardData(userId, companyId);
    }
}

export class GetLoanReportUseCase {
    constructor(private readonly repository: LoanRepository) {}

    execute(startDate: string, endDate: string, companyId?: string, userId?: string): ResultAsync<ReportData, DomainError> {
        return this.repository.getLoanReport(startDate, endDate, companyId, userId);
    }
}
