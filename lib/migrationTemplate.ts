import * as XLSX from "xlsx";

/**
 * Genera y descarga el archivo Excel oficial (.xlsx) de 2 Hojas para migración de cartera en NeoCobros.
 */
export function downloadMigrationTemplate(cobradoresEjemplo: string[] = ["cobrador1", "cobrador2"]) {
  const cobradorEjemplo = cobradoresEjemplo[0] || "cobrador1";

  // Hoja 1: PRESTAMOS
  const prestamosData = [
    {
      CODIGO_REF: "P-001",
      DNI_CLIENTE: "45892134",
      NOMBRES_APELLIDOS: "JUAN PEREZ MENDOZA",
      TELEFONO: "987654321",
      DIRECCION: "AV. LOS HEROES 123 - LIMA",
      MONTO_PRESTADO: 1000.0,
      INTERES_PORCENTAJE: 20,
      TOTAL_PAGAR: 1200.0,
      NUMERO_CUOTAS: 24,
      VALOR_CUOTA: 50.0,
      FECHA_INICIO: "2026-10-01",
      CUOTAS_PAGADAS: 10,
      COBRADOR_USUARIO: cobradorEjemplo,
    },
    {
      CODIGO_REF: "P-002",
      DNI_CLIENTE: "72345678",
      NOMBRES_APELLIDOS: "MARIA ROJAS QUISPE",
      TELEFONO: "912345678",
      DIRECCION: "JR. UNION 456 - COMAS",
      MONTO_PRESTADO: 500.0,
      INTERES_PORCENTAJE: 20,
      TOTAL_PAGAR: 600.0,
      NUMERO_CUOTAS: 20,
      VALOR_CUOTA: 30.0,
      FECHA_INICIO: "2026-10-15",
      CUOTAS_PAGADAS: 0,
      COBRADOR_USUARIO: cobradorEjemplo,
    },
  ];

  // Hoja 2: PAGOS (Opcional - solo si el cliente tiene fechas y montos reales)
  const pagosData = [
    {
      CODIGO_REF: "P-001",
      FECHA_PAGO: "2026-10-02",
      MONTO_ABONADO: 50.0,
      METODO_PAGO: "EFECTIVO",
    },
    {
      CODIGO_REF: "P-001",
      FECHA_PAGO: "2026-10-03",
      MONTO_ABONADO: 50.0,
      METODO_PAGO: "YAPE",
    },
    {
      CODIGO_REF: "P-001",
      FECHA_PAGO: "2026-10-04",
      MONTO_ABONADO: 100.0,
      METODO_PAGO: "EFECTIVO",
    },
  ];

  // Crear libro
  const wb = XLSX.utils.book_new();

  const wsPrestamos = XLSX.utils.json_to_sheet(prestamosData);
  const wsPagos = XLSX.utils.json_to_sheet(pagosData);

  // Forzar que la columna B (DNI_CLIENTE) y columna D (TELEFONO) sean tratadas explícitamente como Texto (@)
  const rangePrestamos = XLSX.utils.decode_range(wsPrestamos["!ref"] || "A1:M3");
  for (let R = rangePrestamos.s.r + 1; R <= rangePrestamos.e.r; ++R) {
    // Columna B (DNI)
    const dniCell = wsPrestamos[XLSX.utils.encode_cell({ r: R, c: 1 })];
    if (dniCell) {
      dniCell.t = "s"; // Tipo String/Texto
      dniCell.z = "@"; // Formato Texto de Excel
    }
    // Columna D (Teléfono)
    const telCell = wsPrestamos[XLSX.utils.encode_cell({ r: R, c: 3 })];
    if (telCell) {
      telCell.t = "s";
      telCell.z = "@";
    }
  }

  // Ajustar anchos de columnas en Hoja 1
  wsPrestamos["!cols"] = [
    { wch: 14 }, // CODIGO_REF
    { wch: 14 }, // DNI_CLIENTE
    { wch: 28 }, // NOMBRES_APELLIDOS
    { wch: 14 }, // TELEFONO
    { wch: 30 }, // DIRECCION
    { wch: 16 }, // MONTO_PRESTADO
    { wch: 18 }, // INTERES_PORCENTAJE
    { wch: 14 }, // TOTAL_PAGAR
    { wch: 16 }, // NUMERO_CUOTAS
    { wch: 14 }, // VALOR_CUOTA
    { wch: 14 }, // FECHA_INICIO
    { wch: 16 }, // CUOTAS_PAGADAS
    { wch: 18 }, // COBRADOR_USUARIO
  ];

  // Ajustar anchos de columnas en Hoja 2
  wsPagos["!cols"] = [
    { wch: 14 }, // CODIGO_REF
    { wch: 14 }, // FECHA_PAGO
    { wch: 16 }, // MONTO_ABONADO
    { wch: 16 }, // METODO_PAGO
  ];

  XLSX.utils.book_append_sheet(wb, wsPrestamos, "PRESTAMOS");
  XLSX.utils.book_append_sheet(wb, wsPagos, "PAGOS");

  XLSX.writeFile(wb, "plantilla_migracion_neocobros.xlsx");
}

