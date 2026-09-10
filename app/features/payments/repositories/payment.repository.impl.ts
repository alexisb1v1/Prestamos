import { ResultAsync } from "neverthrow";
import { DomainError } from "@/lib/domain-error";
import { PaymentRepository } from "./payment.repository";
import { Payment } from "../payment.model";
import { PaymentMapper } from "../payment.mapper";
import { api } from "@/lib/api";
import {
  CreatePaymentRequestDTO,
  CreateInstallmentRequestDTO,
  PaymentResponseDTO,
} from "../payment.dto";

/**
 * Implementación del repositorio de pagos y abonos usando la API centralizada.
 */
export class PaymentRepositoryImpl implements PaymentRepository {
  /**
   * Crea un pago enviando la petición a la API.
   * @param payment Datos del pago.
   * @returns ResultAsync con el pago mapeado a dominio.
   */
  createPayment(
    payment: CreatePaymentRequestDTO,
  ): ResultAsync<Payment, DomainError> {
    return api.safe
      .post<PaymentResponseDTO>("/installment", payment)
      .map((response) => PaymentMapper.toDomain(response));
  }

  /**
   * Crea un abono para un préstamo.
   * @param installment Datos del abono.
   * @returns ResultAsync con el abono mapeado a dominio.
   */
  createInstallment(
    installment: CreateInstallmentRequestDTO,
  ): ResultAsync<Payment, DomainError> {
    return api.safe
      .post<PaymentResponseDTO>("/installment", installment)
      .map((response) => PaymentMapper.toDomain(response));
  }
}
