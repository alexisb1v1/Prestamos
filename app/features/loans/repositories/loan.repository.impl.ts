import { ResultAsync } from "neverthrow";
import { api } from "@/lib/api";
import { LoanRepository } from "./loan.repository";
import { LoanMapper } from "../mappers/loan.mapper";
import { 
    Loan, 
    CreateLoan, 
    LoanDetails, 
    DashboardData, 
    ReportData 
} from "../models/loan.model";
import { 
    LoanDto, 
    CreateLoanRequestDto, 
    LoanDetailsDto,
    DashboardDataDto,
    ReportDataDto
} from "../dto/loan.dto";
import { DomainError } from "@/lib/domain-error";

export class LoanRepositoryImpl implements LoanRepository {
    getAll(userId?: string, searchQuery?: string, companyId?: string, isLiquidated?: boolean): ResultAsync<Loan[], DomainError> {
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (searchQuery) params.append('searchQuery', searchQuery);
        if (companyId) params.append('companyId', companyId);
        if (isLiquidated !== undefined) params.append('isLiquidated', String(isLiquidated));

        const queryString = params.toString();
        
        return api.safe.get<LoanDto[]>(`/loans${queryString ? `?${queryString}` : ''}`)
            .map(dtos => dtos.map(dto => LoanMapper.toDomain(dto)));
    }

    create(loanPayload: CreateLoanRequestDto): ResultAsync<Loan, DomainError> {
        return api.safe.post<LoanDto>('/loans', loanPayload)
            .map(dto => LoanMapper.toDomain(dto));
    }

    getDetails(id: string): ResultAsync<LoanDetails, DomainError> {
        return api.safe.get<LoanDetailsDto>(`/loans/${id}/details`)
            .map(dto => LoanMapper.toLoanDetailsDomain(dto));
    }

    reassign(loanId: string, newUserId: string): ResultAsync<void, DomainError> {
        return api.safe.patch<void>(`/loans/${loanId}/reassign`, { newUserId });
    }

    delete(loanId: string): ResultAsync<void, DomainError> {
        return api.safe.delete<void>(`/loans/${loanId}`);
    }

    deleteInstallment(installmentId: string): ResultAsync<void, DomainError> {
        return api.safe.delete<void>(`/loans/installments/${installmentId}`);
    }

    getDashboardData(userId?: string, companyId?: string): ResultAsync<DashboardData, DomainError> {
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (companyId) params.append('companyId', companyId);

        const queryString = params.toString();
        return api.safe.get<DashboardDataDto>(`/loans/dashboard${queryString ? `?${queryString}` : ''}`)
            .map(dto => LoanMapper.toDashboardDataDomain(dto));
    }

    getLoanReport(startDate: string, endDate: string, companyId?: string, userId?: string): ResultAsync<ReportData, DomainError> {
        const params = new URLSearchParams();
        params.append('startDate', startDate);
        params.append('endDate', endDate);
        if (companyId) params.append('companyId', companyId);
        if (userId) params.append('userId', userId);

        return api.safe.get<ReportDataDto>(`/reports/loans?${params.toString()}`)
            .map(dto => LoanMapper.toReportDataDomain(dto));
    }
}
