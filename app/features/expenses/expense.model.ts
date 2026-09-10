import { User } from "@/app/features/users";

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  expenseDate: string;
  userId: string;
  user?: User;
}
