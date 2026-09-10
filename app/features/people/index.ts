import { PersonRepositoryImpl } from "./repositories/person.repository.impl";
import { SearchPersonUseCase } from "./use-cases/search-person.use-case";
import { CreatePersonUseCase } from "./use-cases/create-person.use-case";

// Export Models
export type { Person } from "./models/person.model";

// Export DTOs
export type {
  CreatePersonRequestDto,
  CreatePersonResponseDto,
} from "./dto/person.dto";

// Inyección de dependencias (Composition Root)
const personRepository = new PersonRepositoryImpl();

export const searchPersonUseCase = new SearchPersonUseCase(personRepository);
export const createPersonUseCase = new CreatePersonUseCase(personRepository);
