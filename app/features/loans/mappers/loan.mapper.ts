import {
    LoanDto,
    CreateLoanRequestDto,
    InstallmentDetailDto,
    LoanDetailsDto,
    DashboardDataDto,
    ReportDataDto,
    DashboardLoanDto
} from '../dto/loan.dto';
import {
    Loan,
    CreateLoan,
    InstallmentDetail,
    LoanDetails,
    DashboardData,
    ReportData,
    DashboardLoan
} from '../models/loan.model';

export class LoanMapper {
    static toDomain(dto: LoanDto): Loan {
        if (!dto) {
            // Retornar un objeto mínimo válido para evitar errores de lectura de propiedades
            return {} as Loan;
        }
        return {
            id: dto.id,
            startDate: dto.startDate,
            endDate: dto.endDate,
            amount: dto.amount,
            interest: dto.interest,
            fee: dto.fee,
            days: dto.days,
            createdAt: dto.createdAt,
            status: dto.status,
            address: dto.address,
            documentNumber: dto.documentNumber,
            clientName: dto.clientName,
            collectorName: dto.collectorName,
            paidToday: dto.paidToday,
            inIntervalPayment: dto.inIntervalPayment,
            remainingAmount: dto.remainingAmount,
            phone: dto.phone,
            personId: dto.personId,
            collectorId: dto.collectorId,
            companyId: dto.companyId,
        };
    }

    static toDashboardDomain(dto: DashboardLoanDto): DashboardLoan {
        return {
            ...this.toDomain(dto),
            remainingAmount: dto.remainingAmount,
            paidToday: dto.paidToday,
        };
    }

    static toDashboardDataDomain(dto: DashboardDataDto): DashboardData {
        return {
            totalLentToday: dto.totalLentToday,
            collectedToday: dto.collectedToday,
            activeClients: dto.activeClients,
            pendingLoans: dto.pendingLoans ? dto.pendingLoans.map(loan => this.toDashboardDomain(loan)) : [],
            detailCollectedToday: {
                yape: dto.detailCollectedToday?.yape || 0,
                efectivo: dto.detailCollectedToday?.efectivo || 0,
            },
            totalExpensesToday: dto.totalExpensesToday,
            thermometer: dto.thermometer,
        };
    }

    static toInstallmentDetailDomain(dto: InstallmentDetailDto): InstallmentDetail {
        return {
            id: dto.id,
            date: dto.date,
            amount: dto.amount,
            status: dto.status,
            registeredBy: dto.registeredBy,
            registeredByUserId: dto.registeredByUserId,
        };
    }

    static toLoanDetailsDomain(dto: LoanDetailsDto): LoanDetails {
        return {
            startDate: dto.startDate,
            endDate: dto.endDate,
            installments: dto.installments ? dto.installments.map(i => this.toInstallmentDetailDomain(i)) : [],
        };
    }

    static toReportDataDomain(dto: ReportDataDto): ReportData {
        return {
            summary: {
                totalGasto: dto.summary.totalGasto,
                totalCobradoEfectivo: dto.summary.totalCobradoEfectivo,
                totalCobradoYape: dto.summary.totalCobradoYape,
                totalCobrado: dto.summary.totalCobrado,
                totalPrestado: dto.summary.totalPrestado,
            },
            pagosPorDia: dto.pagosPorDia ? dto.pagosPorDia.map(day => ({
                fecha: day.fecha,
                gastos: day.gastos || [],
                pagos: day.pagos ? day.pagos.map(payment => ({
                    cliente: payment.cliente,
                    monto: payment.monto,
                    estado: payment.estado,
                    metodo: payment.metodo,
                })) : [],
            })) : [],
        };
    }

    static toCreateDto(domain: CreateLoan): CreateLoanRequestDto {
        return {
            idPeople: domain.idPeople,
            amount: domain.amount,
            userId: domain.userId,
            address: domain.address,
            phone: domain.phone,
            days: domain.days,
        };
    }
}
