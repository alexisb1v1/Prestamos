export interface CompanyDto {
  id: string;
  companyName: string;
  subdomain?: string;
  label?: string;
  status: string;
  createdAt: string;
  keyToken?: string;
  settings?: Record<string, any>;
}

export interface CreateCompanyRequestDto {
  companyName: string;
  label?: string;
  subdomain?: string;
}

export interface UpdateCompanyRequestDto {
  companyName: string;
  subdomain?: string;
  settings?: Record<string, any>;
}

export interface UpdateCompanyStatusRequestDto {
  status: string;
}
