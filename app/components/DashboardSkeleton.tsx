import React from "react";
import styles from "./DashboardSkeleton.module.css";

interface DashboardSkeletonProps {
  isMobile?: boolean;
}

export default function DashboardSkeleton({ isMobile = false }: DashboardSkeletonProps) {
  return (
    <div className={styles.skeletonContainer}>
      {/* Skeleton de Cabecera */}
      <div className={styles.headerRow}>
        <div className={`${styles.skeletonPulse} ${styles.titleSkeleton}`}></div>
        <div className={`${styles.skeletonPulse} ${styles.badgeSkeleton}`}></div>
      </div>

      {/* Skeleton de Métricas */}
      {isMobile ? (
        <div className={styles.mobileMetricsGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`${styles.skeletonPulse} ${styles.metricCardMobile}`}></div>
          ))}
        </div>
      ) : (
        <div className={styles.desktopMetricsGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`${styles.skeletonPulse} ${styles.metricCardDesktop}`}></div>
          ))}
        </div>
      )}

      {/* Skeleton de Buscador */}
      <div className={`${styles.skeletonPulse} ${styles.searchBarSkeleton}`}></div>

      {/* Skeleton de Tarjetas de Clientes (3 simuladas) */}
      <div className={styles.clientCardsList}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.clientCardSkeleton}>
            <div className={styles.clientCardHeader}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <div className={`${styles.skeletonPulse} ${styles.clientNameLine}`}></div>
                <div className={`${styles.skeletonPulse} ${styles.clientMetaLine}`}></div>
              </div>
            </div>

            <div className={`${styles.skeletonPulse} ${styles.clientFinancialBox}`}></div>

            <div className={styles.clientAddressRow}>
              <div className={`${styles.skeletonPulse} ${styles.clientAddressLine}`}></div>
              <div className={`${styles.skeletonPulse} ${styles.clientPhoneCircle}`}></div>
            </div>

            <div className={styles.clientActionsRow}>
              <div className={`${styles.skeletonPulse} ${styles.clientActionBtn}`}></div>
              <div className={`${styles.skeletonPulse} ${styles.clientIconBtn}`}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

