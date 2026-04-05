export interface LoanDto {
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
    phone?: string;
    personId?: string;
    collectorId?: string;
    companyId?: string;
}

export interface CreateLoanRequestDto {
    idPeople: number;
    amount: number;
    userId: number;
    address: string;
    phone: string;
    days: number;
}

export interface UpdateLoanInfoRequestDto {
    phone: string;
    address: string;
}

export interface InstallmentDetailDto {
    id: string;
    date: string;
    amount: number;
    status: string;
    registeredBy: string;
    registeredByUserId: string;
}

export interface LoanDetailsDto {
    startDate: string;
    endDate: string;
    installments: InstallmentDetailDto[];
}

export interface DashboardLoanDto extends LoanDto {
    remainingAmount: number;
    paidToday: number;
}

export interface DashboardDataDto {
    totalLentToday: number;
    collectedToday: number;
    activeClients: number;
    pendingLoans: DashboardLoanDto[];
    detailCollectedToday: {
        yape: number;
        efectivo: number;
    };
    totalExpensesToday: number;
    thermometer?: number;
}

export interface ReportPaymentDto {
    cliente: string;
    monto: number;
    estado: 'COBRADO' | 'PENDIENTE';
    metodo: string;
}

export interface ReportDayDto {
    fecha: string;
    pagos: ReportPaymentDto[];
    gastos: any[];
}

export interface ReportDataDto {
    summary: {
        totalGasto: number;
        totalCobradoEfectivo: number;
        totalCobradoYape: number;
        totalCobrado: number;
        totalPrestado: number;
    };
    pagosPorDia: ReportDayDto[];
}
