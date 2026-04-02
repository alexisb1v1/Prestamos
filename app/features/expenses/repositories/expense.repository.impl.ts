import { ResultAsync } from 'neverthrow';
import { DomainError } from '@/lib/domain-error';
import { ExpenseRepository } from './expense.repository';
import { ExpenseModel } from '../expense.model';
import { ExpenseMapper } from '../expense.mapper';
import { api } from '@/lib/api';
import { CreateExpenseRequest } from '@/lib/types';
import { ExpenseResponseDTO } from '../expense.dto';

export class ExpenseRepositoryImpl implements ExpenseRepository {
    create(expense: CreateExpenseRequest): ResultAsync<ExpenseModel, DomainError> {
        return api.safe.post<ExpenseResponseDTO>('/expenses', ExpenseMapper.toDTOCreate(expense))
            .map(response => ExpenseMapper.toDomain(response));
    }

    getAll(date?: string, userId?: string, companyId?: string): ResultAsync<ExpenseModel[], DomainError> {
        const params = new URLSearchParams();
        if (date) params.append('date', date);
        if (userId) params.append('userId', userId);
        if (companyId) params.append('companyId', companyId);

        return api.safe.get<ExpenseResponseDTO[]>(`/expenses?${params.toString()}`)
            .map(response => ExpenseMapper.toDomainList(response));
    }

    delete(id: string): ResultAsync<void, DomainError> {
        return api.safe.delete<void>(`/expenses/${id}`);
    }
}
