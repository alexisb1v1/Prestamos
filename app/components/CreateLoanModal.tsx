'use client';

import { useState, useEffect } from 'react';
import { userService } from '@/lib/userService';
import { personService } from '@/lib/personService';
import { createLoanUseCase } from '@/app/features/loans';
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
        birthday: null
    });

    // Step 2: Loan Details State
    const [amount, setAmount] = useState<number | ''>('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [days, setDays] = useState<number>(24);

    // Calculations
    const interestRate = 0.20; // 20%

    // Rule: amount < 1000 => days = 24
    useEffect(() => {
        if (amount !== '' && Number(amount) < 1000) {
            setDays(24);
        }
    }, [amount]);

    useEffect(() => {
        if (isOpen) {
            setCurrentUser(authService.getUser());
            if (loanToRenew) {
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
                setPhone(loanToRenew.phone || '');
                setDays(24);
            } else {
                resetState();
            }
        }
    }, [isOpen, loanToRenew]);

    const resetState = () => {
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
            birthday: null
        });
        setAmount('');
        setAddress('');
        setPhone('');
        setDays(24);
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
        } catch (err: any) {
            // Ignoramos el volcado rojo de Next.js si es simplemente que no lo encontró
            if (err?.statusCode !== 404 && !err?.message?.toLowerCase().includes('not found')) {
                console.warn('Búsqueda de cliente:', err.message || err);
            }
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

        if (Number(days) < 24) {
            setError('La cantidad mínima de días es 24.');
            return;
        }

        setLoading(true);
        setError('');
        if (!person?.id || person.id === '0') {
            setError('Error: No se encontró el ID del cliente. Por favor, vuelva a buscarlo.');
            setLoading(false);
            return;
        }

        const payload = {
            idPeople: Number(person.id),
            amount: Number(amount),
            userId: Number(currentUser.id),
            address: address,
            phone: phone,
            days: Number(days)
        };

        const result = await createLoanUseCase.execute(payload);
        
        result.match(
            () => {
                onSuccess();
                onClose();
            },
            (err) => {
                setError(err.message || 'Error al crear el préstamo.');
            }
        );
        setLoading(false);
    };

    const calculateLoan = () => {
        const amt = Number(amount) || 0;
        const interest = amt * interestRate;
        const total = amt + interest;
        const fee = total / (Number(days) || 24);
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
                        {loanToRenew ? 'Renovar Préstamo' : 'Nuevo Préstamo'}
                    </h2>
                    <button className={styles.closeButton} onClick={onClose}>&times;</button>
                </div>

                {error && (
                    <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* SECCIÓN 1: BÚSQUEDA Y CREACIÓN DE CLIENTE */}
                    {!person && !isRegisteringPerson && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <select className="input" value={docType} onChange={e => setDocType(e.target.value)} style={{ width: '80px', backgroundColor: 'var(--bg-app)' }}>
                                <option value="DNI">DNI</option>
                                <option value="CE">CE</option>
                            </select>
                            <input type="text" className="input" placeholder={`Buscar por ${docType}...`} value={docNumber} onChange={e => setDocNumber(e.target.value)} style={{ flex: 1, backgroundColor: 'var(--bg-app)' }} />
                            <button className="btn btn-primary" onClick={handleSearchPerson} disabled={loading || !docNumber}>
                                {loading ? '...' : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="20" height="20">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    )}

                    {person && !isRegisteringPerson && (
                        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                            <div>
                                <span style={{ fontWeight: 600, color: 'var(--color-primary)', display: 'block', textTransform: 'uppercase', fontSize: '0.7rem' }}>Cliente Seleccionado</span>
                                <span style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{person.firstName} {person.lastName} <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 'normal' }}>({person.documentType} {person.documentNumber})</span></span>
                            </div>
                            {!loanToRenew && (
                                <button onClick={() => { setPerson(null); setDocNumber(''); }} style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '50%', color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Cambiar Cliente">
                                    &times;
                                </button>
                            )}
                        </div>
                    )}

                    {isRegisteringPerson && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 600 }}>
                                ⚠️ Cliente no encontrado. Por favor, regístrelo:
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem' }}>
                                <div><label className="label" style={{ fontSize: '0.75rem' }}>Tipo</label><input className="input" value={newPerson.documentType} disabled style={{ backgroundColor: 'var(--bg-card)' }} /></div>
                                <div><label className="label" style={{ fontSize: '0.75rem' }}>Número</label><input className="input" value={newPerson.documentNumber} disabled style={{ backgroundColor: 'var(--bg-card)' }} /></div>
                            </div>
                            <div><label className="label" style={{ fontSize: '0.75rem' }}>Nombres</label><input className="input" value={newPerson.firstName} onChange={e => setNewPerson(prev => ({ ...prev, firstName: e.target.value }))} autoFocus /></div>
                            <div><label className="label" style={{ fontSize: '0.75rem' }}>Apellidos</label><input className="input" value={newPerson.lastName} onChange={e => setNewPerson(prev => ({ ...prev, lastName: e.target.value }))} /></div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreatePerson} disabled={loading || !newPerson.firstName || !newPerson.lastName}>{loading ? 'Guardando...' : 'Guardar y Continuar'}</button>
                                <button className="btn" style={{ flex: 1, border: '1px solid var(--border-color)', backgroundColor: 'transparent' }} onClick={() => setIsRegisteringPerson(false)} disabled={loading}>Cancelar</button>
                            </div>
                        </div>
                    )}

                    {/* SECCIÓN 2: DATOS DEL PRÉSTAMO */}
                    {person && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.3s ease-in-out', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                            <div>
                                <label className="label">Monto (S/)</label>
                                <input 
                                    type="number" 
                                    className="input" 
                                    value={amount} 
                                    onChange={e => setAmount(Number(e.target.value))} 
                                    placeholder="0.00" 
                                    inputMode="decimal"
                                    autoFocus 
                                />
                                <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: (amount === '' || Number(amount) < 1000) ? 'var(--color-primary)' : 'var(--text-secondary)', fontWeight: '600', minHeight: '1.2em' }}>
                                    {(amount === '' || Number(amount) < 1000) ? 'ℹ️ Montos menores a S/ 1,000 tienen un plazo fijo de 24 días.' : '✅ Monto mayor o igual a S/ 1,000 permite plazos personalizados.'}
                                </p>
                            </div>
                            <div>
                                <label className="label">Dirección de Cobranza</label>
                                <input type="text" className="input" value={address} onChange={e => setAddress(e.target.value)} placeholder="Agrega aquí la dirección" />
                            </div>
                            <div>
                                <label className="label">Teléfono / WhatsApp</label>
                                <input 
                                    type="tel" 
                                    className="input" 
                                    value={phone} 
                                    onChange={e => setPhone(e.target.value)} 
                                    placeholder="Ej: 987654321" 
                                    inputMode="tel"
                                />
                            </div>
                            <div>
                                <label className="label">Días del Préstamo</label>
                                <input type="number" className={`input ${amount !== '' && Number(amount) < 1000 ? styles.disabledInput : ''}`} value={days} onChange={e => setDays(Number(e.target.value))} min={24} placeholder="24" disabled={amount !== '' && Number(amount) < 1000} />
                            </div>
                            {/* Resumen */}
                            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}><span style={{ color: 'var(--text-secondary)' }}>Monto:</span><span>S/ {Number(amount || 0).toFixed(2)}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}><span style={{ color: 'var(--text-secondary)' }}>Interés (20%):</span><span>S/ {interest.toFixed(2)}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}><span style={{ color: 'var(--text-secondary)' }}>Plazo:</span><span>{days} días</span></div>
                                <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--border-color)', margin: '0.25rem 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 'bold' }}><span>Total a Pagar:</span><span style={{ color: 'var(--color-primary)' }}>S/ {total.toFixed(2)}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '0.25rem' }}><span style={{ color: 'var(--text-secondary)' }}>Cuota diaria (aprox):</span><span style={{ fontWeight: 600 }}>S/ {fee.toFixed(2)}</span></div>
                            </div>
                            <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 'bold', marginTop: '0.5rem' }} onClick={handleCreateLoan} disabled={loading || !amount || !address}>
                                {loading ? 'Procesando...' : 'Crear Préstamo'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
