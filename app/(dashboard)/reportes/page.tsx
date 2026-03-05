'use client';

import { useState, useEffect } from 'react';
import { loanService } from '@/lib/loanService';
import { userService } from '@/lib/userService';
import { companyService } from '@/lib/companyService';
import { authService } from '@/lib/auth';
import { ReportData, User, Company } from '@/lib/types';
import DateRangePicker from '@/app/components/DateRangePicker';

export default function ReportesPage() {
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isMobile, setIsMobile] = useState(false);
    const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');

    // Filters
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

    const [collectors, setCollectors] = useState<User[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        const init = async () => {
            const user = authService.getUser();
            setCurrentUser(user);

            if (user) {
                if (user.profile === 'OWNER') {
                    try {
                        const companiesData = await companyService.getAll();
                        setCompanies(companiesData);
                    } catch (err) {
                        console.error('Error companies:', err);
                    }
                } else {
                    setSelectedCompanyId(user.idCompany || '');
                }

                if (user.profile === 'ADMIN' || user.profile === 'OWNER') {
                    loadCollectors(user.profile === 'OWNER' ? '' : user.idCompany);
                } else {
                    setSelectedUserId(user.id);
                }
            }

            const checkMobile = () => {
                const mobile = window.innerWidth < 768;
                setIsMobile(mobile);
                if (mobile) setViewMode('list');
            };
            checkMobile();
            window.addEventListener('resize', checkMobile);
            return () => window.removeEventListener('resize', checkMobile);
        };
        init();
    }, []);

    const loadCollectors = async (companyId?: string) => {
        try {
            const allUsers = await userService.getAll(undefined, false, companyId);
            const activeCollectors = allUsers.filter(u =>
                u.profile === 'COBRADOR' && u.status === 'ACTIVE'
            );
            setCollectors(activeCollectors);
        } catch (err) {
            console.error('Error loading collectors:', err);
            setCollectors([]);
        }
    };

    const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedCompanyId(val);
        setSelectedUserId(''); // Reset collector when company changes
        loadCollectors(val);
    };

    const loadReport = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await loanService.getLoanReport(
                startDate,
                endDate,
                selectedCompanyId || undefined,
                selectedUserId || undefined
            );
            setReportData(data);
        } catch (err) {
            console.error('Error loading report:', err);
            setError('Error al cargar el reporte');
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (amount: number) => {
        return `S/ ${Number(amount).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    };

    const formatDateHeader = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };

    const formatShortDate = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    // Matrix View Data Processing
    const getMatrixData = () => {
        if (!reportData) return { dates: [], clients: [], matrix: {}, dateTotals: {}, clientTotals: {} };

        const matrix: Record<string, Record<string, number>> = {};
        const clientTotals: Record<string, number> = {};
        const dateTotals: Record<string, number> = {};
        const uniqueDatesSet = new Set<string>();

        // 1. Collect all dates and populate matrix
        reportData.pagosPorDia.forEach(day => {
            uniqueDatesSet.add(day.fecha);
            day.pagos.forEach(pago => {
                // Solo incluímos pagos ya cobrados en la matriz (sábana)
                if (pago.estado !== 'COBRADO') return;

                const client = pago.cliente.trim();
                if (!matrix[client]) matrix[client] = {};

                const currentAmount = matrix[client][day.fecha] || 0;
                matrix[client][day.fecha] = currentAmount + pago.monto;

                clientTotals[client] = (clientTotals[client] || 0) + pago.monto;
                dateTotals[day.fecha] = (dateTotals[day.fecha] || 0) + pago.monto;
            });
        });

        const dates = Array.from(uniqueDatesSet).sort();
        // Sort clients by name
        const sortedClients = Object.keys(matrix).sort((a, b) => a.localeCompare(b));

        return { dates, clients: sortedClients, matrix, dateTotals, clientTotals };
    };

    const { dates, clients, matrix, dateTotals, clientTotals } = getMatrixData();

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexDirection: isMobile ? 'column' : 'row',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                <div>
                    <h1 style={{ fontSize: isMobile ? '1.5rem' : '1.875rem', fontWeight: 'bold' }}>Reporte de Cobros</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Análisis detallado de movimientos</p>
                </div>

                {!isMobile && reportData && (
                    <div className="card" style={{ padding: '4px', borderRadius: '10px', display: 'flex', gap: '4px', backgroundColor: 'var(--bg-card)' }}>
                        <button
                            className={`btn ${viewMode === 'matrix' ? 'btn-primary' : ''}`}
                            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                            onClick={() => setViewMode('matrix')}
                        >
                            Vista Matriz
                        </button>
                        <button
                            className={`btn ${viewMode === 'list' ? 'btn-primary' : ''}`}
                            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                            onClick={() => setViewMode('list')}
                        >
                            Vista Lista
                        </button>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '1rem',
                    alignItems: 'end'
                }}>
                    <div style={{
                        gridColumn: isMobile ? 'auto' : 'span 2',
                        minWidth: isMobile ? 'auto' : '300px'
                    }}>
                        <label className="label">Rango de Fechas</label>
                        <DateRangePicker
                            startDate={startDate}
                            endDate={endDate}
                            onChange={(start, end) => {
                                setStartDate(start);
                                setEndDate(end);
                            }}
                        />
                    </div>

                    {currentUser?.profile === 'OWNER' && (
                        <div>
                            <label className="label">Empresa</label>
                            <select
                                className="input"
                                value={selectedCompanyId}
                                onChange={handleCompanyChange}
                            >
                                <option value="">Todas las empresas</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                            </select>
                        </div>
                    )}

                    {(currentUser?.profile === 'ADMIN' || currentUser?.profile === 'OWNER') && (
                        <div>
                            <label className="label">Cobrador</label>
                            <select
                                className="input"
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                            >
                                <option value="">Todos los cobradores</option>
                                {collectors.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.username} ({c.firstName} {c.lastName})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        className="btn btn-primary"
                        onClick={loadReport}
                        disabled={loading}
                        style={{ height: '42px', width: isMobile ? '100%' : 'auto' }}
                    >
                        {loading ? 'Cargando...' : 'Generar Reporte'}
                    </button>
                </div>
            </div>

            {error && <div style={{ color: 'var(--color-danger)', marginBottom: '1rem', textAlign: 'center', fontWeight: '500' }}>{error}</div>}

            {reportData && (
                <>
                    {/* Summary Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: isMobile ? '0.75rem' : '1.5rem',
                        marginBottom: '2rem'
                    }}>
                        <div className="card" style={{ padding: isMobile ? '0.75rem' : '1.25rem' }}>
                            <span className="label" style={{ fontSize: isMobile ? '0.7rem' : '0.875rem' }}>Total Prestado</span>
                            <div style={{ fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: 'bold', color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                                {formatMoney(reportData.summary.totalPrestado)}
                            </div>
                        </div>
                        <div className="card" style={{ padding: isMobile ? '0.75rem' : '1.25rem' }}>
                            <span className="label" style={{ fontSize: isMobile ? '0.7rem' : '0.875rem' }}>Total Cobrado</span>
                            <div style={{ fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                                {formatMoney(reportData.summary.totalCobrado)}
                            </div>
                        </div>
                        <div className="card" style={{ padding: isMobile ? '0.75rem' : '1.25rem' }}>
                            <span className="label" style={{ fontSize: isMobile ? '0.7rem' : '0.875rem' }}>Efectivo</span>
                            <div style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 'bold', color: '#22c55e', marginTop: '0.25rem' }}>
                                {formatMoney(reportData.summary.totalCobradoEfectivo)}
                            </div>
                        </div>
                        <div className="card" style={{ padding: isMobile ? '0.75rem' : '1.25rem' }}>
                            <span className="label" style={{ fontSize: isMobile ? '0.7rem' : '0.875rem' }}>Yape</span>
                            <div style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 'bold', color: '#6366f1', marginTop: '0.25rem' }}>
                                {formatMoney(reportData.summary.totalCobradoYape)}
                            </div>
                        </div>
                        <div className="card" style={{ padding: isMobile ? '0.75rem' : '1.25rem', gridColumn: isMobile ? 'span 2' : 'auto' }}>
                            <span className="label" style={{ fontSize: isMobile ? '0.7rem' : '0.875rem' }}>Total Gastos</span>
                            <div style={{ fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: 'bold', color: '#ef4444', marginTop: '0.25rem' }}>
                                {formatMoney(reportData.summary.totalGasto)}
                            </div>
                        </div>
                    </div>

                    {viewMode === 'matrix' && !isMobile ? (
                        /* Matrix View (Desktop) */
                        <div className="card" style={{ padding: '0', overflow: 'hidden', border: '2px solid #334155' }}>
                            <div style={{ overflowX: 'auto', width: '100%' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#ffffff' }}>
                                            <th style={{
                                                width: '220px',
                                                padding: '1.25rem 1rem',
                                                textAlign: 'left',
                                                position: 'sticky',
                                                left: 0,
                                                zIndex: 10,
                                                backgroundColor: '#ffffff',
                                                borderRight: '2px solid #334155',
                                                borderBottom: '2px solid #334155',
                                                fontSize: '0.9rem',
                                                fontWeight: '900',
                                                color: '#1e293b'
                                            }}>
                                                CLIENTE
                                            </th>
                                            {dates.map(date => (
                                                <th key={date} style={{
                                                    minWidth: '110px',
                                                    padding: '1.25rem 1rem',
                                                    textAlign: 'center',
                                                    borderBottom: '2px solid #334155',
                                                    borderRight: '1px solid var(--border-color)',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '800',
                                                    color: '#1e293b'
                                                }}>
                                                    {formatShortDate(date)}
                                                </th>
                                            ))}
                                            <th style={{
                                                width: '110px',
                                                padding: '1.25rem 1rem',
                                                textAlign: 'center',
                                                backgroundColor: '#f8fafc',
                                                borderBottom: '2px solid #334155',
                                                fontSize: '0.85rem',
                                                fontWeight: '900',
                                                color: '#1e293b'
                                            }}>
                                                TOTAL
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clients.map(client => (
                                            <tr key={client} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{
                                                    padding: '1rem',
                                                    backgroundColor: '#ffffff',
                                                    position: 'sticky',
                                                    left: 0,
                                                    zIndex: 5,
                                                    borderRight: '2px solid #334155',
                                                    fontWeight: '700',
                                                    fontSize: '0.9rem',
                                                    color: '#334155'
                                                }}>
                                                    {client}
                                                </td>
                                                {dates.map(date => {
                                                    const amount = matrix[client] ? matrix[client][date] : undefined;
                                                    return (
                                                        <td key={date} style={{
                                                            padding: '0.6rem',
                                                            textAlign: 'center',
                                                            borderRight: '1px solid var(--border-color)'
                                                        }}>
                                                            {amount ? (
                                                                <div style={{
                                                                    backgroundColor: '#dcfce7',
                                                                    color: '#166534',
                                                                    border: '2.5px solid #22c55e',
                                                                    borderRadius: '10px',
                                                                    padding: '6px 10px',
                                                                    fontWeight: '800',
                                                                    fontSize: '0.95rem',
                                                                    display: 'inline-block',
                                                                    minWidth: '45px'
                                                                }}>
                                                                    {formatMoney(amount)}
                                                                </div>
                                                            ) : null}
                                                        </td>
                                                    );
                                                })}
                                                <td style={{
                                                    padding: '1rem',
                                                    textAlign: 'center',
                                                    backgroundColor: '#f8fafc',
                                                    fontWeight: '800',
                                                    color: 'var(--color-primary)',
                                                    fontSize: '1rem'
                                                }}>
                                                    {formatMoney(clientTotals[client])}
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Total Row */}
                                        <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #334155' }}>
                                            <td style={{
                                                padding: '1.5rem 1rem',
                                                position: 'sticky',
                                                left: 0,
                                                zIndex: 5,
                                                backgroundColor: '#f8fafc',
                                                borderRight: '2px solid #334155',
                                                fontWeight: '900',
                                                fontSize: '1.1rem',
                                                textAlign: 'center',
                                                color: '#1e293b'
                                            }}>
                                                TOTAL
                                            </td>
                                            {dates.map(date => (
                                                <td key={date} style={{
                                                    padding: '1rem',
                                                    textAlign: 'center',
                                                    fontWeight: '900',
                                                    color: '#1e293b',
                                                    fontSize: '1rem',
                                                    borderRight: '1px solid var(--border-color)'
                                                }}>
                                                    {formatMoney(dateTotals[date] || 0)}
                                                </td>
                                            ))}
                                            <td style={{
                                                padding: '1rem',
                                                textAlign: 'center',
                                                fontWeight: '900',
                                                color: 'var(--color-primary)',
                                                fontSize: '1.25rem',
                                                backgroundColor: 'rgba(59, 130, 246, 0.05)'
                                            }}>
                                                {formatMoney(Object.values(clientTotals).reduce((a, b) => a + b, 0))}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        /* List View (Original) */
                        <>
                            {/* Daily Sections */}
                            {reportData.pagosPorDia.map((day, idx) => (
                                <div key={idx} style={{ marginBottom: '2.5rem' }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '1rem',
                                        borderBottom: '2px solid var(--border-color)',
                                        paddingBottom: '0.5rem'
                                    }}>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                                            {formatDateHeader(day.fecha)}
                                        </h3>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                backgroundColor: 'var(--bg-card)',
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                border: '1px solid var(--border-color)',
                                                fontWeight: '600',
                                                color: 'var(--text-secondary)'
                                            }}>
                                                {day.pagos.length + (day.gastos?.length || 0)} ops
                                            </span>
                                        </div>
                                    </div>

                                    {isMobile ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                                            {day.pagos.map((pago, pIdx) => (
                                                <div key={pIdx} className="card" style={{ padding: '0px', overflow: 'hidden' }}>
                                                    <div style={{ padding: '1rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'start' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                                                                    {pago.cliente}
                                                                </div>
                                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                                                                    Método: <span style={{ color: pago.metodo === 'YAPE' ? '#6366f1' : '#22c55e', fontWeight: '600' }}>{pago.metodo || '---'}</span>
                                                                </div>
                                                            </div>
                                                            <span style={{
                                                                fontSize: '0.65rem',
                                                                fontWeight: '800',
                                                                padding: '3px 8px',
                                                                borderRadius: '12px',
                                                                backgroundColor: pago.estado === 'COBRADO' ? '#dcfce7' : '#fee2e2',
                                                                color: pago.estado === 'COBRADO' ? '#166534' : '#991b1b',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.025em'
                                                            }}>
                                                                {pago.estado}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Monto Pago</span>
                                                            <span style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                                                                {formatMoney(pago.monto)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {day.gastos && day.gastos.map((gasto, gIdx) => (
                                                <div key={`g-${gIdx}`} className="card" style={{ padding: '0px', overflow: 'hidden', borderLeft: '4px solid #ef4444' }}>
                                                    <div style={{ padding: '1rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'start' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#991b1b', textTransform: 'uppercase' }}>
                                                                    EGRESO / GASTO
                                                                </div>
                                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                                                    {gasto.descripcion || gasto.description}
                                                                </div>
                                                            </div>
                                                            <span style={{
                                                                fontSize: '0.65rem',
                                                                fontWeight: '800',
                                                                padding: '3px 8px',
                                                                borderRadius: '12px',
                                                                backgroundColor: '#fee2e2',
                                                                color: '#991b1b',
                                                                textTransform: 'uppercase'
                                                            }}>
                                                                Egreso
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                                                            <span style={{ color: '#991b1b', fontSize: '0.85rem', fontWeight: '500' }}>Salida Caja</span>
                                                            <span style={{ fontWeight: '800', color: '#ef4444', fontSize: '1.1rem' }}>
                                                                -{formatMoney(gasto.monto || gasto.amount)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: 'rgb(248, 250, 252)', borderBottom: '1.5px solid var(--border-color)' }}>
                                                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Concepto / Cliente</th>
                                                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Método</th>
                                                        <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</th>
                                                        <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monto</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {day.pagos.map((pago, pIdx) => (
                                                        <tr key={pIdx} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                                                            <td style={{ padding: '1rem' }}>
                                                                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{pago.cliente}</div>
                                                            </td>
                                                            <td style={{ padding: '1rem' }}>
                                                                <span style={{
                                                                    fontSize: '0.85rem',
                                                                    fontWeight: '600',
                                                                    color: pago.metodo === 'YAPE' ? '#6366f1' : '#22c55e'
                                                                }}>
                                                                    {pago.metodo || '---'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                                <span style={{
                                                                    fontSize: '0.75rem',
                                                                    padding: '4px 10px',
                                                                    borderRadius: '20px',
                                                                    backgroundColor: pago.estado === 'COBRADO' ? '#dcfce7' : '#fee2e2',
                                                                    color: pago.estado === 'COBRADO' ? '#166534' : '#991b1b',
                                                                    fontWeight: '700',
                                                                    textTransform: 'uppercase'
                                                                }}>
                                                                    {pago.estado}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                                <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '1rem' }}>
                                                                    {formatMoney(pago.monto)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {day.gastos && day.gastos.map((gasto, gIdx) => (
                                                        <tr key={`g-${gIdx}`} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(239, 68, 68, 0.02)' }}>
                                                            <td style={{ padding: '1rem' }}>
                                                                <div style={{ fontWeight: '700', color: '#991b1b', fontSize: '0.85rem' }}>GASTO: {gasto.descripcion || gasto.description}</div>
                                                            </td>
                                                            <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Efectivo</td>
                                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                                <span style={{
                                                                    fontSize: '0.7rem',
                                                                    padding: '3px 8px',
                                                                    borderRadius: '4px',
                                                                    backgroundColor: '#fee2e2',
                                                                    color: '#991b1b',
                                                                    fontWeight: '800'
                                                                }}>EGRESO</span>
                                                            </td>
                                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                                <span style={{ fontWeight: '700', color: '#ef4444', fontSize: '1rem' }}>
                                                                    -{formatMoney(gasto.monto || gasto.amount)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {reportData.pagosPorDia.length === 0 && (
                                <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: 'var(--bg-card)' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1.5rem', opacity: 0.2 }}>🔍</div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Sin movimientos</h3>
                                    <p style={{ color: 'var(--text-secondary)' }}>No se encontraron transacciones para el rango seleccionado.</p>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {!reportData && !loading && (
                <div className="card" style={{ padding: '5rem 2rem', textAlign: 'center', backgroundColor: 'var(--bg-card)' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1.5rem', opacity: 0.2 }}>📊</div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Panel de Reportes</h3>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>Selecciona un rango de fechas y filtros para analizar el rendimiento de tus cobros y egresos.</p>
                </div>
            )}
        </div>
    );
}
