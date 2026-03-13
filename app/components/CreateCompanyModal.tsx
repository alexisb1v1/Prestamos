'use client';

import { useState, useEffect } from 'react';
import styles from './CreateCompanyModal.module.css';
import { Company, CreateCompanyRequest, UpdateCompanyRequest } from '@/lib/types';
import { companyService } from '@/lib/companyService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    companyToEdit?: Company | null;
}

export default function CreateCompanyModal({ isOpen, onClose, onSuccess, companyToEdit }: Props) {
    const [name, setName] = useState('');
    const [label, setLabel] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (companyToEdit) {
            setName(companyToEdit.companyName);
            setLabel(companyToEdit.label || '');
        } else {
            setName('');
            setLabel('');
        }
        setError('');
    }, [companyToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (companyToEdit) {
                const request: UpdateCompanyRequest = { companyName: name };
                await companyService.update(companyToEdit.id, request);
            } else {
                const request: CreateCompanyRequest = { companyName: name, label: label || undefined };
                await companyService.create(request);
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al procesar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={styles.modal}>
                <h2 className={styles.title}>{companyToEdit ? 'Editar Empresa' : 'Nueva Empresa'}</h2>
                <p className={styles.subtitle}>
                    {companyToEdit ? 'Actualiza la información de la empresa.' : 'Crea una nueva organización en el sistema.'}
                </p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div>
                        <label className="label">Nombre de la Empresa</label>
                        <input
                            type="text"
                            className="input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Inversiones Globales S.A.C."
                            required
                            disabled={loading}
                        />
                    </div>

                    {!companyToEdit && (
                        <div>
                            <label className="label">Etiqueta (Opcional)</label>
                            <input
                                type="text"
                                className="input"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="Ej: IG"
                                maxLength={5}
                                disabled={loading}
                            />
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                Nombre corto para identificar rápido a la empresa.
                            </p>
                        </div>
                    )}

                    {error && (
                        <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <div className={styles.actions}>
                        <button
                            type="button"
                            className="btn"
                            onClick={onClose}
                            disabled={loading}
                            style={{ border: '1px solid var(--border-color)' }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || !name}
                        >
                            {loading ? 'Procesando...' : companyToEdit ? 'Guardar Cambios' : 'Crear Empresa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
