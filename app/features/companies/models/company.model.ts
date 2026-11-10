export interface CapitalHistoryEntry {
  id: number;
  date: string;
  previous_capital: number;
  amount_injected: number;
  new_capital: number;
  type: 'INITIAL_CAPITAL' | 'CAPITAL_INJECTION';
  registered_by: string;
  note?: string;
}

export interface CompanySettings {
  financial?: {
    current_capital?: number;
    capital_history?: CapitalHistoryEntry[];
  };
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
  initialCapital?: number | null;
  settings?: CompanySettings;
  isDemo?: boolean;
}
