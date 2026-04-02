import { UserRepositoryImpl } from "./repositories/user.repository.impl";
import { GetAllUsersUseCase, GetUserByIdUseCase, SearchPersonUseCase } from "./use-cases/get-all-users.use-case";
import { CreateUserUseCase, UpdateUserUseCase, DeleteUserUseCase, ToggleDayStatusUseCase } from "./use-cases/user-mutations.use-case";

// Instanciación del repositorio
const userRepository = new UserRepositoryImpl();

// Exportación de Casos de Uso
export const getAllUsersUseCase = new GetAllUsersUseCase(userRepository);
export const getUserByIdUseCase = new GetUserByIdUseCase(userRepository);
export const searchPersonUseCase = new SearchPersonUseCase(userRepository);
export const createUserUseCase = new CreateUserUseCase(userRepository);
export const updateUserUseCase = new UpdateUserUseCase(userRepository);
export const deleteUserUseCase = new DeleteUserUseCase(userRepository);
export const toggleDayStatusUseCase = new ToggleDayStatusUseCase(userRepository);
