export interface PersonDto {
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
  creditScoreDetail?: any;
}

export interface CreatePersonRequestDto {
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  birthday?: string | null;
}

export interface CreatePersonResponseDto {
  id: string;
}

export interface RecalculateScoreResponseDto {
  creditScore: number;
  creditScoreDetail: any;
}

