import { eq, desc, sql } from "drizzle-orm";
import {
  db,
  reportesDiarios,
  solicitudes,
  colaboradores,
  incapacidades,
  movimientosPersonal,
  saldosVacaciones,
  consultasChat,
} from "../config/db";

export type ReporteDiario = typeof reportesDiarios.$inferSelect;

export class ReporteModel {
  /**
   * 1. Personas ausentes hoy (por tipo y departamento).
   */
  static async getAusentesHoy() {
    // Vacaciones aprobadas vigentes hoy
    const vacacionesHoy = await db
      .select({
        id: colaboradores.id,
        nombre: colaboradores.nombre,
        departamento: colaboradores.departamento,
        tipo: sql<string>`'vacaciones'`,
      })
      .from(solicitudes)
      .innerJoin(colaboradores, eq(solicitudes.colaboradorId, colaboradores.id))
      .where(
        sql`${solicitudes.estado} = 'aprobada' 
             AND ${solicitudes.tipo} = 'vacaciones' 
             AND CURDATE() BETWEEN ${solicitudes.fechaInicio} AND ${solicitudes.fechaFin}`
      );

    // Incapacidades activas hoy
    const incapacidadesHoy = await db
      .select({
        id: colaboradores.id,
        nombre: colaboradores.nombre,
        departamento: colaboradores.departamento,
        tipo: sql<string>`CONCAT('incapacidad_', LOWER(${incapacidades.entidad}))`,
      })
      .from(incapacidades)
      .innerJoin(colaboradores, eq(incapacidades.colaboradorId, colaboradores.id))
      .where(
        sql`CURDATE() BETWEEN ${incapacidades.fechaInicio} AND DATE_ADD(${incapacidades.fechaInicio}, INTERVAL (${incapacidades.dias} - 1) DAY)`
      );

    const todosAusentes = [...vacacionesHoy, ...incapacidadesHoy];

    const porTipo: Record<string, number> = {
      vacaciones: vacacionesHoy.length,
      incapacidad_ccss: incapacidadesHoy.filter((i) => i.tipo.includes("ccss")).length,
      incapacidad_ins: incapacidadesHoy.filter((i) => i.tipo.includes("ins")).length,
    };

    const porDepartamento: Record<string, number> = {};
    for (const a of todosAusentes) {
      porDepartamento[a.departamento] = (porDepartamento[a.departamento] || 0) + 1;
    }

    return {
      total: todosAusentes.length,
      porTipo,
      porDepartamento,
      detalles: todosAusentes,
    };
  }

  /**
   * 2. Solicitudes pendientes y cuántas llevan >3 días sin respuesta.
   */
  static async getSolicitudesPendientes() {
    const pendientes = await db
      .select({
        id: solicitudes.id,
        colaborador_id: solicitudes.colaboradorId,
        colaborador_nombre: colaboradores.nombre,
        departamento: colaboradores.departamento,
        tipo: solicitudes.tipo,
        fecha_inicio: solicitudes.fechaInicio,
        fecha_fin: solicitudes.fechaFin,
        creada_en: solicitudes.creadaEn,
        dias_espera: sql<number>`DATEDIFF(NOW(), ${solicitudes.creadaEn})`,
      })
      .from(solicitudes)
      .innerJoin(colaboradores, eq(solicitudes.colaboradorId, colaboradores.id))
      .where(eq(solicitudes.estado, "pendiente"))
      .orderBy(solicitudes.creadaEn);

    const pendientesMas3Dias = pendientes.filter((s) => Number(s.dias_espera) > 3);

    return {
      totalPendientes: pendientes.length,
      pendientesMas3Dias: pendientesMas3Dias.length,
      lista: pendientes,
    };
  }

  /**
   * 3. Incapacidades activas y días acumulados en el mes.
   */
  static async getIncapacidadesMes() {
    const mesRows = await db
      .select({
        activas_hoy: sql<number>`COUNT(*)`,
        dias_acumulados_mes: sql<number>`COALESCE(SUM(${incapacidades.dias}), 0)`,
        dias_ccss: sql<number>`COALESCE(SUM(CASE WHEN ${incapacidades.entidad} = 'CCSS' THEN ${incapacidades.dias} ELSE 0 END), 0)`,
        dias_ins: sql<number>`COALESCE(SUM(CASE WHEN ${incapacidades.entidad} = 'INS' THEN ${incapacidades.dias} ELSE 0 END), 0)`,
      })
      .from(incapacidades)
      .where(
        sql`MONTH(${incapacidades.fechaInicio}) = MONTH(CURDATE()) AND YEAR(${incapacidades.fechaInicio}) = YEAR(CURDATE())`
      );

    const row = mesRows[0] || {
      activas_hoy: 0,
      dias_acumulados_mes: 0,
      dias_ccss: 0,
      dias_ins: 0,
    };

    return {
      activasHoy: Number(row.activas_hoy),
      diasAcumuladosMes: Number(row.dias_acumulados_mes),
      porEntidad: {
        CCSS: Number(row.dias_ccss),
        INS: Number(row.dias_ins),
      },
    };
  }

  /**
   * 4. Ingresos, salidas del mes y tasa de rotación acumulada.
   */
  static async getRotacionMes() {
    const movimientos = await db
      .select({
        tipo: movimientosPersonal.tipo,
        cantidad: sql<number>`COUNT(*)`,
      })
      .from(movimientosPersonal)
      .where(
        sql`MONTH(${movimientosPersonal.fecha}) = MONTH(CURDATE()) AND YEAR(${movimientosPersonal.fecha}) = YEAR(CURDATE())`
      )
      .groupBy(movimientosPersonal.tipo);

    let ingresosMes = 0;
    let salidasMes = 0;
    let ascensosMes = 0;

    for (const m of movimientos) {
      if (m.tipo === "ingreso") ingresosMes = Number(m.cantidad);
      if (m.tipo === "salida") salidasMes = Number(m.cantidad);
      if (m.tipo === "ascenso") ascensosMes = Number(m.cantidad);
    }

    const headcountRow = await db
      .select({ headcount: sql<number>`COUNT(*)` })
      .from(colaboradores)
      .where(eq(colaboradores.estado, "activo"));

    const headcountActivo = Number(headcountRow[0]?.headcount || 50);

    const tasaRotacionMensualPct =
      headcountActivo > 0
        ? parseFloat(((salidasMes / headcountActivo) * 100).toFixed(2))
        : 0;

    return {
      ingresosMes,
      salidasMes,
      ascensosMes,
      headcountActivo,
      tasaRotacionMensualPct,
    };
  }

  /**
   * 5. Colaboradores con >20 días de vacaciones acumulados.
   */
  static async getVacacionesAcumuladasAlerta() {
    const alertaRows = await db
      .select({
        id: colaboradores.id,
        nombre: colaboradores.nombre,
        departamento: colaboradores.departamento,
        puesto: colaboradores.puesto,
        dias_disponibles: saldosVacaciones.diasDisponibles,
      })
      .from(saldosVacaciones)
      .innerJoin(colaboradores, eq(saldosVacaciones.colaboradorId, colaboradores.id))
      .where(sql`CAST(${saldosVacaciones.diasDisponibles} AS DECIMAL(5,2)) > 20.00`)
      .orderBy(desc(saldosVacaciones.diasDisponibles));

    return {
      totalColaboradoresMas20Dias: alertaRows.length,
      topColaboradores: alertaRows,
    };
  }

  /**
   * 6. Métricas del chatbot del día anterior.
   */
  static async getMetricasChatAyer() {
    const rows = await db
      .select({
        total_consultas: sql<number>`COUNT(*)`,
        resueltas: sql<number>`COALESCE(SUM(CASE WHEN ${consultasChat.resuelta} = 1 AND ${consultasChat.escalada} = 0 THEN 1 ELSE 0 END), 0)`,
        latencia_promedio: sql<number>`COALESCE(AVG(${consultasChat.latenciaMs}), 0)`,
      })
      .from(consultasChat)
      .where(sql`DATE(${consultasChat.fecha}) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`);

    const r = rows[0] || {
      total_consultas: 0,
      resueltas: 0,
      latencia_promedio: 0,
    };
    const total = Number(r.total_consultas);
    const resueltas = Number(r.resueltas);
    const pct = total > 0 ? parseFloat(((resueltas / total) * 100).toFixed(2)) : 100;

    return {
      totalConsultas: total,
      porcentajeResueltasSinEscalar: pct,
      latenciaPromedioMs: Math.round(Number(r.latencia_promedio)),
    };
  }

  /**
   * 7. Top 5 temas consultados y preguntas no resueltas.
   */
  static async getTopTemasYBrechas() {
    const topTemas = await db
      .select({
        tema: consultasChat.intencion,
        consultas: sql<number>`COUNT(*)`,
      })
      .from(consultasChat)
      .groupBy(consultasChat.intencion)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(5);

    const noResueltas = await db
      .select({
        pregunta: consultasChat.pregunta,
        fecha: consultasChat.fecha,
      })
      .from(consultasChat)
      .where(sql`${consultasChat.resuelta} = 0 OR ${consultasChat.escalada} = 1`)
      .orderBy(desc(consultasChat.fecha))
      .limit(5);

    return {
      topTemas,
      preguntasNoResueltas: noResueltas.map((q) => q.pregunta),
    };
  }

  /**
   * Guarda o actualiza el reporte diario consolidado en reportes_diarios con Drizzle ORM.
   */
  static async guardarReporteDiario(
    fecha: string,
    datosJson: any,
    resumenTexto: string,
    generadoPor = "analystAgent (cron 07:00)"
  ): Promise<number> {
    const existing = await db
      .select({ id: reportesDiarios.id })
      .from(reportesDiarios)
      .where(eq(reportesDiarios.fecha, fecha))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(reportesDiarios)
        .set({
          datosJson,
          resumenTexto,
          generadoPor,
        })
        .where(eq(reportesDiarios.fecha, fecha));
      return existing[0].id;
    }

    const [insertResult]: any = await db.insert(reportesDiarios).values({
      fecha,
      datosJson,
      resumenTexto,
      generadoPor,
    });
    return insertResult.insertId;
  }

  static async obtenerUltimoReporte(): Promise<ReporteDiario | null> {
    const rows = await db
      .select()
      .from(reportesDiarios)
      .orderBy(desc(reportesDiarios.fecha))
      .limit(1);
    return rows[0] || null;
  }

  static async obtenerPorFecha(fecha: string): Promise<ReporteDiario | null> {
    const rows = await db
      .select()
      .from(reportesDiarios)
      .where(eq(reportesDiarios.fecha, fecha))
      .limit(1);
    return rows[0] || null;
  }

  static async obtenerHistorial(limit = 30): Promise<ReporteDiario[]> {
    return db
      .select()
      .from(reportesDiarios)
      .orderBy(desc(reportesDiarios.fecha))
      .limit(limit);
  }
}
