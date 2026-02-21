export interface Person {
    id: string;
    documentType: string;
    documentNumber: string;
    firstName: string;
    lastName: string;
    birthday: string;
}

export interface User {
    id: string;
    username: string;
    profile: 'ADMIN' | 'OWNER' | 'COBRADOR';
    status: 'ACTIVE' | 'INACTIVE';
    isDayClosed?: boolean;
    idCompany?: string;
    companyStatus?: string;
    // Person (flattened)
    idPeople?: number;
    documentType?: string;
    documentNumber?: string;
    firstName?: string;
    lastName?: string;
    birthday?: string;
    person?: Person;
}

export interface LoginRequest {
    username: string;
    passwordHash: string;
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
    message: string;
}

export interface Loan {
    id: string;
    startDate: string;
    endDate: string;
    amount: number;
    interest: number;
    fee: number;
    days: number;
    createdAt: string;
    status: string; // 'Activo' or others
    address: string;
    documentNumber: string;
    clientName: string;
    collectorName: string;
    paidToday: number;
    inIntervalPayment: number;
    remainingAmount?: number;
    personId?: string | number;
    collectorId?: string | number;
    companyId?: string | number;
}

export interface Cobrador {
    id: string;
    name: string;
    email: string;
    assignedClients: number;
    collectedToday: number;
    status: 'active' | 'inactive';
}

export interface Payment {
    id: string;
    loanId: string;
    amount: number;
    date: string;
    cobradorId: string;
}
export interface Company {
    id: string;
    companyName: string;
    ruc?: string;
    address?: string;
    phone?: string;
    status: string;
}

export interface CreateUserRequest {
    username: string;
    passwordHash: string;
    profile: 'ADMIN' | 'COBRADOR';
    documentType: string;
    documentNumber: string;
    firstName: string;
    lastName: string;
    birthday?: string | null;
    idCompany?: string; // Optional because only Owner sends it explicitely, others might be handled differently or required based on logic
}

export interface CreateUserResponse {
    success: boolean;
    message: string;
    userId: string;
}

export interface UpdateUserRequest {
    profile: 'ADMIN' | 'COBRADOR';
    status: 'ACTIVE' | 'INACTIVE';
    documentType: string;
    documentNumber: string;
    firstName: string;
    lastName: string;
    birthday?: string | null;
    idCompany?: string;
}

export interface UpdateUserResponse {
    success: boolean;
    message: string;
}

export interface CreatePersonRequest {
    documentType: string;
    documentNumber: string;
    firstName: string;
    lastName: string;
    birthday: string;
}

export interface CreatePersonResponse {
    id: string; // The API returns just { "id": "5" }
}

// ... existing types

export interface Payment {
    id: string;
    loanId: string;
    amount: number;
    date: string;
    cobradorId: string;
}

export interface CreatePaymentRequest {
    loanId: number; // API uses number usually
    amount: number;
    userId: number; // Collector ID
}

export interface CreatePaymentResponse {
    id: string;
    success: boolean;
}

export interface CreateInstallmentRequest {
    loanId: string;
    amount: number;
    userId: number;
    paymentType?: 'EFECTIVO' | 'YAPE';
}

export interface CreateInstallmentResponse {
    id: string;
}

export interface InstallmentDetail {
    id: string;
    date: string;
    amount: number;
    status: string;
    registeredBy: string;
}

export interface LoanDetails {
    startDate: string;
    endDate: string;
    installments: InstallmentDetail[];
}
export interface DashboardLoan extends Loan {
    remainingAmount: number;
    paidToday: number;
}

export interface DashboardData {
    totalLentToday: number;
    collectedToday: number;
    activeClients: number;
    pendingLoans: DashboardLoan[];
    detailCollectedToday: {
        yape: number;
        efectivo: number;
    };
    totalExpensesToday: number;
    thermometer?: number;
}

export interface CreateExpenseRequest {
    description: string;
    amount: number;
    userId: string;
}

export interface Expense {
    id: string;
    description: string;
    amount: number;
    date: string;
    expenseDate: string; // Full date with time from API
    userId: string;
    user?: User;
}
