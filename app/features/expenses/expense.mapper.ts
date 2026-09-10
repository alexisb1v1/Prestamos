import { ExpenseDto } from "./expense.dto";
import { Expense } from "./expense.model";

/**
 * Mapper para transformar datos entre la capa de infraestructura (API/DTO) y la capa de dominio.
 */
export class ExpenseMapper {
  /**
   * Convierte el DTO de respuesta de la API al Modelo de Dominio.
   * @param dto Datos provenientes de la API.
   * @returns Modelo de dominio Expense.
   */
  static toDomain(dto: ExpenseDto): Expense {
    return {
      id: dto.id?.toString() || "",
      description: dto.description || "",
      amount: Number(dto.amount) || 0,
      date: dto.date || "",
      expenseDate: dto.expenseDate || dto.date || "",
      userId: dto.userAppId?.toString() || dto.userId?.toString() || "",
      user: (dto.user as any) || undefined,
    };
  }

  /**
   * Convierte una lista de DTOs a una lista de Modelos de Dominio.
   * @param dtos Listado de datos de la API.
   * @returns Listado de modelos de dominio.
   */
  static toDomainList(dtos: ExpenseDto[]): Expense[] {
    if (!Array.isArray(dtos)) return [];
    return dtos.map((dto) => this.toDomain(dto));
  }
}
