import { Person } from "@/lib/types";

export interface UserDto {
    id: string;
    username: string;
    profile: 'ADMIN' | 'OWNER' | 'COBRADOR';
    status: 'ACTIVE' | 'INACTIVE';
    id_people: string; 
    is_day_closed: boolean;
    id_company: string;
    // En el listado a veces vienen aplanados
    first_name?: string;
    last_name?: string;
    document_type?: string;
    document_number?: string;
}

export interface GetUserResponseDto {
    success: boolean;
    message: string;
    user: {
        id: string;
        username: string;
        profile: 'ADMIN' | 'OWNER' | 'COBRADOR';
        status: 'ACTIVE' | 'INACTIVE';
        idPeople: string;
        isDayClosed: boolean;
        idCompany: string;
    };
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
