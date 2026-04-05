'use client';

import { useState, useEffect } from 'react';
import { createUserUseCase, updateUserUseCase, searchPersonUseCase } from '@/app/features/users';
import { User as UserModel } from '@/app/features/users/models/user.model';
import { companyService } from '@/lib/companyService';
import { authService } from '@/lib/auth';
import { User, Company } from '@/lib/types';
import styles from './CreateUserModal.module.css';

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userToEdit?: UserModel | null;
}

interface CreateUserFormData {
    username: string;
    password?: string;
    profile: string;
    documentType: string;
    documentNumber: string;
    firstName: string;
    lastName: string;
    birthday?: string | null;
    status?: 'ACTIVE' | 'INACTIVE';
    idCompany?: string;
}

export default function CreateUserModal({ isOpen, onClose, onSuccess, userToEdit }: CreateUserModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Initial state
    const initialFormState: CreateUserFormData = {
        username: '',
        password: '',
        profile: 'COBRADOR',
        documentType: 'DNI',
        documentNumber: '',
        firstName: '',
        lastName: '',
        birthday: null
    };

    const [formData, setFormData] = useState<CreateUserFormData>(initialFormState);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const [searchingPerson, setSearchingPerson] = useState(false);

    // Reset logic when modal opens or userToEdit changes
    useEffect(() => {
        if (isOpen) {
            const user = authService.getUser();
            setCurrentUser(user);

            const fetchCompanies = async () => {
                if (user?.profile === 'OWNER') {
                    try {
                        const data = await companyService.getAll();
                        setCompanies(data);
                    } catch (e) {
                        console.error("Error fetching companies", e);
                    }
                }
            };
            fetchCompanies();

            if (userToEdit) {
                setFormData({
                    username: userToEdit.username,
                    password: '', 
                    profile: userToEdit.profile,
                    documentType: userToEdit.documentType,
                    documentNumber: userToEdit.documentNumber,
                    firstName: userToEdit.firstName,
                    lastName: userToEdit.lastName,
                    birthday: null,
                    status: userToEdit.status,
                    idCompany: userToEdit.idCompany
                });
            } else {
                setFormData(initialFormState);
            }
            setError('');
            setSearchingPerson(false);
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Re-implementation of search logic
    useEffect(() => {
        if (!isOpen) return;
        if (!formData.documentNumber || formData.documentNumber.length < 8) return;

        const timer = setTimeout(async () => {
            setSearchingPerson(true);
            setError('');
            
            const result = await searchPersonUseCase.execute(formData.documentType, formData.documentNumber);
            
            result.match(
                (person) => {
                    setFormData(prev => ({
                        ...prev,
                        firstName: person.firstName,
                        lastName: person.lastName,
                    }));
                },
                (err) => {
                    setFormData(prev => ({ ...prev, firstName: '', lastName: '' }));
                    if (err.code === '404') {
                        setError('Persona no registrada. Ingrese los datos manualmente.');
                    } else {
                        console.error('Error searching person:', err);
                        setError('Error al realizar la búsqueda.');
                    }
                }
            );
            setSearchingPerson(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, [formData.documentNumber, formData.documentType, isOpen]);

    // Auto-generate username logic (kept as is)
    useEffect(() => {
        if (!isOpen || userToEdit) return;

        const effectiveCompanyId = formData.idCompany || currentUser?.idCompany || '';

        if (effectiveCompanyId) {
            let newUsername = '';

            if (formData.profile === 'ADMIN' && formData.firstName && formData.lastName) {
                const firstLetter = formData.firstName.charAt(0).toLowerCase();
                const firstLastName = formData.lastName.split(' ')[0].toLowerCase();
                newUsername = `${effectiveCompanyId}:${firstLetter}${firstLastName}`;
            } else if (formData.profile === 'COBRADOR' && formData.documentNumber) {
                newUsername = `${effectiveCompanyId}:${formData.documentNumber}`;
            }

            if (newUsername) {
                setFormData(prev => ({
                    ...prev,
                    username: newUsername
                }));
            }
        }
    }, [formData.idCompany, currentUser?.idCompany, formData.documentNumber, formData.firstName, formData.lastName, formData.profile, isOpen, userToEdit]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { status, ...creationData } = formData;
        
        const result = userToEdit
            ? await updateUserUseCase.execute(userToEdit.id, { 
                firstName: formData.firstName,
                lastName: formData.lastName,
                profile: formData.profile,
                status: formData.status,
                birthday: null 
              })
            : await createUserUseCase.execute({ ...creationData, birthday: null });

        result.match(
            () => {
                onSuccess();
                onClose();
            },
            (err) => {
                console.error('Error saving user:', err);
                setError(err.message || (userToEdit ? 'Error al actualizar usuario.' : 'Error al crear usuario.'));
            }
        );
        setLoading(false);
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                        {userToEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                {error && (
                    <div style={{
                        padding: '0.75rem',
                        marginBottom: '1rem',
                        backgroundColor: 'rgba(220, 38, 38, 0.1)',
                        border: '1px solid var(--color-danger)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-danger)',
                        fontSize: '0.875rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>

                    {/* Status Field - Only for Edit */}
                    {userToEdit && (
                        <div>
                            <label className="label">Estado</label>
                            <select
                                className="input"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                            >
                                <option value="ACTIVE">Activo</option>
                                <option value="INACTIVE">Inactivo</option>
                            </select>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem', alignItems: 'end' }}>
                        <div>
                            <label className="label">Tipo Doc.</label>
                            <select
                                className="input"
                                name="documentType"
                                value={formData.documentType}
                                onChange={handleChange}
                            >
                                <option value="DNI">DNI</option>
                                <option value="CE">CE</option>
                                <option value="PASAPORTE">Pasaporte</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <div style={{ flex: 1 }}>
                                <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    Número Documento
                                    {searchingPerson && <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>Buscando...</span>}
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    name="documentNumber"
                                    value={formData.documentNumber}
                                    onChange={handleChange}
                                    required
                                    placeholder="Ingrese documento"
                                    inputMode="numeric"
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="label">Nombres</label>
                            <input
                                type="text"
                                className="input"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Apellidos</label>
                            <input
                                type="text"
                                className="input"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>



                    <hr style={{ borderColor: 'var(--border-color)', margin: '0.5rem 0' }} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                        <div>
                            <label className="label">Perfil (Rol)</label>
                            <select
                                className="input"
                                name="profile"
                                value={formData.profile}
                                onChange={handleChange}
                                disabled={!!userToEdit} // Read-only in edit mode
                            >
                                <option value="COBRADOR">Cobrador</option>
                                <option value="ADMIN">Administrador</option>
                            </select>
                        </div>
                    </div>

                    {/* Company Selector for OWNER */}
                    {currentUser?.profile === 'OWNER' && (
                        <div>
                            <label className="label">Empresa</label>
                            <select
                                className="input"
                                name="idCompany"
                                value={formData.idCompany || ''}
                                onChange={handleChange}
                                disabled={!!userToEdit} // Read-only in edit mode
                            >
                                <option value="">Seleccione una empresa...</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.companyName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Credentials - Only for Create */}
                    {!userToEdit && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label className="label">Usuario</label>
                                <input
                                    type="text"
                                    className="input"
                                    name="username"
                                    value={formData.username}
                                    readOnly // Read only as requested
                                    disabled // Visually disabled to indicate auto-generated
                                    title="Usuario autogenerado (Empresa-DNI)"
                                    style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                                />
                            </div>
                            <div>
                                <label className="label">Contraseña</label>
                                <input
                                    type="password"
                                    className="input"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            className="btn"
                            onClick={onClose}
                            style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)' }}
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Guardando...' : (userToEdit ? 'Actualizar Usuario' : 'Crear Usuario')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
