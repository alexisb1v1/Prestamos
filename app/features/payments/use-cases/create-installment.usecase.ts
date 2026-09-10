import { ResultAsync } from "neverthrow";
import { DomainError } from "@/lib/domain-error";
import { Payment } from "../payment.model";
import { PaymentRepository } from "../repositories/payment.repository";
import { CreateInstallmentRequest } from "@/lib/types";

export class CreateInstallmentUseCase {
  constructor(private readonly repository: PaymentRepository) {}

  execute(
    installment: CreateInstallmentRequest,
  ): ResultAsync<Payment, DomainError> {
    return this.repository.createInstallment(installment);
  }
}
