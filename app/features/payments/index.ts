import { PaymentRepositoryImpl } from './repositories/payment.repository.impl';
import { CreatePaymentUseCase } from './usecases/create-payment.usecase';
import { CreateInstallmentUseCase } from './usecases/create-installment.usecase';

// 1. Instanciar repositorios
const paymentRepository = new PaymentRepositoryImpl();

// 2. Instanciar Casos de Uso
const createPaymentUseCase = new CreatePaymentUseCase(paymentRepository);
const createInstallmentUseCase = new CreateInstallmentUseCase(paymentRepository);

// 3. Exportar DTOs y Modelos útiles
export * from './payment.dto';
export * from './payment.model';

// 4. Exportar Casos de Uso
export {
    createPaymentUseCase,
    createInstallmentUseCase
};
