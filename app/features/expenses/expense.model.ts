export class ExpenseModel {
    constructor(
        public readonly id: string,
        public readonly description: string,
        public readonly amount: number,
        public readonly date: string,
        public readonly expenseDate: string,
        public readonly userId: string,
        public readonly user?: any
    ) {}

    // Lógica rica de dominio si fuera necesaria
    get formattedAmount(): string {
        return `S/ ${this.amount.toFixed(2)}`;
    }
}
