export interface Person {
    id: string;
    documentType: string;
    documentNumber: string;
    firstName: string;
    lastName: string;
    birthday?: string | null;
    phone?: string;
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
    idPeople?: string;
    documentType?: string;
    documentNumber?: string;
    firstName?: string;
    lastName?: string;
    birthday?: string | null;
    phone?: string;
    person?: Person;
    permissions?: UserPermissions;
    collectionOrder?: string[];
}

export interface UserPermissions {
    canDeleteLoan: boolean;
    canDeletePayment: (paymentDate: string, registeredByUserId?: string) => boolean;
    canReassignLoan: boolean;
    canManageUsers: boolean;
    canManageCompanies: boolean;
    canViewReports: boolean;
    canViewExpenses: boolean;
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
    phone?: string;
    personId?: string;
    collectorId?: string;
    companyId?: string;
    userId?: string;
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
    label?: string;
    status: string;
    createdAt: string;
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
    phone?: string;
    idCompany?: string;
}

export interface UpdateUserResponse {
    success: boolean;
    message: string;
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

export interface CreatePersonRequest {
    documentType: string;
    documentNumber: string;
    firstName: string;
    lastName: string;
    birthday?: string | null;
    phone?: string;
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
    loanId: string;
    amount: number;
    userId: string; // Collector ID
}

export interface CreatePaymentResponse {
    id: string;
    success: boolean;
}

export interface CreateInstallmentRequest {
    loanId: string;
    amount: number;
    userId: string;
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
    registeredByUserId: string;
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

export interface ReportPayment {
    cliente: string;
    monto: number;
    estado: 'COBRADO' | 'PENDIENTE';
    metodo: string;
}

export interface ReportDay {
    fecha: string;
    pagos: ReportPayment[];
    gastos: any[];
}

export interface ReportData {
    summary: {
        totalGasto: number;
        totalCobradoEfectivo: number;
        totalCobradoYape: number;
        totalCobrado: number;
        totalPrestado: number;
    };
    pagosPorDia: ReportDay[];
}
