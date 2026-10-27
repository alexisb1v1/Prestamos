"use client";

import { useEffect } from "react";
import { CompanyRepositoryImpl } from "@/app/features/companies/repositories/company.repository.impl";
import { authService } from "@/lib/auth";

const companyRepo = new CompanyRepositoryImpl();

export interface BrandingConfig {
  primaryColor?: string;
  secondaryColor?: string;
  iconUrl?: string;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  primaryColor: "#4147eb",
  secondaryColor: "#10b981",
  iconUrl: "/icons/icon-192x192.png",
};

export function applyTenantTheme(branding?: BrandingConfig) {
  const primary = branding?.primaryColor || DEFAULT_BRANDING.primaryColor!;
  const secondary = branding?.secondaryColor || DEFAULT_BRANDING.secondaryColor!;
  const icon = branding?.iconUrl || DEFAULT_BRANDING.iconUrl!;

  // 1. Inyectar variables CSS en el elemento raíz
  document.documentElement.style.setProperty("--color-primary", primary);
  document.documentElement.style.setProperty("--color-primary-hover", primary);
  document.documentElement.style.setProperty("--color-secondary", secondary);

  // 2. Inyectar barra de estado nativa en Mobile (Android / Chrome / iOS)
  let themeMeta = document.querySelector("meta[name='theme-color']") as HTMLMetaElement;
  if (!themeMeta) {
    themeMeta = document.createElement("meta");
    themeMeta.name = "theme-color";
    document.getElementsByTagName("head")[0].appendChild(themeMeta);
  }
  themeMeta.content = primary;

  // 3. Inyectar Favicon dinámico de la pestaña
  let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
  if (!link) {
    link = document.createElement("link");
    link.type = "image/x-icon";
    link.rel = "shortcut icon";
    document.getElementsByTagName("head")[0].appendChild(link);
  }
  link.href = icon;

  // 4. Inyectar Ícono para PWA en Pantalla de Inicio de iOS (Apple Touch Icon)
  let appleIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
  if (!appleIcon) {
    appleIcon = document.createElement("link");
    appleIcon.rel = "apple-touch-icon";
    document.getElementsByTagName("head")[0].appendChild(appleIcon);
  }
  appleIcon.href = icon;
}

export default function TenantThemeApplier() {
  useEffect(() => {
    const loadSettings = () => {
      // 1. Intentar cargar desde caché local para renderizado instantáneo
      try {
        const stored = localStorage.getItem("company_settings");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.branding) {
            applyTenantTheme(parsed.branding);
            // Si además no está autenticado, ya no hay nada más que consultar
            if (!authService.isAuthenticated()) {
              return;
            }
          }
        }
      } catch {}

      // Si no hay usuario autenticado (ej. en la pantalla de login), no consultar my-company para evitar 401
      if (!authService.isAuthenticated()) {
        return;
      }

      // 2. Consultar políticas frescas al backend para el usuario autenticado
      companyRepo.getMyCompany().match(
        (comp) => {
          if (comp?.settings?.branding) {
            try {
              localStorage.setItem("company_settings", JSON.stringify(comp.settings));
              localStorage.setItem("app_branding", JSON.stringify(comp.settings.branding));
            } catch {}
            applyTenantTheme(comp.settings.branding);
          } else {
            applyTenantTheme(DEFAULT_BRANDING);
          }
        },
        () => {
          // Si hay fallo de red, aplicar fallback
          applyTenantTheme(DEFAULT_BRANDING);
        },
      );
    };

    loadSettings();
    window.addEventListener("company_theme_updated", loadSettings);
    return () => window.removeEventListener("company_theme_updated", loadSettings);
  }, []);

  return null;
}
