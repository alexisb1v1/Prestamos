/**
 * Servicio Centralizado de Analítica y Telemetría con Umami (Self-hosted)
 * Permite monitorear el uso de opciones, botones y links compartidos,
 * inyectando automáticamente el tenant, rol y tipo de dispositivo.
 */

/**
 * Obtiene el tenant actual de la aplicación.
 * Evalúa el subdominio del hostname, el usuario en cache o la variable de desarrollo.
 */
export function getAnalyticsTenant(): string {
  if (typeof window === "undefined") return "server";

  try {
    const hostname = window.location.hostname;
    const parts = hostname.split(".");
    const isLocalWithSub = hostname.endsWith(".localhost") && parts.length >= 2;

    if (hostname === "localhost" || parts[0] === "central" || (!isLocalWithSub && parts.length < 3)) {
      const devTenant = process.env.NEXT_PUBLIC_DEV_TENANT;
      if (devTenant && devTenant !== "central") {
        return devTenant;
      }
    } else {
      return parts[0];
    }

    const userStr = localStorage.getItem("auth_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user?.companyName) return user.companyName.toLowerCase().replace(/\s+/g, "_");
    }
  } catch {
    // Ignorar fallos de parsing
  }

  return "central";
}

/**
 * Obtiene el rol del usuario autenticado (sin exponer PII).
 */
export function getAnalyticsRole(): string {
  if (typeof window === "undefined") return "public";

  try {
    const userStr = localStorage.getItem("auth_user");
    if (!userStr) return "public";
    const user = JSON.parse(userStr);
    return user.role || user.profile || "authenticated";
  } catch {
    return "unknown";
  }
}

/**
 * Detecta si el cliente está operando desde un dispositivo móvil o escritorio.
 */
export function getAnalyticsDevice(): "mobile" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  return window.innerWidth < 768 ? "mobile" : "desktop";
}

/**
 * Registra un evento personalizado en Umami enriquecido con metadatos de tenant y rol.
 * 
 * @param eventName Nombre representativo de la acción (ej: 'click_compartir_link', 'menu_gastos')
 * @param eventData Datos complementarios opcionales (IDs numéricos, tipo de vista, etc. CERO datos PII)
 */
export function trackEvent(eventName: string, eventData: Record<string, any> = {}): void {
  if (typeof window === "undefined") return;

  try {
    const umami = (window as any).umami;
    if (!umami || typeof umami.track !== "function") return;

    const tenant = getAnalyticsTenant();
    const role = getAnalyticsRole();
    const device = getAnalyticsDevice();

    umami.track(eventName, {
      tenant,
      role,
      device,
      ...eventData,
    });
  } catch {
    // La telemetría nunca debe romper el flujo de la aplicación
  }
}

/**
 * Identifica la sesión en Umami asociando tenant y rol (si la versión de Umami lo soporta).
 */
export function identifyAnalyticsSession(sessionData: Record<string, any> = {}): void {
  if (typeof window === "undefined") return;

  try {
    const umami = (window as any).umami;
    if (!umami || typeof umami.identify !== "function") return;

    const tenant = getAnalyticsTenant();
    const role = getAnalyticsRole();

    umami.identify({
      tenant,
      role,
      ...sessionData,
    });
  } catch {
    // Fallback silencioso
  }
}
