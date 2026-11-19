import React from "react";
import { Users, Clock, TrendingUp, Calendar, AlertTriangle, UserMinus } from "lucide-react";

export function KpiCards({ datos }) {
  if (!datos) return null;

  const ausentesTotal = datos.ausentesHoy?.total ?? 0;
  const vacAusentes = datos.ausentesHoy?.porTipo?.vacaciones ?? 0;
  const incAusentes = (datos.ausentesHoy?.porTipo?.incapacidad_ccss || 0) + (datos.ausentesHoy?.porTipo?.incapacidad_ins || 0);

  const pendientesTotal = datos.solicitudesPendientes?.totalPendientes ?? 0;
  const pendientesMas3d = datos.solicitudesPendientes?.pendientesMas3Dias ?? 0;

  const rotacionPct = datos.rotacionPersonalMes?.tasaRotacionMensualPct ?? 0;
  const headcount = datos.rotacionPersonalMes?.headcountActivo ?? 50;
  const ingresosMes = datos.rotacionPersonalMes?.ingresosMes ?? 0;
  const salidasMes = datos.rotacionPersonalMes?.salidasMes ?? 0;

  const mas20DiasCount = datos.vacacionesAcumuladasAlerta?.totalColaboradoresMas20Dias ?? 0;

  const kpis = [
    {
      titulo: "Ausentes Hoy",
      valor: ausentesTotal,
      icono: UserMinus,
      color: "blue",
      subtexto: `${vacAusentes} vacaciones &middot; ${incAusentes} incapacidad`,
      alerta: false,
    },
    {
      titulo: "Pendientes >3 días",
      valor: pendientesMas3d,
      icono: Clock,
      color: pendientesMas3d > 0 ? "amber" : "emerald",
      subtexto: `De ${pendientesTotal} solicitudes pendientes totales`,
      alerta: pendientesMas3d > 0,
    },
    {
      titulo: "Tasa de Rotación",
      valor: `${rotacionPct}%`,
      icono: TrendingUp,
      color: rotacionPct > 5 ? "rose" : "indigo",
      subtexto: `${ingresosMes} ingresos / ${salidasMes} salidas (${headcount} activos)`,
      alerta: false,
    },
    {
      titulo: "Vacaciones >20 Días",
      valor: mas20DiasCount,
      icono: AlertTriangle,
      color: mas20DiasCount > 0 ? "rose" : "emerald",
      subtexto: "Colaboradores con alerta de pasivo laboral",
      alerta: mas20DiasCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => {
        const Icono = kpi.icono;
        return (
          <div
            key={index}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {kpi.titulo}
              </span>
              <div
                className={`p-2 rounded-lg ${
                  kpi.color === "blue"
                    ? "bg-blue-50 text-blue-600"
                    : kpi.color === "amber"
                    ? "bg-amber-50 text-amber-600"
                    : kpi.color === "rose"
                    ? "bg-rose-50 text-rose-600"
                    : kpi.color === "indigo"
                    ? "bg-indigo-50 text-indigo-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                <Icono className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {kpi.valor}
              </span>
              {kpi.alerta && (
                <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Atención SLA
                </span>
              )}
            </div>

            <p
              className="mt-2 text-xs text-slate-500"
              dangerouslySetInnerHTML={{ __html: kpi.subtexto }}
            />
          </div>
        );
      })}
    </div>
  );
}
