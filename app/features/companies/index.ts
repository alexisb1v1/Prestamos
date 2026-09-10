import { CompanyRepositoryImpl } from "./repositories/company.repository.impl";
import { GetAllCompaniesUseCase } from "./use-cases/get-all-companies.use-case";
import { CompanyMutationsUseCase } from "./use-cases/company-mutations.use-case";

// Infrastructure
const companyRepository = new CompanyRepositoryImpl();

// Use Cases
export const getAllCompaniesUseCase = new GetAllCompaniesUseCase(
  companyRepository,
);
export const companyMutationsUseCase = new CompanyMutationsUseCase(
  companyRepository,
);

// Models & DTOs
export * from "./models/company.model";
export * from "./dto/company.dto";
