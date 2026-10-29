export interface PillarDetail {
  score: number;
  max_score: number;
  weight_percent: number;
  assessment?: string;
  [key: string]: any;
}

export interface CreditScoreDetail {
  calculated_at?: string;
  score?: number;
  rating?: 'A+' | 'A' | 'B' | 'C' | string;
  rating_label?: string;
  pillars?: {
    reputation_history: PillarDetail;
    active_punctuality: PillarDetail;
    debt_capacity: PillarDetail;
  };
  recommendations?: {
    status?: 'APROBADO' | 'SUJETO_A_CONDICIONES' | 'BLOQUEADO' | string;
    suggested_action?: string;
    risk_level?: 'MINIMO' | 'BAJO' | 'MEDIO' | 'ALTO' | string;
  };
  [key: string]: any;
}

export interface Person {
  id: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  birthday?: string | null;
  phone?: string;
  address?: string;
  riskScoringEnabled?: boolean;
  creditScore?: number;
  creditScoreDetail?: CreditScoreDetail;
  isSynced?: boolean;
}

