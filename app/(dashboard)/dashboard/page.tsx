export default function DashboardPage() {
    return (
        <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Dashboard</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                {/* Stat Cards */}
                <div className="card">
                    <h3 className="label">Total Prestado</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>$125,000</p>
                    <span style={{ color: 'var(--color-success)', fontSize: '0.875rem' }}>+12% vs mes anterior</span>
                </div>

                <div className="card">
                    <h3 className="label">Cobrado Hoy</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>$4,500</p>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Meta: $5,000</span>
                </div>

                <div className="card">
                    <h3 className="label">Clientes Activos</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>142</p>
                </div>

                <div className="card">
                    <h3 className="label">Mora</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-danger)' }}>15%</p>
                </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Ruta de Cobro (Hoy)</h2>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: 'var(--bg-app)', textAlign: 'left' }}>
                            <tr>
                                <th style={{ padding: '1rem' }}>Cliente</th>
                                <th style={{ padding: '1rem' }}>Dirección</th>
                                <th style={{ padding: '1rem' }}>Monto</th>
                                <th style={{ padding: '1rem' }}>Estado</th>
                                <th style={{ padding: '1rem' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[1, 2, 3].map((i) => (
                                <tr key={i} style={{ borderTop: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1rem' }}>Juan Pérez</td>
                                    <td style={{ padding: '1rem' }}>Av. Central 123</td>
                                    <td style={{ padding: '1rem' }}>$200.00</td>
                                    <td style={{ padding: '1rem' }}><span style={{ color: 'var(--color-warning)' }}>Pendiente</span></td>
                                    <td style={{ padding: '1rem' }}>
                                        <button className="btn btn-primary" style={{ fontSize: '0.875rem', padding: '0.25rem 0.75rem' }}>Cobrar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
