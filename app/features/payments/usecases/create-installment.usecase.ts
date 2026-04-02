import { ResultAsync } from 'neverthrow';
import { DomainError } from '@/lib/domain-error';
import { PaymentModel } from '../payment.model';
import { PaymentRepository } from '../repositories/payment.repository';
import { CreateInstallmentRequest } from '@/lib/types';

export class CreateInstallmentUseCase {
    constructor(private readonly repository: PaymentRepository) {}

    execute(installment: CreateInstallmentRequest): ResultAsync<PaymentModel, DomainError> {
        return this.repository.createInstallment(installment);
    }
}
