export interface PersonDto {
  id: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  birthday?: string | null;
  phone?: string;
  address?: string;
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
