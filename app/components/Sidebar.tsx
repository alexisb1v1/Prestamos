'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './Sidebar.module.css';
import { usePermissions } from '@/hooks/usePermissions';
import { authService } from '@/lib/auth';
import { User } from '@/lib/types';
import { formatUserName } from '@/lib/utils';

// Define recursive type for menu items
type MenuItem = {
  label: string;
  href?: string;
  icon: string;
  permission?: keyof ReturnType<typeof usePermissions>;
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
      { label: 'Usuarios', href: '/cobradores', icon: '👥', permission: 'canManageUsers' },
      { label: 'Empresas', href: '/empresas', icon: '🏢', permission: 'canManageCompanies' },
      { label: 'Reportes', href: '/reportes', icon: '📊', permission: 'canViewReports' },
    ]
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const permissions = usePermissions();
  const { user } = permissions;
  // State to track expanded menu items by label
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({ 'Configuración': true });

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
    // Check permission for the item itself
    if (item.permission && !(permissions as any)[item.permission]) {
      return null;
    }

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
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '0.95rem'
            }}
          >
            <span>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>{isExpanded ? '▼' : '▶'}</span>
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
          marginBottom: '0.25rem',
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
          <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, var(--color-primary), #6366f1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)' }}>💰</div>
          <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'white', letterSpacing: '-0.025em' }}>Neo<span style={{ color: 'var(--color-accent)' }}>Cobros</span></span>
        </div>

        <nav className={styles.nav}>
          {MENU_ITEMS.map((item) => renderMenuItem(item))}
        </nav>

        <div className={styles.footer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20" color="#cbd5e1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'white' }}>{formatUserName(user)}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '500' }}>{user?.profile || 'Perfil'}</div>
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
