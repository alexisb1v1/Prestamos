'use client';

import { useState } from 'react';
import { expenseService } from '@/lib/expenseService';
import { authService } from '@/lib/auth';
import styles from './CreateExpenseModal.module.css';

interface CreateExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateExpenseModal({ isOpen, onClose, onSuccess }: CreateExpenseModalProps) {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const user = authService.getUser();
            if (!user) throw new Error('No user found');

            await expenseService.create({
                description,
                amount: parseFloat(amount),
                userId: user.id
            });

            // Reset form
            setDescription('');
            setAmount('');

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating expense:', error);
            alert('Error al registrar el gasto');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Registrar Gasto</h2>
                    <button className={styles.closeButton} onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Descripción</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ej: Pasajes, Almuerzo"
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Monto (S/)</label>
                        <input
                            type="number"
                            step="0.10"
                            className={styles.input}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={loading}
                    >
                        {loading ? 'Registrando...' : 'Guardar Gasto'}
                    </button>
                </form>
            </div>
        </div>
    );
}
