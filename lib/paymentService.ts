import { api } from './api';
import { CreatePaymentRequest, CreatePaymentResponse, CreateInstallmentRequest, CreateInstallmentResponse } from './types';

export const paymentService = {
    /**
     * Create a new general payment (old endpoint)
     */
    async create(payment: CreatePaymentRequest): Promise<CreatePaymentResponse> {
        return api.post<CreatePaymentResponse>('/payments', payment);
    },

    /**
     * Register a loan installment payment
     * Endpoint: POST /loans/installments
     */
    async createInstallment(payment: CreateInstallmentRequest): Promise<CreateInstallmentResponse> {
        return api.post<CreateInstallmentResponse>('/loans/installments', payment);
    }
};
