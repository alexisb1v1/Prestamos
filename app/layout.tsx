import type { Metadata, Viewport } from 'next';
import './globals.css';
import InstallPrompt from './components/InstallPrompt';

export const metadata: Metadata = {
  title: 'Prestamos App',
  description: 'Sistema de Gestion de Prestamos',
  applicationName: 'Prestamos App',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Prestamos App',
  },
  manifest: '/manifest.json',
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
