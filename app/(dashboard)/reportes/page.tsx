'use client';

export default function ReportesPage() {
    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Reportes</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Visualiza el rendimiento de tu negocio</p>
                </div>
            </div>

            {/* Content Container */}
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{
                    fontSize: '4rem',
                    marginBottom: '1rem',
                    opacity: 0.5
                }}>
                    📊
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Módulo de Reportes
                </h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Estamos trabajando en las estadísticas detalladas. Próximamente podrás ver aquí gráficos de rendimiento, recaudación diaria y métricas de crecimiento.
                </p>
            </div>
        </div>
    );
}
