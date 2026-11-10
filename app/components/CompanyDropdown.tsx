"use client";

import React, { useState, useEffect, useRef } from "react";
import { Building2, ChevronDown, CheckCircle2, Building } from "lucide-react";

export interface CompanyItem {
  id: string;
  companyName: string;
  label?: string;
  subdomain?: string;
}

export interface CompanyDropdownProps {
  companies: CompanyItem[];
  selectedCompanyId: string;
  onSelectCompany: (companyId: string) => void;
  allowAll?: boolean;
  allLabel?: string;
  placeholder?: string;
  isMobile?: boolean;
  width?: string;
  triggerStyle?: React.CSSProperties;
}

export default function CompanyDropdown({
  companies,
  selectedCompanyId,
  onSelectCompany,
  allowAll = true,
  allLabel = "Todas las empresas",
  placeholder = "Seleccionar Empresa...",
  isMobile = false,
  width,
  triggerStyle,
}: CompanyDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCompany = companies.find(
    (c) => c.id.toString() === selectedCompanyId.toString()
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
    onSelectCompany(id);
    setIsOpen(false);
  };

  const getButtonLabel = () => {
    if (selectedCompany) {
      return selectedCompany.companyName;
    }
    if (allowAll && selectedCompanyId === "") {
      return allLabel;
    }
    return placeholder;
  };

  const getSelectedInitials = () => {
    if (!selectedCompany) return "";
    const parts = selectedCompany.companyName.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return selectedCompany.companyName.slice(0, 2).toUpperCase();
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
            : "1.5px solid #a5b4fc",
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
          {selectedCompany ? (
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
          ) : allowAll && selectedCompanyId === "" ? (
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
              <Building size={12} />
            </div>
          ) : (
            <Building2
              size={15}
              color="var(--color-primary, #4147eb)"
              style={{ flexShrink: 0 }}
            />
          )}

          <span
            style={{
              fontSize: isMobile ? "12px" : "13px",
              fontWeight: 600,
              color: selectedCompany || (allowAll && selectedCompanyId === "") ? "#0f172a" : "#64748b",
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
                  selectedCompanyId === ""
                    ? "color-mix(in srgb, var(--color-primary, #4147eb) 8%, transparent)"
                    : "transparent",
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (selectedCompanyId !== "")
                  e.currentTarget.style.backgroundColor = "#f8f9fa";
              }}
              onMouseLeave={(e) => {
                if (selectedCompanyId !== "")
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
                      selectedCompanyId === ""
                        ? "linear-gradient(135deg, var(--color-primary, #4147eb), var(--color-primary-hover, #353bd6))"
                        : "#f1f5f9",
                    color: selectedCompanyId === "" ? "white" : "#64748b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Building size={14} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: selectedCompanyId === "" ? 700 : 500,
                      color:
                        selectedCompanyId === ""
                          ? "var(--color-primary, #4147eb)"
                          : "#1e293b",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {allLabel}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: "11px",
                      color: "#94a3b8",
                    }}
                  >
                    Ver todas las empresas
                  </span>
                </div>
              </div>
              {selectedCompanyId === "" && (
                <CheckCircle2
                  size={16}
                  color="var(--color-primary, #4147eb)"
                  style={{ flexShrink: 0 }}
                />
              )}
            </div>
          )}

          {companies.map((c) => {
            const isSelected = selectedCompanyId.toString() === c.id.toString();
            const parts = c.companyName.trim().split(" ");
            const initials =
              parts.length >= 2
                ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
                : c.companyName.slice(0, 2).toUpperCase();

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
                  if (!isSelected) e.currentTarget.style.backgroundColor = "#f8f9fa";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
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
                      background: isSelected
                        ? "linear-gradient(135deg, var(--color-primary, #4147eb), var(--color-primary-hover, #353bd6))"
                        : "color-mix(in srgb, var(--color-primary, #4147eb) 10%, transparent)",
                      color: isSelected ? "white" : "var(--color-primary, #4147eb)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected
                          ? "var(--color-primary, #4147eb)"
                          : "#1e293b",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {c.companyName}
                    </span>
                    {c.subdomain && (
                      <span
                        style={{
                          display: "block",
                          fontSize: "11px",
                          color: "#94a3b8",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {c.subdomain}
                      </span>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <CheckCircle2
                    size={16}
                    color="var(--color-primary, #4147eb)"
                    style={{ flexShrink: 0 }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

