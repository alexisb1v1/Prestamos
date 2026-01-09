'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import styles from './Sidebar.module.css';

const MENU_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { label: 'Préstamos', href: '/prestamos', icon: '💰' },
  { label: 'Cobradores', href: '/cobradores', icon: '👥' },
  { label: 'Configuración', href: '/configuracion', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className={styles.toggle}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Menu"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Backdrop for mobile */}
      <div
        className={`${styles.backdrop} ${isOpen ? styles.open : ''}`}
        onClick={() => setIsOpen(false)}
      />

      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.logo}>
          <div style={{ width: '32px', height: '32px', background: 'var(--color-primary)', borderRadius: '8px' }}></div>
          <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>PrestamosApp</span>
        </div>

        <nav className={styles.nav}>
          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                onClick={() => setIsOpen(false)} // Auto close on mobile click
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.footer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#334155' }}></div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>Admin User</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>admin@demo.com</div>
            </div>
          </div>
          <Link href="/login" style={{ marginTop: '1rem', display: 'block', color: 'var(--color-danger)', fontSize: '0.875rem' }}>
            Cerrar Sesión
          </Link>
        </div>
      </aside>
    </>
  );
}
