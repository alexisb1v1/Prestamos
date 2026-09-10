
/**
 * Interface para el mapeo de errores por módulo.
 * Estructura: [idioma][módulo][código_error] = mensaje
 */
export type ErrorMapping = Record<string, Record<string, Record<string, string>>>;

export const ERROR_TRANSLATIONS: ErrorMapping = {
    es: {
        loans: {
            'LOA_001': 'El préstamo solicitado no existe.',
            'LOA_002': 'El cliente ya tiene un préstamo activo en curso.',
            'LOA_003': 'El plazo solicitado no cumple con el mínimo requerido.',
            'LOA_005': 'La cuota o pago no fue encontrado.',
        },
        installments: {
            'LOA_004': 'El préstamo no puede aceptar pagos en la fecha actual.',
            'LOA_005': 'La cuota o pago no fue encontrado.',
        },
        people: {
            'USR_004': 'La persona ya está registrada con ese documento.',
            'USR_002': 'La ficha personal no existe.',
        },
        users: {
            'USR_001': 'El usuario no existe.',
            'USR_003': 'El nombre de usuario ya está en uso.',
        },
        companies: {
            'COM_001': 'La empresa solicitada no existe.',
            'COM_002': 'La empresa se encuentra inactiva o bloqueada.',
        },
        expenses: {
            'EXP_001': 'El gasto solicitado no existe.',
        },
        auth: {
            'GEN_003': 'Usuario o contraseña incorrectos.',
            'GEN_004': 'Tu cuenta o empresa se encuentra inactiva. Contacta al administrador.',
        },
        common: {
            'GEN_001': 'Ocurrió un error inesperado en el servidor.',
            'GEN_002': 'Los datos ingresados son inválidos o están incompletos.',
            'GEN_003': 'No autorizado para realizar esta acción.',
            'GEN_004': 'No tienes permisos suficientes.',
            'GEN_005': 'El recurso solicitado no fue encontrado.',
            'NETWORK_ERROR': 'No se pudo conectar con el servidor. Revisa tu conexión.',
        }
    },
    en: {
        common: {
            'GEN_001': 'An unexpected server error occurred.',
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
