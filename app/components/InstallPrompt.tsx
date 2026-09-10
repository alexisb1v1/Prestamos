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

  useEffect(() => {
    // Check if already installed - Use timeout to avoid sync setState in effect
    const checkStandalone = () => {
      if (window.matchMedia("(display-mode: standalone)").matches) {
        setIsStandalone(true);
      }
    };

    const timer = setTimeout(checkStandalone, 0);

    // Listen for install prompt on Android/Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      
      // Detectar si es un dispositivo móvil
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i.test(window.navigator.userAgent);
      
      // Solo mostrar el prompt de instalación si es móvil
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

  if (isStandalone) return null;

  if (deferredPrompt) {
    return (
      <div className="install-prompt-container">
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
    );
  }

  if (showIOSPrompt) {
    return (
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
    );
  }

  return null;
}
