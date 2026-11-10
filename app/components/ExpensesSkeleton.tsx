import React from "react";
import styles from "./LoansSkeleton.module.css";

export default function ExpensesSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            backgroundColor: "#ffffff",
            padding: "1.25rem",
            borderRadius: "1rem",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1 }}>
            <div
              className={styles.skeletonPulse}
              style={{ width: "42px", height: "42px", borderRadius: "0.75rem", flexShrink: 0 }}
            ></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
              <div
                className={styles.skeletonPulse}
                style={{ width: "50%", height: "16px" }}
              ></div>
              <div
                className={styles.skeletonPulse}
                style={{ width: "35%", height: "12px" }}
              ></div>
            </div>
          </div>
          <div
            className={styles.skeletonPulse}
            style={{ width: "70px", height: "22px", borderRadius: "6px" }}
          ></div>
        </div>
      ))}
    </div>
  );
}

