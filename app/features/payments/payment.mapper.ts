import { PaymentResponseDTO } from "./payment.dto";
import { Payment } from "./payment.model";

/**
 * Mapper para transformar datos entre la capa de infraestructura (API/DTO) y la capa de dominio en pagos.
 */
export class PaymentMapper {
  /**
   * Convierte el DTO de respuesta de la API al Modelo de Dominio.
   * @param dto Datos provenientes de la API.
   * @returns Modelo de dominio Payment.
   */
  static toDomain(dto: PaymentResponseDTO): Payment {
    return {
      id: dto.id?.toString() || "",
      loanId: "",
      amount: 0,
      date: "",
      cobradorId: "",
    };
  }
}
