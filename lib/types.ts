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
