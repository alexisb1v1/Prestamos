import { ResultAsync } from 'neverthrow';
import { DomainError } from '@/lib/domain-error';
import { ExpenseRepository } from '../repositories/expense.repository';

export class DeleteExpenseUseCase {
    constructor(private readonly repository: ExpenseRepository) {}

    execute(id: string): ResultAsync<void, DomainError> {
        return this.repository.delete(id);
    }
}
