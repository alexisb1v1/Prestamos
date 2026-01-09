export default function CobradoresPage() {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Cobradores</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Gestiona tu equipo de cobranza.</p>
                </div>
                <button className="btn btn-primary">+ Nuevo Cobrador</button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                    <thead style={{ backgroundColor: 'var(--bg-app)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                        <tr>
                            <th style={{ padding: '1rem' }}>Nombre</th>
                            <th style={{ padding: '1rem' }}>Email</th>
                            <th style={{ padding: '1rem' }}>Clientes Asignados</th>
                            <th style={{ padding: '1rem' }}>Recaudado Hoy</th>
                            <th style={{ padding: '1rem' }}>Estado</th>
                            <th style={{ padding: '1rem' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[1, 2].map((i) => (
                            <tr key={i} style={{ borderTop: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                                <td style={{ padding: '1rem', fontWeight: 500 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#475569' }}></div>
                                        Cobrador {i}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>cobrador{i}@demo.com</td>
                                <td style={{ padding: '1rem' }}>45</td>
                                <td style={{ padding: '1rem', fontWeight: 'bold' }}>$1,200.00</td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '999px',
                                        fontSize: '0.75rem',
                                        backgroundColor: 'rgba(129, 140, 248, 0.1)',
                                        color: '#818cf8'
                                    }}>
                                        Activo
                                    </span>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <button className="btn" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Editar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
