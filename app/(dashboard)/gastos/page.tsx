'use client';

import { useState, useEffect } from 'react';
import { expenseService } from '@/lib/expenseService';
import { authService } from '@/lib/auth';
import { Expense } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const user = authService.getUser();
        if (user) {
            setIsAdmin(user.profile === 'ADMIN' || user.profile === 'OWNER');
            loadExpenses();
        }
    }, [date]); // Reload when date changes

    const loadExpenses = async () => {
        try {
            setLoading(true);
            const user = authService.getUser();

            // If admin, we fetch all (userId undefined). If cobrador, we usually simplify pass ID or backend handles it.
            // User requirement: "Admin sees all, Cobrador info of him". 
            // Usually valid to just pass date if backend filters by token, BUT 
            // if backend expects 'userId' for filtering even for self, we might need it.
            // Given previous patterns, let's assume specific query params logic:

            let userIdParam: string | undefined = undefined;
            if (user?.profile === 'COBRADOR') {
                userIdParam = String(user.id);
            }

            // Actually, if backend is smart, it filters by token for Cobrador. 
            // But let's pass it if Cobrador to be safe, or leave empty for Admin to see all.

            const data = await expenseService.getAll(date, userIdParam);
            setExpenses(data);
        } catch (error) {
            console.error('Error loading expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem'
            }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#0f172a' }}>
                    Gastos
                </h1>

                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #e2e8f0',
                        fontSize: '1rem'
                    }}
                />
            </div>

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
                <div style={{ display: 'grid', gap: '1rem' }}>
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
                                    {format(new Date(expense.date || date), "h:mm a", { locale: es })}
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

                    <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        borderTop: '2px dashed #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: 'bold',
                        fontSize: '1.125rem'
                    }}>
                        <span>Total Gastos</span>
                        <span style={{ color: '#ef4444' }}>
                            S/ {expenses.reduce((sum, item) => sum + Number(item.amount), 0).toFixed(2)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
