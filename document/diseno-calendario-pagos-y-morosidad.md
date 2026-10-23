# Especificación de Diseño: Calendario de Pagos, Prórrogas y Control de Morosidad

**Fecha:** 23 de Octubre de 2026  
**Módulos Afectados:**
- [`LoanDetailsModal.tsx`](file:///d:/Personal/Repositorios/Prestamos/Prestamos/app/components/LoanDetailsModal.tsx)
- [`LoanShareGenerator.tsx`](file:///d:/Personal/Repositorios/Prestamos/Prestamos/app/components/LoanShareGenerator.tsx)
- [`app/compartir/[token]/page.tsx`](file:///d:/Personal/Repositorios/Prestamos/Prestamos/app/compartir/%5Btoken%5D/page.tsx)
- [`app/globals.css`](file:///d:/Personal/Repositorios/Prestamos/Prestamos/app/globals.css)

---

## 1. Contexto y Problema Resuelto

### 1.1 Deformación y Aplastamiento de Columnas
En las versiones anteriores, algunas columnas del calendario (especialmente **Viernes** y **Domingo**) se visualizaban comprimidas o parcialmente ocultas, forzando a que los montos se fracturaran verticalmente (`S/` arriba y `15` abajo).

- **Causa raíz:** Las celdas renderizaban textos descriptivos largos debajo del monto (`PRÓRROGA`, `LIQUIDADO`, `PACTADO`, `INI`). En CSS Grid, la regla `repeat(7, 1fr)` tiene un `min-width: auto` intrínseco; las celdas con palabras largas expandían su columna y comprimían a las demás.
- **Solución implementada:**
  1. Se eliminaron por completo todos los textos de estado dentro de las celdas. La simbología de colores y la leyenda inferior comunican el estado de manera limpia y sin sobrecargar la celda.
  2. Se actualizó la cuadrícula a `repeat(7, minmax(0, 1fr))` con `white-space: nowrap` en los montos, asegurando un ancho idéntico (14.285%) para los 7 días de la semana.

---

## 2. Matriz de Estados y Código de Colores

El calendario distingue estrictamente dos zonas temporales: **Dentro del plazo contractual** y **Fuera del plazo contractual (Prórroga)**.

| Condición | Temporalidad | Fondo (BG) | Borde | Texto | Etiqueta / Monto |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cuota Pagada** | Dentro del plazo | `#ecfdf5` (Verde suave) | `#10b981` (Esmeralda) | `#065f46` | `S/ XX` |
| **Cuota No Pagada (Vencida)** | Dentro del plazo (`< hoy`) | `#fef2f2` (Rojo suave) | `#fecaca` (Rosa/Rojo) | `#e11d48` | `S/ XX` |
| **Cuota Pendiente / Por Vencer** | Dentro del plazo (`>= hoy`) | `#f8fafc` (Slate claro) | `#e2e8f0` (Gris tenue) | `#334155` | `S/ XX` |
| **Inicio de Contrato** | Fecha inicio pactada | Según estado de pago | Anillo acento `#4f46e5` | Según estado | `S/ XX` |
| **Fin Pactado de Contrato** | Fecha fin pactada | Según estado de pago | Anillo acento `#6366f1` | Según estado | `S/ XX` |
| **Pago Fuera de Fecha (Prórroga)** | Fuera del plazo (`> fin pactado`) | `#fefce8` (Amarillo suave) | `#ca8a04` (Ámbar) | `#854d0e` | `S/ XX` |
| **Día Sin Pago en Prórroga** | Fuera del plazo (`> fin pactado`) | Transparente | Transparente | `#cbd5e1` (Gris) | Vacío |
| **Domingos** | No laborable | Transparente | Transparente | `#cbd5e1` (Gris) | Vacío |

> [!IMPORTANT]
> **Regla de Oro en Prórroga:**  
> Cualquier pago realizado fuera del plazo contractual se pinta **exclusivamente en color amarillo**, incluso si se trata de la cuota final o del pago de liquidación. Los días en prórroga en los que el cliente no pagó se mantienen en **gris inactivo**, evitando saturar el calendario de rojo innecesariamente.

---

## 3. Tratamiento de Clientes Morosos Prolongados (> 7 días)

### 3.1 El Problema de la Extensión Indefinida
Anteriormente, si un cliente debía una cuota desde hace varios meses, el calendario se extendía hasta el día de hoy (`today`), generando calendarios kilométricos de 3 a 6 meses repletos de espacios vacíos que dificultaban la lectura y rompían la experiencia en dispositivos móviles.

### 3.2 Lógica de Acotamiento y Franja de Alerta
1. **Detección de Moroso Crónico:**  
   Se calcula la diferencia de días entre la fecha actual y la fecha de última actividad (último abono o fin contractual):
   ```typescript
   const referenceDate = (lastPaymentDate && hasLatePayments) ? lastPaymentDate : contractEnd;
   const daysSinceLastActivity = differenceInCalendarDays(today, referenceDate);
   const isStalledOverdue = !isLiquidated && today > contractEnd && daysSinceLastActivity > 7;
   ```
2. **Acotamiento:**  
   Si `isStalledOverdue === true`, el calendario **NO** se extiende hasta hoy; se detiene limpiamente en la fecha contractual (o en el último abono registrado).
3. **Franja Destacada de Deuda Pendiente:**  
   Inmediatamente debajo del calendario se despliega una franja horizontal de alta visibilidad:
   - **Icono:** Alerta triangular roja (`AlertTriangle`).
   - **Saldo Pendiente:** `Deuda pendiente: S/ XX.XX` (monto total adeudado).
   - **Retraso:** `X días fuera del plazo contractual`.
   - **Insignia:** Badge destacado con fondo rojo `MORA ACTIVA`.

---

## 4. Leyenda Unificada del Calendario

Tanto en la vista modal como en la ficha descargable y la vista web pública, la leyenda se estandarizó en 5 elementos:

1. 🟣 **Inicio / Fin Pactado:** Anillos índigo (`#4f46e5` / `#6366f1`).
2. 🟢 **Cobrado:** Verde esmeralda (`#10b981`).
3. 🟡 **Prórroga:** Amarillo/ámbar (`#ca8a04`).
4. 🔴 **Mora:** Rojo tenue con borde (`#fef2f2` / `#fecaca`).
5. ⚪ **Inactivo:** Gris tenue (`#cbd5e1`).

---

## 5. Sincronización entre Canales

La misma arquitectura visual y de datos fue replicada de forma idéntica en:
- **Modal de Detalle Interno:** [`LoanDetailsModal.tsx`](file:///d:/Personal/Repositorios/Prestamos/Prestamos/app/components/LoanDetailsModal.tsx)
- **Ficha Compartible / Exportable (html2canvas):** [`LoanShareGenerator.tsx`](file:///d:/Personal/Repositorios/Prestamos/Prestamos/app/components/LoanShareGenerator.tsx)
- **Portal de Consulta del Cliente Web:** [`app/compartir/[token]/page.tsx`](file:///d:/Personal/Repositorios/Prestamos/Prestamos/app/compartir/%5Btoken%5D/page.tsx)
