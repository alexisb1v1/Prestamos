import { ExpenseRepositoryImpl } from "./repositories/expense.repository.impl";
import { CreateExpenseUseCase } from "./use-cases/create-expense.usecase";
import { GetExpensesUseCase } from "./use-cases/get-expenses.usecase";
import { DeleteExpenseUseCase } from "./use-cases/delete-expense.usecase";

// 1. Instanciar repositorios
const expenseRepository = new ExpenseRepositoryImpl();

// 2. Instanciar Casos de Uso
const createExpenseUseCase = new CreateExpenseUseCase(expenseRepository);
const getExpensesUseCase = new GetExpensesUseCase(expenseRepository);
const deleteExpenseUseCase = new DeleteExpenseUseCase(expenseRepository);

// 3. Exportar DTOs y Modelos útiles
export * from "./expense.dto";
export * from "./expense.model";

// 4. Exportar Casos de Uso
export { createExpenseUseCase, getExpensesUseCase, deleteExpenseUseCase };
