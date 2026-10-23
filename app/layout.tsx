import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./components.css";
import InstallPrompt from "./components/InstallPrompt";

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
  const umamiUrl =
    process.env.UMAMI_URL ||
    process.env.NEXT_PUBLIC_UMAMI_URL;
  const umamiWebsiteId =
    process.env.UMAMI_WEBSITE_ID ||
    process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

  return (
    <html lang="es">
      <head>
        {umamiUrl && umamiWebsiteId && (
          <script
            defer
            src={`${umamiUrl.replace(/\/+$/, "")}/script.js`}
            data-website-id={umamiWebsiteId}
          />
        )}
      </head>
      <body>
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
