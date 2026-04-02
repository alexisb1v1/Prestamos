export interface CreateExpenseRequestDTO {
    description: string;
    amount: number;
    userId: string;
    companyId?: string;
}

export interface ExpenseResponseDTO {
    id: string;
    description: string;
    amount: number;
    date: string;
    expenseDate?: string;
    userAppId?: string;
    userId?: string;
    user?: any;
}
