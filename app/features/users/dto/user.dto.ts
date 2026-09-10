import { Person } from "@/app/features/people";

export interface UserDto {
  id: string;
  username: string;
  profile: "ADMIN" | "OWNER" | "COBRADOR";
  status: "ACTIVE" | "INACTIVE";
  isDayClosed: boolean;
  idCompany: string;
  idPeople: string;
  // Common flattened fields if any
  firstName?: string;
  lastName?: string;
  documentType?: string;
  documentNumber?: string;
  person?: Person;
}

export interface GetUserResponseDto {
  success: boolean;
  user: UserDto;
  person: Person;
}

export interface CreateUserRequestDto {
  username: string;
  password?: string;
  profile: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  birthday?: string | null;
  idCompany?: string;
}

export interface UpdateUserRequestDto {
  firstName: string;
  lastName: string;
  profile: string;
  status: "ACTIVE" | "INACTIVE";
  birthday?: string | null;
}
