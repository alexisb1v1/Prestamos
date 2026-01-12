import { api } from './api';
import { Person, CreatePersonRequest, CreatePersonResponse } from './types';

export const personService = {
    /**
     * Search person by document
     */
    async search(documentType: string, documentNumber: string): Promise<Person> {
        return api.get<Person>(`/people/search?documentType=${documentType}&documentNumber=${documentNumber}`);
    },

    /**
     * Create a new person
     */
    async create(person: CreatePersonRequest): Promise<CreatePersonResponse> {
        return api.post<CreatePersonResponse>('/people', person);
    }
};
