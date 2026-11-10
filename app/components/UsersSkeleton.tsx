import React from "react";
import styles from "./LoansSkeleton.module.css";

interface UsersSkeletonProps {
  isMobile?: boolean;
}

export default function UsersSkeleton({ isMobile = false }: UsersSkeletonProps) {
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="card"
            style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                className={styles.skeletonPulse}
                style={{ width: "48px", height: "48px", borderRadius: "12px", flexShrink: 0 }}
              ></div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
                <div className={styles.skeletonPulse} style={{ width: "60%", height: "16px" }}></div>
                <div className={styles.skeletonPulse} style={{ width: "40%", height: "12px" }}></div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <div className={styles.skeletonPulse} style={{ flex: 1, height: "34px", borderRadius: "8px" }}></div>
              <div className={styles.skeletonPulse} style={{ width: "34px", height: "34px", borderRadius: "8px" }}></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "1rem",
            gap: "1.5rem",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <div className={styles.skeletonPulse} style={{ width: "30%", height: "20px" }}></div>
          <div className={styles.skeletonPulse} style={{ width: "20%", height: "20px" }}></div>
          <div className={styles.skeletonPulse} style={{ width: "20%", height: "20px" }}></div>
          <div className={styles.skeletonPulse} style={{ width: "15%", height: "20px" }}></div>
          <div className={styles.skeletonPulse} style={{ width: "15%", height: "32px", borderRadius: "8px" }}></div>
        </div>
      ))}
    </div>
  );
}

