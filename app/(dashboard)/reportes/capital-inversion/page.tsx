'use client';

import React, { useState, useEffect, useMemo } from 'react';
import styles from '../reportes.module.css';
import { authService } from '@/lib/auth';
import { apiRequest } from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Landmark,
  PiggyBank,
  PieChart,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  DollarSign,
  AlertCircle
} from 'lucide-react';

interface MonthlyCapitalEvolution {
  month: string;
  monthName: string;
  loansCount: number;
  capitalLent: number;
  capitalRecovered: number;
  interestEarned: number;
  totalCollected: number;
  expenses: number;
  netProfit: number;
  netCashFlow: number;
  portfolioBalance: number;
  growthRateMoM: number;
}

interface CapitalReportResponse {
  summary: {
    activeTotalRemaining?: number;
    activeCapitalInStreet: number;
    activeInterestRemaining?: number;
    activeOriginalPrincipal?: number;
    activeLoansCount: number;
    historicalTotalLent: number;
    historicalCapitalRecovered: number;
    historicalInterestEarned: number;
    historicalExpenses: number;
    netProfit: number;
    roi: number;
    profitMarginOnInterest?: number;
  };
  monthlyEvolution: MonthlyCapitalEvolution[];
}

export default function CapitalInversionPage() {
  const [reportData, setReportData] = useState<CapitalReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthsCount, setMonthsCount] = useState<number>(12);
  const [selectedMetric, setSelectedMetric] = useState<'lent' | 'recovered' | 'profit'>('lent');

  const loadReport = async () => {
    try {
      setLoading(true);
      const user = authService.getUser();
      const queryParams = new URLSearchParams({
        months: monthsCount.toString(),
      });

      if (user?.idCompany) {
        queryParams.append('companyId', user.idCompany.toString());
      }

      const res = await apiRequest<CapitalReportResponse>(
        `/report/capital-investment?${queryParams.toString()}`
      );

      if (res) {
        setReportData(res);
      }
    } catch (err) {
      console.error('Error al cargar reporte de capital e inversión:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [monthsCount]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const evolution = reportData?.monthlyEvolution || [];
  const tableEvolution = useMemo(() => {
    return [...evolution].reverse();
  }, [evolution]);
  const summary = reportData?.summary;

  const maxEvolutionValue = Math.max(
    ...evolution.map((m) =>
      selectedMetric === 'lent'
        ? m.capitalLent
        : selectedMetric === 'recovered'
        ? m.capitalRecovered
        : Math.abs(m.netProfit)
    ),
    100
  );

  return (
    <div className={styles.dashboardCanvas}>
      {/* 1. Header / Command Center */}
      <section className={styles.commandCenter}>
        <div className={styles.commandHeader}>
          <div className={styles.commandTag}>
            <span className={styles.tagText}>Gestión Patrimonial y Retorno</span>
            <span className={styles.tagDot} />
            <span className={styles.tagDate}>Análisis Mensual MoM</span>
          </div>
          <h1 className={styles.commandTitle}>Evolución del Capital e Inversión</h1>
        </div>

        <div className={styles.commandActions}>
          {/* Selector de periodo */}
          <div className={styles.datePickerPill}>
            <Calendar size={18} color="var(--color-primary, #4147eb)" />
            <select
              className={styles.pillInput}
              value={monthsCount}
              onChange={(e) => setMonthsCount(Number(e.target.value))}
              style={{ cursor: 'pointer' }}
            >
              <option value={6}>Últimos 6 meses</option>
              <option value={12}>Últimos 12 meses (1 año)</option>
              <option value={24}>Últimos 24 meses (2 años)</option>
            </select>
          </div>

          <button className={styles.btnSecondary} onClick={loadReport} disabled={loading}>
            <RefreshCw size={18} className={loading ? styles.spinnerIcon : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </section>

      {/* Control Mobile de Meses */}
      <div className={styles.mobileDashboardLayout} style={{ marginBottom: 16 }}>
        <div className={styles.mobileDatePills}>
          {[6, 12, 24].map((m) => (
            <button
              key={m}
              className={`${styles.mobileDatePill} ${monthsCount === m ? styles.mobileDatePillActive : ''}`}
              onClick={() => setMonthsCount(m)}
            >
              {m === 6 ? '6 Meses' : m === 12 ? '1 Año' : '2 Años'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Calculando evolución patrimonial de la cartera...</p>
        </div>
      ) : summary ? (
        <>
          {/* 2. Bento Ribbon de Métricas Patrimoniales Clave */}
          <div className={styles.desktopDashboardLayout}>
            <div className={styles.bentoRibbon}>
              {/* Tarjeta 1: Saldo Total en Calle (Con desglose de Capital Propio e Interés) */}
              <div className={`${styles.bentoCard} ${styles.bentoCardGradient}`}>
                <div className={styles.bentoCardHeader}>
                  <span className={styles.bentoCardTitleWhite}>Saldo Total en Calle</span>
                  <span className={`${styles.bentoIcon} ${styles.iconWhite}`}>
                    <Landmark size={18} />
                  </span>
                </div>
                <div className={styles.bentoCardBody}>
                  <div className={styles.bentoValueWhite}>
                    {formatCurrency(summary.activeTotalRemaining ?? summary.activeCapitalInStreet)}
                  </div>
                  <span className={styles.bentoSubtextWhite}>
                    Saldo total por cobrar ({summary.activeLoansCount} préstamos activos)
                  </span>
                </div>
                <div className={styles.bentoCardFooterGlass} style={{ flexDirection: 'column', gap: 6, alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                    <span style={{ opacity: 0.85 }}>Capital propio pendiente:</span>
                    <span style={{ fontWeight: 700 }}>{formatCurrency(summary.activeCapitalInStreet)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                    <span style={{ opacity: 0.85 }}>Interés futuro por cobrar:</span>
                    <span style={{ fontWeight: 700 }}>+{formatCurrency(summary.activeInterestRemaining ?? 0)}</span>
                  </div>
                </div>
              </div>

              {/* Tarjeta 2: Ganancia Limpia Acumulada */}
              <div className={styles.bentoCard}>
                <div className={styles.bentoCardHeader}>
                  <span className={styles.bentoCardTitle}>Ganancia Limpia Acumulada</span>
                  <span className={`${styles.bentoIcon} ${summary.netProfit >= 0 ? styles.iconSuccess : styles.iconDanger}`}>
                    <PiggyBank size={18} />
                  </span>
                </div>
                <div className={styles.bentoCardBody}>
                  <div className={summary.netProfit >= 0 ? styles.bentoValueSuccess : styles.bentoValueDanger}>
                    {formatCurrency(summary.netProfit)}
                  </div>
                  <span className={styles.bentoSubtext}>
                    Intereses cobrados menos gastos de ruta
                  </span>
                </div>
                <div className={styles.bentoCardFooter}>
                  <div className={styles.footerRow}>
                    <span>Intereses cobrados</span>
                    <span className={styles.footerRowValuePrimary}>{formatCurrency(summary.historicalInterestEarned)}</span>
                  </div>
                  <div className={styles.footerRow}>
                    <span>Gastos de ruta</span>
                    <span className={styles.footerRowValueDanger}>-{formatCurrency(summary.historicalExpenses)}</span>
                  </div>
                </div>
              </div>

              {/* Tarjeta 3: Margen de Ganancia Neta sobre Intereses */}
              <div className={styles.bentoCard}>
                <div className={styles.bentoCardHeader}>
                  <span className={styles.bentoCardTitle}>Margen de Ganancia Neta</span>
                  <span className={`${styles.bentoIcon} ${styles.iconPrimaryDim}`}>
                    <TrendingUp size={18} />
                  </span>
                </div>
                <div className={styles.bentoCardBody}>
                  <div className={styles.bentoValuePrimary}>
                    {summary.profitMarginOnInterest ?? 19.5}%
                  </div>
                  <span className={styles.bentoSubtext}>
                    De cada S/ 100 de interés, te quedan S/ {summary.profitMarginOnInterest ?? 19.5} limpios
                  </span>
                </div>
                <div className={styles.bentoCardFooterProgress}>
                  <div className={styles.progressBarBg}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${Math.min(Math.max(summary.profitMarginOnInterest ?? 19.5, 0), 100)}%` }}
                    />
                  </div>
                  <div className={styles.progressLabels}>
                    <span>Retenido tras gastos</span>
                    <span className={styles.progressHighlight}>
                      +{(summary.profitMarginOnInterest ?? 19.5)}% neto
                    </span>
                  </div>
                </div>
              </div>

              {/* Tarjeta 4: Total Prestado (La Rueda) */}
              <div className={styles.bentoCard}>
                <div className={styles.bentoCardHeader}>
                  <span className={styles.bentoCardTitle}>Total Prestado (La Rueda)</span>
                  <span className={`${styles.bentoIcon} ${styles.iconSuccess}`}>
                    <PieChart size={18} />
                  </span>
                </div>
                <div className={styles.bentoCardBody}>
                  <div className={styles.bentoValue}>{formatCurrency(summary.historicalTotalLent)}</div>
                  <span className={styles.bentoSubtext}>
                    Suma de todos los préstamos (rotación continua)
                  </span>
                </div>
                <div className={styles.bentoCardFooterSingle}>
                  <span>Capital devuelto: {formatCurrency(summary.historicalCapitalRecovered)}</span>
                  <span className={styles.footerValueSuccess}>
                    {summary.historicalTotalLent > 0
                      ? ((summary.historicalCapitalRecovered / summary.historicalTotalLent) * 100).toFixed(1)
                      : 0}% cobrado
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Versión Mobile de Resumen Rápido */}
          <div className={styles.mobileDashboardLayout}>
            {/* Card Gradiente Saldo Total en Calle */}
            <div className={styles.mobileCardGradient}>
              <div className={styles.mobileCardGradientHeader}>
                <div className={styles.mobileCardGradientTitle}>
                  <Landmark size={14} /> SALDO TOTAL EN CALLE
                </div>
              </div>
              <div className={styles.mobileCardGradientValue}>
                <span className={styles.mobileCurrencySymbol}>S/</span>{' '}
                {formatNumber(summary.activeTotalRemaining ?? summary.activeCapitalInStreet)}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', margin: '4px 0 8px' }}>
                {summary.activeLoansCount} Préstamos activos en curso
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 10px', fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Capital propio:</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(summary.activeCapitalInStreet)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Interés por cobrar:</span>
                  <span style={{ fontWeight: 700 }}>+{formatCurrency(summary.activeInterestRemaining ?? 0)}</span>
                </div>
              </div>
            </div>

            {/* Grid 2x2 para mobile */}
            <div className={styles.mobileMetricsGrid}>
              <div className={styles.mobileCardWhite}>
                <div className={styles.mobileCardWhiteHeader}>
                  <span className={styles.mobileCardWhiteTitle}>Ganancia Limpia</span>
                  <PiggyBank size={16} color="var(--color-primary, #4147eb)" />
                </div>
                <div className={styles.mobileMetricContent}>
                  <span className={summary.netProfit >= 0 ? styles.mobileCardWhiteValueSuccess : styles.mobileCardWhiteValueDanger}>
                    S/ {formatNumber(summary.netProfit)}
                  </span>
                  <span className={styles.bentoSubtext}>En el bolsillo</span>
                </div>
              </div>

              <div className={styles.mobileCardWhite}>
                <div className={styles.mobileCardWhiteHeader}>
                  <span className={styles.mobileCardWhiteTitle}>Margen Neto</span>
                  <TrendingUp size={16} color="#10b981" />
                </div>
                <div className={styles.mobileMetricContent}>
                  <span className={styles.mobileCardWhiteValue}>
                    {summary.profitMarginOnInterest ?? 19.5}%
                  </span>
                  <span className={styles.bentoSubtext}>Sobre intereses</span>
                </div>
              </div>

              <div className={styles.mobileCardWhite}>
                <div className={styles.mobileCardWhiteHeader}>
                  <span className={styles.mobileCardWhiteTitle}>Cap. Cobrado</span>
                  <DollarSign size={16} color="#059669" />
                </div>
                <div className={styles.mobileMetricContent}>
                  <span className={styles.mobileCardWhiteValue}>
                    S/ {formatNumber(summary.historicalCapitalRecovered)}
                  </span>
                  <span className={styles.bentoSubtext}>Retornado</span>
                </div>
              </div>

              <div className={styles.mobileCardWhite}>
                <div className={styles.mobileCardWhiteHeader}>
                  <span className={styles.mobileCardWhiteTitle}>Total Prestado</span>
                  <Layers size={16} color="#6366f1" />
                </div>
                <div className={styles.mobileMetricContent}>
                  <span className={styles.mobileCardWhiteValue}>
                    S/ {formatNumber(summary.historicalTotalLent)}
                  </span>
                  <span className={styles.bentoSubtext}>La rueda total</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Gráfico Interactivo de Evolución Mes a Mes */}
          <div className={styles.desktopDashboardLayout}>
            <div className={`${styles.chartContainer} ${styles.dailyChartCard}`}>
              <div className={styles.chartHeader}>
                <div>
                  <h2 className={styles.chartTitle}>Evolución del Capital Mes a Mes</h2>
                  <p className={styles.chartSubtitle}>
                    Comportamiento de la inversión, recuperación de capital y utilidad mensual
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Selector de variable a graficar */}
                  <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 3, gap: 4 }}>
                    <button
                      onClick={() => setSelectedMetric('lent')}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: selectedMetric === 'lent' ? 'var(--color-primary, #4147eb)' : 'transparent',
                        color: selectedMetric === 'lent' ? 'white' : '#64748b',
                        transition: 'all 0.2s',
                      }}
                    >
                      Colocación
                    </button>
                    <button
                      onClick={() => setSelectedMetric('recovered')}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: selectedMetric === 'recovered' ? '#10b981' : 'transparent',
                        color: selectedMetric === 'recovered' ? 'white' : '#64748b',
                        transition: 'all 0.2s',
                      }}
                    >
                      Recupero
                    </button>
                    <button
                      onClick={() => setSelectedMetric('profit')}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: selectedMetric === 'profit' ? '#f59e0b' : 'transparent',
                        color: selectedMetric === 'profit' ? 'white' : '#64748b',
                        transition: 'all 0.2s',
                      }}
                    >
                      Utilidad Neta
                    </button>
                  </div>

                  <div className={styles.chartLegend}>
                    <div className={styles.legendItem}>
                      <span
                        className={styles.legendDotCapital}
                        style={{
                          backgroundColor:
                            selectedMetric === 'lent'
                              ? 'var(--color-primary, #4147eb)'
                              : selectedMetric === 'recovered'
                              ? '#10b981'
                              : '#f59e0b',
                        }}
                      />
                      <span className={styles.legendLabel}>
                        {selectedMetric === 'lent'
                          ? 'Capital Colocado'
                          : selectedMetric === 'recovered'
                          ? 'Capital Recuperado'
                          : 'Utilidad Neta'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barras de evolución */}
              <div className={styles.barChartWrapper} style={{ minHeight: 220, alignItems: 'flex-end' }}>
                {evolution.map((m, i) => {
                  const currentValue =
                    selectedMetric === 'lent'
                      ? m.capitalLent
                      : selectedMetric === 'recovered'
                      ? m.capitalRecovered
                      : Math.abs(m.netProfit);

                  const heightPercent = maxEvolutionValue > 0 ? (currentValue / maxEvolutionValue) * 100 : 0;

                  return (
                    <div key={m.month || i} className={styles.barColumn} style={{ position: 'relative' }}>
                      {/* Píldora de crecimiento MoM sobre la barra */}
                      {m.growthRateMoM !== 0 && (
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: m.growthRateMoM > 0 ? '#10b981' : '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 4,
                          }}
                        >
                          {m.growthRateMoM > 0 ? `+${m.growthRateMoM}%` : `${m.growthRateMoM}%`}
                        </div>
                      )}

                      <span className={styles.barValueTooltip}>
                        {m.monthName}
                        <br />
                        Colocado: {formatCurrency(m.capitalLent)}
                        <br />
                        Recuperado: {formatCurrency(m.capitalRecovered)}
                        <br />
                        Utilidad: {formatCurrency(m.netProfit)}
                      </span>

                      <div className={styles.barTrack} style={{ height: 160 }}>
                        <div
                          className={styles.barFill}
                          style={{
                            height: `${Math.min(heightPercent, 100)}%`,
                            backgroundColor:
                              selectedMetric === 'lent'
                                ? 'var(--color-primary, #4147eb)'
                                : selectedMetric === 'recovered'
                                ? '#10b981'
                                : m.netProfit >= 0
                                ? '#f59e0b'
                                : '#ef4444',
                          }}
                        />
                      </div>
                      <span className={styles.barLabel}>{m.monthName}</span>
                    </div>
                  );
                })}
              </div>

              <div className={styles.chartFooter}>
                <div className={styles.chartFooterLeft}>
                  <TrendingUp size={20} color="var(--color-primary, #4147eb)" />
                  <span className={styles.chartFooterLabel}>Promedio mensual colocado:</span>
                  <span className={styles.chartFooterValue}>
                    {formatCurrency(
                      evolution.length > 0
                        ? evolution.reduce((acc, curr) => acc + curr.capitalLent, 0) / evolution.length
                        : 0
                    )}{' '}
                    / mes
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Tabla Detallada de Evolución Mensual Cronológica */}
          <div className={styles.tableContainerSection}>
            <div className={styles.tableHeaderSection}>
              <div>
                <h2 className={styles.tableTitleSection}>Desglose Mensual Cronológico</h2>
                <p className={styles.tableSubtitleSection}>
                  Historial detallado de colocación, amortización de capital, margen neto y flujo de fondos.
                </p>
              </div>
            </div>

            <div className={styles.desktopTable}>
              <div className={styles.tableWrapper}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Mes</th>
                      <th style={{ textAlign: 'center' }}>Préstamos</th>
                      <th style={{ textAlign: 'right' }}>Capital Colocado</th>
                      <th style={{ textAlign: 'center' }}>Var. MoM</th>
                      <th style={{ textAlign: 'right' }}>Capital Recuperado</th>
                      <th style={{ textAlign: 'right' }}>Interés Cobrado</th>
                      <th style={{ textAlign: 'right' }}>Gastos Ruta</th>
                      <th style={{ textAlign: 'right' }}>Utilidad Neta</th>
                      <th style={{ textAlign: 'right' }}>Flujo Neto Caja</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableEvolution.map((m) => {
                      const hasLent = m.capitalLent > 0;
                      const hasRecovered = m.capitalRecovered > 0;
                      const hasInterest = m.interestEarned > 0;
                      const hasExpenses = m.expenses > 0;
                      const hasProfit = m.netProfit !== 0;
                      const hasCashFlow = m.netCashFlow !== 0;

                      return (
                        <tr key={m.month}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Calendar size={15} color="#64748b" />
                              <span style={{ fontWeight: 600, color: '#0f172a' }}>{m.monthName}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              style={{
                                background: m.loansCount > 0 ? '#f1f5f9' : 'transparent',
                                color: m.loansCount > 0 ? '#0f172a' : '#94a3b8',
                                padding: '2px 8px',
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {m.loansCount}
                            </span>
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 600,
                              color: hasLent ? '#0f172a' : '#94a3b8',
                            }}
                          >
                            {formatCurrency(m.capitalLent)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {m.growthRateMoM === 0 ? (
                              <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                            ) : m.growthRateMoM > 0 ? (
                              <span
                                style={{
                                  color: '#059669',
                                  background: '#ecfdf5',
                                  padding: '2px 6px',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 2,
                                }}
                              >
                                <ArrowUpRight size={12} />+{m.growthRateMoM}%
                              </span>
                            ) : (
                              <span
                                style={{
                                  color: '#dc2626',
                                  background: '#fef2f2',
                                  padding: '2px 6px',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 2,
                                }}
                              >
                                <ArrowDownRight size={12} />
                                {m.growthRateMoM}%
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              color: hasRecovered ? '#059669' : '#94a3b8',
                              fontWeight: 600,
                            }}
                          >
                            {formatCurrency(m.capitalRecovered)}
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              color: hasInterest ? 'var(--color-primary, #4147eb)' : '#94a3b8',
                              fontWeight: 600,
                            }}
                          >
                            {formatCurrency(m.interestEarned)}
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              color: hasExpenses ? '#dc2626' : '#94a3b8',
                              fontWeight: hasExpenses ? 600 : 400,
                            }}
                          >
                            {formatCurrency(m.expenses)}
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 700,
                              color: !hasProfit
                                ? '#94a3b8'
                                : m.netProfit > 0
                                ? '#059669'
                                : '#dc2626',
                            }}
                          >
                            {formatCurrency(m.netProfit)}
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 600,
                              color: !hasCashFlow
                                ? '#94a3b8'
                                : m.netCashFlow > 0
                                ? '#0284c7'
                                : '#d97706',
                            }}
                          >
                            {formatCurrency(m.netCashFlow)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                    {(() => {
                      const totals = evolution.reduce(
                        (acc, m) => ({
                          loansCount: acc.loansCount + m.loansCount,
                          capitalLent: acc.capitalLent + m.capitalLent,
                          capitalRecovered: acc.capitalRecovered + m.capitalRecovered,
                          interestEarned: acc.interestEarned + m.interestEarned,
                          expenses: acc.expenses + m.expenses,
                          netProfit: acc.netProfit + m.netProfit,
                          netCashFlow: acc.netCashFlow + m.netCashFlow,
                        }),
                        {
                          loansCount: 0,
                          capitalLent: 0,
                          capitalRecovered: 0,
                          interestEarned: 0,
                          expenses: 0,
                          netProfit: 0,
                          netCashFlow: 0,
                        }
                      );
                      return (
                        <tr style={{ fontWeight: 700 }}>
                          <td style={{ padding: '14px 16px', color: '#0f172a' }}>TOTALES DEL PERIODO</td>
                          <td style={{ textAlign: 'center', color: '#0f172a' }}>
                            <span style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>
                              {totals.loansCount}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', color: '#0f172a' }}>{formatCurrency(totals.capitalLent)}</td>
                          <td style={{ textAlign: 'center', color: '#94a3b8' }}>—</td>
                          <td style={{ textAlign: 'right', color: '#059669' }}>{formatCurrency(totals.capitalRecovered)}</td>
                          <td style={{ textAlign: 'right', color: 'var(--color-primary, #4147eb)' }}>
                            {formatCurrency(totals.interestEarned)}
                          </td>
                          <td style={{ textAlign: 'right', color: '#dc2626' }}>{formatCurrency(totals.expenses)}</td>
                          <td
                            style={{
                              textAlign: 'right',
                              color: totals.netProfit >= 0 ? '#059669' : '#dc2626',
                            }}
                          >
                            {formatCurrency(totals.netProfit)}
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              color: totals.netCashFlow >= 0 ? '#0284c7' : '#d97706',
                            }}
                          >
                            {formatCurrency(totals.netCashFlow)}
                          </td>
                        </tr>
                      );
                    })()}
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Versión Cards Mobile para el Historial Mensual (oculta en pantallas desktop >= 768px) */}
            <div className={styles.mobileCards}>
              {tableEvolution.map((m) => (
                <div key={m.month} className={styles.collectorCardMobile}>
                  <div className={styles.collectorCardMobileHeader}>
                    <div className={styles.collectorCardMobileProfile}>
                      <div className={styles.collectorCardMobileAvatar}>
                        <Calendar size={18} />
                      </div>
                      <div>
                        <div className={styles.collectorCardMobileName}>{m.monthName}</div>
                        <div className={styles.collectorCardMobileSubtitle}>
                          {m.loansCount} {m.loansCount === 1 ? 'préstamo' : 'préstamos'} colocados
                        </div>
                      </div>
                    </div>
                    {m.growthRateMoM !== 0 && (
                      <div className={styles.collectorCardMobileMetrics}>
                        <span
                          style={{
                            color: m.growthRateMoM > 0 ? '#059669' : '#dc2626',
                            backgroundColor: m.growthRateMoM > 0 ? '#ecfdf5' : '#fef2f2',
                            padding: '3px 8px',
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 2,
                          }}
                        >
                          {m.growthRateMoM > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {m.growthRateMoM > 0 ? `+${m.growthRateMoM}%` : `${m.growthRateMoM}%`}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={styles.collectorCardMobileGrid}>
                    <div className={styles.collectorCardMobileDataCol}>
                      <span className={styles.collectorCardMobileDataLabel}>Capital Colocado</span>
                      <span className={styles.collectorCardMobileDataValueNeutral}>{formatCurrency(m.capitalLent)}</span>
                    </div>
                    <div className={styles.collectorCardMobileDataCol}>
                      <span className={styles.collectorCardMobileDataLabel}>Capital Recuperado</span>
                      <span style={{ color: '#059669', fontWeight: 700, fontSize: 14 }}>
                        {formatCurrency(m.capitalRecovered)}
                      </span>
                    </div>
                    <div className={styles.collectorCardMobileDataCol}>
                      <span className={styles.collectorCardMobileDataLabel}>Interés Ganado</span>
                      <span className={styles.collectorCardMobileDataValuePrimary}>{formatCurrency(m.interestEarned)}</span>
                    </div>
                    <div className={styles.collectorCardMobileDataCol}>
                      <span className={styles.collectorCardMobileDataLabel}>Gastos Operativos</span>
                      <span className={styles.collectorCardMobileDataValueError}>{formatCurrency(m.expenses)}</span>
                    </div>
                    <div className={styles.collectorCardMobileDataCol}>
                      <span className={styles.collectorCardMobileDataLabel}>Utilidad Neta</span>
                      <span
                        style={{
                          color: m.netProfit >= 0 ? '#059669' : '#dc2626',
                          fontWeight: 800,
                          fontSize: 14,
                        }}
                      >
                        {formatCurrency(m.netProfit)}
                      </span>
                    </div>
                    <div className={styles.collectorCardMobileDataCol}>
                      <span className={styles.collectorCardMobileDataLabel}>Flujo Neto Caja</span>
                      <span
                        style={{
                          color: m.netCashFlow >= 0 ? '#0284c7' : '#d97706',
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {formatCurrency(m.netCashFlow)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className={styles.emptyStateContainer} style={{ padding: 48, textAlign: 'center' }}>
          <AlertCircle size={48} color="#94a3b8" style={{ margin: '0 auto 16px' }} />
          <h3>No se encontraron datos para el periodo seleccionado</h3>
          <p>Prueba seleccionando un rango mayor de meses o actualizando la vista.</p>
        </div>
      )}
    </div>
  );
}
