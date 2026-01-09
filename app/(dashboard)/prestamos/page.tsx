export default function PrestamosPage() {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Préstamos</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Gestiona y visualiza todos los préstamos activos.</p>
                </div>
                <button className="btn btn-primary">+ Nuevo Préstamo</button>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <input type="text" className="input" placeholder="Buscar por cliente..." style={{ maxWidth: '300px' }} />
                    <select className="input" style={{ maxWidth: '200px' }}>
                        <option value="">Todos los estados</option>
                        <option value="active">Activos</option>
                        <option value="paid">Pagados</option>
                        <option value="overdue">Mora</option>
                    </select>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                    <thead style={{ backgroundColor: 'var(--bg-app)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                        <tr>
                            <th style={{ padding: '1rem' }}>ID</th>
                            <th style={{ padding: '1rem' }}>Cliente</th>
                            <th style={{ padding: '1rem' }}>Monto Prestado</th>
                            <th style={{ padding: '1rem' }}>Interés</th>
                            <th style={{ padding: '1rem' }}>Saldo Restante</th>
                            <th style={{ padding: '1rem' }}>Frecuencia</th>
                            <th style={{ padding: '1rem' }}>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <tr key={i} style={{ borderTop: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>#{1000 + i}</td>
                                <td style={{ padding: '1rem', fontWeight: 500 }}>María González</td>
                                <td style={{ padding: '1rem' }}>$500.00</td>
                                <td style={{ padding: '1rem' }}>20%</td>
                                <td style={{ padding: '1rem', color: '#10b981' }}>$350.00</td>
                                <td style={{ padding: '1rem' }}>Diario</td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '999px',
                                        fontSize: '0.75rem',
                                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                        color: '#10b981'
                                    }}>
                                        Al día
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
