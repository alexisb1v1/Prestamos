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
export interface CreateUserRequest {
    username: string;
    passwordHash: string;
    profile: 'ADMIN' | 'OWNER' | 'COBRADOR';
    documentType: string;
    documentNumber: string;
    firstName: string;
    lastName: string;
    birthday: string;
}

export interface CreateUserResponse {
    success: boolean;
    message: string;
    userId: string;
}

export interface UpdateUserRequest {
    profile: 'ADMIN' | 'OWNER' | 'COBRADOR';
    status: 'ACTIVE' | 'INACTIVE';
    documentType: string;
    documentNumber: string;
    firstName: string;
    lastName: string;
    birthday: string;
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
}
