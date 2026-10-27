import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import "./components.css";
import InstallPrompt from "./components/InstallPrompt";
import TenantThemeApplier from "./components/TenantThemeApplier";

export const metadata: Metadata = {
  title: "NeoCobros",
  description: "Sistema de Gestión de Recaudación y Préstamos",
  applicationName: "NeoCobros",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NeoCobros",
  },
  manifest: "/manifest.json?v=2",
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL;
  const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          id="theme-initializer"
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var b = localStorage.getItem("app_branding");
                var branding = b ? JSON.parse(b) : null;
                if (!branding) {
                  var cs = localStorage.getItem("company_settings");
                  if (cs) {
                    var parsed = JSON.parse(cs);
                    branding = parsed.branding || null;
                  }
                }
                if (!branding) {
                  var host = window.location.hostname;
                  var parts = host.split(".");
                  var sub = parts[0];
                  var tc = localStorage.getItem("tenant_name_" + sub);
                  if (tc) {
                    var tParsed = JSON.parse(tc);
                    branding = tParsed.branding || null;
                  }
                }
                if (branding && branding.primaryColor) {
                  var root = document.documentElement.style;
                  root.setProperty("--color-primary", branding.primaryColor);
                  root.setProperty("--color-primary-hover", branding.primaryColor);
                  if (branding.secondaryColor) {
                    root.setProperty("--color-secondary", branding.secondaryColor);
                  }
                }
              } catch(e) {}
            })();`,
          }}
        />
      </head>
      <body>
        <TenantThemeApplier />
        {children}
        <InstallPrompt />
        {umamiUrl && umamiWebsiteId && (
          <Script
            src={`${umamiUrl.replace(/\/+$/, "")}/script.js`}
            data-website-id={umamiWebsiteId}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
