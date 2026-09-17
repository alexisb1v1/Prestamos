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
  prestamos: {
    id: "prestamos",
    title: "Tutorial de Préstamos",
    path: "/prestamos",
    storageKey: "tour_prestamos_completed",
    steps: [
      {
        element: "#header-prestamos",
        popover: {
          title: "Módulo de Préstamos",
          description: "Aquí puedes ver y administrar todos los préstamos registrados en el sistema.",
        },
      },
      {
        element: "#btn-accion",
        popover: {
          title: "Boton de Accion",
          description: "Haz clic en este botón para registrar rápidamente un nuevo préstamo o gastó, la pantalla que te aparezca dependera de la ruta en la que estes.",
        },
      },
      {
        element: "#filtro-ruta",
        popover: {
          title: "Filtrar por Ruta",
          description: "Utiliza este filtro para ver únicamente los préstamos asignados a una ruta específica.",
        },
      },
      {
        element: "#tabla-prestamos",
        popover: {
          title: "Lista de Préstamos",
          description: "Esta tabla te muestra los préstamos con sus montos, fechas y estados actuales.",
        },
      },
    ],
  },
  dashboard: {
    id: "dashboard",
    title: "Tutorial del Dashboard",
    path: "/dashboard",
    storageKey: "tour_dashboard_completed",
    steps: [
      {
        element: "#header-dashboard",
        popover: {
          title: "Dashboard Central",
          description: "Este es el panel principal donde puedes ver un resumen de todas las operaciones.",
        },
      },
      {
        element: "#filtro-dashboard",
        popover: {
          title: "Filtros",
          description: "Usa este botón para filtrar la información por empresa o por cobrador.",
        },
      },
      {
        element: "#stats-dashboard",
        popover: {
          title: "Estadísticas del Día",
          description: "Aquí verás cuánto se ha prestado, cuánto se ha cobrado y los porcentajes de progreso.",
        },
      },
      {
        element: "#lista-rutas-dashboard",
        popover: {
          title: "Ruta de Cobro",
          description: "Lista de todos los préstamos pendientes por cobrar hoy, ordenados según la ruta establecida.",
        },
      },
      {
        element: "#btn-accion",
        popover: {
          title: "Boton de Accion",
          description: "Haz clic en este botón para registrar rápidamente un nuevo préstamo o gastó, la pantalla que te aparezca dependera de la ruta en la que estes.",
        },
      },
    ],
  },
  gastos: {
    id: "gastos",
    title: "Tutorial de Gastos",
    path: "/gastos",
    storageKey: "tour_gastos_completed",
    steps: [
      {
        element: "#header-gastos",
        popover: {
          title: "Módulo de Gastos",
          description: "Aquí puedes llevar un control de todos los egresos y gastos operativos.",
        },
      },
      {
        element: "#filtro-gastos",
        popover: {
          title: "Filtros de Búsqueda",
          description: "Busca gastos por fecha específica, empresa o cobrador que registró el gasto.",
        },
      },
      {
        element: "#btn-accion",
        popover: {
          title: "Boton de Accion",
          description: "Haz clic en este botón para registrar rápidamente un nuevo préstamo o gastó, la pantalla que te aparezca dependera de lo que estes haciendo.",
        },
      },
      {
        element: "#total-gastos",
        popover: {
          title: "Total",
          description: "Suma total de los gastos registrados según los filtros aplicados.",
        },
      },
      {
        element: "#lista-gastos",
        popover: {
          title: "Detalle de Gastos",
          description: "Lista desglosada de cada gasto con su descripción, fecha, monto y usuario responsable.",
        },
      },
    ],
  },
};
