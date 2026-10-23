import { PersonRepositoryImpl } from "./repositories/person.repository.impl";
import { SearchPersonUseCase } from "./use-cases/search-person.use-case";
import { CreatePersonUseCase } from "./use-cases/create-person.use-case";
import { RecalculateScoreUseCase } from "./use-cases/recalculate-score.use-case";

// Export Models
export type { Person, CreditScoreDetail, PillarDetail } from "./models/person.model";

// Export DTOs
export type {
  CreatePersonRequestDto,
  CreatePersonResponseDto,
  RecalculateScoreResponseDto,
} from "./dto/person.dto";

// Inyección de dependencias (Composition Root)
const personRepository = new PersonRepositoryImpl();

export const searchPersonUseCase = new SearchPersonUseCase(personRepository);
export const createPersonUseCase = new CreatePersonUseCase(personRepository);
export const recalculateScoreUseCase = new RecalculateScoreUseCase(personRepository);

