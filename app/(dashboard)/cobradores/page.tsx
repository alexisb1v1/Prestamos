'use client';

import { useState, useEffect } from 'react';
import { userService } from '@/lib/userService';
import { User } from '@/lib/types';
import CreateUserModal from '@/app/components/CreateUserModal';

export default function CobradoresPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await userService.getAll(searchTerm);
            setUsers(data);
        } catch (err) {
            console.error('Error loading users:', err);
            setError('Error al cargar la lista de usuarios.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadUsers();
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingUser(null);
        setIsModalOpen(false);
    };

    const handleDelete = async (userId: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción lo desactivará.')) {
            try {
                setLoading(true);
                await userService.delete(userId);
                loadUsers();
            } catch (err) {
                console.error('Error deleting user:', err);
                setError('Error al eliminar el usuario.');
                setLoading(false);
            }
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            {/* Sticky Header Section for Mobile */}
            <div style={{
                position: isMobile ? 'sticky' : 'static',
                top: isMobile ? '0' : 'auto', // Stick at top of viewport
                zIndex: isMobile ? 30 : 'auto',
                backgroundColor: isMobile ? 'var(--bg-app)' : 'transparent',
                margin: isMobile ? '0 -2rem 1rem -2rem' : '0 0 1.5rem 0', // Removed negative margin-top
                padding: isMobile ? '0.75rem 2rem 1rem 2rem' : '0', // More compact top padding
                borderBottom: isMobile ? '1px solid var(--border-color)' : 'none',
                boxShadow: isMobile ? 'var(--shadow-md)' : 'none',
                transition: 'all 0.3s ease'
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'row', // Force same line
                    justifyContent: 'space-between',
                    alignItems: 'center', // Aligned middle
                    marginBottom: isMobile ? '1rem' : '2rem',
                    gap: isMobile ? '0.5rem' : '0'
                }}>
                    <div>
                        <h1 style={{ fontSize: isMobile ? '1.5rem' : '1.875rem', fontWeight: 'bold' }}>Usuarios</h1>
                        {!isMobile && <p style={{ color: 'var(--text-secondary)' }}>Gestiona tu equipo de cobranza.</p>}
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsModalOpen(true)}
                        style={{ width: 'auto', whiteSpace: 'nowrap', padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem', fontSize: isMobile ? '0.85rem' : '1rem' }}
                    >
                        + Nuevo {isMobile ? '' : 'Usuario'}
                    </button>
                </div>

                {/* Search Bar - Part of Sticky Header */}
                <div className={isMobile ? "" : "card"} style={{
                    marginBottom: isMobile ? '0' : '1.5rem',
                    padding: isMobile ? '0' : '1rem',
                    backgroundColor: isMobile ? 'transparent' : 'var(--bg-card)',
                    border: isMobile ? 'none' : '1px solid var(--border-color)',
                    boxShadow: isMobile ? 'none' : 'var(--shadow-sm)'
                }}>
                    <form onSubmit={handleSearch} style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: '1rem'
                    }}>
                        <input
                            type="text"
                            className="input"
                            placeholder="Buscar por nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                maxWidth: isMobile ? 'none' : '300px',
                                backgroundColor: isMobile ? 'var(--bg-card)' : 'var(--bg-app)'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', width: isMobile ? '100%' : 'auto' }}>
                            <button type="submit" className="btn btn-primary" style={{ flex: isMobile ? 1 : 'none' }}>
                                Buscar
                            </button>
                            {searchTerm && (
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => { setSearchTerm(''); loadUsers(); }}
                                    style={{
                                        border: '1px solid var(--border-color)',
                                        flex: isMobile ? 1 : 'none',
                                        backgroundColor: 'var(--bg-card)'
                                    }}
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            {error && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    border: '1px solid var(--color-danger)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-danger)'
                }}>
                    {error}
                </div>
            )}

            {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Cargando...</div>
                    ) : users.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No se encontraron usuarios.</div>
                    ) : (
                        users.map((user) => (
                            <div key={user.id} className="card" style={{ padding: '1rem' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    paddingBottom: '1rem',
                                    marginBottom: '1rem',
                                    borderBottom: '1px solid var(--border-color)'
                                }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        background: 'var(--color-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '1.2rem'
                                    }}>
                                        {(user.firstName?.[0] || user.username[0]).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{user.firstName} {user.lastName}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>@{user.username}</div>
                                    </div>
                                    <span style={{
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '999px',
                                        fontSize: '0.7rem',
                                        fontWeight: 'bold',
                                        backgroundColor: user.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        color: user.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-danger)'
                                    }}>
                                        {user.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '0.75rem',
                                    paddingBottom: '0.75rem',
                                    borderBottom: '1px solid var(--border-color)',
                                    marginBottom: '1rem',
                                    fontSize: '0.85rem'
                                }}>
                                    <div>
                                        <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Perfil</span>
                                        <span style={{ fontWeight: '500' }}>{user.profile}</span>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Documento</span>
                                        <span style={{ fontWeight: '500' }}>{user.documentNumber}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        className="btn"
                                        style={{ flex: 1, padding: '0.6rem', fontSize: '0.9rem' }}
                                        onClick={() => handleEdit(user)}
                                    >
                                        ✏️ Editar
                                    </button>
                                    <button
                                        className="btn"
                                        style={{ flex: 1, padding: '0.6rem', fontSize: '0.9rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                                        onClick={() => handleDelete(user.id)}
                                    >
                                        🗑️ Eliminar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead style={{ backgroundColor: 'var(--bg-app)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                            <tr>
                                <th style={{ padding: '1rem' }}>Nombre</th>
                                <th style={{ padding: '1rem' }}>Usuario</th>
                                <th style={{ padding: '1rem' }}>Perfil</th>
                                <th style={{ padding: '1rem' }}>Estado</th>
                                <th style={{ padding: '1rem' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        Cargando usuarios...
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No se encontraron usuarios.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} style={{ borderTop: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                                        <td style={{ padding: '1rem', fontWeight: 500 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '50%',
                                                    background: 'var(--color-primary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontSize: '0.8rem'
                                                }}>
                                                    {(user.firstName?.[0] || user.username[0]).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div>{user.firstName} {user.lastName}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                        {user.documentType} {user.documentNumber}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                            {user.username}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                fontSize: '0.8rem',
                                                fontWeight: 500,
                                                backgroundColor:
                                                    user.profile === 'ADMIN' ? 'rgba(124, 58, 237, 0.1)' :
                                                        user.profile === 'OWNER' ? 'rgba(245, 158, 11, 0.1)' :
                                                            'rgba(59, 130, 246, 0.1)', // COBRADOR and others
                                                color:
                                                    user.profile === 'ADMIN' ? '#7c3aed' :
                                                        user.profile === 'OWNER' ? '#d97706' :
                                                            '#2563eb',
                                                border: `1px solid ${user.profile === 'ADMIN' ? 'rgba(124, 58, 237, 0.2)' :
                                                    user.profile === 'OWNER' ? 'rgba(245, 158, 11, 0.2)' :
                                                        'rgba(59, 130, 246, 0.2)'
                                                    }`
                                            }}>
                                                {user.profile}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '999px',
                                                fontSize: '0.75rem',
                                                backgroundColor: user.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: user.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-danger)'
                                            }}>
                                                {user.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td style={{
                                            padding: '1rem',
                                            display: 'flex',
                                            gap: '0.5rem'
                                        }}>
                                            <button
                                                className="btn"
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                                onClick={() => handleEdit(user)}
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                className="btn"
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                                                onClick={() => handleDelete(user.id)}
                                            >
                                                🗑️ Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <CreateUserModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                userToEdit={editingUser}
                onSuccess={() => {
                    loadUsers();
                    setSearchTerm(''); // Optional: clear search on new user
                }}
            />
        </div>
    );
}
