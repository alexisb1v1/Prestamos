'use client';

import { useState, useEffect } from 'react';
import { userService } from '@/lib/userService';
import { personService } from '@/lib/personService';
import { loanService } from '@/lib/loanService';
import { authService } from '@/lib/auth';
import { Person, User, CreatePersonRequest } from '@/lib/types';
import { startOfDay } from 'date-fns';

import styles from './CreateLoanModal.module.css';

interface CreateLoanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    loanToRenew?: any | null;
}

export default function CreateLoanModal({ isOpen, onClose, onSuccess, loanToRenew }: CreateLoanModalProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // Step 1: Person Search/Create State
    const [docType, setDocType] = useState('DNI');
    const [docNumber, setDocNumber] = useState('');
    const [person, setPerson] = useState<Person | null>(null);
    const [isRegisteringPerson, setIsRegisteringPerson] = useState(false);

    // New Person Form State
    const [newPerson, setNewPerson] = useState<CreatePersonRequest>({
        documentType: 'DNI',
        documentNumber: '',
        firstName: '',
        lastName: '',
        birthday: ''
    });

    // Step 2: Loan Details State
    const [amount, setAmount] = useState<number | ''>('');
    const [address, setAddress] = useState('');

    // Calculations
    const interestRate = 0.20; // 20%
    const defaultDays = 24;

    useEffect(() => {
        if (isOpen) {
            setCurrentUser(authService.getUser());
            if (loanToRenew) {
                setStep(2);
                setLoading(false);
                setError('');
                // Use personId from current loan if available
                const pid = loanToRenew.personId || loanToRenew.idPeople;

                setPerson({
                    id: pid?.toString() || '',
                    documentType: 'DNI',
                    documentNumber: loanToRenew.documentNumber,
                    firstName: loanToRenew.clientName?.split(' ')[0] || '',
                    lastName: loanToRenew.clientName?.split(' ').slice(1).join(' ') || '',
                    birthday: ''
                });
                setAmount(loanToRenew.amount);
                setAddress(loanToRenew.address);
            } else {
                resetState();
            }
        }
    }, [isOpen, loanToRenew]);

    const resetState = () => {
        setStep(1);
        setLoading(false);
        setError('');
        setDocType('DNI');
        setDocNumber('');
        setPerson(null);
        setIsRegisteringPerson(false);
        setNewPerson({
            documentType: 'DNI',
            documentNumber: '',
            firstName: '',
            lastName: '',
            birthday: ''
        });
        setAmount('');
        setAddress('');
    };

    const handleSearchPerson = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await personService.search(docType, docNumber);
            if (result) {
                setPerson(result);
                setIsRegisteringPerson(false);
            } else {
                setPerson(null);
                setIsRegisteringPerson(true);
                setNewPerson(prev => ({ ...prev, documentType: docType, documentNumber: docNumber }));
            }
        } catch (err) {
            console.error(err);
            setPerson(null);
            setIsRegisteringPerson(true);
            setNewPerson(prev => ({ ...prev, documentType: docType, documentNumber: docNumber }));
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePerson = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await personService.create(newPerson);
            if (response && response.id) {
                const createdPerson: Person = {
                    id: response.id,
                    ...newPerson
                };
                setPerson(createdPerson);
                setStep(2); // Proceed to next step
            } else {
                setError('Error al crear la persona. Intente nuevamente.');
            }
        } catch (err: any) {
            setError(err.message || 'Error al registrar persona.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateLoan = async () => {
        if (!person || !currentUser || !amount) return;

        setLoading(true);
        setError('');
        if (!person?.id || person.id === '0') {
            setError('Error: No se encontró el ID del cliente. Por favor, vuelva a buscarlo.');
            setLoading(false);
            return;
        }

        try {
            await loanService.create({
                idPeople: Number(person.id),
                amount: Number(amount),
                userId: Number(currentUser.id),
                address: address
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al crear el préstamo.');
        } finally {
            setLoading(false);
        }
    };

    const calculateLoan = () => {
        const amt = Number(amount) || 0;
        const interest = amt * interestRate;
        const total = amt + interest;
        const fee = total / defaultDays;
        return { interest, total, fee };
    };

    const { interest, total, fee } = calculateLoan();

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        {loanToRenew ? 'Renovar Préstamo' : (step === 1 ? 'Identificar Cliente' : 'Datos del Préstamo')}
                    </h2>
                    <button className={styles.closeButton} onClick={onClose}>&times;</button>
                </div>

                {error && (
                    <div style={{
                        padding: '0.75rem',
                        backgroundColor: '#fee2e2',
                        color: '#ef4444',
                        borderRadius: '0.375rem',
                        marginBottom: '1rem',
                        fontSize: '0.9rem'
                    }}>
                        {error}
                    </div>
                )}

                {step === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Search Section */}
                        {!isRegisteringPerson && !person && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <select
                                    className="input"
                                    value={docType}
                                    onChange={e => setDocType(e.target.value)}
                                    style={{ width: '80px' }}
                                >
                                    <option value="DNI">DNI</option>
                                    <option value="CE">CE</option>
                                </select>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Número de documento"
                                    value={docNumber}
                                    onChange={e => setDocNumber(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button className="btn btn-primary" onClick={handleSearchPerson} disabled={loading || !docNumber}>
                                    {loading ? '...' : 'Buscar'}
                                </button>
                            </div>
                        )}

                        {/* Person Found Summary */}
                        {person && !isRegisteringPerson && (
                            <div style={{
                                padding: '1rem',
                                backgroundColor: 'var(--bg-app)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)'
                            }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{person.firstName} {person.lastName}</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{person.documentType}: {person.documentNumber}</div>
                                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setStep(2)}>
                                        Continuar
                                    </button>
                                    <button className="btn" style={{ width: '100%', border: '1px solid var(--border-color)' }} onClick={() => { setPerson(null); setDocNumber(''); }}>
                                        Buscar otro
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Register Person Form */}
                        {isRegisteringPerson && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                    Cliente no encontrado. Por favor, regístrelo.
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem' }}>
                                    <div>
                                        <label className="label">Tipo</label>
                                        <input className="input" value={newPerson.documentType} disabled />
                                    </div>
                                    <div>
                                        <label className="label">Número</label>
                                        <input className="input" value={newPerson.documentNumber} disabled />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Nombres</label>
                                    <input
                                        className="input"
                                        value={newPerson.firstName}
                                        onChange={e => setNewPerson(prev => ({ ...prev, firstName: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="label">Apellidos</label>
                                    <input
                                        className="input"
                                        value={newPerson.lastName}
                                        onChange={e => setNewPerson(prev => ({ ...prev, lastName: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="label">F. Nacimiento</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={newPerson.birthday}
                                        onChange={e => setNewPerson(prev => ({ ...prev, birthday: e.target.value }))}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreatePerson} disabled={loading}>
                                        {loading ? 'Guardando...' : 'Guardar y Continuar'}
                                    </button>
                                    <button className="btn" style={{ flex: 1, border: '1px solid var(--border-color)' }} onClick={() => setIsRegisteringPerson(false)} disabled={loading}>
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{
                            padding: '0.75rem',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.9rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ fontWeight: 600 }}>Cliente: {person?.firstName} {person?.lastName}</span>
                            <button
                                onClick={() => setStep(1)}
                                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                Cambiar
                            </button>
                        </div>

                        <div>
                            <label className="label">Monto (S/)</label>
                            <input
                                type="number"
                                className="input"
                                value={amount}
                                onChange={e => setAmount(Number(e.target.value))}
                                placeholder="0.00"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="label">Dirección de Cobranza</label>
                            <input
                                type="text"
                                className="input"
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                                placeholder="Dirección completa"
                            />
                        </div>

                        {/* Resumen / Simulador */}
                        <div style={{
                            padding: '1rem',
                            backgroundColor: 'var(--bg-app)',
                            borderRadius: 'var(--radius-md)',
                            marginTop: '0.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Monto:</span>
                                <span>S/ {Number(amount).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Interés (20%):</span>
                                <span>S/ {interest.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Plazo:</span>
                                <span>{defaultDays} días</span>
                            </div>
                            <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--border-color)', margin: '0.25rem 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 'bold' }}>
                                <span>Total a Pagar:</span>
                                <span style={{ color: 'var(--color-primary)' }}>S/ {total.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Cuota diaria (aprox):</span>
                                <span style={{ fontWeight: 600 }}>S/ {fee.toFixed(2)}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreateLoan} disabled={loading || !amount || !address}>
                                {loading ? 'Procesando...' : 'Crear Préstamo'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
