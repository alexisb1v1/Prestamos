import React, { useEffect, useState } from 'react';

interface AnimatedNumberProps {
    value: number;
    isCurrency?: boolean;
    duration?: number;
}

// Función de suavizado tipo "Ease-Out Exponential" (rápido al inicio, lento al final)
const easeOutExpo = (t: number): number => {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

export default function AnimatedNumber({ value, isCurrency = false, duration = 1200 }: AnimatedNumberProps) {
    const [displayValue, setDisplayValue] = useState<string>('');

    useEffect(() => {
        let startTime: number | null = null;
        let animationFrameId: number;

        // Función de formateo (Soles peruanos o número entero)
        const formatValue = (val: number) => {
            if (isCurrency) {
                return `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
            return Math.floor(val).toString();
        };

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;

            if (progress < duration) {
                // Calcular qué porcentaje del tiempo ha pasado (0 a 1)
                const timeFraction = progress / duration;
                // Aplicar la curva de suavizado
                const easeProgress = easeOutExpo(timeFraction);
                // Interpolar el valor actual entre 0 y el valor final
                const currentVal = easeProgress * value;

                setDisplayValue(formatValue(currentVal));
                animationFrameId = requestAnimationFrame(animate);
            } else {
                // Al finalizar el tiempo, fijar el valor exacto exacto
                setDisplayValue(formatValue(value));
            }
        };

        // Iniciar en 0 formateado
        setDisplayValue(formatValue(0));
        animationFrameId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [value, isCurrency, duration]);

    return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{displayValue}</span>;
}
