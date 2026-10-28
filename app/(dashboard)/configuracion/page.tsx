"use client";

import { useState, useEffect, useRef } from "react";
import {
  Palette,
  Sliders,
  ShieldCheck,
  KeyRound,
  Upload,
  RotateCcw,
  Save,
  CheckCircle2,
  Info,
  Building2,
  Sparkles,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import ChangePasswordModal from "@/app/components/ChangePasswordModal";
import { CompanyRepositoryImpl } from "@/app/features/companies/repositories/company.repository.impl";
import { Company } from "@/app/features/companies/models/company.model";
import { usePermissions } from "@/hooks/usePermissions";

const companyRepo = new CompanyRepositoryImpl();

// Paletas de color sugeridas preestablecidas
const PRESET_COLORS = [
  { name: "Índigo Neo (Original)", primary: "#4147eb", secondary: "#100069" },
  { name: "Verde Esmeralda Pro", primary: "#059669", secondary: "#064e3b" },
  { name: "Azul Cobalto Fintech", primary: "#0284c7", secondary: "#0c4a6e" },
  { name: "Violeta Corporativo", primary: "#7c3aed", secondary: "#3b0764" },
  { name: "Ámbar & Dorado", primary: "#d97706", secondary: "#78350f" },
  { name: "Negro Obsidiana", primary: "#1e293b", secondary: "#0f172a" },
];

export default function ConfiguracionPage() {
  const { user } = usePermissions();
  const [activeTab, setActiveTab] = useState<"branding" | "loans" | "security">("branding");
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkTabsScroll = () => {
    if (!tabsRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  };

  const scrollTabs = (direction: "left" | "right") => {
    if (!tabsRef.current) return;
    const scrollAmount = 180;
    tabsRef.current.scrollBy({
      left: direction === "right" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      checkTabsScroll();
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    // Verificar si hay scroll disponible al cargar la página
    const timer = setTimeout(checkTabsScroll, 100);
    return () => clearTimeout(timer);
  }, [isMobile]);

  // Estados de Personalización Visual (Branding)
  const [primaryColor, setPrimaryColor] = useState("#4147eb");
  const [secondaryColor, setSecondaryColor] = useState("#100069");
  const [iconUrl, setIconUrl] = useState<string>("");
  const [iconSizeKb, setIconSizeKb] = useState<number | null>(null);
  const [iconError, setIconError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de Configuración de Préstamos (Loans)
  const [defaultDays, setDefaultDays] = useState(24);
  const [defaultInterestRate, setDefaultInterestRate] = useState(20);
  const [allowCollectorOverrideOver1000, setAllowCollectorOverrideOver1000] = useState(true);

  // Cargar datos de la empresa
  useEffect(() => {
    setLoading(true);
    companyRepo.getMyCompany().match(
      (data) => {
        setCompany(data);
        const settings = data.settings || {};

        // Cargar Branding
        if (settings.branding?.primaryColor) setPrimaryColor(settings.branding.primaryColor);
        if (settings.branding?.secondaryColor) setSecondaryColor(settings.branding.secondaryColor);
        if (settings.branding?.iconUrl) setIconUrl(settings.branding.iconUrl);

        // Cargar Políticas de Préstamos
        if (settings.loans?.defaultDays !== undefined) setDefaultDays(settings.loans.defaultDays);
        if (settings.loans?.defaultInterestRate !== undefined)
          setDefaultInterestRate(settings.loans.defaultInterestRate);
        if (settings.loans?.allowCollectorOverrideOver1000 !== undefined)
          setAllowCollectorOverrideOver1000(settings.loans.allowCollectorOverrideOver1000);

        setLoading(false);
      },
      (err) => {
        console.error("Error al cargar datos de empresa:", err);
        setLoading(false);
      },
    );
  }, []);

  // Manejar subida y compresión estricta de archivo para el icono del sistema (Máx 18 KB)
  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIconError("");

    if (!file.type.startsWith("image/")) {
      setIconError("Por favor selecciona un archivo de imagen válido (PNG, JPG, SVG, WebP).");
      return;
    }

    const MAX_KB = 18;

    // Caso A: Archivos SVG (Vectores directos)
    if (file.type === "image/svg+xml") {
      const sizeKb = file.size / 1024;
      if (sizeKb > MAX_KB) {
        setIconError(
          `El archivo SVG pesa ${sizeKb.toFixed(1)} KB, superando el límite máximo permitido de ${MAX_KB} KB. Por favor, simplifica el vector o utiliza un PNG.`,
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setIconUrl(result);
        setIconSizeKb(sizeKb);
      };
      reader.readAsDataURL(file);
      return;
    }

    // Caso B: Imágenes de mapa de bits (PNG, JPG, WebP) -> Redimensionar a 128x128 y optimizar
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new Image();

      img.onload = () => {
        const MAX_DIMENSION = 128;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          setIconError("No se pudo inicializar el procesador de imágenes del navegador.");
          return;
        }

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const calcKb = (url: string) => {
          const base64Str = url.substring(url.indexOf(",") + 1);
          return (base64Str.length * 0.75) / 1024;
        };

        // Pase 1: WebP con calidad 0.82
        let optimizedDataUrl = canvas.toDataURL("image/webp", 0.82);
        let finalKb = calcKb(optimizedDataUrl);

        // Pase 2: Si supera 18 KB, comprimir con calidad 0.65
        if (finalKb > MAX_KB) {
          optimizedDataUrl = canvas.toDataURL("image/webp", 0.65);
          finalKb = calcKb(optimizedDataUrl);
        }

        // Pase 3: Si aún supera 18 KB, intentar reducción de resolución a 96x96
        if (finalKb > MAX_KB) {
          canvas.width = Math.round(width * 0.75);
          canvas.height = Math.round(height * 0.75);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          optimizedDataUrl = canvas.toDataURL("image/webp", 0.60);
          finalKb = calcKb(optimizedDataUrl);
        }

        // Validación estricta final de 18 KB
        if (finalKb > MAX_KB) {
          setIconError(
            `La imagen optimizada pesa ${finalKb.toFixed(1)} KB, superando el límite permitido de ${MAX_KB} KB. Por favor, utiliza un isotipo más simple o con menos detalles visuales.`,
          );
          return;
        }

        setIconUrl(optimizedDataUrl);
        setIconSizeKb(finalKb);
      };

      img.onerror = () => {
        setIconError("Error al cargar la imagen seleccionada.");
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  };

  // Guardar cambios en el backend
  const handleSaveSettings = async () => {
    setSaving(true);
    setFeedback(null);

    const payload = {
      branding: {
        primaryColor,
        secondaryColor,
        iconUrl,
      },
      loans: {
        defaultDays: Number(defaultDays),
        defaultInterestRate: Number(defaultInterestRate),
        allowCollectorOverrideOver1000,
      },
    };

    companyRepo.updateMyCompanySettings(payload).match(
      (res) => {
        setSaving(false);
        setFeedback({
          type: "success",
          text: "Configuraciones de la empresa actualizadas exitosamente.",
        });

        // Actualizar en localStorage para aplicar cambios de color inmediatamente en el cliente
        try {
          const currentLocal = localStorage.getItem("company_settings")
            ? JSON.parse(localStorage.getItem("company_settings")!)
            : {};
          localStorage.setItem(
            "company_settings",
            JSON.stringify({ ...currentLocal, ...payload }),
          );
          if (payload.branding) {
            localStorage.setItem("app_branding", JSON.stringify(payload.branding));
          }

          // Disparar evento para que el theme provider y sidebar se actualicen al vuelo
          window.dispatchEvent(new Event("company_theme_updated"));
        } catch (e) {
          console.error("Error actualizando cache local de tema:", e);
        }
      },
      (err) => {
        setSaving(false);
        setFeedback({
          type: "error",
          text: `Error al guardar: ${err.message || "Fallo en el servidor"}`,
        });
      },
    );
  };

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        paddingBottom: isMobile ? "7.5rem" : "3rem",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Cabecera */}
      <div id="header-configuracion" style={{ marginBottom: isMobile ? "1.25rem" : "2rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: isMobile ? "flex-start" : "center",
            gap: "0.75rem",
            marginBottom: "0.5rem",
          }}
        >
          <div
            style={{
              padding: isMobile ? "0.45rem" : "0.5rem",
              borderRadius: "0.75rem",
              backgroundColor: "#e0e7ff",
              color: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Building2 size={isMobile ? 22 : 24} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1
              style={{
                fontSize: isMobile ? "1.35rem" : "1.875rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.25,
                marginBottom: "0.25rem",
              }}
            >
              Configuración de Empresa
            </h1>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: isMobile ? "0.85rem" : "0.95rem",
                lineHeight: 1.4,
              }}
            >
              Personaliza la apariencia visual, ícono y reglas de crédito para{" "}
              <strong>{company?.companyName || "tu organización"}</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs de Navegación con scroll táctil y flecha indicadora en móvil */}
      <div style={{ position: "relative", marginBottom: "1.5rem" }}>
        {/* Flecha Izquierda (solo si hay scroll hacia la izquierda) */}
        {isMobile && canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollTabs("left")}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: "1px",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              width: "42px",
              background: "linear-gradient(to right, var(--bg-app, #f8f9fa) 60%, transparent)",
              border: "none",
              color: "var(--color-primary, #4147eb)",
              cursor: "pointer",
              paddingLeft: "2px",
            }}
            aria-label="Desplazar pestañas hacia la izquierda"
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                border: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </div>
          </button>
        )}

        {/* Barra de Tabs con scroll */}
        <div
          ref={tabsRef}
          onScroll={checkTabsScroll}
          style={{
            display: "flex",
            gap: "0.5rem",
            borderBottom: "1px solid var(--border-color)",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            paddingBottom: "2px",
            paddingRight: isMobile && canScrollRight ? "2.5rem" : "0",
            paddingLeft: isMobile && canScrollLeft ? "2.5rem" : "0",
            transition: "padding 0.2s ease",
            maxWidth: "100%",
          }}
        >
          <button
            id="tab-branding"
            onClick={() => setActiveTab("branding")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: isMobile ? "0.65rem 0.95rem" : "0.75rem 1.25rem",
              fontWeight: 600,
              fontSize: isMobile ? "0.875rem" : "0.95rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              borderBottom: activeTab === "branding" ? "2px solid var(--color-primary)" : "2px solid transparent",
              color: activeTab === "branding" ? "var(--color-primary)" : "var(--text-secondary)",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <Palette size={18} />
            <span>Personalización Visual</span>
          </button>

          <button
            id="tab-loans"
            onClick={() => setActiveTab("loans")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: isMobile ? "0.65rem 0.95rem" : "0.75rem 1.25rem",
              fontWeight: 600,
              fontSize: isMobile ? "0.875rem" : "0.95rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              borderBottom: activeTab === "loans" ? "2px solid var(--color-primary)" : "2px solid transparent",
              color: activeTab === "loans" ? "var(--color-primary)" : "var(--text-secondary)",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <Sliders size={18} />
            <span>Políticas de Préstamos</span>
          </button>

          <button
            id="tab-security"
            onClick={() => setActiveTab("security")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: isMobile ? "0.65rem 0.95rem" : "0.75rem 1.25rem",
              fontWeight: 600,
              fontSize: isMobile ? "0.875rem" : "0.95rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              borderBottom: activeTab === "security" ? "2px solid var(--color-primary)" : "2px solid transparent",
              color: activeTab === "security" ? "var(--color-primary)" : "var(--text-secondary)",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={18} />
            <span>Seguridad</span>
          </button>
        </div>

        {/* Flecha Derecha (guía interactiva cuando hay pestañas ocultas) */}
        {isMobile && canScrollRight && (
          <button
            type="button"
            onClick={() => scrollTabs("right")}
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: "1px",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              width: "42px",
              background: "linear-gradient(to left, var(--bg-app, #f8f9fa) 60%, transparent)",
              border: "none",
              color: "var(--color-primary, #4147eb)",
              cursor: "pointer",
              paddingRight: "2px",
            }}
            aria-label="Ver más pestañas a la derecha"
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                border: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-primary, #4147eb)",
              }}
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </div>
          </button>
        )}
      </div>

      {/* Alerta de Feedback */}
      {feedback && (
        <div
          style={{
            padding: "1rem",
            borderRadius: "0.75rem",
            marginBottom: "1.5rem",
            border: feedback.type === "success" ? "1px solid #86efac" : "1px solid #fca5a5",
            backgroundColor: feedback.type === "success" ? "#f0fdf4" : "#fef2f2",
            color: feedback.type === "success" ? "#166534" : "#991b1b",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          {feedback.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
          <p>Cargando configuraciones...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: PERSONALIZACIÓN VISUAL (BRANDING) */}
          {activeTab === "branding" && (
            <div style={{ display: "grid", gap: "1.75rem" }}>
              <section id="seccion-colores" className="card" style={{ padding: isMobile ? "1.25rem" : "1.75rem", borderRadius: "1rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                  Colores del Sistema
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                  Personaliza la paleta de colores para tu tenant. Los cambios se aplicarán a botones, navegación,
                  gráficos y enlaces de todos los usuarios de tu empresa.
                </p>

                {/* Paletas Predefinidas */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <label className="label" style={{ fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>
                    Paletas Rápidas Recomendadas:
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
                    {PRESET_COLORS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setPrimaryColor(preset.primary);
                          setSecondaryColor(preset.secondary);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.45rem 0.85rem",
                          borderRadius: "2rem",
                          border: primaryColor === preset.primary ? "2px solid #1e293b" : "1px solid #e2e8f0",
                          backgroundColor: "#ffffff",
                          cursor: "pointer",
                          fontSize: "0.825rem",
                          fontWeight: 500,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                        }}
                      >
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            backgroundColor: preset.primary,
                            display: "inline-block",
                          }}
                        />
                        <span>{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selectores de Color Manuales */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? "1.25rem" : "1.5rem" }}>
                  <div>
                    <label className="label" style={{ fontWeight: 600 }}>Color Primario (Botones y Enlaces)</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.4rem" }}>
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "0.5rem",
                          border: "1px solid var(--border-color)",
                          cursor: "pointer",
                          padding: 2,
                        }}
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="input"
                        style={{ fontFamily: "monospace", textTransform: "uppercase" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label" style={{ fontWeight: 600 }}>Color Secundario / Fondo Oscuro</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.4rem" }}>
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "0.5rem",
                          border: "1px solid var(--border-color)",
                          cursor: "pointer",
                          padding: 2,
                        }}
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="input"
                        style={{ fontFamily: "monospace", textTransform: "uppercase" }}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Carga de Ícono del Sistema */}
              <section id="seccion-icono" className="card" style={{ padding: isMobile ? "1.25rem" : "1.75rem", borderRadius: "1rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                  Ícono o Isotipo del Sistema
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
                  Sube el logotipo o ícono representativo de tu empresa. Se mostrará en la barra lateral del menú,
                  en los comprobantes generados y en el favicon del navegador para todos tus cobradores.
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: isMobile ? "flex-start" : "center",
                    gap: isMobile ? "1.25rem" : "1.5rem",
                    flexDirection: isMobile ? "column" : "row",
                  }}
                >
                  {/* Vista Previa del Ícono */}
                  <div
                    style={{
                      width: 90,
                      height: 90,
                      borderRadius: "1rem",
                      border: "2px dashed #cbd5e1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#f8fafc",
                      overflow: "hidden",
                      position: "relative",
                      flexShrink: 0,
                    }}
                  >
                    {iconUrl ? (
                      <img
                        src={iconUrl}
                        alt="Ícono de la Empresa"
                        style={{ width: "100%", height: "100%", objectFit: "contain", padding: "0.35rem" }}
                      />
                    ) : (
                      <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.75rem" }}>
                        <Building2 size={28} style={{ margin: "0 auto 0.25rem" }} />
                        <span>NeoCobros</span>
                      </div>
                    )}
                  </div>

                  {/* Acciones de Carga */}
                  <div style={{ width: isMobile ? "100%" : "auto" }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleIconUpload}
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      style={{ display: "none" }}
                    />
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-secondary"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.5rem",
                          padding: "0.65rem 1.15rem",
                          fontSize: "0.9rem",
                          width: isMobile ? "100%" : "auto",
                        }}
                      >
                        <Upload size={17} />
                        <span>Subir Imagen / Ícono</span>
                      </button>

                      {iconUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setIconUrl("");
                            setIconSizeKb(null);
                            setIconError("");
                          }}
                          className="btn btn-secondary"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.4rem",
                            color: "#b91c1c",
                            borderColor: "#fca5a5",
                            padding: "0.65rem 1rem",
                            fontSize: "0.9rem",
                            width: isMobile ? "100%" : "auto",
                          }}
                        >
                          <RotateCcw size={16} />
                          <span>Restaurar Ícono Original</span>
                        </button>
                      )}
                    </div>

                    {/* Mensaje de Error si supera 18 KB */}
                    {iconError && (
                      <div
                        style={{
                          marginTop: "0.75rem",
                          padding: "0.65rem 0.85rem",
                          borderRadius: "0.5rem",
                          backgroundColor: "#fef2f2",
                          border: "1px solid #fecaca",
                          color: "#b91c1c",
                          fontSize: "0.825rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                        <span>{iconError}</span>
                      </div>
                    )}

                    {/* Badge de Optimización Exitosa */}
                    {iconUrl && iconSizeKb !== null && !iconError && (
                      <div
                        style={{
                          marginTop: "0.75rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          padding: "0.35rem 0.75rem",
                          borderRadius: "2rem",
                          backgroundColor: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          color: "#166534",
                          fontSize: "0.775rem",
                          fontWeight: 600,
                        }}
                      >
                        <CheckCircle2 size={14} color="#16a34a" />
                        <span>Optimizado a 128×128 px: {iconSizeKb.toFixed(1)} KB (Límite: 18 KB)</span>
                      </div>
                    )}

                    <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.5rem" }}>
                      El sistema redimensiona automáticamente a 128×128 px. Peso estricto: <strong>máx. 18 KB</strong>.
                    </p>
                  </div>
                </div>
              </section>

              {/* Botón de Guardado */}
              <div
                style={{
                  display: "flex",
                  justifyContent: isMobile ? "stretch" : "flex-end",
                  marginTop: isMobile ? "0.5rem" : "0",
                  marginBottom: isMobile ? "1rem" : "0",
                }}
              >
                <button
                  id="btn-guardar-configuracion"
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="btn btn-primary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "0.75rem 1.75rem",
                    fontWeight: 600,
                    borderRadius: "0.75rem",
                    width: isMobile ? "100%" : "auto",
                  }}
                >
                  <Save size={18} />
                  <span>{saving ? "Guardando..." : "Guardar Configuración"}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: POLÍTICAS DE PRÉSTAMOS */}
          {activeTab === "loans" && (
            <div style={{ display: "grid", gap: "1.75rem" }}>
              <section id="seccion-prestamos-params" className="card" style={{ padding: isMobile ? "1.25rem" : "1.75rem", borderRadius: "1rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                  Valores Predeterminados para Nuevos Préstamos
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                  Establece los días y porcentaje de ganancia estándar sugeridos al registrar un préstamo en el
                  formulario de cobranza.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? "1.25rem" : "1.5rem" }}>
                  <div>
                    <label className="label" style={{ fontWeight: 600 }}>Días Predeterminados de Pago</label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      className="input"
                      value={defaultDays}
                      onChange={(e) => setDefaultDays(Number(e.target.value))}
                      placeholder="Ej. 24"
                    />
                    <span style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.3rem", display: "block" }}>
                      Plazo habitual en días laborables (Lunes a Sábado).
                    </span>
                  </div>

                  <div>
                    <label className="label" style={{ fontWeight: 600 }}>Tasa de Interés Base (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      className="input"
                      value={defaultInterestRate}
                      onChange={(e) => setDefaultInterestRate(Number(e.target.value))}
                      placeholder="Ej. 20"
                    />
                    <span style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.3rem", display: "block" }}>
                      Porcentaje de recargo estándar (Ej. 20% para cobrar S/ 1,200 por cada S/ 1,000 prestados).
                    </span>
                  </div>
                </div>
              </section>

              {/* Regla Especial para Préstamos > S/ 1,000 */}
              <section
                className="card"
                style={{
                  padding: isMobile ? "1.25rem" : "1.75rem",
                  borderRadius: "1rem",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    justifyContent: "space-between",
                    alignItems: isMobile ? "flex-start" : "flex-start",
                    gap: isMobile ? "1rem" : "1.5rem",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                      <Sparkles size={20} color="#6366f1" />
                      <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        Permitir al Cobrador Modificar Plazo en Préstamos de S/ 1,000 a más
                      </h2>
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.5, maxWidth: "600px" }}>
                      Activa o desactiva la regla que autoriza a los cobradores a personalizar los días de pago cuando
                      el crédito otorgado es mayor o igual a S/ 1,000.
                    </p>

                    <div
                      style={{
                        marginTop: "0.85rem",
                        padding: "0.75rem 1rem",
                        borderRadius: "0.5rem",
                        backgroundColor: allowCollectorOverrideOver1000 ? "#f0fdf4" : "#f8fafc",
                        border: allowCollectorOverrideOver1000 ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                        fontSize: "0.825rem",
                        color: allowCollectorOverrideOver1000 ? "#166534" : "#64748b",
                      }}
                    >
                      {allowCollectorOverrideOver1000 ? (
                        <>
                          <strong>Opción Activada:</strong> Los cobradores podrán negociar y alterar el número de días
                          para préstamos de S/ 1,000 a más. Los préstamos menores tendrán plazo fijo rígido ({defaultDays} días).
                        </>
                      ) : (
                        <>
                          <strong>Opción Desactivada:</strong> El plazo de todos los préstamos estará estrictamente bloqueado en{" "}
                          <strong>{defaultDays} días</strong> para los cobradores, sin importar el monto.
                        </>
                      )}
                    </div>
                  </div>

                  {/* Switch / Toggle */}
                  <div style={{ flexShrink: 0, marginTop: isMobile ? "0.25rem" : "0.5rem" }}>
                    <label
                      style={{
                        position: "relative",
                        display: "inline-block",
                        width: 52,
                        height: 28,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={allowCollectorOverrideOver1000}
                        onChange={(e) => setAllowCollectorOverrideOver1000(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          cursor: "pointer",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: allowCollectorOverrideOver1000 ? "var(--color-primary)" : "#cbd5e1",
                          transition: "0.3s",
                          borderRadius: 34,
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            content: '""',
                            height: 20,
                            width: 20,
                            left: allowCollectorOverrideOver1000 ? 27 : 4,
                            bottom: 4,
                            backgroundColor: "white",
                            transition: "0.3s",
                            borderRadius: "50%",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                          }}
                        />
                      </span>
                    </label>
                  </div>
                </div>
              </section>

              {/* Botón de Guardado */}
              <div
                style={{
                  display: "flex",
                  justifyContent: isMobile ? "stretch" : "flex-end",
                  marginTop: isMobile ? "0.5rem" : "0",
                  marginBottom: isMobile ? "1rem" : "0",
                }}
              >
                <button
                  id="btn-guardar-configuracion"
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="btn btn-primary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "0.75rem 1.75rem",
                    fontWeight: 600,
                    borderRadius: "0.75rem",
                    width: isMobile ? "100%" : "auto",
                  }}
                >
                  <Save size={18} />
                  <span>{saving ? "Guardando..." : "Guardar Configuración"}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SEGURIDAD DE LA CUENTA */}
          {activeTab === "security" && (
            <div style={{ display: "grid", gap: "1.75rem" }}>
              <section id="seccion-seguridad-pass" className="card" style={{ padding: isMobile ? "1.25rem" : "1.75rem", borderRadius: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
                  <KeyRound size={22} color="var(--color-primary)" />
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Seguridad y Contraseña</h2>
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem", lineHeight: 1.5 }}>
                  Mantén tu cuenta protegida renovando periódicamente tu clave de acceso. Al cambiar la contraseña,
                  se invalidarán las sesiones previas en otros dispositivos por seguridad.
                </p>

                <div>
                  <button
                    onClick={() => setIsChangePasswordOpen(true)}
                    className="btn btn-primary"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      padding: "0.7rem 1.35rem",
                      fontWeight: 600,
                      width: isMobile ? "100%" : "auto",
                    }}
                  >
                    <KeyRound size={18} />
                    <span>Cambiar mi Contraseña</span>
                  </button>
                </div>
              </section>
            </div>
          )}
        </>
      )}

      {/* Modal de Cambio de Contraseña */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
}
