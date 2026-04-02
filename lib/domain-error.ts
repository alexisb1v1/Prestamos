import { getFriendlyErrorMessage } from './error-mapping';

/**
 * Clase base para errores de dominio en el frontend.
 * Siguiendo el estándar definido en Clean Architecture Frontend Pro.
 */
export class DomainError extends Error {
    constructor(
        public readonly message: string,
        public readonly code: string,
        public readonly statusCode?: number,
        public readonly timestamp?: string,
        public readonly originalError?: unknown
    ) {
        super(message);
        this.name = 'DomainError';
        // Asegura que el prototipo sea correcto en entornos de compilación modernos
        Object.setPrototypeOf(this, DomainError.prototype);
    }

    /**
     * Factory method para errores de red genéricos
     */
    static networkError(error?: unknown): DomainError {
        return new DomainError(
            'Fallo de conexión con el servidor',
            'NETWORK_ERROR',
            503,
            new Date().toISOString(),
            error
        );
    }

    /**
     * Factory method para errores inesperados
     */
    static unexpectedError(message: string, error?: unknown): DomainError {
        return new DomainError(message, 'UNEXPECTED_ERROR', 500, new Date().toISOString(), error);
    }

    /**
     * Retorna un mensaje amigable al usuario basado en el diccionario de traducción.
     * @param module - El nombre del módulo (ej: 'loans', 'people')
     * @param locale - Idioma opcional (por defecto 'es')
     */
    public toFriendlyMessage(module: string = 'common', locale: string = 'es'): string {
        const friendly = getFriendlyErrorMessage(this.code, module, locale);
        return friendly || this.message;
    }
}
