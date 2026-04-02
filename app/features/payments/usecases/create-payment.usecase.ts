import { ResultAsync } from 'neverthrow';
import { DomainError } from '@/lib/domain-error';
import { PaymentModel } from '../payment.model';
import { PaymentRepository } from '../repositories/payment.repository';
import { CreatePaymentRequest } from '@/lib/types';

export class CreatePaymentUseCase {
    constructor(private readonly repository: PaymentRepository) {}

    execute(payment: CreatePaymentRequest): ResultAsync<PaymentModel, DomainError> {
        return this.repository.createPayment(payment);
    }
}
