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
    person: Person;
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
    clientName: string;
    amount: number;
    interestRate: number;
    balance: number;
    frequency: 'daily' | 'weekly' | 'monthly';
    status: 'active' | 'paid' | 'overdue';
    startDate: string;
    cobradorId?: string;
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
