import { ResultAsync } from 'neverthrow';
import { DomainError } from '@/lib/domain-error';
import { ExpenseModel } from '../expense.model';
import { ExpenseRepository } from '../repositories/expense.repository';

export class GetExpensesUseCase {
    constructor(private readonly repository: ExpenseRepository) {}

    execute(date?: string, userId?: string, companyId?: string): ResultAsync<ExpenseModel[], DomainError> {
        return this.repository.getAll(date, userId, companyId);
    }
}
