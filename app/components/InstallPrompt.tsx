"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed - Use timeout to avoid sync setState in effect
    const checkStandalone = () => {
      if (window.matchMedia("(display-mode: standalone)").matches) {
        setIsStandalone(true);
      }
      if (localStorage.getItem("androidInstallPromptDismissed") === "true") {
        setIsDismissed(true);
      }
    };

    const timer = setTimeout(checkStandalone, 0);

    // Listen for install prompt on Android/Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      
      // Store globally for sidebar to access
      (window as any).deferredInstallPrompt = e;
      window.dispatchEvent(new Event("pwa-install-available"));
      
      // Detectar si es un dispositivo móvil
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i.test(window.navigator.userAgent);
      
      // Solo mostrar el prompt de instalación de forma automática si es móvil
      if (isMobile) {
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Detect iOS (rudimentary check)
    const nav = window.navigator as any;
    const isIOS = /iPad|iPhone|iPod/.test(nav.userAgent) && !nav.MSStream;

    if (isIOS && !window.matchMedia("(display-mode: standalone)").matches) {
      const hasSeenPrompt = localStorage.getItem("iosInstallPromptSeen");
      if (!hasSeenPrompt) {
        const timer = setTimeout(() => {
          setShowIOSPrompt(true);
        }, 0);
        return () => clearTimeout(timer);
      }
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const closeIOSPrompt = () => {
    setShowIOSPrompt(false);
    localStorage.setItem("iosInstallPromptSeen", "true");
  };

  const closeAndroidPrompt = () => {
    setIsDismissed(true);
    localStorage.setItem("androidInstallPromptDismissed", "true");
  };

  // Always return a stable wrapper to prevent hydration errors on <body>
  return (
    <div id="install-prompt-wrapper" aria-live="polite">
      {!isStandalone && deferredPrompt && !isDismissed && (
        <div className="install-prompt-container" style={{ position: "fixed" }}>
          <button 
            onClick={closeAndroidPrompt}
            style={{ position: 'absolute', top: '-10px', right: '-10px', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'white', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#64748b', cursor: 'pointer', padding: 0 }}
            aria-label="Cerrar"
          >
            ✕
          </button>
          <div className="install-prompt-content">
            <span className="install-prompt-icon">📱</span>
            <div className="install-prompt-text">
              <strong>Instalar App</strong>
              <p>Agrega la app a tu inicio para un acceso más rápido.</p>
            </div>
          </div>
          <button className="install-prompt-btn" onClick={handleInstallClick}>
            Instalar
          </button>
        </div>
      )}

      {!isStandalone && showIOSPrompt && (
        <div className="install-prompt-ios">
          <div className="install-prompt-ios-content">
            <p>Para instalar en iOS:</p>
            <ol>
              <li>
                Toca el botón <strong>Compartir</strong>{" "}
                <span style={{ fontSize: "1.2rem" }}>⎋</span>
              </li>
              <li>
                Desliza y selecciona <strong>&quot;Agregar a Inicio&quot;</strong>{" "}
                <span style={{ fontSize: "1.2rem" }}>➕</span>
              </li>
            </ol>
            <button className="install-prompt-close-btn" onClick={closeIOSPrompt}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
