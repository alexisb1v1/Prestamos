export interface CompanySettings {
  features?: {
    risk_scoring?: boolean;
    [key: string]: any;
  };
  preferences?: Record<string, any>;
  [key: string]: any;
}

export interface Company {
  id: string;
  companyName: string;
  subdomain?: string;
  label?: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | string;
  createdAt: string;
  keyToken?: string;
  settings?: CompanySettings;
}
