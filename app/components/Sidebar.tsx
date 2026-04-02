'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  Users, 
  ReceiptText, 
  Settings, 
  ChevronDown, 
  ChevronRight,
  LogOut,
  X,
  Menu,
  BarChart3,
  Building2,
  Users2
} from 'lucide-react';
import styles from './Sidebar.module.css';
import { usePermissions } from '@/hooks/usePermissions';
import { authService } from '@/lib/auth';
import { formatUserName } from '@/lib/utils';

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const { user, isAdmin, isOwner, canManageUsers, canManageCompanies, canViewReports } = usePermissions();
    
    // State to track if "Configuración" is expanded
    // Set to true by default for administrators as requested
    const [configExpanded, setConfigExpanded] = useState(false);

    useEffect(() => {
        if (isAdmin || isOwner) {
            setConfigExpanded(true);
        }
    }, [isAdmin, isOwner]);

    const handleLogout = () => {
        authService.logout();
        router.push('/login');
    };

    // Helper to get initials for avatar
    const getInitials = (name?: string) => {
        if (!name) return '??';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const isActive = (href: string) => pathname === href;

    return (
        <>
            {/* Mobile Toggle Button (Burger) - Hidden when sidebar is open */}
            {!isOpen && (
                <button
                    className={styles.toggle}
                    onClick={() => setIsOpen(true)}
                    aria-label="Abrir Menú"
                >
                    <Menu size={20} />
                </button>
            )}

            {/* Backdrop for mobile */}
            <div
                className={`${styles.backdrop} ${isOpen ? styles.open : ''}`}
                onClick={() => setIsOpen(false)}
            />

            <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
                {/* Close Button for Mobile */}
                <button 
                    className={styles.closeButton}
                    onClick={() => setIsOpen(false)}
                    aria-label="Cerrar Menú"
                >
                    <X size={18} strokeWidth={2.5} />
                </button>

                {/* Logo Section */}
                <div className={styles.logo}>
                    <div className={styles.logoMain}>
                        Neo<span className={styles.logoAccent}>Cobros</span>
                    </div>
                    <div className={styles.logoSub}>SAAS DE COBRANZA</div>
                </div>

                <nav className={styles.nav}>
                    <div className={styles.groupLabel}>PRINCIPAL</div>
                    
                    <Link 
                        href="/dashboard" 
                        className={`${styles.navItem} ${isActive('/dashboard') ? styles.active : ''}`}
                        onClick={() => setIsOpen(false)}
                    >
                        <LayoutDashboard size={20} strokeWidth={isActive('/dashboard') ? 2.5 : 2} />
                        Resumen
                    </Link>

                    <Link 
                        href="/prestamos" 
                        className={`${styles.navItem} ${isActive('/prestamos') ? styles.active : ''}`}
                        onClick={() => setIsOpen(false)}
                    >
                        <Wallet size={20} strokeWidth={isActive('/prestamos') ? 2.5 : 2} />
                        Préstamos
                    </Link>

                    <Link 
                        href="/gastos" 
                        className={`${styles.navItem} ${isActive('/gastos') ? styles.active : ''}`}
                        onClick={() => setIsOpen(false)}
                    >
                        <ReceiptText size={20} strokeWidth={isActive('/gastos') ? 2.5 : 2} />
                        Gastos
                    </Link>

                    {/* Administration Section - Only for Admin/Owner */}
                    {(isAdmin || isOwner) && (
                        <>
                            <div className={styles.groupLabel}>ADMINISTRACIÓN</div>
                            
                            <div>
                                <button
                                    className={`${styles.accordionHeader} ${configExpanded ? styles.active : ''}`}
                                    onClick={() => setConfigExpanded(!configExpanded)}
                                >
                                    <Settings size={20} strokeWidth={configExpanded ? 2.5 : 2} />
                                    <span style={{ flex: 1, textAlign: 'left' }}>Configuración</span>
                                    {configExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                                
                                {configExpanded && (
                                    <div className={styles.accordionContent}>
                                        {canManageUsers && (
                                            <Link 
                                                href="/cobradores" 
                                                className={`${styles.subItem} ${isActive('/cobradores') ? styles.active : ''}`}
                                                onClick={() => setIsOpen(false)}
                                            >
                                                Usuarios
                                            </Link>
                                        )}
                                        {canManageCompanies && (
                                            <Link 
                                                href="/empresas" 
                                                className={`${styles.subItem} ${isActive('/empresas') ? styles.active : ''}`}
                                                onClick={() => setIsOpen(false)}
                                            >
                                                Empresas
                                            </Link>
                                        )}
                                        {canViewReports && (
                                            <Link 
                                                href="/reportes" 
                                                className={`${styles.subItem} ${isActive('/reportes') ? styles.active : ''}`}
                                                onClick={() => setIsOpen(false)}
                                            >
                                                Reportes
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </nav>

                <div className={styles.footer}>
                    <div className={styles.profileCard}>
                        <div className={styles.avatar}>
                            {getInitials(user?.username)}
                        </div>
                        <div className={styles.profileInfo}>
                            <div className={styles.userName}>{formatUserName(user)}</div>
                            <div className={styles.userRole}>
                                {isOwner ? 'OWNER / ADMIN' : isAdmin ? 'ADMIN' : 'COBRADOR'}
                            </div>
                        </div>
                    </div>

                    <button className={styles.logoutButton} onClick={handleLogout}>
                        <LogOut size={20} strokeWidth={2.5} />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>
        </>
    );
}
