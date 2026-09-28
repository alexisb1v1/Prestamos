"use client";

import { MapPin, Phone, Banknote, GripVertical, Eye } from "lucide-react";
import styles from "./ClientCard.module.css";
import { DashboardLoan } from "@/app/features/loans/models/loan.model";

interface ClientCardProps {
  loan: DashboardLoan;
  onPayClick: (loan: DashboardLoan) => void;
  onDetailsClick?: (loan: DashboardLoan) => void;
  renderMenu?: () => React.ReactNode;
  showDragHandle?: boolean;
  dragHandleProps?: any;
  isDragging?: boolean;
}

export default function ClientCard({ 
  loan, 
  onPayClick,
  onDetailsClick,
  renderMenu,
  showDragHandle,
  dragHandleProps,
  isDragging
}: ClientCardProps) {
  // Iniciales del cliente
  const initials = loan.clientName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Cálculos financieros
  const totalAmount = loan.amount + loan.interest;
  const saldo = loan.remainingAmount;
  const planTotal = totalAmount;
  const cuotaDiaria = loan.fee;
  
  const cuotasPagadas = Math.floor((planTotal - saldo) / cuotaDiaria);
  const totalCuotas = loan.days;
  const progressPercent = Math.min(100, Math.max(0, (cuotasPagadas / totalCuotas) * 100));

  // Determinar estado
  // Si la fecha actual > endDate y saldo > 0 -> Vencido
  // Si no, si paidToday > 0 -> Al día
  // Si no, Mora Leve
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(loan.endDate);
  fin.setHours(0, 0, 0, 0);

  let status: "vencido" | "mora" | "aldia" = "aldia";
  let statusText = "Al Día";

  if (saldo > 0 && hoy > fin) {
    status = "vencido";
    statusText = "Vencido";
  } else if (loan.paidToday === 0) {
    status = "mora";
    statusText = "Mora Leve";
  } else {
    status = "aldia";
    statusText = "Al Día";
  }

  // Si ya pagó todo
  if (saldo <= 0) {
    status = "aldia";
    statusText = "Cancelado";
  }

  return (
    <article className={`${styles.card} ${isDragging ? styles.dragging : ""}`}>
      {/* Header: Avatar, Info, Handle */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <div className={`${styles.avatar} ${styles[status]}`}>
            {initials}
          </div>
          <div className={styles.clientDetails}>
            <div className={styles.titleRow}>
              <h2 className={styles.clientName}>{loan.clientName}</h2>
              <span className={`${styles.badge} ${styles[status]}`}>
                {statusText}
              </span>
            </div>
            <span className={styles.document}>DNI: {loan.documentNumber}</span>
          </div>
        </div>
        
        {showDragHandle && (
          <button 
            className={styles.dragHandle} 
            type="button" 
            aria-label="Reordenar cliente"
            {...dragHandleProps}
          >
            <GripVertical size={18} />
          </button>
        )}
      </div>

      {/* Datos del Préstamo */}
      <div className={styles.loanData}>
        <div className={styles.gridData}>
          <div className={styles.gridItem}>
            <span className={styles.dataLabel}>Plan</span>
            <div className={styles.dataValue}>S/ {planTotal.toFixed(2)}</div>
          </div>
          <div className={`${styles.gridItem} ${styles.center}`}>
            <span className={styles.dataLabel}>Saldo</span>
            <div className={styles.dataValue}>S/ {saldo.toFixed(2)}</div>
          </div>
          <div className={`${styles.gridItem} ${styles.right}`}>
            <span className={styles.dataLabel}>Cuota diaria</span>
            <div className={styles.dataValue}>S/ {cuotaDiaria.toFixed(2)}</div>
          </div>
        </div>

        <div className={styles.progressContainer}>
          <div className={styles.progressHeader}>
            <span>Progreso: {cuotasPagadas} de {totalCuotas} cuotas</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className={styles.progressBarBg}>
            <div 
              className={`${styles.progressBarFill} ${styles[status]}`} 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Dirección y Contacto */}
      <div className={styles.contactRow}>
        <div className={styles.contactAddress}>
          <MapPin size={16} />
          <span className={styles.addressText}>{loan.address || "Sin dirección"}</span>
        </div>
        <div className={styles.contactActions}>
          {loan.phone && (
            <a href={`tel:${loan.phone}`} className={styles.phoneBtn} title={`Llamar al ${loan.phone}`}>
              <Phone size={14} />
            </a>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className={styles.actionsRow}>
        <button 
          className={styles.btnCobrar} 
          onClick={() => onPayClick(loan)}
          disabled={saldo <= 0}
          style={{ opacity: saldo <= 0 ? 0.5 : 1 }}
        >
          <Banknote size={18} />
          COBRAR S/ {cuotaDiaria.toFixed(2)}
        </button>
        {onDetailsClick && (
          <button className={styles.btnIcon} title="Ver Detalle" onClick={() => onDetailsClick(loan)}>
            <Eye size={18} />
          </button>
        )}
        {renderMenu && renderMenu()}
      </div>
    </article>
  );
}
