'use client';

import { useState, useEffect } from 'react';
import { expenseService } from '@/lib/expenseService';
import { userService } from '@/lib/userService';
import { authService } from '@/lib/auth';
import { Expense, User } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // User filter states (similar to loans page)
    const [collectors, setCollectors] = useState<User[]>([]);
    const [selectedCollector, setSelectedCollector] = useState('');

    // Mobile detection
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const user = authService.getUser();
        if (user) {
            setCurrentUser(user);
            setIsAdmin(user.profile === 'ADMIN' || user.profile === 'OWNER');

            // Load collectors only if ADMIN
            if (user.profile === 'ADMIN' || user.profile === 'OWNER') {
                loadCollectors();
            }

            loadExpenses(user);
        }
    }, []); // Initial load

    // Removed the useEffect that reloads expenses on date/selectedCollector change
    // because now we have a manual search button.

    const loadExpenses = async (userContext?: User | null) => {
        const user = userContext || currentUser;
        try {
            setLoading(true);

            let userIdParam: string | undefined = selectedCollector || undefined;

            // If user is COBRADOR, force their ID
            if (user?.profile === 'COBRADOR') {
                userIdParam = String(user.id);
            }

            const data = await expenseService.getAll(date, userIdParam);
            setExpenses(data);
        } catch (error) {
            console.error('Error loading expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadCollectors = async () => {
        try {
            const allUsers = await userService.getAll();
            const activeCollectors = allUsers.filter(u =>
                u.profile === 'COBRADOR' && u.status === 'ACTIVE'
            );
            setCollectors(activeCollectors);
        } catch (err) {
            console.error('Error loading collectors:', err);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadExpenses();
    };

    const handleClearFilters = () => {
        setDate(new Date().toISOString().split('T')[0]);
        setSelectedCollector('');
        setTimeout(() => loadExpenses(), 0);
    };

    return (
        <div style={{ position: 'relative' }}>
            {/* Header Section */}
            <div style={{
                position: isMobile ? 'sticky' : 'static',
                top: isMobile ? '0' : 'auto',
                zIndex: isMobile ? 30 : 'auto',
                backgroundColor: isMobile ? 'var(--bg-app)' : 'transparent',
                margin: isMobile ? '0 -2rem 1rem -2rem' : '0 0 2rem 0',
                padding: isMobile ? '0.75rem 2rem 1rem 2rem' : '0',
                borderBottom: isMobile ? '1px solid var(--border-color)' : 'none',
                boxShadow: isMobile ? 'var(--shadow-md)' : 'none',
                transition: 'all 0.3s ease'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: isMobile ? '1rem' : '2rem'
                }}>
                    <div>
                        <h1 style={{ fontSize: isMobile ? '1.5rem' : '1.875rem', fontWeight: 'bold' }}>Gastos</h1>
                    </div>
                </div>

                {/* Filters - Part of Sticky Header */}
                <div className={isMobile ? "" : "card"} style={{
                    marginBottom: isMobile ? '0' : '2rem',
                    padding: isMobile ? '0' : '1.5rem',
                    backgroundColor: isMobile ? 'transparent' : 'var(--bg-card)',
                    border: isMobile ? 'none' : '1px solid var(--border-color)',
                    boxShadow: isMobile ? 'none' : 'var(--shadow-sm)'
                }}>
                    <form onSubmit={handleSearch} style={{
                        display: 'flex',
                        gap: '1rem',
                        flexWrap: 'wrap',
                        alignItems: 'center'
                    }}>
                        {/* Date Selector */}
                        <div style={{ width: isMobile ? '100%' : 'auto' }}>
                            <input
                                type="date"
                                className="input"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                style={{
                                    width: '100%',
                                    maxWidth: isMobile ? 'none' : '200px',
                                    backgroundColor: isMobile ? 'var(--bg-card)' : 'var(--bg-app)'
                                }}
                            />
                        </div>

                        {/* User selector - Only show for ADMIN */}
                        {(currentUser?.profile === 'ADMIN' || currentUser?.profile === 'OWNER') && (
                            <div style={{ width: isMobile ? '100%' : 'auto' }}>
                                <select
                                    className="input"
                                    value={selectedCollector}
                                    onChange={(e) => setSelectedCollector(e.target.value)}
                                    style={{
                                        width: '100%',
                                        maxWidth: isMobile ? 'none' : '250px',
                                        backgroundColor: isMobile ? 'var(--bg-card)' : 'var(--bg-app)'
                                    }}
                                >
                                    <option value="">Todos los cobradores</option>
                                    {collectors.map(collector => (
                                        <option key={collector.id} value={collector.id}>
                                            {collector.username} ({collector.firstName} {collector.lastName})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem', width: isMobile ? '100%' : 'auto' }}>
                            <button type="submit" className="btn btn-primary" style={{ flex: isMobile ? 1 : 'initial' }}>
                                Buscar
                            </button>
                            {(date !== new Date().toISOString().split('T')[0] || selectedCollector) && (
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={handleClearFilters}
                                    style={{
                                        flex: isMobile ? 1 : 'initial',
                                        backgroundColor: 'transparent',
                                        color: 'var(--text-secondary)',
                                        border: '1px solid var(--border-color)'
                                    }}
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Total Gastos - Always visible in sticky header */}
                {!loading && expenses.length > 0 && (
                    <div style={{
                        marginTop: isMobile ? '1rem' : '1.5rem',
                        marginBottom: isMobile ? '0.5rem' : '0',
                        padding: '1rem',
                        borderTop: '2px solid #e2e8f0',
                        borderBottom: isMobile ? '2px solid #e2e8f0' : 'none',
                        backgroundColor: isMobile ? 'var(--bg-card)' : 'transparent',
                        borderRadius: isMobile ? '0.5rem' : '0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: 'bold',
                        fontSize: '1.125rem'
                    }}>
                        <span>Total Gastos</span>
                        <span style={{ color: '#ef4444', fontSize: '1.25rem' }}>
                            S/ {expenses.reduce((sum, item) => sum + Number(item.amount), 0).toFixed(2)}
                        </span>
                    </div>
                )}
            </div>

            {/* Results Section */}
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando gastos...</div>
                ) : expenses.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem',
                        backgroundColor: 'white',
                        borderRadius: '1rem',
                        color: '#64748b',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        No hay gastos registrados para esta fecha.
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gap: '1rem'
                    }}>
                        {expenses.map((expense) => (
                            <div key={expense.id} style={{
                                backgroundColor: 'white',
                                padding: '1.5rem',
                                borderRadius: '1rem',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <h3 style={{ fontWeight: '600', fontSize: '1.125rem', color: '#0f172a', marginBottom: '0.25rem' }}>
                                        {expense.description}
                                    </h3>
                                    <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                                        {format(new Date(expense.expenseDate || date), "dd/MM/yyyy HH:mm:ss", { locale: es })}
                                        {isAdmin && expense.user && (
                                            <span> • Por: <span style={{ color: '#3b82f6' }}>{expense.user.username || expense.userId}</span></span>
                                        )}
                                    </p>
                                </div>
                                <div style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 'bold',
                                    color: '#ef4444'
                                }}>
                                    - S/ {Number(expense.amount).toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
