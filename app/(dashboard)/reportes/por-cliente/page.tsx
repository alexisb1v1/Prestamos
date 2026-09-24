'use client';

import React, { useState } from 'react';
import styles from '../reportes.module.css';
import { searchPersonUseCase } from '@/app/features/people';
import { Person } from '@/app/features/people/models/person.model';
import { apiRequest } from '@/lib/api';

interface ClientHealthData {
  person: {
    id: string;
    documentNumber: string;
    fullName: string;
    creditScore: number;
    suggestedLimit: number | null;
    healthState: string;
  };
  history: Array<{
    loanId: string;
    amount: number;
    interest: number;
    fee: number;
    status: string;
    startDate: string;
    totalPaid: number;
    progressPercentage: number;
  }>;
}

export default function PorClientePage() {
  const [docType, setDocType] = useState("DNI");
  const [docNumber, setDocNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [person, setPerson] = useState<Person | null>(null);
  const [report, setReport] = useState<ClientHealthData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const searchPersonAndReport = async () => {
    if (!docNumber) return;
    try {
      setLoading(true);
      setErrorMsg("");
      setReport(null);
      setPerson(null);
      
      const personResult = await searchPersonUseCase.execute(docType, docNumber);
      if (personResult.isErr()) {
        setErrorMsg("Persona no encontrada o error en la búsqueda.");
        setLoading(false);
        return;
      }
      
      const foundPerson = personResult.value;
      setPerson(foundPerson);
      
      // Now fetch report
      const json = await apiRequest<ClientHealthData>(`/report/client-health?personId=${foundPerson.id}`);
      if (json) {
        setReport(json);
      } else {
        setErrorMsg("No se pudo obtener el historial del cliente.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (state: string) => {
    switch(state) {
      case 'VERDE': return styles.scoreVerde;
      case 'AMARILLO': return styles.scoreAmarillo;
      case 'NARANJA': return styles.scoreNaranja;
      case 'ROJO': return styles.scoreRojo;
      default: return styles.scoreVerde;
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val);
  };

  return (
    <div>
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Tipo Doc.</label>
          <select 
            className={styles.filterInput} 
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          >
            <option value="DNI">DNI</option>
            <option value="CE">CE</option>
            <option value="PASAPORTE">PASAPORTE</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Número de Documento</label>
          <input 
            type="text" 
            className={styles.filterInput} 
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value)}
            placeholder="Ingrese el documento"
          />
        </div>
        <button className={styles.primaryButton} onClick={searchPersonAndReport} disabled={loading || !docNumber}>
          {loading ? 'Buscando...' : 'Buscar Historial'}
        </button>
      </div>

      {errorMsg && (
        <div style={{ color: '#ef4444', marginBottom: '24px', fontSize: '14px', background: '#fef2f2', padding: '12px', borderRadius: '8px' }}>
          {errorMsg}
        </div>
      )}

      {!report && !loading && !errorMsg && (
        <div className={styles.emptyState}>
          <p>Busca un cliente para visualizar su historial y salud crediticia.</p>
        </div>
      )}

      {report && (
        <div>
          {/* Header Semáforo */}
          <div className={styles.healthHeaderCard}>
            <div className={styles.healthProfileInfo}>
              <h2 className={styles.healthProfileName}>
                {report.person.fullName}
              </h2>
              <div className={styles.healthProfileDoc}>
                Doc: {report.person.documentNumber}
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div 
                className={styles.healthScoreCircle} 
                style={{ background: `conic-gradient(${report.person.healthState === 'VERDE' ? '#059669' : report.person.healthState === 'AMARILLO' ? '#d97706' : '#dc2626'} ${report.person.creditScore}%, #e2e8f0 0)` }}
              >
                <div className={styles.healthScoreInner}>
                  <span className={styles.healthScoreValue} style={{ color: report.person.healthState === 'VERDE' ? '#059669' : report.person.healthState === 'AMARILLO' ? '#d97706' : '#dc2626' }}>
                    {report.person.creditScore}
                  </span>
                  <span className={styles.healthScoreLabel}>SCORE</span>
                </div>
              </div>
              <span 
                className={styles.healthBadge}
                style={{
                  backgroundColor: report.person.healthState === 'VERDE' ? '#d1fae5' : report.person.healthState === 'AMARILLO' ? '#fef3c7' : '#fee2e2',
                  color: report.person.healthState === 'VERDE' ? '#065f46' : report.person.healthState === 'AMARILLO' ? '#92400e' : '#991b1b'
                }}
              >
                RIESGO {report.person.healthState}
              </span>
            </div>
          </div>

          <h3 className={styles.sectionTitle}>Historial de Préstamos</h3>
          <div className={styles.loanHistoryList}>
            {report.history.map((loan) => {
              const dateObj = new Date(loan.startDate);
              const month = dateObj.toLocaleString('es', { month: 'short' });
              const day = dateObj.getDate();
              
              return (
                <div key={loan.loanId} className={styles.loanHistoryCard}>
                  
                  <div className={styles.loanHistoryDateBadge}>
                    <span className={styles.loanHistoryDateMonth}>{month}</span>
                    <span className={styles.loanHistoryDateDay}>{day}</span>
                  </div>

                  <div className={styles.loanHistoryInfo}>
                    <div className={styles.loanHistoryAmount}>
                      {formatCurrency(loan.amount)}
                      <span className={`${styles.loanHistoryStatus} ${loan.status === 'Liquidado' ? styles.statusLiquidado : styles.statusActivo}`}>
                        {loan.status}
                      </span>
                    </div>
                    <div className={styles.loanHistoryDetails}>
                      Cuotas de {formatCurrency(loan.fee)}
                    </div>
                  </div>
                  
                  <div className={styles.loanHistoryProgress}>
                    <div className={styles.loanHistoryProgressHeader}>
                      <span>Progreso</span>
                      <span>{loan.progressPercentage}%</span>
                    </div>
                    <div className={styles.loanHistoryProgressBar}>
                      <div 
                        className={styles.loanHistoryProgressFill}
                        style={{ 
                          width: `${loan.progressPercentage}%`, 
                          backgroundColor: loan.progressPercentage === 100 ? '#10b981' : '#3b82f6' 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {report.history.length === 0 && (
            <div className={styles.emptyState}>
              <p>El cliente no tiene préstamos registrados.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
