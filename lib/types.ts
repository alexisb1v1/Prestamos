import { Person } from '@/app/features/people';
import { User, UserProfile, UserStatus } from '@/app/features/users';
import { Company } from '@/app/features/companies';
import { Loan, LoanDetails, InstallmentDetail, DashboardData, ReportData } from '@/app/features/loans';
import { Expense, CreateExpenseRequestDto as CreateExpenseRequest } from '@/app/features/expenses';
import { CreatePaymentRequestDTO as CreatePaymentRequest, CreateInstallmentRequestDTO as CreateInstallmentRequest } from '@/app/features/payments';

export type { 
    Person, 
    User, UserProfile, UserStatus,
    Company,
    Loan, LoanDetails, InstallmentDetail, DashboardData, ReportData,
    Expense, CreateExpenseRequest,
    CreatePaymentRequest, CreateInstallmentRequest
};

export interface UserPermissions {
    canDeleteLoan: boolean;
    canDeletePayment: (paymentDate: string, registeredByUserId?: string) => boolean;
    canReassignLoan: boolean;
    canManageUsers: boolean;
    canManageCompanies: boolean;
    canViewReports: boolean;
    canViewExpenses: boolean;
    canViewConfiguration?: boolean;
    canCreateLoan: boolean;
    canRenewLoan: boolean;
    canCreateExpense: boolean;
}

export interface LoginRequest {
    username: string;
    password: string;
    fingerprint?: string;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    token: string;
    user: User;
    companyStatus?: string;
}

export interface ErrorResponse {
    statusCode: number;
    errorCode: string;
    message: string;
    timestamp: string;
}

export interface CreateCompanyRequest {
    companyName: string;
    label?: string;
}

export interface UpdateCompanyRequest {
    companyName: string;
}

export interface CreateUserRequest {
    username: string;
    password: string;
    profile: 'ADMIN' | 'COBRADOR';
    documentType: string;
    documentNumber: string;
    firstName: string;
    lastName: string;
    birthday?: string | null;
    phone?: string;
    idCompany?: string;
}

export interface UpdateUserRequest {
    profile: 'ADMIN' | 'COBRADOR';
    status: 'ACTIVE' | 'INACTIVE';
    documentType: string;
    documentNumber: string;
    firstName: string;
    lastName: string;
    birthday?: string | null;
    phone?: string;
    idCompany?: string;
}

export interface GetUserResponse {
    success: boolean;
    message: string;
    user: {
        id: string;
        username: string;
        profile: 'ADMIN' | 'OWNER' | 'COBRADOR';
        status: 'ACTIVE' | 'INACTIVE';
        idPeople: string;
        isDayClosed: boolean;
        idCompany: string;
    };
    person: Person;
}

export interface CreatePaymentResponse {
    id: string;
    success: boolean;
}

export interface CreateInstallmentResponse {
    id: string;
}
