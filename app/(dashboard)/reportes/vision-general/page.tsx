'use client';

import React, { useState, useEffect } from 'react';
import styles from '../reportes.module.css';
import { authService } from '@/lib/auth';
import { apiRequest } from '@/lib/api';
import {
  CalendarRange,
  RefreshCw,
  FileText,
  Banknote,
  Fuel,
  Landmark,
  PieChart,
  Activity,
  CheckCircle,
  Users,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  ChevronRight
} from 'lucide-react';

interface ConsolidatedData {
  totalCollected: number;
  cashCollected: number;
  digitalCollected: number;
  capitalRecovered: number;
  interestEarned: number;
  totalExpenses: number;
  expectedAmount?: number;
  netBalance: number;
  dailyCollections?: { date: string; amount: number }[];
}

interface CollectorData {
  userId: string;
  name: string;
  paymentCount: number;
  totalCollected: number;
  clientes: number;
  prestamosActivos: number;
  gastosRuta: number;
  netoEntregar: number;
  expectedAmount?: number;
}

export default function VisionGeneralPage() {
  const [data, setData] = useState<ConsolidatedData | null>(null);
  const [collectorData, setCollectorData] = useState<CollectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const getStartOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lunes
    const start = new Date(d.setDate(diff));
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  };

  const getEndOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + 6; // Domingo
    const end = new Date(d.setDate(diff));
    return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
  };

  const [startDate, setStartDate] = useState(getStartOfWeek());
  const [endDate, setEndDate] = useState(getEndOfWeek());

  const loadData = async () => {
    try {
      setLoading(true);
      const user = authService.getUser();

      const queryParams = new URLSearchParams({
        startDate,
        endDate,
      });

      if (user?.idCompany) {
        queryParams.append('companyId', user.idCompany.toString());
      }

      const [consolidatedJson, collectorJson] = await Promise.all([
        apiRequest<ConsolidatedData>(`/report/consolidated?${queryParams.toString()}`),
        apiRequest<CollectorData[]>(`/report/collector?${queryParams.toString()}`)
      ]);

      if (consolidatedJson) setData(consolidatedJson);
      if (collectorJson) setCollectorData(collectorJson);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val);
  };

  const getEfficiencyPercent = (data: ConsolidatedData) => {
    if (!data.expectedAmount || data.expectedAmount === 0) return data.totalCollected > 0 ? 100 : 0;
    const value = ((data.totalCollected / data.expectedAmount) * 100).toFixed(1);
    return Math.round(parseFloat(value));
  };

  // Format real daily data
  const getDailyChartData = () => {
    if (!startDate || !endDate) return [];

    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const result = [];

    // Use T12:00:00 to avoid timezone shift issues
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');

    const collectionsMap = new Map();
    if (data && data.dailyCollections) {
      data.dailyCollections.forEach(d => {
        collectionsMap.set(d.date, d.amount);
      });
    }

    const current = new Date(start);
    while (current <= end) {
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      const amount = collectionsMap.get(dateStr) || 0;

      result.push({
        day: `${days[current.getDay()]} ${current.getDate()}`,
        value: amount
      });

      current.setDate(current.getDate() + 1);
    }

    return result;
  };

  const dailyChartData = getDailyChartData();
  const maxDaily = dailyChartData.length > 0 ? Math.max(...dailyChartData.map(d => d.value)) || 100 : 100;

  return (
    <div className={styles.dashboardCanvas}>
      {/* Top command center */}
      <section className={styles.commandCenter}>
        <div className={styles.commandHeader}>
          <h1 className={styles.commandTitle}>Visión General Consolidada</h1>
        </div>

        <div className={styles.commandActions}>
          <div className={styles.datePickerPill}>
            <CalendarRange size={18} color="#4147eb" />
            <input
              type="date"
              className={styles.pillInput}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span style={{ color: '#454652', fontWeight: 600 }}> - </span>
            <input
              type="date"
              className={styles.pillInput}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button className={styles.btnSecondary} onClick={loadData}>
            <RefreshCw size={18} />
            <span>Actualizar</span>
          </button>
        </div>
      </section>

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Sincronizando métricas...</p>
        </div>
      ) : data ? (
        <>
          {/* Master KPI Bento Ribbon */}
          <div className={styles.desktopDashboardLayout}>
            <div className={styles.bentoRibbon}>
              {/* Card 1: Cobro Bruto */}
              <div className={styles.bentoCard}>
                <div className={styles.bentoCardHeader}>
                  <span className={styles.bentoCardTitle}>Total Cobrado Bruto</span>
                  <span className={`${styles.bentoIcon} ${styles.iconPrimary}`}>
                    <Banknote size={18} />
                  </span>
                </div>
                <div className={styles.bentoCardBody}>
                  <div className={styles.bentoValue}>{formatCurrency(data.totalCollected)}</div>
                </div>
                <div className={styles.bentoCardFooter}>
                  <div className={styles.footerRow}>
                    <span>Efectivo Físico</span>
                    <span className={styles.footerRowValueBlack}>{formatCurrency(data.cashCollected)}</span>
                  </div>
                  <div className={styles.footerRow}>
                    <span>Yape / Digital</span>
                    <span className={styles.footerRowValuePrimary}>{formatCurrency(data.digitalCollected)}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Gastos Operativos */}
              <div className={styles.bentoCard}>
                <div className={styles.bentoCardHeader}>
                  <span className={styles.bentoCardTitle}>Gastos Operativos Ruta</span>
                  <span className={`${styles.bentoIcon} ${styles.iconDanger}`}>
                    <Fuel size={18} />
                  </span>
                </div>
                <div className={styles.bentoCardBody}>
                  <div className={styles.bentoValueDanger}>{formatCurrency(data.totalExpenses)}</div>
                  <span className={styles.bentoSubtext}>Gasolina, viáticos y mant. menor</span>
                </div>
                <div className={styles.bentoCardFooterSingle}>
                  <span>Impacto s/ Recaudo</span>
                  <span className={styles.footerValueDanger}>
                    {data.totalCollected > 0 ? ((data.totalExpenses / data.totalCollected) * 100).toFixed(2) : 0}% del total
                  </span>
                </div>
              </div>

              {/* Card 3: Balance Neto en Caja */}
              <div className={`${styles.bentoCard} ${styles.bentoCardGradient}`}>
                <div className={styles.bentoCardHeader}>
                  <span className={styles.bentoCardTitleWhite}>Balance Neto en Caja</span>
                  <span className={`${styles.bentoIcon} ${styles.iconWhite}`}>
                    <Landmark size={18} />
                  </span>
                </div>
                <div className={styles.bentoCardBody}>
                  <div className={styles.bentoValueWhite}>{formatCurrency(data.netBalance)}</div>
                  <span className={styles.bentoSubtextWhite}>Efectivo real en bóveda central</span>
                </div>
                <div className={styles.bentoCardFooterGlass}>
                  <span>Conciliación Total</span>
                </div>
              </div>

              {/* Card 4: Capital vs Interés */}
              <div className={styles.bentoCard}>
                <div className={styles.bentoCardHeader}>
                  <span className={styles.bentoCardTitle}>Recupero vs Interés</span>
                  <span className={`${styles.bentoIcon} ${styles.iconSuccess}`}>
                    <PieChart size={18} />
                  </span>
                </div>
                <div className={styles.bentoCardBody}>
                  <div className={styles.bentoValue}>{formatCurrency(data.capitalRecovered)}</div>
                  <span className={styles.bentoSubtext}>
                    Capital devuelto ({data.totalCollected > 0 ? ((data.capitalRecovered / data.totalCollected) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className={styles.bentoCardFooterSingle}>
                  <span>Interés Ganado</span>
                  <span className={styles.footerValueSuccess}>{formatCurrency(data.interestEarned)}</span>
                </div>
              </div>

              {/* Card 5: Eficiencia Global */}
              <div className={styles.bentoCard}>
                <div className={styles.bentoCardHeader}>
                  <span className={styles.bentoCardTitle}>Cumplimiento Meta Global</span>
                  <span className={`${styles.bentoIcon} ${styles.iconPrimaryDim}`}>
                    <Activity size={18} />
                  </span>
                </div>
                <div className={styles.bentoCardBody}>
                  <div className={styles.bentoValueSuccess}>{getEfficiencyPercent(data)}%</div>
                  <span className={styles.bentoSubtext}>Recaudado vs Esperado</span>
                </div>
                <div className={styles.bentoCardFooterProgress}>
                  <div className={styles.progressBarBg}>
                    <div className={styles.progressBarFill} style={{ width: `${Math.min(getEfficiencyPercent(data), 100)}%` }}></div>
                  </div>
                  <div className={styles.progressLabels}>
                    <span>Meta: {formatCurrency(data.expectedAmount || 0)}</span>
                    <span className={styles.progressHighlight}>
                      {getEfficiencyPercent(data) >= 100 ? '+' : ''}{(getEfficiencyPercent(data) - 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.mobileDashboardLayout}>
            {/* Control de fechas mobile */}
            <div className={styles.mobileDatePickerRow}>
              <CalendarRange size={16} color="#4147eb" />
              <input
                type="date"
                className={styles.mobileDateInput}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>—</span>
              <input
                type="date"
                className={styles.mobileDateInput}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <button className={styles.mobileDateRefreshBtn} onClick={loadData}>
                <RefreshCw size={14} />
              </button>
            </div>

            {/* Balance Neto */}
            <div className={styles.mobileCardGradient}>
              <div className={styles.mobileCardGradientHeader}>
                <div className={styles.mobileCardGradientTitle}>
                  <Landmark size={14} /> BALANCE NETO EN CAJA
                </div>
              </div>
              <div className={styles.mobileCardGradientValue}>
                <span className={styles.mobileCurrencySymbol}>S/</span> {new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(data.netBalance)}
              </div>
              <div className={styles.mobileCardGradientFooter}>
                <div className={styles.mobileCardGradientFooterLeft}>
                  <CheckCircle size={14} /> Liquidación semanal al día
                </div>
              </div>
            </div>

            {/* Total Cobrado */}
            <div className={styles.mobileCardWhite}>
              <div className={styles.mobileCardWhiteHeader}>
                <span className={styles.mobileCardWhiteTitle}>Total Cobrado</span>
                <div className={styles.mobileCardWhiteIcon}>
                  <Banknote size={16} />
                </div>
              </div>
              <div className={styles.mobileCardWhiteValueRow}>
                <span className={styles.mobileCardWhiteValue}>S/ {new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(data.totalCollected)}</span>
                {data.totalCollected > 0 && <span className={styles.mobileCardWhiteTrend}><TrendingUp size={12} style={{ marginRight: '2px' }} /> +8.2%</span>}
              </div>

              <div className={styles.mobilePillsRow}>
                <div className={styles.mobilePill}>
                  <div className={styles.mobilePillHeader}>
                    <div className={styles.mobileDotGreen}></div> Efectivo
                  </div>
                  <span className={styles.mobilePillValue}>S/ {new Intl.NumberFormat('es-PE').format(data.cashCollected)}</span>
                </div>
                <div className={styles.mobilePill}>
                  <div className={styles.mobilePillHeader}>
                    <div className={styles.mobileDotPurple}></div> Yape / Plin
                  </div>
                  <span className={styles.mobilePillValue}>S/ {new Intl.NumberFormat('es-PE').format(data.digitalCollected)}</span>
                </div>
              </div>
            </div>

            {/* Gastos Ruta & Eficiencia */}
            <div className={styles.mobileMetricsGrid}>
              <div className={styles.mobileCardWhite}>
                <div className={styles.mobileCardWhiteHeader}>
                  <span className={styles.mobileCardWhiteTitle}>Gastos Ruta</span>
                  <div className={`${styles.mobileCardWhiteIcon} ${styles.mobileCardWhiteIconDanger}`}>
                    <TrendingDown size={16} />
                  </div>
                </div>
                <div className={styles.mobileMetricContent}>
                  <div className={styles.mobileCardWhiteValue} style={{ fontSize: '18px' }}>S/ {new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(data.totalExpenses)}</div>
                  <div className={styles.mobileMetricSubtextDanger}>
                    -{data.totalCollected > 0 ? ((data.totalExpenses / data.totalCollected) * 100).toFixed(2) : 0}% del total
                  </div>
                </div>
              </div>

              <div className={styles.mobileCardWhite}>
                <div className={styles.mobileCardWhiteHeader}>
                  <span className={styles.mobileCardWhiteTitle}>Eficiencia</span>
                  <div className={styles.mobileCardWhiteIcon}>
                    <Target size={16} />
                  </div>
                </div>
                <div className={styles.mobileMetricContent}>
                  <div className={styles.mobileCardWhiteValue} style={{ fontSize: '18px' }}>{getEfficiencyPercent(data)}%</div>
                  <div className={styles.mobileMetricSubtextSuccess}>
                    Meta {getEfficiencyPercent(data) >= 100 ? 'superada' : 'en progreso'}
                  </div>
                </div>
              </div>
            </div>

            {/* Recupero de Capital vs Interés */}
            <div className={styles.mobileCardWhite}>
              <div className={styles.mobileCardWhiteHeader}>
                <span className={styles.mobileCardWhiteTitle} style={{ fontSize: '16px', fontWeight: '700' }}>Recupero de Capital vs Interés</span>
                <span className={styles.mobileCardWhiteTitle} style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Semana 18</span>
              </div>
              <div className={styles.mobileStackedBarContainer}>
                <div className={styles.mobileStackedBarCapital} style={{ width: `${data.totalCollected > 0 ? (data.capitalRecovered / data.totalCollected) * 100 : 0}%` }}></div>
                <div className={styles.mobileStackedBarInterest} style={{ width: `${data.totalCollected > 0 ? (data.interestEarned / data.totalCollected) * 100 : 0}%` }}></div>
              </div>
              <div className={styles.mobileLegendRow}>
                <div className={styles.mobileLegendItem}>
                  <span className={styles.mobileLegendLabel}><div className={styles.mobileDotBlue}></div> Capital Recuperado</span>
                  <div className={styles.mobileLegendValue}>
                    S/ {new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(data.capitalRecovered)}
                  </div>
                </div>
                <div className={styles.mobileLegendItemRight}>
                  <span className={styles.mobileLegendLabel}>Interés Ganado <div className={styles.mobileDotPurple}></div></span>
                  <div className={styles.mobileLegendValue}>
                    S/ {new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(data.interestEarned)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.middleRowSingle}>
            {/* Daily Collection Chart */}
            <div className={`${styles.chartContainer} ${styles.dailyChartCard}`}>
              <div className={styles.chartHeader}>
                <div>
                  <h2 className={styles.chartTitle}>Recaudación Diaria Semanal</h2>
                  <p className={styles.chartSubtitle}>
                    Comparativa de ingresos por cobranza en campo (Lunes a Sábado)
                  </p>
                </div>
                <div className={styles.chartLegend}>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDotCapital}></span>
                    <span className={styles.legendLabel}>Efectivo</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDotInterest} style={{ backgroundColor: '#bdc2ff' }}></span>
                    <span className={styles.legendLabel}>Digital</span>
                  </div>
                </div>
              </div>

              <div className={styles.barChartWrapper}>
                {dailyChartData.map((d, i) => (
                  <div key={i} className={styles.barColumn}>
                    <span className={styles.barValueTooltip}>{formatCurrency(d.value)}</span>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{ height: `${(d.value / maxDaily) * 100}%` }}
                      ></div>
                    </div>
                    <span className={styles.barLabel}>{d.day}</span>
                  </div>
                ))}
              </div>

              <div className={styles.chartFooter}>
                <div className={styles.chartFooterLeft}>
                  <TrendingUp size={20} color="#4147eb" />
                  <span className={styles.chartFooterLabel}>Promedio diario recaudado:</span>
                  <span className={styles.chartFooterValue}>
                    {formatCurrency(data && data.dailyCollections && data.dailyCollections.length > 0 ? (data.totalCollected / data.dailyCollections.length) : 0)} / día
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Desempeño y Liquidación */}
          <div className={styles.tableContainerSection}>
            <div className={styles.tableHeaderSection}>
              <div>
                <h2 className={styles.tableTitleSection}>Desempeño por Cobrador</h2>
                <p className={styles.tableSubtitleSection}>Detalle de valores recaudados y saldo neto final.</p>
              </div>
            </div>

            <div className={styles.desktopTable}>
              <div className={styles.tableWrapper}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Cobrador</th>
                      <th style={{ textAlign: 'center' }}>Clientes</th>
                      <th style={{ textAlign: 'center' }}>Préstamos Activos</th>
                      <th style={{ textAlign: 'right' }}>Cobro Bruto</th>
                      <th style={{ textAlign: 'right' }}>Gastos Ruta</th>
                      <th style={{ textAlign: 'right' }}>Neto a Entregar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collectorData.map(c => (
                      <tr key={c.userId}>
                        <td>
                          <div className={styles.tableCollectorInfo}>
                            <div className={styles.tableAvatar}>{c.name.charAt(0).toUpperCase()}</div>
                            <div>
                              <div className={styles.tableCollectorName}>{c.name}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '500' }}>{c.clientes}</td>
                        <td style={{ textAlign: 'center', fontWeight: '500' }}>{c.prestamosActivos}</td>
                        <td style={{ textAlign: 'right', fontWeight: '700' }}>{formatCurrency(c.totalCollected)}</td>
                        <td style={{ textAlign: 'right', color: '#c2410c', fontWeight: '600' }}>- {formatCurrency(c.gastosRuta)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={styles.tagNeto}>{formatCurrency(c.netoEntregar)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.mobileCards}>
              {collectorData.map(c => {
                const isTopPerformer = c.totalCollected > 0 && collectorData.every(x => c.totalCollected >= x.totalCollected);
                const percentMeta = c.expectedAmount && c.expectedAmount > 0 ? ((c.totalCollected / c.expectedAmount) * 100).toFixed(1) : (c.totalCollected > 0 ? 100 : 0);

                return (
                  <div key={c.userId} className={styles.collectorCardMobile}>
                    <div className={styles.collectorCardMobileHeader}>
                      <div className={styles.collectorCardMobileProfile}>
                        <div className={styles.collectorCardMobileAvatar}>
                          {c.name.charAt(0).toUpperCase()}{c.name.split(' ').length > 1 ? c.name.split(' ')[1].charAt(0).toUpperCase() : ''}
                        </div>
                        <div className={styles.collectorCardMobileDataCol}>
                          <div className={styles.collectorCardMobileName}>
                            {c.name}
                            {isTopPerformer && <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#d1fae5', color: '#065f46', fontSize: '10px', fontWeight: '600' }}>Líder</span>}
                          </div>
                          <span className={styles.collectorCardMobileSubtitle}>{c.prestamosActivos} activos / {c.clientes} clientes</span>
                        </div>
                      </div>
                      <div className={styles.collectorCardMobileMetrics}>
                        <span className={styles.collectorCardMobileTitle}>{formatCurrency(c.totalCollected)}</span>
                        <span className={styles.collectorCardMobileProgress}>{percentMeta}% meta</span>
                      </div>
                    </div>

                    <div className={styles.collectorCardMobileGrid}>
                      <div className={styles.collectorCardMobileDataCol}>
                        <span className={styles.collectorCardMobileDataLabel}>Gastos reportados</span>
                        <span className={styles.collectorCardMobileDataValueError}>{formatCurrency(c.gastosRuta)}</span>
                      </div>
                      <div className={styles.collectorCardMobileDataCol}>
                        <span className={styles.collectorCardMobileDataLabel}>Neto en Entrega</span>
                        <span className={isTopPerformer ? styles.collectorCardMobileDataValuePrimary : styles.collectorCardMobileDataValueNeutral}>{formatCurrency(c.netoEntregar)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <br />

          {/* Income Distribution (Original) */}
          <div className={styles.chartContainer}>
            <div className={styles.chartHeader}>
              <div>
                <h2 className={styles.chartTitle}>Distribución de Ingresos</h2>
                <p className={styles.chartSubtitle}>Comparativa de ingresos de capital e intereses en el periodo</p>
              </div>
              <div className={styles.chartLegend}>
                <div className={styles.legendItem}>
                  <span className={styles.legendDotCapital}></span>
                  <span className={styles.legendLabel}>Capital Recuperado</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendDotInterest}></span>
                  <span className={styles.legendLabel}>Interés Ganado</span>
                </div>
              </div>
            </div>

            <div className={styles.stackedBarContainer}>
              <div
                className={styles.stackedBarCapital}
                style={{ width: `${data.totalCollected > 0 ? (data.capitalRecovered / data.totalCollected) * 100 : 0}%` }}
              >
                {data.totalCollected > 0 && (data.capitalRecovered / data.totalCollected) > 0.1 && (
                  <span className={styles.stackedBarLabel}>Capital</span>
                )}
              </div>
              <div
                className={styles.stackedBarInterest}
                style={{ width: `${data.totalCollected > 0 ? (data.interestEarned / data.totalCollected) * 100 : 0}%` }}
              >
                {data.totalCollected > 0 && (data.interestEarned / data.totalCollected) > 0.1 && (
                  <span className={styles.stackedBarLabel}>Interés</span>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className={styles.emptyState}>
          <BarChart3 size={48} color="#c6c5d4" />
          <p>No hay datos para las fechas seleccionadas.</p>
        </div>
      )}
    </div>
  );
}
