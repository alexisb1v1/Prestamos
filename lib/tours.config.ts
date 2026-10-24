export type TourStep = {
  element: string;
  popover: {
    title: string;
    description: string;
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
  };
};

export type TourConfig = {
  id: string;
  title: string;
  path: string;
  storageKey: string;
  steps: TourStep[];
};

export const TOURS: Record<string, TourConfig> = {
  dashboard: {
    id: "dashboard",
    title: "1. Panel de Control (Dashboard)",
    path: "/dashboard",
    storageKey: "tour_dashboard_completed",
    steps: [
      {
        element: "#header-dashboard",
        popover: {
          title: "Resumen Operativo",
          description: "Visualiza el estado diario de las cobranzas y el rendimiento en tiempo real.",
        },
      },
      {
        element: "#filtro-dashboard",
        popover: {
          title: "Filtros por Empresa o Cobrador",
          description: "Filtra la información para supervisar una empresa específica o un cobrador en ruta.",
        },
      },
      {
        element: "#stats-dashboard",
        popover: {
          title: "Métricas del Día",
          description: "Consulta el dinero cobrado hoy, las cuotas pendientes, el capital colocado y la recaudación.",
        },
      },
      {
        element: "#lista-rutas-dashboard",
        popover: {
          title: "Ruta de Cobro del Día",
          description: "Lista de clientes a cobrar hoy organizados por orden de visita. Puedes registrar abonos en 1 clic.",
        },
      },
    ],
  },
  prestamos: {
    id: "prestamos",
    title: "2. Gestión de Préstamos",
    path: "/prestamos",
    storageKey: "tour_prestamos_completed",
    steps: [
      {
        element: "#header-prestamos",
        popover: {
          title: "Módulo de Préstamos",
          description: "Administra y supervisa toda tu cartera de créditos otorgados.",
        },
      },
      {
        element: "#btn-accion",
        popover: {
          title: "Nuevo Préstamo",
          description: "Registra créditos al instante con evaluación crediticia integrada y cálculo automático de cuotas.",
        },
      },
      {
        element: "#filtro-ruta",
        popover: {
          title: "Filtro de Cartera",
          description: "Filtra por cobrador, empresa o estado (activos o liquidados).",
        },
      },
      {
        element: "#tabla-prestamos",
        popover: {
          title: "Tabla de Créditos",
          description: "Revisa montos, saldos, días restantes, y comparte la ficha o enlace de pago al cliente.",
        },
      },
    ],
  },
  gastos: {
    id: "gastos",
    title: "3. Control de Gastos",
    path: "/gastos",
    storageKey: "tour_gastos_completed",
    steps: [
      {
        element: "#header-gastos",
        popover: {
          title: "Módulo de Gastos",
          description: "Controla todos los egresos y gastos operativos diarios de tu equipo.",
        },
      },
      {
        element: "#btn-accion",
        popover: {
          title: "Registrar Gasto",
          description: "Registra salidas de dinero (combustible, almuerzo, movilidad, etc.) para cuadrar la caja.",
        },
      },
      {
        element: "#filtro-gastos",
        popover: {
          title: "Filtros de Búsqueda",
          description: "Consulta gastos por fecha específica y por cobrador.",
        },
      },
      {
        element: "#total-gastos",
        popover: {
          title: "Total de Gastos",
          description: "Suma total de los egresos del día según los filtros seleccionados.",
        },
      },
      {
        element: "#lista-gastos",
        popover: {
          title: "Detalle de Gastos",
          description: "Historial completo de egresos con descripción, monto y responsable.",
        },
      },
    ],
  },
};
