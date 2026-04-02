export interface CreatePaymentRequestDTO {
    loanId: string;
    amount: number;
    userId: string;
}

export interface CreateInstallmentRequestDTO {
    loanId: string;
    amount: number;
    userId: string;
    paymentType?: 'EFECTIVO' | 'YAPE';
}

export interface PaymentResponseDTO {
    id: string;
    success?: boolean;
}
