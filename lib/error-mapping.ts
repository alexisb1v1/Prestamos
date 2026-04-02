import { ErrorResponse } from './types';

/**
 * Interface para el mapeo de errores por módulo.
 * Estructura: [idioma][módulo][código_error] = mensaje
 */
export type ErrorMapping = Record<string, Record<string, Record<string, string>>>;

export const ERROR_TRANSLATIONS: ErrorMapping = {
    es: {
        loans: {
            'ALREADY_EXISTS': 'El cliente ya tiene un préstamo activo.',
            'INVALID_INPUT': 'Días mínimos son 24 días.',
            'NOT_FOUND': 'Préstamo no encontrado.',
        },
        installments: {
            'INVALID_INPUT': 'La fecha del abono debe ser posterior a la fecha de inicio del préstamo.',
            'NOT_FOUND': 'Préstamo o cuota no válida.',
            'ALREADY_EXISTS': 'Ya existe un abono registrado para este periodo.',
        },
        people: {
            'ALREADY_EXISTS': 'Ya existe un cliente registrado con este documento.',
            'NOT_FOUND': 'Cliente no encontrado.',
        },
        users: {
            'ALREADY_EXISTS': 'Este nombre de usuario ya está en uso.',
            'UNAUTHORIZED': 'No tienes permisos para realizar esta acción.',
            'FORBIDDEN': 'Acceso denegado: Empresa o usuario inactivo.',
        },
        auth: {
            'UNAUTHORIZED': 'Usuario o contraseña incorrectos.',
            'FORBIDDEN': 'Tu cuenta o empresa se encuentra inactiva. Contacta al administrador.',
        },
        common: {
            'UNEXPECTED_ERROR': 'Ocurrió un error inesperado. Inténtalo de nuevo.',
            'NETWORK_ERROR': 'No se pudo conectar con el servidor. Revisa tu conexión.',
            'INVALID_INPUT': 'Los datos enviados no son válidos.',
        }
    },
    // Preparado para otros idiomas en el futuro
    en: {
        common: {
            'UNEXPECTED_ERROR': 'An unexpected error occurred.',
            'NETWORK_ERROR': 'Connection failed.',
        }
    }
};

/**
 * Obtiene un mensaje de error amigable basado en el código de error y el módulo.
 * 
 * @param errorCode - Código de error (ej: 'ALREADY_EXISTS')
 * @param module - Módulo del sistema (ej: 'loans')
 * @param locale - Idioma (por defecto 'es')
 * @returns Mensaje traducido o mensaje genérico
 */
export function getFriendlyErrorMessage(
    errorCode: string, 
    module: string = 'common', 
    locale: string = 'es'
): string | undefined {
    const languageMap = ERROR_TRANSLATIONS[locale] || ERROR_TRANSLATIONS['es'];
    
    // Intenta buscar en el módulo específico
    if (languageMap[module] && languageMap[module][errorCode]) {
        return languageMap[module][errorCode];
    }
    
    // Fallback al módulo común
    if (languageMap['common'] && languageMap['common'][errorCode]) {
        return languageMap['common'][errorCode];
    }

    return undefined;
}
