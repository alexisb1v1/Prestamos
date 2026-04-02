import { ResultAsync } from 'neverthrow';
import { DomainError } from '@/lib/domain-error';
import { ExpenseModel } from '../expense.model';
import { ExpenseRepository } from '../repositories/expense.repository';
import { CreateExpenseRequest } from '@/lib/types';

export class CreateExpenseUseCase {
    constructor(private readonly repository: ExpenseRepository) {}

    execute(expense: CreateExpenseRequest): ResultAsync<ExpenseModel, DomainError> {
        return this.repository.create(expense);
    }
}
