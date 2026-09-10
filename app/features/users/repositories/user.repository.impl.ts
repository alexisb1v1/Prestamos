import { ResultAsync } from "neverthrow";
import { UserRepository } from "./user.repository";
import { User } from "../models/user.model";
import { DomainError } from "@/lib/domain-error";
import { api } from "@/lib/api";
import { userDtoToModel, userListDtoToModel } from "../mappers/user.mapper";
import {
  UserDto,
  GetUserResponseDto,
  CreateUserRequestDto,
  UpdateUserRequestDto,
} from "../dto/user.dto";

export class UserRepositoryImpl implements UserRepository {
  getAll(
    username?: string,
    idCompany?: string,
  ): ResultAsync<User[], DomainError> {
    const params = new URLSearchParams();
    if (username) params.append("username", username);
    if (idCompany) params.append("idCompany", idCompany);
    const queryString = params.toString();

    return api.safe
      .get<UserDto[]>(`/user${queryString ? `?${queryString}` : ""}`)
      .map(userListDtoToModel);
  }

  getById(id: string): ResultAsync<User, DomainError> {
    return api.safe.get<GetUserResponseDto>(`/user/${id}`).map(userDtoToModel);
  }

  create(user: CreateUserRequestDto): ResultAsync<void, DomainError> {
    return api.safe.post<void>("/user", user);
  }

  update(
    id: string,
    user: UpdateUserRequestDto,
  ): ResultAsync<void, DomainError> {
    return api.safe.put<void>(`/user/${id}`, user);
  }

  delete(id: string): ResultAsync<void, DomainError> {
    return api.safe.delete<void>(`/user/${id}`);
  }

  toggleDayStatus(
    id: string,
    isDayClosed: boolean,
  ): ResultAsync<void, DomainError> {
    return api.safe.patch<void>(`/user/${id}/toggle-day-status`, {
      isDayClosed,
    });
  }
}
