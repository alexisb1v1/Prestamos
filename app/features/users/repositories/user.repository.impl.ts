import { ResultAsync } from "neverthrow";
import { UserRepository } from "./user.repository";
import { User } from "../models/user.model";
import { DomainError } from "@/lib/domain-error";
import { api } from "@/lib/api";
import { userDtoToModel, userListDtoToModel } from "../mappers/user.mapper";
import { CreateUserRequestDto } from "../dto/user.dto";

export class UserRepositoryImpl implements UserRepository {
    getAll(username?: string, idCompany?: string): ResultAsync<User[], DomainError> {
        const params = new URLSearchParams();
        if (username) params.append('username', username);
        if (idCompany) params.append('idCompany', idCompany);
        const queryString = params.toString();

        return api.safe.get<any[]>(`/users${queryString ? `?${queryString}` : ''}`)
            .map(userListDtoToModel);
    }

    getById(id: string): ResultAsync<User, DomainError> {
        return api.safe.get<any>(`/users/${id}`)
            .map(userDtoToModel);
    }

    create(user: CreateUserRequestDto): ResultAsync<void, DomainError> {
        return api.safe.post<any>('/users', user).map(() => undefined);
    }

    update(id: string, user: any): ResultAsync<void, DomainError> {
        return api.safe.put<any>(`/users/${id}`, user).map(() => undefined);
    }

    delete(id: string): ResultAsync<void, DomainError> {
        return api.safe.delete<any>(`/users/${id}`).map(() => undefined);
    }

    toggleDayStatus(id: string, isDayClosed: boolean): ResultAsync<void, DomainError> {
        return api.safe.patch<void>(`/users/${id}/toggle-day-status`, { isDayClosed });
    }

    searchPerson(documentType: string, documentNumber: string): ResultAsync<any, DomainError> {
        return api.safe.get<any>(`/people/search?documentType=${documentType}&documentNumber=${documentNumber}`);
    }
}
