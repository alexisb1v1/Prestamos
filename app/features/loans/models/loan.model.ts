export interface Loan {
    id: string;
    startDate: string;
    endDate: string;
    amount: number;
    interest: number;
    fee: number;
    days: number;
    createdAt: string;
    status: string;
    address: string;
    documentNumber: string;
    clientName: string;
    collectorName: string;
    paidToday: number;
    inIntervalPayment: number;
    remainingAmount?: number;
    personId?: string;
    collectorId?: string;
    companyId?: string;
}

export interface CreateLoan {
    idPeople: string;
    amount: number;
    userId: string;
    address: string;
    days: number;
}

export interface InstallmentDetail {
    id: string;
    date: string;
    amount: number;
    status: string;
    registeredBy: string;
    registeredByUserId: string;
}

export interface LoanDetails {
    startDate: string;
    endDate: string;
    installments: InstallmentDetail[];
}

export interface DashboardLoan extends Loan {
    remainingAmount: number;
    paidToday: number;
}

export interface DashboardData {
    totalLentToday: number;
    collectedToday: number;
    activeClients: number;
    pendingLoans: DashboardLoan[];
    detailCollectedToday: {
        yape: number;
        efectivo: number;
    };
    totalExpensesToday: number;
    thermometer?: number;
}

export interface ReportPayment {
    cliente: string;
    monto: number;
    estado: 'COBRADO' | 'PENDIENTE';
    metodo: string;
}

export interface ReportDay {
    fecha: string;
    pagos: ReportPayment[];
    gastos: any[];
}

export interface ReportData {
    summary: {
        totalGasto: number;
        totalCobradoEfectivo: number;
        totalCobradoYape: number;
        totalCobrado: number;
        totalPrestado: number;
    };
    pagosPorDia: ReportDay[];
}
