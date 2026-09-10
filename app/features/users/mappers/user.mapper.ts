import { User, UserProfile, UserStatus } from "../models/user.model";
import { UserDto } from "../dto/user.dto";

export const userDtoToModel = (dto: any): User => {
  // Manejo de estructura anidada {user, person} o plana sin usar 'any'
  const d = dto as unknown as Record<string, unknown>;

  // Detect if it's the nested {user, person} structure or flat structure
  const userObj = (d.user as Record<string, unknown>) || d;
  const personObj = (d.person as Record<string, unknown>) || d;

  return {
    id: userObj.id ? String(userObj.id) : "",
    username: (userObj.username as string) || "",
    profile: (userObj.profile as UserProfile) || "COBRADOR",
    status: (userObj.status as UserStatus) || "ACTIVE",
    isDayClosed:
      (userObj.isDayClosed as boolean) ??
      (userObj.is_day_closed as boolean) ??
      false,
    idCompany: userObj.idCompany
      ? String(userObj.idCompany)
      : userObj.id_company
        ? String(userObj.id_company)
        : "",
    firstName:
      (userObj.firstName as string) ||
      (userObj.first_name as string) ||
      (personObj.firstName as string) ||
      (personObj.first_name as string) ||
      "",
    lastName:
      (userObj.lastName as string) ||
      (userObj.last_name as string) ||
      (personObj.lastName as string) ||
      (personObj.last_name as string) ||
      "",
    documentType:
      (userObj.documentType as string) ||
      (userObj.document_type as string) ||
      (personObj.documentType as string) ||
      (personObj.document_type as string) ||
      "",
    documentNumber:
      (userObj.documentNumber as string) ||
      (userObj.document_number as string) ||
      (personObj.documentNumber as string) ||
      (personObj.document_number as string) ||
      "",
    idPeople: userObj.idPeople
      ? String(userObj.idPeople)
      : userObj.id_people
        ? String(userObj.id_people)
        : personObj.idPeople
          ? String(personObj.idPeople)
          : personObj.id_people
            ? String(personObj.id_people)
            : undefined,
  };
};

export const userListDtoToModel = (dtos: UserDto[]): User[] => {
  if (!dtos || !Array.isArray(dtos)) return [];
  return dtos.map(userDtoToModel);
};
