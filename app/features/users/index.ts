import { UserRepositoryImpl } from "./repositories/user.repository.impl";
import {
  GetAllUsersUseCase,
  GetUserByIdUseCase,
} from "./use-cases/get-all-users.use-case";
import {
  CreateUserUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  ToggleDayStatusUseCase,
} from "./use-cases/user-mutations.use-case";

// Export Models
export type { User, UserProfile, UserStatus } from "./models/user.model";

// Instanciación del repositorio
const userRepository = new UserRepositoryImpl();

// Exportación de Casos de Uso
export const getAllUsersUseCase = new GetAllUsersUseCase(userRepository);
export const getUserByIdUseCase = new GetUserByIdUseCase(userRepository);
export const createUserUseCase = new CreateUserUseCase(userRepository);
export const updateUserUseCase = new UpdateUserUseCase(userRepository);
export const deleteUserUseCase = new DeleteUserUseCase(userRepository);
export const toggleDayStatusUseCase = new ToggleDayStatusUseCase(
  userRepository,
);
