import { ResultAsync } from "neverthrow";
import { DomainError } from "@/lib/domain-error";
import { Payment } from "../payment.model";
import {
  CreatePaymentRequestDTO,
  CreateInstallmentRequestDTO,
} from "../payment.dto";

/**
 * Interfaz para el repositorio de pagos y abonos.
 */
export interface PaymentRepository {
  /**
   * Crea un pago (legacy/específico).
   * @param payment Datos del pago.
   */
  createPayment(
    payment: CreatePaymentRequestDTO,
  ): ResultAsync<Payment, DomainError>;

  /**
   * Crea un abono (cuota) para un préstamo.
   * @param installment Datos del abono.
   */
  createInstallment(
    installment: CreateInstallmentRequestDTO,
  ): ResultAsync<Payment, DomainError>;
}
