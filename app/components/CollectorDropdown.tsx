"use client";

import React, { useState, useEffect, useRef } from "react";
import { User } from "@/app/features/users";
import { UserRound, ChevronDown, CheckCircle2, Users } from "lucide-react";

export interface CollectorDropdownProps {
  collectors: User[];
  selectedCollectorId: string;
  onSelectCollector: (collectorId: string) => void;
  allowAll?: boolean;
  allLabel?: string;
  placeholder?: string;
  isMobile?: boolean;
  width?: string;
  triggerStyle?: React.CSSProperties;
}

export default function CollectorDropdown({
  collectors,
  selectedCollectorId,
  onSelectCollector,
  allowAll = false,
  allLabel = "Todos los cobradores",
  placeholder = "Seleccionar Cobrador...",
  isMobile = false,
  width,
  triggerStyle,
}: CollectorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCollector = collectors.find(
    (c) => c.id.toString() === selectedCollectorId.toString()
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSelect = (id: string) => {
    onSelectCollector(id);
    setIsOpen(false);
  };

  const getButtonLabel = () => {
    if (selectedCollector) {
      return `${selectedCollector.firstName} ${selectedCollector.lastName}`.trim() || selectedCollector.username;
    }
    if (allowAll && selectedCollectorId === "") {
      return allLabel;
    }
    return placeholder;
  };

  const getSelectedInitials = () => {
    if (!selectedCollector) return "";
    const first = selectedCollector.firstName?.charAt(0) || "";
    const last = selectedCollector.lastName?.charAt(0) || "";
    return `${first}${last}`.toUpperCase() || selectedCollector.username.slice(0, 2).toUpperCase();
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "relative",
        width: width || (isMobile ? "100%" : "auto"),
        boxSizing: "border-box",
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#ffffff",
          borderRadius: "2rem",
          padding: isMobile ? "0.45rem 0.75rem" : "0.5rem 0.95rem",
          border: isOpen
            ? "1px solid var(--color-primary, #4147eb)"
            : "1px solid var(--border-color, #e2e8f0)",
          gap: "8px",
          boxShadow: isOpen
            ? "0 0 0 3px color-mix(in srgb, var(--color-primary, #4147eb) 12%, transparent)"
            : "0 1px 3px rgba(0,0,0,0.03)",
          width: width || (isMobile ? "100%" : "250px"),
          boxSizing: "border-box",
          cursor: "pointer",
          transition: "all 0.2s ease",
          outline: "none",
          ...triggerStyle,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: 0,
            flex: 1,
          }}
        >
          {selectedCollector ? (
            <div
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                background:
                  "color-mix(in srgb, var(--color-primary, #4147eb) 12%, transparent)",
                color: "var(--color-primary, #4147eb)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {getSelectedInitials()}
            </div>
          ) : allowAll && selectedCollectorId === "" ? (
            <div
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                background: "#f1f5f9",
                color: "#64748b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Users size={12} />
            </div>
          ) : (
            <UserRound
              size={15}
              color="var(--color-primary, #4147eb)"
              style={{ flexShrink: 0 }}
            />
          )}

          <span
            style={{
              fontSize: isMobile ? "12px" : "13px",
              fontWeight: 600,
              color: selectedCollector || (allowAll && selectedCollectorId === "") ? "#0f172a" : "#64748b",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {getButtonLabel()}
          </span>
        </div>

        <ChevronDown
          size={15}
          color="#64748b"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            flexShrink: 0,
          }}
        />
      </button>

      {/* Floating Popover Dropdown */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: isMobile ? "100%" : "280px",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            boxShadow:
              "0 12px 30px -4px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.05)",
            border: "1px solid var(--border-color, #e2e8f0)",
            padding: "6px",
            zIndex: 100,
            maxHeight: "280px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {allowAll && (
            <div
              onClick={() => handleSelect("")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "10px",
                cursor: "pointer",
                backgroundColor:
                  selectedCollectorId === ""
                    ? "color-mix(in srgb, var(--color-primary, #4147eb) 8%, transparent)"
                    : "transparent",
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (selectedCollectorId !== "")
                  e.currentTarget.style.backgroundColor = "#f8f9fa";
              }}
              onMouseLeave={(e) => {
                if (selectedCollectorId !== "")
                  e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    background:
                      selectedCollectorId === ""
                        ? "linear-gradient(135deg, var(--color-primary, #4147eb), var(--color-primary-hover, #353bd6))"
                        : "#f1f5f9",
                    color: selectedCollectorId === "" ? "#ffffff" : "#64748b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Users size={14} />
                </div>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: selectedCollectorId === "" ? 700 : 600,
                    color:
                      selectedCollectorId === ""
                        ? "var(--color-primary, #4147eb)"
                        : "#0f172a",
                  }}
                >
                  {allLabel}
                </span>
              </div>
              {selectedCollectorId === "" && (
                <CheckCircle2
                  size={16}
                  color="var(--color-primary, #4147eb)"
                  style={{ flexShrink: 0, marginLeft: "8px" }}
                />
              )}
            </div>
          )}

          <div
            style={{
              padding: "6px 12px 4px 12px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Cobradores ({collectors.length})
          </div>

          {collectors.length === 0 ? (
            <div
              style={{
                padding: "16px 12px",
                fontSize: "13px",
                color: "#94a3b8",
                textAlign: "center",
              }}
            >
              No hay cobradores disponibles
            </div>
          ) : (
            collectors.map((c) => {
              const isSelected = selectedCollectorId.toString() === c.id.toString();
              const first = c.firstName?.charAt(0) || "";
              const last = c.lastName?.charAt(0) || "";
              const initials = `${first}${last}`.toUpperCase() || c.username.slice(0, 2).toUpperCase();
              const fullName = `${c.firstName} ${c.lastName}`.trim() || c.username;

              return (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c.id.toString())}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    backgroundColor: isSelected
                      ? "color-mix(in srgb, var(--color-primary, #4147eb) 8%, transparent)"
                      : "transparent",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.backgroundColor = "#f8f9fa";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "8px",
                        background: isSelected
                          ? "linear-gradient(135deg, var(--color-primary, #4147eb), var(--color-primary-hover, #353bd6))"
                          : "color-mix(in srgb, var(--color-primary, #4147eb) 12%, transparent)",
                        color:
                          isSelected ? "#ffffff" : "var(--color-primary, #4147eb)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: isSelected ? 700 : 600,
                          color: isSelected
                            ? "var(--color-primary, #4147eb)"
                            : "#0f172a",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {fullName}
                      </span>
                      {c.documentNumber && (
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                          DNI: {c.documentNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <CheckCircle2
                      size={16}
                      color="var(--color-primary, #4147eb)"
                      style={{ flexShrink: 0, marginLeft: "8px" }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
