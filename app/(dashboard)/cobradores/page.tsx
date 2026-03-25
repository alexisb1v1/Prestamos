'use client';

import { useState, useEffect } from 'react';
import { userService } from '@/lib/userService';
import { authService } from '@/lib/auth';
import { companyService } from '@/lib/companyService';
import { User, Company } from '@/lib/types';
import CreateUserModal from '@/app/components/CreateUserModal';
import ConfirmModal from '@/app/components/ConfirmModal';
import LoadingSpinner from '@/app/components/LoadingSpinner';

export default function CobradoresPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean;
        action: 'DELETE' | 'TOGGLE_DAY' | null;
        user: User | null;
    }>({ isOpen: false, action: null, user: null });
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const init = async () => {
            const user = authService.getUser();
            setCurrentUser(user);

            let companyIdToUse = user?.idCompany;

            if (user?.profile === 'OWNER') {
                const companiesData = await companyService.getAll();
                setCompanies(companiesData);
                if (companiesData.length > 0) {
                    // Set default company
                    setSelectedCompanyId(""); // Default to all
                    companyIdToUse = "";
                }
            } else {
                setSelectedCompanyId(user?.idCompany || '');
            }

            loadUsers(companyIdToUse);
        };
        init();
    }, []);

    const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedCompanyId(val);
        loadUsers(val);
    };

    const loadUsers = async (companyId?: string) => {
        const compId = companyId !== undefined ? companyId : selectedCompanyId;
        try {
            setLoading(true);
            // forceRefresh: true ensures we always get fresh data from API
            // This is critical for the users list page to show updates immediately
            const data = await userService.getAll(searchTerm, true, compId);
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

    const handleEdit = async (user: User) => {
        try {
            setLoading(true);
            const freshUser = await userService.getById(user.id);
            setEditingUser(freshUser);
            setIsModalOpen(true);
        } catch (err) {
            console.error('Error fetching fresh user data:', err);
            setError('Error al cargar los datos del usuario.');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setEditingUser(null);
        setIsModalOpen(false);
    };

    const handleDelete = (userId: string) => {
        const userToDelete = users.find(u => u.id === userId);
        if (userToDelete) {
            setConfirmation({ isOpen: true, action: 'DELETE', user: userToDelete });
        }
    };

    const handleToggleDayStatus = (user: User) => {
        setConfirmation({ isOpen: true, action: 'TOGGLE_DAY', user });
    };

    const executeAction = async () => {
        if (!confirmation.user || !confirmation.action) return;

        try {
            setLoading(true);

            if (confirmation.action === 'DELETE') {
                await userService.delete(confirmation.user.id);
            } else if (confirmation.action === 'TOGGLE_DAY') {
                await userService.toggleDayStatus(confirmation.user.id, !confirmation.user.isDayClosed);
            }

            loadUsers();
            setConfirmation({ isOpen: false, action: null, user: null });
        } catch (err) {
            console.error('Error executing action:', err);
            setError('Error al procesar la acción.');
            setLoading(false);
            setConfirmation({ isOpen: false, action: null, user: null });
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            {/* Sticky Header Section for Mobile */}
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
                        <h1 style={{ fontSize: isMobile ? '1.5rem' : '1.875rem', fontWeight: 'bold' }}>Usuarios</h1>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsModalOpen(true)}
                        style={{ width: 'auto', whiteSpace: 'nowrap', padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem', fontSize: isMobile ? '0.85rem' : '1rem' }}
                    >
                        + Nuevo {isMobile ? '' : 'Usuario'}
                    </button>
                </div>

                {/* Search / Filters - Part of Sticky Header */}
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
                        <div style={{ width: isMobile ? '100%' : 'auto', flex: isMobile ? 'none' : 1 }}>
                            <input
                                type="text"
                                className="input"
                                placeholder="Buscar por nombre o usuario..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    backgroundColor: isMobile ? 'var(--bg-card)' : 'var(--bg-app)'
                                }}
                            />
                        </div>

                        {currentUser?.profile === 'OWNER' && (
                            <div style={{ width: isMobile ? '100%' : 'auto' }}>
                                <select
                                    className="input"
                                    value={selectedCompanyId}
                                    onChange={handleCompanyChange}
                                    style={{
                                        width: '100%',
                                        maxWidth: isMobile ? 'none' : '250px',
                                        backgroundColor: isMobile ? 'var(--bg-card)' : 'var(--bg-app)'
                                    }}
                                >
                                    <option value="">Todas las empresas</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.companyName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', width: isMobile ? '100%' : 'auto' }}>
                            <button type="submit" className="btn btn-primary" style={{ flex: isMobile ? 1 : 'initial' }}>
                                Filtrar
                            </button>
                            {(searchTerm || selectedCompanyId) && (
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => { setSearchTerm(''); setSelectedCompanyId(''); loadUsers(''); }}
                                    style={{
                                        border: '1px solid var(--border-color)',
                                        flex: isMobile ? 1 : 'initial',
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

            {/* Error Message */}
            {
                error && (
                    <div style={{
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        backgroundColor: 'rgba(220, 38, 38, 0.1)',
                        border: '1px solid var(--color-danger)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-danger)',
                        fontWeight: 600
                    }}>
                        {error}
                    </div>
                )
            }

            {/* Content Section (Mobile Card View or Desktop Table) */}
            {
                isMobile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {loading ? (
                            <LoadingSpinner message="Cargando usuarios..." />
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
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', padding: '0.5rem 0' }}>
                                        {/* Lock/Unlock */}
                                        <button
                                            onClick={() => handleToggleDayStatus(user)}
                                            title={user.isDayClosed ? "Cerrado" : "Abierto"}
                                            style={{
                                                padding: '0.6rem',
                                                border: 'none',
                                                backgroundColor: 'transparent',
                                                cursor: 'pointer',
                                                borderRadius: '0.5rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: user.isDayClosed ? '#ef4444' : '#22c55e',
                                                flex: 1
                                            }}
                                        >
                                            {user.isDayClosed ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="22" height="22">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="22" height="22">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                                </svg>
                                            )}
                                        </button>

                                        {/* Edit */}
                                        <button
                                            onClick={() => handleEdit(user)}
                                            title="Editar"
                                            style={{
                                                padding: '0.6rem',
                                                border: 'none',
                                                backgroundColor: 'transparent',
                                                cursor: 'pointer',
                                                borderRadius: '0.5rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#64748b',
                                                flex: 1
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="22" height="22">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                            </svg>
                                        </button>

                                        {/* Delete */}
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            title="Eliminar"
                                            style={{
                                                padding: '0.6rem',
                                                border: 'none',
                                                backgroundColor: 'transparent',
                                                cursor: 'pointer',
                                                borderRadius: '0.5rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#64748b',
                                                flex: 1
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="22" height="22">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    /* Desktop View: Table */
                    <div className="card" style={{ padding: 0, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                                <thead style={{ backgroundColor: 'var(--bg-app)', textAlign: 'left' }}>
                                    <tr>
                                        <th style={{ padding: '1rem' }}>Nombre</th>
                                        <th style={{ padding: '1rem' }}>Usuario</th>
                                        <th style={{ padding: '1rem' }}>Perfil</th>
                                        <th style={{ padding: '1rem' }}>Estado</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5}>
                                                <LoadingSpinner message="Cargando usuarios..." />
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
                                                        padding: '0.4rem 1rem',
                                                        borderRadius: '999px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '700',
                                                        backgroundColor: user.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        color: user.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-danger)'
                                                    }}>
                                                        {user.status === 'ACTIVE' ? 'ACTIVO' : 'INACTIVO'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                                        {/* Toggle Day Status - Lock/Unlock */}
                                                        <button
                                                            onClick={() => handleToggleDayStatus(user)}
                                                            className={`btn-icon ${user.isDayClosed ? 'danger' : 'success'}`}
                                                            title={user.isDayClosed ? "Día Cerrado - Abrir" : "Día Abierto - Cerrar"}
                                                            style={{ padding: '0.6rem', borderRadius: '10px' }}
                                                        >
                                                            {user.isDayClosed ? (
                                                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                                                            ) : (
                                                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                                                            )}
                                                        </button>

                                                        {/* Edit */}
                                                        <button
                                                            onClick={() => handleEdit(user)}
                                                            className="btn-icon primary"
                                                            title="Editar"
                                                            style={{ padding: '0.6rem', borderRadius: '10px' }}
                                                        >
                                                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                        </button>

                                                        {/* Delete */}
                                                        <button
                                                            onClick={() => handleDelete(user.id)}
                                                            className="btn-icon danger"
                                                            title="Eliminar"
                                                            style={{ padding: '0.6rem', borderRadius: '10px' }}
                                                        >
                                                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
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

            <ConfirmModal
                isOpen={confirmation.isOpen}
                onClose={() => setConfirmation({ isOpen: false, action: null, user: null })}
                onConfirm={executeAction}
                title={confirmation.action === 'DELETE' ? "Eliminar Usuario" : confirmation.action === 'TOGGLE_DAY' ? (confirmation.user?.isDayClosed ? "Abrir Día" : "Cerrar Día") : ""}
                message={confirmation.action === 'DELETE'
                    ? "¿Estás seguro de que deseas eliminar este usuario? Esta acción lo desactivará."
                    : confirmation.action === 'TOGGLE_DAY'
                        ? `¿Estás seguro de que deseas ${confirmation.user?.isDayClosed ? 'abrir' : 'cerrar'} el día para ${confirmation.user?.username}?`
                        : ""
                }
                confirmText={confirmation.action === 'DELETE' ? "Eliminar" : "Confirmar"}
                cancelText="Cancelar"
            />
        </div>
    );
}
