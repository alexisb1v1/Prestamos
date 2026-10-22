import { LoanRepositoryImpl } from "./repositories/loan.repository.impl";
import {
  GetAllLoansUseCase,
  GetLoanDetailsUseCase,
  GetDashboardDataUseCase,
  GetLoanReportUseCase,
} from "./use-cases/get-loans.use-case";
import {
  CreateLoanUseCase,
  ReassignLoanUseCase,
  DeleteLoanUseCase,
  DeleteInstallmentUseCase,
  UpdateLoanInfoUseCase,
  GenerateShareLinkUseCase,
} from "./use-cases/loan-mutations.use-case";

// Composition Root (Simple Dependency Injection)
const loanRepository = new LoanRepositoryImpl();

// Export Use Cases
export const getAllLoansUseCase = new GetAllLoansUseCase(loanRepository);
export const getLoanDetailsUseCase = new GetLoanDetailsUseCase(loanRepository);
export const getDashboardDataUseCase = new GetDashboardDataUseCase(
  loanRepository,
);
export const getLoanReportUseCase = new GetLoanReportUseCase(loanRepository);
export const createLoanUseCase = new CreateLoanUseCase(loanRepository);
export const reassignLoanUseCase = new ReassignLoanUseCase(loanRepository);
export const deleteLoanUseCase = new DeleteLoanUseCase(loanRepository);
export const deleteInstallmentUseCase = new DeleteInstallmentUseCase(
  loanRepository,
);
export const updateLoanInfoUseCase = new UpdateLoanInfoUseCase(loanRepository);
export const generateShareLinkUseCase = new GenerateShareLinkUseCase(loanRepository);

// Export Models
export * from "./models/loan.model";
export * from "./dto/loan.dto";
