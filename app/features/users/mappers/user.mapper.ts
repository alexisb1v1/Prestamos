import { User } from "../models/user.model";
import { UserDto, GetUserResponseDto } from "../dto/user.dto";

export const userDtoToModel = (dto: any): User => {
    // Si viene la respuesta de "getById" que trae {user, person}
    if (dto.user && dto.person) {
        return {
            id: dto.user.id,
            username: dto.user.username,
            profile: dto.user.profile,
            status: dto.user.status,
            isDayClosed: dto.user.isDayClosed ?? false,
            idCompany: dto.user.idCompany,
            firstName: dto.person.firstName,
            lastName: dto.person.lastName,
            documentType: dto.person.documentType,
            documentNumber: dto.person.documentNumber,
            idPeople: dto.user.idPeople
        };
    }

    // Si viene del listado (aplanado o con objeto person)
    const person = dto.person || {};
    return {
        id: dto.id,
        username: dto.username,
        profile: dto.profile,
        status: dto.status,
        isDayClosed: dto.isDayClosed ?? false,
        idCompany: dto.idCompany,
        firstName: dto.firstName || person.firstName || '',
        lastName: dto.lastName || person.lastName || '',
        documentType: dto.documentType || person.documentType || '',
        documentNumber: dto.documentNumber || person.documentNumber || '',
        idPeople: dto.idPeople
    };
};

export const userListDtoToModel = (dtos: any[]): User[] => {
    return dtos.map(userDtoToModel);
};
