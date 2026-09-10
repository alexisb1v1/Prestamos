import { CompanyDto } from "../dto/company.dto";
import { Company } from "../models/company.model";

export class CompanyMapper {
  static toDomain(dto: CompanyDto): Company {
    return {
      id: dto.id,
      companyName: dto.companyName,
      subdomain: dto.subdomain,
      label: dto.label,
      status: dto.status,
      createdAt: dto.createdAt,
    };
  }
}
