import { ResultAsync } from 'neverthrow';
import { DomainError } from '@/lib/domain-error';
import { PaymentModel } from '../payment.model';
import { CreatePaymentRequest, CreateInstallmentRequest } from '@/lib/types';

export interface PaymentRepository {
    createPayment(payment: CreatePaymentRequest): ResultAsync<PaymentModel, DomainError>;
    createInstallment(installment: CreateInstallmentRequest): ResultAsync<PaymentModel, DomainError>;
}
