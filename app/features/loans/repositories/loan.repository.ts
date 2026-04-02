import { ResultAsync } from "neverthrow";
import { DomainError } from "@/lib/domain-error";
import { 
    Loan, 
    CreateLoan, 
    LoanDetails, 
    DashboardData, 
    ReportData 
} from "../models/loan.model";
import { CreateLoanRequestDto } from "../dto/loan.dto";

export abstract class LoanRepository {
    abstract getAll(userId?: string, searchQuery?: string, companyId?: string, isLiquidated?: boolean): ResultAsync<Loan[], DomainError>;
    abstract create(loan: CreateLoanRequestDto): ResultAsync<Loan, DomainError>;
    abstract getDetails(id: string): ResultAsync<LoanDetails, DomainError>;
    abstract reassign(loanId: string, newUserId: string): ResultAsync<void, DomainError>;
    abstract delete(loanId: string): ResultAsync<void, DomainError>;
    abstract deleteInstallment(installmentId: string): ResultAsync<void, DomainError>;
    abstract getDashboardData(userId?: string, companyId?: string): ResultAsync<DashboardData, DomainError>;
    abstract getLoanReport(startDate: string, endDate: string, companyId?: string, userId?: string): ResultAsync<ReportData, DomainError>;
}
