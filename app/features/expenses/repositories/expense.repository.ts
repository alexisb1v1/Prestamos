import { ResultAsync } from 'neverthrow';
import { DomainError } from '@/lib/domain-error';
import { ExpenseModel } from '../expense.model';
import { CreateExpenseRequest } from '@/lib/types';

export interface ExpenseRepository {
    create(expense: CreateExpenseRequest): ResultAsync<ExpenseModel, DomainError>;
    getAll(date?: string, userId?: string, companyId?: string): ResultAsync<ExpenseModel[], DomainError>;
    delete(id: string): ResultAsync<void, DomainError>;
}
