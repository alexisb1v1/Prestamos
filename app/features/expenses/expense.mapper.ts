import { CreateExpenseRequestDTO, ExpenseResponseDTO } from './expense.dto';
import { ExpenseModel } from './expense.model';
import { CreateExpenseRequest } from '@/lib/types'; // Types from the original app

export class ExpenseMapper {
    /**
     * Convierte el request local al DTO que espera la API
     */
    static toDTOCreate(domain: CreateExpenseRequest): CreateExpenseRequestDTO {
        return {
            description: domain.description,
            amount: Number(domain.amount),
            userId: domain.userId.toString()
        };
    }

    /**
     * Convierte el DTO de respuesta de la API al Modelo de Dominio rico
     */
    static toDomain(dto: ExpenseResponseDTO): ExpenseModel {
        return new ExpenseModel(
            dto.id?.toString() || '',
            dto.description || '',
            Number(dto.amount) || 0,
            dto.date || '',
            dto.expenseDate || dto.date || '',
            dto.userAppId?.toString() || dto.userId?.toString() || '',
            dto.user || undefined
        );
    }

    /**
     * Convierte una lista de DTOs a una lista de Modelos de Dominio
     */
    static toDomainList(dtos: ExpenseResponseDTO[]): ExpenseModel[] {
        if (!Array.isArray(dtos)) return [];
        return dtos.map(dto => this.toDomain(dto));
    }
}
