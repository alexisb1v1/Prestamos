export interface User {
    id: string;
    username: string;
    profile: UserProfile;
    status: UserStatus;
    isDayClosed: boolean;
    idCompany: string;
    // Datos de la persona (aplanados en el dominio)
    firstName: string;
    lastName: string;
    documentType: string;
    documentNumber: string;
    idPeople?: string;
}

export type UserProfile = 'ADMIN' | 'OWNER' | 'COBRADOR';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
