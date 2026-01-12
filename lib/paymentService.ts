import { api } from './api';
import { CreatePaymentRequest, CreatePaymentResponse } from './types';

export const paymentService = {
    /**
     * Create a new payment
     */
    async create(payment: CreatePaymentRequest): Promise<CreatePaymentResponse> {
        return api.post<CreatePaymentResponse>('/payments', payment);
    }
};
