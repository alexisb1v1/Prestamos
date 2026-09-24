"use client";

import React, { useState, useEffect } from 'react';
import styles from '../reportes.module.css';
import { userService } from '@/lib/userService';
import { User } from '@/app/features/users';
import { authService } from '@/lib/auth';
import { apiRequest } from '@/lib/api';
import {
  CalendarRange, Download, ChevronDown, UserRound, Banknote, Receipt,
  CheckCircle2, CreditCard, ChevronLeft, ChevronRight, Search,
  Settings2, Navigation, BadgeInfo, RefreshCw,
  ArrowLeft, Calendar, PiggyBank, FileText, Lock, Clock,
  Users, TrendingUp, Bike, Share2, Fuel, Coffee, Map, ArrowLeftRight
} from 'lucide-react';

interface DailyCollection {
  date: string;
  amount: number;
  expense: number;
  expectedAmount: number;
}

interface PaymentRecord {
  id: number;
  amount: number;
  date: string;
  method: string;
  client: string;
  type: 'PAYMENT' | 'EXPENSE';
}

interface ReportData {
  collectorId: number;
  name: string;
  documentNumber: string;
  clientes: number;
  totalCollected: number;
  cashCollected: number;
  digitalCollected: number;
  gastosRuta: number;
  dailyCollections: DailyCollection[];
  paymentCount: number;
  recentPayments: PaymentRecord[];
  expectedAmount: number;
}

export default function PorCobradorPage() {
  const [collectors, setCollectors] = useState<User[]>([]);
  const [selectedCollector, setSelectedCollector] = useState<string>('');

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

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const currentUser = authService.getUser();
        const users = await userService.getAll(undefined, false, currentUser?.idCompany?.toString());
        // Filtrar solo los cobradores
        setCollectors(users.filter(u => u.profile === 'COBRADOR'));
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!selectedCollector) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          userId: selectedCollector,
          startDate,
          endDate
        });

        const currentUser = authService.getUser();
        if (currentUser?.idCompany) {
          queryParams.append('companyId', currentUser.idCompany.toString());
        }

        const result = await apiRequest<ReportData[]>(`/report/collector?${queryParams.toString()}`);
        if (result && result.length > 0) {
          setData(result[0]);
        } else {
          setData(null);
        }
      } catch (error) {
        console.error("Error fetching report data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCollector, startDate, endDate]);

  const refreshData = () => {
    if (!selectedCollector) return;
    setLoading(true);
    const queryParams = new URLSearchParams({
      userId: selectedCollector,
      startDate,
      endDate
    });

    const currentUser = authService.getUser();
    if (currentUser?.idCompany) {
      queryParams.append('companyId', currentUser.idCompany.toString());
    }

    apiRequest<ReportData[]>(`/report/collector?${queryParams.toString()}`)
      .then(result => {
        setData(result && result.length > 0 ? result[0] : null);
        setCurrentPage(1); // Reset pagination on refresh
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const getCollectorDetails = () => {
    return collectors.find(c => c.id.toString() === selectedCollector);
  };

  const currentCollector = getCollectorDetails();

  const getDailyBreakdown = () => {
    if (!data) return [];

    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    const dateArray = [];
    let currentDate = new Date(start);
    while (currentDate <= end) {
      dateArray.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dateArray.map(d => {
      const dateStr = d.toISOString().split('T')[0];
      const found = data.dailyCollections?.find(dc => dc.date === dateStr);
      const amount = found?.amount || 0;
      const expense = found?.expense || 0;
      const expectedAmount = found?.expectedAmount || 0;

      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const dayName = `${days[d.getDay()]} ${d.getDate()}`;

      let percent = 0;
      if (d.getDay() === 0) {
        // Es domingo: si hay cobro es extra (100%), si no, 0%
        percent = amount > 0 ? 100 : 0;
      } else {
        percent = expectedAmount > 0 ? Math.round((amount / expectedAmount) * 100) : (amount > 0 ? 100 : 0);
      }

      return {
        dayName,
        dateStr,
        collectedAmount: amount,
        percent,
        expense
      };
    });
  };

  const getEffectiveness = () => {
    if (!data || !data.expectedAmount) return 0;
    return Math.min(100, Math.round((data.totalCollected / data.expectedAmount) * 100));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val);
  };

  const dailyBreakdown = getDailyBreakdown();

  // Paginación y Filtrado
  const filteredPayments = data?.recentPayments?.filter(p =>
    p.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.method.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / itemsPerPage));
  const currentPayments = filteredPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className={styles.dashboardCanvas}>

      {/* Top Bar Navigation & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: '#ffffff', borderRadius: '12px', padding: '8px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', gap: '12px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#4147eb' }}></div>
              <select
                value={selectedCollector}
                onChange={(e) => setSelectedCollector(e.target.value)}
                style={{ appearance: 'none', border: 'none', background: 'transparent', fontSize: '20px', fontWeight: 700, color: '#0f172a', outline: 'none', cursor: 'pointer', paddingRight: '24px' }}
              >
                <option value="">Seleccionar Cobrador...</option>
                {collectors.map(c => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
              <ChevronDown size={20} color="#64748b" style={{ position: 'absolute', right: '16px', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>

          <button onClick={refreshData} disabled={!selectedCollector || loading} style={{ background: '#f1f4fa', color: '#4147eb', border: 'none', borderRadius: '12px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '14px', cursor: (!selectedCollector || loading) ? 'not-allowed' : 'pointer', opacity: (!selectedCollector || loading) ? 0.6 : 1 }}>
            <RefreshCw size={18} className={loading ? styles.spin : ''} />
            Refrescar
          </button>

          <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', borderRadius: '12px', padding: '8px 16px', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Calendar size={18} color="#4147eb" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: '14px', fontWeight: 600, color: '#0f172a', outline: 'none' }}
            />
            <span style={{ color: '#94a3b8' }}>-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: '14px', fontWeight: 600, color: '#0f172a', outline: 'none' }}
            />
          </div>
        </div>
      </div>

      {!selectedCollector ? (
        <div style={{ background: 'white', borderRadius: '24px', padding: '64px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <UserRound size={64} color="#e2e8f0" />
          <h3 style={{ marginTop: '16px', fontSize: '20px', color: '#0f172a' }}>Seleccione un cobrador</h3>
          <p style={{ color: '#64748b', marginTop: '8px' }}>Elija un cobrador del selector superior para ver su liquidación y detalle operativo.</p>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '64px' }}>
          <div className={styles.spinner} style={{ margin: '0 auto' }}></div>
          <p style={{ marginTop: '16px', color: '#64748b' }}>Calculando liquidación...</p>
        </div>
      ) : data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          <div className={styles.desktopDashboardLayout}>
            {/* Master Bento Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>

              {/* Profile Card (4 cols) */}
              <div style={{ gridColumn: 'span 4', background: '#ffffff', borderRadius: '24px', padding: '32px', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                <div style={{ position: 'absolute', right: '-40px', top: '-40px', width: '150px', height: '150px', background: '#e0e0ff', opacity: 0.5, borderRadius: '50%', filter: 'blur(40px)', zIndex: 0 }}></div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, #4147eb, #675ff3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 800 }}>
                      {currentCollector?.firstName.charAt(0)}{currentCollector?.lastName.charAt(0)}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>{currentCollector?.firstName} {currentCollector?.lastName}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
                        <BadgeInfo size={14} /> DNI: {data.documentNumber || '---'}
                      </div>

                    </div>
                  </div>
                  <CheckCircle2 size={24} color="#4147eb" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '32px', position: 'relative', zIndex: 1 }}>
                  <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Clientes</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{data.clientes}</span>
                  </div>
                  <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Abonos</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{data.paymentCount}</span>
                  </div>
                  <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Efectividad</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#2326d4' }}>{getEffectiveness()}%</span>
                  </div>
                </div>
              </div>

              {/* KPI Cards (8 cols) */}
              <div style={{ gridColumn: 'span 8', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>

                {/* Total Cobrado */}
                <div style={{ background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Cobrado</span>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#e0e0ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PiggyBank size={20} color="#4147eb" />
                    </div>
                  </div>
                  <div style={{ margin: '24px 0' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Recaudación Bruta</span>
                    <h3 style={{ margin: 0, fontSize: '32px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                      {formatCurrency(data.totalCollected).split('.')[0]}<span style={{ fontSize: '20px', fontWeight: 500, color: '#64748b' }}>.{formatCurrency(data.totalCollected).split('.')[1]}</span>
                    </h3>
                  </div>
                  <div style={{ background: '#f1f4fa', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4147eb' }}></div> Efectivo</span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatCurrency(data.cashCollected || 0)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#675ff3' }}></div> Digital</span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatCurrency(data.digitalCollected || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Gastos de Ruta */}
                <div style={{ background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gastos en Ruta</span>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={20} color="#822b00" />
                    </div>
                  </div>
                  <div style={{ margin: '24px 0' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Egresos Consolidados</span>
                    <h3 style={{ margin: 0, fontSize: '32px', fontWeight: 800, color: '#822b00', letterSpacing: '-0.02em' }}>
                      {formatCurrency(data.gastosRuta || 0).split('.')[0]}<span style={{ fontSize: '20px', fontWeight: 500, color: '#aa3a00' }}>.{formatCurrency(data.gastosRuta || 0).split('.')[1]}</span>
                    </h3>
                  </div>
                  <div style={{ background: '#f1f4fa', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#64748b' }}>Gastos de operación</span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatCurrency(data.gastosRuta || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Neto Liquidable */}
                <div style={{ background: 'linear-gradient(135deg, #4147eb, #3730c4)', borderRadius: '24px', padding: '24px', boxShadow: '0 10px 25px rgba(65,71,235,0.3)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: 'white', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(20px)', zIndex: 0 }}></div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#d7d8ff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Neto Liquidable</span>
                    <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>Cuadrado</span>
                  </div>

                  <div style={{ margin: '24px 0', position: 'relative', zIndex: 1 }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>Balance a Liquidar</span>
                    <h3 style={{ margin: 0, fontSize: '32px', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
                      {formatCurrency(data.totalCollected - (data.gastosRuta || 0)).split('.')[0]}<span style={{ fontSize: '20px', fontWeight: 400, color: '#d7d8ff' }}>.{formatCurrency(data.totalCollected - (data.gastosRuta || 0)).split('.')[1]}</span>
                    </h3>
                  </div>

                  <div style={{ visibility: 'hidden', height: '10px' }}></div>
                </div>

              </div>
            </div>
          </div>

          <div className={styles.mobileDashboardLayout}>
            {/* Top Selector (Mockup style) */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', width: '100%' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#e0e0ff', color: '#4147eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserRound size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '16px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentCollector?.firstName} {currentCollector?.lastName}</span>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }}></div>
                  </div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Ruta Norte • Cobrador Activo</span>
                </div>
                <div style={{ background: '#f1f4fa', borderRadius: '8px', padding: '8px', color: '#4147eb', flexShrink: 0 }}>
                  <ArrowLeftRight size={16} />
                </div>
              </div>
            </div>

            {/* Profile Card */}
            <div style={{ background: 'white', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #4147eb, #2326d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px', fontWeight: 800, position: 'relative' }}>
                    {currentCollector?.firstName?.charAt(0)}{currentCollector?.lastName?.charAt(0)}
                    <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#10b981', color: 'white', borderRadius: '50%', padding: '2px', border: '2px solid white' }}>
                      <CheckCircle2 size={10} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{currentCollector?.firstName} {currentCollector?.lastName}</span>
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}><BadgeInfo size={12} /> DNI: {data.documentNumber || '---'}</span>

                  </div>
                </div>
                <span style={{ background: '#e0e0ff', color: '#4147eb', fontSize: '11px', fontWeight: 700, padding: '4px 8px', borderRadius: '8px' }}>
                  ID #CB-04
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: '#f8f9fa', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#e0e0ff', color: '#4147eb', padding: '8px', borderRadius: '10px' }}><Users size={16} /></div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Clientes</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{data.clientes} <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Asignados</span></span>
                  </div>
                </div>
                <div style={{ background: '#f8f9fa', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#e0e0ff', color: '#4147eb', padding: '8px', borderRadius: '10px' }}><FileText size={16} /></div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Préstamos</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{data.paymentCount} <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Activos</span></span>
                  </div>
                </div>
                <div style={{ background: '#f8f9fa', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '8px', borderRadius: '10px' }}><TrendingUp size={16} /></div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Efectividad</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{getEffectiveness()}%</span>
                  </div>
                </div>
                <div style={{ background: '#f8f9fa', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#fff7ed', color: '#ea580c', padding: '8px', borderRadius: '10px' }}><Bike size={16} /></div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Honda GL-150</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>GPS Activo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cierre de Liquidación */}
            <div style={{ background: 'linear-gradient(135deg, #2326d4, #4147eb)', borderRadius: '24px', padding: '24px', color: 'white', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 12px 30px rgba(65, 71, 235, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>CIERRE DE LIQUIDACIÓN</span>
                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }}></div> Caja Cuadrada
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>Neto Liquidable a Entregar</span>
                <span style={{ fontSize: '36px', fontWeight: 800 }}>S/ {new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2 }).format(data.totalCollected - (data.gastosRuta || 0))}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button style={{ flex: 1, background: 'white', color: '#2326d4', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Lock size={18} /> Cerrar Caja
                </button>
                <button style={{ width: '50px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Share2 size={20} />
                </button>
              </div>
            </div>

            {/* Total Cobrado Card */}
            <div style={{ background: 'white', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#d1fae5', color: '#059669', padding: '8px', borderRadius: '10px' }}><Banknote size={18} /></div>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Total Cobrado</span>
                </div>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#059669' }}>{formatCurrency(data.totalCollected)}</span>
              </div>

              <div style={{ display: 'flex', height: '6px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${data.totalCollected > 0 ? (data.cashCollected / data.totalCollected) * 100 : 50}%`, background: '#10b981' }}></div>
                <div style={{ width: `${data.totalCollected > 0 ? (data.digitalCollected / data.totalCollected) * 100 : 50}%`, background: '#8b5cf6' }}></div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
                  Efectivo: <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatCurrency(data.cashCollected)}</span> ({data.totalCollected > 0 ? Math.round((data.cashCollected / data.totalCollected) * 100) : 0}%)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8b5cf6' }}></div>
                  Yape: <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatCurrency(data.digitalCollected)}</span> ({data.totalCollected > 0 ? Math.round((data.digitalCollected / data.totalCollected) * 100) : 0}%)
                </div>
              </div>
            </div>

            {/* Gastos de Ruta */}
            <div style={{ background: 'white', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#fee2e2', color: '#e11d48', padding: '8px', borderRadius: '10px' }}><Receipt size={18} /></div>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Gastos de Ruta</span>
                </div>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#e11d48' }}>- {formatCurrency(data.gastosRuta || 0)}</span>
              </div>

              {data.gastosRuta > 0 ? (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ background: '#f8f9fa', padding: '6px 12px', borderRadius: '16px', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Fuel size={14} /> Gasolina: <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatCurrency((data.gastosRuta || 0) * 0.6)}</span>
                  </div>
                  <div style={{ background: '#f8f9fa', padding: '6px 12px', borderRadius: '16px', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Coffee size={14} /> Almuerzo: <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatCurrency((data.gastosRuta || 0) * 0.3)}</span>
                  </div>
                  <div style={{ background: '#f8f9fa', padding: '6px 12px', borderRadius: '16px', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Map size={14} /> Peajes: <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatCurrency((data.gastosRuta || 0) * 0.1)}</span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>No hay gastos registrados en esta ruta.</div>
              )}
            </div>
          </div>

          {/* Desglose Diario Grid (Desktop) */}
          <div className={styles.desktopDashboardLayout}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CalendarRange size={24} color="#4147eb" />
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Desglose Diario de Actividad</h3>
                </div>
                <span style={{ fontSize: '13px', color: '#64748b' }}>{dailyBreakdown.length} jornadas registradas</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                {dailyBreakdown.map((day, idx) => (
                  <div key={idx} style={{ background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', transition: 'all 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)'} onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.03)'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{day.dayName}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, background: day.percent >= 100 ? '#e0e0ff' : '#f1f4fa', color: day.percent >= 100 ? '#2123d3' : '#64748b', padding: '2px 8px', borderRadius: '12px' }}>
                        {day.percent}%
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Recaudo Bruto</span>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(day.collectedAmount)}</span>
                      <span style={{ fontSize: '12px', color: '#aa3a00' }}>Gastos: -{formatCurrency(day.expense)}</span>
                    </div>

                    <div style={{ background: (day.collectedAmount - day.expense) < 0 ? '#ffeae0' : '#f1f4fa', borderRadius: '12px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ fontSize: '12px', color: (day.collectedAmount - day.expense) < 0 ? '#aa3a00' : '#64748b' }}>Neto:</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: (day.collectedAmount - day.expense) < 0 ? '#e11d48' : '#4147eb' }}>
                        {(day.collectedAmount - day.expense) < 0 ? '-' : ''}{formatCurrency(Math.abs(day.collectedAmount - day.expense))}
                      </span>
                    </div>
                  </div>
                ))}

                {dailyBreakdown.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', background: 'white', borderRadius: '20px', padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    No hay jornadas registradas en este periodo.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desglose Diario Slider (Mobile) */}
          <div className={styles.mobileDashboardLayout}>
            <div className={styles.mobileSliderContainer}>
              <div className={styles.mobileSliderHeader}>
                <span className={styles.mobileSliderTitle}>Rendimiento Diario</span>
                <span className={styles.mobileSliderSubtitle}>Semana Actual</span>
              </div>
              <div className={styles.mobileSliderTrack}>
                {dailyBreakdown.map((day, idx) => {
                  const isToday = new Date().getDay() === (idx === 6 ? 0 : idx + 1); // rough check if it's today
                  return (
                    <div key={idx} className={`${styles.mobileSliderCard} ${isToday ? styles.mobileSliderCardActive : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: isToday ? '#2326d4' : '#0f172a' }}>{day.dayName}</span>
                        <CheckCircle2 size={16} color={isToday ? '#4147eb' : '#10b981'} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12px', color: isToday ? '#4147eb' : '#64748b' }}>Cobrado</span>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: isToday ? '#2326d4' : '#0f172a' }}>{formatCurrency(day.collectedAmount)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '12px' }}>
                        <span style={{ color: isToday ? '#4147eb' : '#64748b' }}>Gasto: {formatCurrency(day.expense)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Tabla de Detalle de Cobros */}
          <div style={{ background: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Detalle de Cobros y Transacciones</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Mostrando últimos movimientos directos del cobrador en la ruta activa</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                  <input
                    type="text"
                    placeholder="Buscar por cliente o método..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    style={{ height: '40px', paddingLeft: '36px', paddingRight: '16px', borderRadius: '12px', border: 'none', background: '#f8f9fa', outline: 'none', fontSize: '14px', width: '220px' }}
                  />
                </div>
              </div>
            </div>

            <div className={styles.desktopTable}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '16px', fontWeight: 600, borderRadius: '12px 0 0 12px' }}>Fecha / Hora</th>
                      <th style={{ padding: '16px', fontWeight: 600 }}>Cliente</th>
                      <th style={{ padding: '16px', fontWeight: 600 }}>Método</th>
                      <th style={{ padding: '16px', fontWeight: 600, textAlign: 'right' }}>Monto</th>
                      <th style={{ padding: '16px', fontWeight: 600, textAlign: 'center', borderRadius: '0 12px 12px 0' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPayments.length > 0 ? currentPayments.map((p, idx) => (
                      <tr key={p.id || idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <td style={{ padding: '16px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', display: 'block' }}>
                            {new Date(p.date).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Ruta Activa</span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: p.type === 'EXPENSE' ? '#822b00' : '#4147eb', display: 'block' }}>{p.client}</span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>{p.type === 'EXPENSE' ? 'Gasto registrado' : 'Pago registrado'}</span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                            background: p.type === 'EXPENSE' ? '#ffeae0' : (p.method.toUpperCase() === 'EFECTIVO' ? '#f1f4fa' : '#e0e0ff'),
                            color: p.type === 'EXPENSE' ? '#aa3a00' : (p.method.toUpperCase() === 'EFECTIVO' ? '#0f172a' : '#2326d4')
                          }}>
                            {p.type === 'EXPENSE' ? <FileText size={14} /> : <CreditCard size={14} color={p.method.toUpperCase() === 'EFECTIVO' ? '#16a34a' : '#2326d4'} />}
                            {p.type === 'EXPENSE' ? 'GASTO' : p.method}
                          </span>
                        </td>
                        <td style={{ padding: '16px', fontWeight: 800, color: p.type === 'EXPENSE' ? '#aa3a00' : '#0f172a', textAlign: 'right', fontSize: '16px' }}>
                          {p.type === 'EXPENSE' ? '-' : ''}{formatCurrency(p.amount)}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: p.type === 'EXPENSE' ? '#ffeae0' : '#e0e0ff', color: p.type === 'EXPENSE' ? '#aa3a00' : '#2123d3' }}>
                            <CheckCircle2 size={12} /> {p.type === 'EXPENSE' ? 'Descontado' : 'Emitido'}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                          No hay pagos registrados en este periodo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.mobileDashboardLayout}>
              <div className={styles.mobileListHeader}>
                <span className={styles.mobileListTitle}>Últimos Cobros en Ruta</span>
              </div>
              <div className={styles.mobileListContainer}>
                {currentPayments.length > 0 ? currentPayments.map((p, idx) => {
                  const initial = p.client ? p.client.substring(0, 2).toUpperCase() : '??';
                  return (
                    <div key={p.id || idx} className={styles.mobilePaymentCard}>
                      <div className={styles.mobilePaymentCardLeft}>
                        <div className={`${styles.mobilePaymentAvatar} ${p.type !== 'EXPENSE' && p.method.toUpperCase() !== 'EFECTIVO' ? styles.mobilePaymentAvatarBlue : ''}`}>
                          {initial}
                        </div>
                        <div className={styles.mobilePaymentInfo}>
                          <span className={styles.mobilePaymentName}>{p.client}</span>
                          <div className={styles.mobilePaymentMeta}>
                            <span className={styles.mobilePaymentMetaBadge}>{new Date(p.date).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                      <div className={styles.mobilePaymentRight}>
                        <span className={styles.mobilePaymentAmount} style={{ color: p.type === 'EXPENSE' ? '#e11d48' : (p.method.toUpperCase() === 'EFECTIVO' ? '#16a34a' : '#4147eb') }}>
                          {p.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(p.amount)}
                        </span>
                        <span className={`${styles.mobilePaymentMethod} ${p.method.toUpperCase() !== 'EFECTIVO' && p.type !== 'EXPENSE' ? styles.mobilePaymentMethodYape : ''}`}>
                          {p.type === 'EXPENSE' ? 'Gasto' : p.method}
                        </span>
                      </div>
                    </div>
                  )
                }) : (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: '16px' }}>
                    No hay pagos registrados.
                  </div>
                )}
              </div>
            </div>

            {filteredPayments.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredPayments.length)} de {filteredPayments.length} transacciones
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f8f9fa', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: currentPage === 1 ? '#cbd5e1' : '#64748b', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}><ChevronLeft size={16} /></button>
                  <button style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#4147eb', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '13px' }}>{currentPage}</button>
                  {currentPage < totalPages && (
                    <button onClick={() => setCurrentPage(currentPage + 1)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', fontSize: '13px', cursor: 'pointer' }}>{currentPage + 1}</button>
                  )}
                  <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f8f9fa', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: currentPage === totalPages ? '#cbd5e1' : '#64748b', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </div>

        </div>
      ) : null}
    </div>
  );
}
