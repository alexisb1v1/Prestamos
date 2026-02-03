'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './Sidebar.module.css';
import { authService } from '@/lib/auth';
import { User } from '@/lib/types';
import { formatUserName } from '@/lib/utils';

// Define recursive type for menu items
type MenuItem = {
  label: string;
  href?: string;
  icon: string;
  children?: MenuItem[];
};

const MENU_ITEMS: MenuItem[] = [
  { label: 'Resumen', href: '/dashboard', icon: '🏠' },
  { label: 'Préstamos', href: '/prestamos', icon: '💰' },
  { label: 'Gastos', href: '/gastos', icon: '💸' },
  {
    label: 'Configuración',
    icon: '⚙️',
    children: [
      { label: 'Usuarios', href: '/cobradores', icon: '👥' },
      // { label: 'Reportes', href: '/reportes', icon: '📊' },
      // { label: 'Configuración', href: '/configuracion', icon: '⚙️' }
    ]
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  // State to track expanded menu items by label
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({ 'Configuración': true });

  useEffect(() => {
    setUser(authService.getUser());
  }, []);

  const handleLogout = () => {
    authService.logout();
    router.push('/login');
  };

  const toggleExpand = (label: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.label];

    // Check if any child is active to highlight parent
    const isChildActive = hasChildren && item.children!.some(child => pathname === child.href);

    const stylesForDepth = {
      paddingLeft: `${1 + depth * 0.75}rem`,
    };

    // If item has children, it's a toggle button. Otherwise it's a link.
    if (hasChildren) {
      return (
        <div key={item.label}>
          <button
            className={`${styles.navItem} ${isChildActive ? styles.active : ''}`}
            onClick={() => toggleExpand(item.label)}
            style={{
              ...stylesForDepth,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              color: isChildActive ? 'var(--color-primary)' : 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '0.95rem'
            }}
          >
            <span>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            <span style={{ fontSize: '0.8rem' }}>{isExpanded ? '▼' : '▶'}</span>
          </button>
          {isExpanded && (
            <div style={{ paddingLeft: '0.5rem' }}>
              {item.children!.map(child => renderMenuItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const isActive = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href!}
        className={`${styles.navItem} ${isActive ? styles.active : ''}`}
        onClick={() => setIsOpen(false)}
        style={{
          ...stylesForDepth,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
          backgroundColor: isActive ? 'var(--color-bg-subtle)' : 'transparent',
          textDecoration: 'none',
          borderRadius: 'var(--radius-md)',
          marginBottom: '0.25rem',
          fontWeight: isActive ? 500 : 400,
          transition: 'all 0.2s'
        }}
      >
        <span>{item.icon}</span>
        {item.label}
      </Link>
    );
  };

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
          {MENU_ITEMS.filter(item => {
            if (user?.profile === 'ADMIN' || user?.profile === 'OWNER') return true;
            // Non-admin users see Resumen, Préstamos, and Gastos
            return ['Resumen', 'Préstamos', 'Gastos'].includes(item.label);
          }).map((item) => renderMenuItem(item))}
        </nav>

        <div className={styles.footer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#334155' }}></div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{formatUserName(user)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user?.profile || 'Perfil'}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              marginTop: '1rem',
              display: 'block',
              width: '100%',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-danger)',
              fontSize: '0.875rem',
              padding: 0
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
