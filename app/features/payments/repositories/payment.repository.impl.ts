import { ResultAsync } from 'neverthrow';
import { DomainError } from '@/lib/domain-error';
import { PaymentRepository } from './payment.repository';
import { PaymentModel } from '../payment.model';
import { PaymentMapper } from '../payment.mapper';
import { api } from '@/lib/api';
import { CreatePaymentRequest, CreateInstallmentRequest } from '@/lib/types';
import { PaymentResponseDTO } from '../payment.dto';

export class PaymentRepositoryImpl implements PaymentRepository {
    createPayment(payment: CreatePaymentRequest): ResultAsync<PaymentModel, DomainError> {
        return api.safe.post<PaymentResponseDTO>('/payments', PaymentMapper.toPaymentDTOCreate(payment))
            .map(response => PaymentMapper.toDomain(response));
    }

    createInstallment(installment: CreateInstallmentRequest): ResultAsync<PaymentModel, DomainError> {
        return api.safe.post<PaymentResponseDTO>('/loans/installments', PaymentMapper.toInstallmentDTOCreate(installment))
            .map(response => PaymentMapper.toDomain(response));
    }
}
