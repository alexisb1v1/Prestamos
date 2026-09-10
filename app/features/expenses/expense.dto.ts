export interface CreateExpenseRequestDto {
  description: string;
  amount: number;
  userId: string;
  companyId?: string;
}

export interface ExpenseDto {
  id: string;
  description: string;
  amount: number;
  date: string;
  expenseDate?: string;
  userAppId?: string;
  userId?: string;
  user?: unknown;
}
