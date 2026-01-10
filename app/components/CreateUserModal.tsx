'use client';

import { useState, useEffect } from 'react';
import { userService } from '@/lib/userService';
import { CreateUserRequest, User, UpdateUserRequest } from '@/lib/types';

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userToEdit?: User | null;
}

export default function CreateUserModal({ isOpen, onClose, onSuccess, userToEdit }: CreateUserModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Initial state
    const initialFormState: CreateUserRequest & { status: 'ACTIVE' | 'INACTIVE' } = {
        username: '',
        passwordHash: '',
        profile: 'COBRADOR',
        documentType: 'DNI',
        documentNumber: '',
        firstName: '',
        lastName: '',
        birthday: '',
        status: 'ACTIVE'
    };

    const [formData, setFormData] = useState(initialFormState);

    const [searchingPerson, setSearchingPerson] = useState(false);

    // Reset logic when modal opens or userToEdit changes
    useEffect(() => {
        if (isOpen) {
            if (userToEdit) {
                setFormData({
                    username: userToEdit.username,
                    passwordHash: '', // Password not editable directly here, or handled separately
                    profile: userToEdit.profile,
                    documentType: userToEdit.documentType || 'DNI',
                    documentNumber: userToEdit.documentNumber || '',
                    firstName: userToEdit.firstName || '',
                    lastName: userToEdit.lastName || '',
                    birthday: userToEdit.birthday ? new Date(userToEdit.birthday).toISOString().split('T')[0] : '',
                    status: userToEdit.status
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

    // Re-implementation of search logic inside hook for safety and simplicity
    useEffect(() => {
        // Don't search if empty or too short
        if (!isOpen) return; // Don't search if closed
        if (!formData.documentNumber || formData.documentNumber.length < 8) return;

        const timer = setTimeout(async () => {
            setSearchingPerson(true);
            setError('');
            try {
                const person = await userService.searchPerson(formData.documentType, formData.documentNumber);
                if (person) {
                    setFormData(prev => ({
                        ...prev,
                        firstName: person.firstName,
                        lastName: person.lastName,
                        birthday: person.birthday
                    }));
                } else {
                    // This block might not be reached if API throws 404, but in case it returns null/200 OK without data:
                    setFormData(prev => ({ ...prev, firstName: '', lastName: '', birthday: '' }));
                    setError('Persona no encontrada. Puede ingresar los datos manualmente.');
                }
            } catch (err: any) {
                // Clear fields always on error/not found
                setFormData(prev => ({
                    ...prev,
                    firstName: '',
                    lastName: '',
                    birthday: ''
                }));

                if (err.statusCode === 404) {
                    // 404 means person not found, which is expected flow for new users
                    // We display a friendly message, maybe not even an error?
                    // User said: "no hay que tomarlo como error".
                    // We will set a 'warning' or just a specific message.
                    setError('Persona no registrada. Ingrese los datos manualmente.');
                } else {
                    console.error('Error searching person:', err);
                    setError('Error al realizar la búsqueda.');
                }
            } finally {
                setSearchingPerson(false);
            }
        }, 1000); // 1 second debounce

        return () => clearTimeout(timer);
    }, [formData.documentNumber, formData.documentType, isOpen]);

    if (!isOpen) return null;


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (userToEdit) {
                await userService.update(userToEdit.id, {
                    profile: formData.profile,
                    status: formData.status,
                    documentType: formData.documentType,
                    documentNumber: formData.documentNumber,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    birthday: formData.birthday
                });
            } else {
                await userService.create(formData);
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error saving user:', err);
            const msg = userToEdit ? 'Error al actualizar usuario.' : 'Error al crear usuario.';
            setError(err.message || msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            backdropFilter: 'blur(4px)'
        }}>
            <div className="card glass" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', margin: '1rem' }}>
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

                    <div>
                        <label className="label">Fecha de Nacimiento</label>
                        <input
                            type="date"
                            className="input"
                            name="birthday"
                            value={formData.birthday}
                            onChange={handleChange}
                            required
                        />
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
                            >
                                <option value="COBRADOR">Cobrador</option>
                                <option value="ADMIN">Administrador</option>
                                <option value="OWNER">Dueño</option>
                            </select>
                        </div>
                    </div>

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
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Contraseña</label>
                                <input
                                    type="password"
                                    className="input"
                                    name="passwordHash"
                                    value={formData.passwordHash}
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
