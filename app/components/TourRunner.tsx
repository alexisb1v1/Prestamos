"use client";

import { useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { TOURS } from "@/lib/tours.config";

// Exponemos una función global (window) para lanzar los tours desde el menú o cualquier otro lado.
declare global {
  interface Window {
    startTour?: (path: string) => void;
  }
}

export default function TourRunner() {
  const pathname = usePathname();

  const startTourForPath = useCallback((targetPath: string) => {
    // Buscar la configuración del tour usando la ruta exacta, omitiendo query params si los hubiera
    const tourKey = Object.keys(TOURS).find((key) => TOURS[key].path === targetPath);
    const tourConfig = tourKey ? TOURS[tourKey] : null;

    if (tourConfig) {
      // Filtrar dinámicamente los pasos para omitir aquellos cuyos elementos
      // no existen en el DOM (ej. botones de admin que no ve un cobrador)
      const activeSteps = tourConfig.steps.filter(
        (step) => !step.element || document.querySelector(step.element) !== null
      );

      if (activeSteps.length === 0) return;

      const driverObj = driver({
        showProgress: true,
        nextBtnText: 'Siguiente',
        prevBtnText: 'Anterior',
        doneBtnText: 'Terminar',
        steps: activeSteps,
        onNextClick: () => {
          driverObj.moveNext();
        },
        onPopoverRender: (popover, { config, state }) => {
          popover.wrapper.style.borderRadius = "12px";
          popover.wrapper.style.border = "1px solid #e2e8f0";
          popover.wrapper.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
        }
      });

      driverObj.drive();

      // Marcar como visto al iniciar
      if (typeof window !== 'undefined') {
        localStorage.setItem(tourConfig.storageKey, "true");
      }
    }
  }, []);

  // Exponer a nivel de ventana para invocarlo desde cualquier parte (ej. Sidebar)
  useEffect(() => {
    window.startTour = startTourForPath;
    return () => {
      delete window.startTour;
    };
  }, [startTourForPath]);

  // Autoejecución
  useEffect(() => {
    if (!pathname) return;
    
    const tourKey = Object.keys(TOURS).find((key) => TOURS[key].path === pathname);
    if (!tourKey) return;
    
    const tourConfig = TOURS[tourKey];
    
    // Si no ha sido visto, lo lanzamos automáticamente tras un pequeño delay (para que cargue el DOM)
    const hasSeenTour = localStorage.getItem(tourConfig.storageKey);
    if (!hasSeenTour) {
      const timer = setTimeout(() => {
        startTourForPath(pathname);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [pathname, startTourForPath]);

  return null; // Es un componente invisible
}
