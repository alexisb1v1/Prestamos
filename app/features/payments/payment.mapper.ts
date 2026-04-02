import { CreatePaymentRequestDTO, CreateInstallmentRequestDTO, PaymentResponseDTO } from './payment.dto';
import { PaymentModel } from './payment.model';
import { CreatePaymentRequest, CreateInstallmentRequest } from '@/lib/types';

export class PaymentMapper {
    static toPaymentDTOCreate(domain: CreatePaymentRequest): CreatePaymentRequestDTO {
        return {
            loanId: String(domain.loanId),
            amount: Number(domain.amount),
            userId: String(domain.userId)
        };
    }

    static toInstallmentDTOCreate(domain: CreateInstallmentRequest): CreateInstallmentRequestDTO {
        return {
            loanId: String(domain.loanId),
            amount: Number(domain.amount),
            userId: String(domain.userId),
            paymentType: domain.paymentType
        };
    }

    static toDomain(dto: PaymentResponseDTO): PaymentModel {
        return new PaymentModel(dto.id?.toString() || '');
    }
}
