'use client';

import { useState, useRef, useEffect } from 'react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addDays,
    isBefore,
    isAfter,
    parseISO,
    startOfDay
} from 'date-fns';
import { es } from 'date-fns/locale';

interface DateRangePickerProps {
    startDate: string; // ISO string YYYY-MM-DD
    endDate: string;   // ISO string YYYY-MM-DD
    onChange: (start: string, end: string) => void;
}

export default function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(parseISO(startDate));
    const [tempStart, setTempStart] = useState<Date | null>(parseISO(startDate));
    const [tempEnd, setTempEnd] = useState<Date | null>(parseISO(endDate));
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const onDateClick = (day: Date) => {
        if (!tempStart || (tempStart && tempEnd)) {
            setTempStart(day);
            setTempEnd(null);
        } else if (tempStart && !tempEnd) {
            if (isBefore(day, tempStart)) {
                setTempStart(day);
                setTempEnd(null);
            } else {
                setTempEnd(day);
                onChange(format(tempStart, 'yyyy-MM-dd'), format(day, 'yyyy-MM-dd'));
                setIsOpen(false);
            }
        }
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const renderHeader = () => {
        return (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 0.5rem' }}>
                <button onClick={(e) => { e.preventDefault(); prevMonth(); }} className="btn" style={{ padding: '5px 10px', minWidth: 'auto' }}>&lt;</button>
                <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                    {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </span>
                <button onClick={(e) => { e.preventDefault(); nextMonth(); }} className="btn" style={{ padding: '5px 10px', minWidth: 'auto' }}>&gt;</button>
            </div>
        );
    };

    const renderDays = () => {
        const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.5rem' }}>
                {days.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{d}</div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDateCal = startOfWeek(monthStart);
        const endDateCal = endOfWeek(monthEnd);

        const rows = [];
        let days = [];
        let day = startDateCal;
        let formattedDate = "";

        while (day <= endDateCal) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, "d");
                const cloneDay = day;

                const isSelected = (tempStart && isSameDay(day, tempStart)) || (tempEnd && isSameDay(day, tempEnd));
                const isInRange = tempStart && tempEnd && isAfter(day, tempStart) && isBefore(day, tempEnd);
                const isCurrentMonth = isSameMonth(day, monthStart);

                days.push(
                    <div
                        key={day.toString()}
                        onClick={() => onDateClick(cloneDay)}
                        style={{
                            padding: '10px 0',
                            textAlign: 'center',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            borderRadius: isSelected ? '8px' : '0',
                            backgroundColor: isSelected ? 'var(--color-primary)' : isInRange ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                            color: isSelected ? 'white' : isCurrentMonth ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: isSelected ? 'bold' : 'normal',
                            transition: 'all 0.2s'
                        }}
                    >
                        {formattedDate}
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div key={day.toString()} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div>{rows}</div>;
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <div
                className="input"
                onClick={() => setIsOpen(!isOpen)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
                <div style={{ fontSize: '0.9rem' }}>
                    {format(parseISO(startDate), 'dd/MM/yyyy')} - {format(parseISO(endDate), 'dd/MM/yyyy')}
                </div>
                <span style={{ opacity: 0.5 }}>📅</span>
            </div>

            {isOpen && (
                <div className="card" style={{
                    position: 'absolute',
                    top: '110%',
                    left: 0,
                    zIndex: 100,
                    width: '300px',
                    padding: '1rem',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)'
                }}>
                    {renderHeader()}
                    {renderDays()}
                    {renderCells()}
                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            className="btn"
                            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                            onClick={(e) => { e.preventDefault(); setIsOpen(false); }}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
