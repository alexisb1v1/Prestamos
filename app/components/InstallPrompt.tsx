'use client';

import { useState, useEffect } from 'react';
import styles from './InstallPrompt.module.css';

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showIOSPrompt, setShowIOSPrompt] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsStandalone(true);
        }

        // Listen for install prompt on Android/Desktop
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Detect iOS (rudimentary check)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        if (isIOS && !window.matchMedia('(display-mode: standalone)').matches) {
            // Show iOS instructions only if not already installed
            // You might want to persist this in localStorage so it doesn't show every time
            const hasSeenPrompt = localStorage.getItem('iosInstallPromptSeen');
            if (!hasSeenPrompt) {
                setShowIOSPrompt(true);
            }
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const closeIOSPrompt = () => {
        setShowIOSPrompt(false);
        localStorage.setItem('iosInstallPromptSeen', 'true');
    };

    if (isStandalone) return null;

    if (deferredPrompt) {
        return (
            <div className={styles.promptContainer}>
                <div className={styles.content}>
                    <span className={styles.icon}>📱</span>
                    <div className={styles.text}>
                        <strong>Instalar App</strong>
                        <p>Agrega la app a tu inicio para un acceso más rápido.</p>
                    </div>
                </div>
                <button className={styles.installBtn} onClick={handleInstallClick}>
                    Instalar
                </button>
            </div>
        );
    }

    if (showIOSPrompt) {
        return (
            <div className={styles.iosPrompt}>
                <div className={styles.iosContent}>
                    <p>Para instalar en iOS:</p>
                    <ol>
                        <li>Toca el botón <strong>Compartir</strong> <span style={{ fontSize: '1.2rem' }}>⎋</span></li>
                        <li>Desliza y selecciona <strong>"Agregar a Inicio"</strong> <span style={{ fontSize: '1.2rem' }}>➕</span></li>
                    </ol>
                    <button className={styles.closeBtn} onClick={closeIOSPrompt}>Entendido</button>
                </div>
            </div>
        );
    }

    return null;
}
