import React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export function ChartsPanel({ datosReporte }) {
  // 1. Datos simulados de tendencia de 30 días (o tomados del histórico del reporte)
  const tendencia30Dias = [
    { dia: "D-28", consultas: 14, ausencias: 5 },
    { dia: "D-24", consultas: 18, ausencias: 6 },
    { dia: "D-20", consultas: 22, ausencias: 7 },
    { dia: "D-16", consultas: 19, ausencias: 6 },
    { dia: "D-12", consultas: 25, ausencias: 8 },
    { dia: "D-8", consultas: 28, ausencias: 9 },
    { dia: "D-4", consultas: 31, ausencias: 7 },
    { dia: "Ayer", consultas: datosReporte?.metricasChatbotAyer?.totalConsultas || 12, ausencias: 7 },
    { dia: "Hoy", consultas: 16, ausencias: datosReporte?.ausentesHoy?.total || 7 },
  ];

  // 2. Datos de ausencias por departamento
  const ausentesPorDepto = datosReporte?.ausentesHoy?.porDepartamento || {
    "Ingeniería de Software": 3,
    "IA y Ciencia de Datos": 1,
    "Ciberseguridad y Cloud": 1,
    "Producto y UX": 1,
    "Operaciones y CS": 1,
  };

  const dataDeptos = Object.entries(ausentesPorDepto).map(([depto, cantidad]) => ({
    departamento: depto.replace(" y ", " & ").replace("de Software", "Soft"),
    ausentes: cantidad,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico 1: Tendencia 30 Días */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="mb-4">
          <h4 className="text-sm font-bold text-slate-900">
            Tendencia de 30 Días: Consultas al Asistente vs Ausencias
          </h4>
          <p className="text-xs text-slate-500">
            Evolución de interacciones de colaboradores y personal ausente por período
          </p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={tendencia30Dias}>
              <defs>
                <linearGradient id="colorConsultas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAusencias" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderColor: "#e2e8f0",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
              <Area
                type="monotone"
                dataKey="consultas"
                name="Consultas Chat"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorConsultas)"
              />
              <Area
                type="monotone"
                dataKey="ausencias"
                name="Colaboradores Ausentes"
                stroke="#f59e0b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorAusencias)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 2: Ausentes por Departamento */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="mb-4">
          <h4 className="text-sm font-bold text-slate-900">
            Distribución de Ausencias por Departamento (Hoy)
          </h4>
          <p className="text-xs text-slate-500">
            Impacto operativo de vacaciones e incapacidades médicas vigentes
          </p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataDeptos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="departamento" tick={{ fontSize: 10, fill: "#64748b" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderColor: "#e2e8f0",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey="ausentes"
                name="Personas Ausentes"
                fill="#6366f1"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
