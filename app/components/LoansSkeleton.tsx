import React from "react";
import styles from "./LoansSkeleton.module.css";

interface LoansSkeletonProps {
  isMobile?: boolean;
}

export default function LoansSkeleton({ isMobile = false }: LoansSkeletonProps) {
  if (isMobile) {
    return (
      <div className={styles.mobileCardsList}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.cardSkeleton}>
            <div className={styles.cardHeader}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <div className={`${styles.skeletonPulse} ${styles.nameLine}`}></div>
                <div className={`${styles.skeletonPulse} ${styles.metaLine}`}></div>
              </div>
            </div>

            <div className={`${styles.skeletonPulse} ${styles.financialBox}`}></div>

            <div className={styles.addressRow}>
              <div className={`${styles.skeletonPulse} ${styles.addressLine}`}></div>
              <div className={`${styles.skeletonPulse} ${styles.phoneCircle}`}></div>
            </div>

            <div className={styles.actionsRow}>
              <div className={`${styles.skeletonPulse} ${styles.actionBtn}`}></div>
              <div className={`${styles.skeletonPulse} ${styles.iconBtn}`}></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.tableSkeletonWrapper}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={styles.tableRowSkeleton}>
          <div className={`${styles.skeletonPulse} ${styles.col1}`}></div>
          <div className={`${styles.skeletonPulse} ${styles.col2}`}></div>
          <div className={`${styles.skeletonPulse} ${styles.col3}`}></div>
          <div className={`${styles.skeletonPulse} ${styles.col4}`}></div>
          <div className={`${styles.skeletonPulse} ${styles.col5}`}></div>
          <div className={`${styles.skeletonPulse} ${styles.col6}`}></div>
        </div>
      ))}
    </div>
  );
}

