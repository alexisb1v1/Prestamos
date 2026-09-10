import { ResultAsync } from "neverthrow";
import { api } from "@/lib/api";
import { DomainError } from "@/lib/domain-error";
import { CompanyRepository } from "./company.repository";
import { Company } from "../models/company.model";
import {
  CompanyDto,
  CreateCompanyRequestDto,
  UpdateCompanyRequestDto,
} from "../dto/company.dto";
import { CompanyMapper } from "../mappers/company.mapper";

export class CompanyRepositoryImpl implements CompanyRepository {
  getAll(): ResultAsync<Company[], DomainError> {
    return api.safe
      .get<CompanyDto[]>("/company")
      .map((dtos) => dtos.map((dto) => CompanyMapper.toDomain(dto)));
  }

  create(
    data: CreateCompanyRequestDto,
  ): ResultAsync<{ id: string }, DomainError> {
    return api.safe.post<{ id: string }>("/company", data);
  }

  update(
    id: string,
    data: UpdateCompanyRequestDto,
  ): ResultAsync<{ message: string }, DomainError> {
    return api.safe.put<{ message: string }>(`/company/${id}`, data);
  }

  updateStatus(
    id: string,
    status: string,
  ): ResultAsync<{ message: string }, DomainError> {
    return api.safe.patch<{ message: string }>(`/company/${id}/status`, {
      status,
    });
  }
}
