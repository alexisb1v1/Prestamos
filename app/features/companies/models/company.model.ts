export interface Company {
  id: string;
  companyName: string;
  subdomain?: string;
  label?: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | string;
  createdAt: string;
}
