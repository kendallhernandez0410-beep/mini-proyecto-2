import { eq, desc, sql } from "drizzle-orm";
import { db, solicitudes, colaboradores, saldosVacaciones } from "../config/db";

export interface SolicitudConColaborador {
  id: number;
  colaborador_id: number;
  colaborador_nombre: string;
  departamento: string;
  puesto: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: "pendiente" | "aprobada" | "rechazada";
  aprobador_id: number | null;
  aprobador_nombre: string | null;
  creada_en: Date;
  dias_espera: number;
}

export class SolicitudModel {
  /**
   * Obtiene solicitudes con detalles del colaborador y días de espera.
   */
  static async getAll(estadoFiltro?: "pendiente" | "aprobada" | "rechazada"): Promise<SolicitudConColaborador[]> {
    let query = db
      .select({
        id: solicitudes.id,
        colaborador_id: solicitudes.colaboradorId,
        colaborador_nombre: colaboradores.nombre,
        departamento: colaboradores.departamento,
        puesto: colaboradores.puesto,
        tipo: solicitudes.tipo,
        fecha_inicio: solicitudes.fechaInicio,
        fecha_fin: solicitudes.fechaFin,
        estado: solicitudes.estado,
        aprobador_id: solicitudes.aprobadorId,
        aprobador_nombre: sql<string | null>`(SELECT nombre FROM colaboradores WHERE id = ${solicitudes.aprobadorId} LIMIT 1)`,
        creada_en: solicitudes.creadaEn,
        dias_espera: sql<number>`DATEDIFF(NOW(), ${solicitudes.creadaEn})`,
      })
      .from(solicitudes)
      .innerJoin(colaboradores, eq(solicitudes.colaboradorId, colaboradores.id))
      .orderBy(desc(solicitudes.creadaEn));

    if (estadoFiltro) {
      return (await query.where(eq(solicitudes.estado, estadoFiltro))) as SolicitudConColaborador[];
    }

    return (await query) as SolicitudConColaborador[];
  }

  /**
   * Obtiene una solicitud por su ID.
   */
  static async getById(id: number) {
    const rows = await db
      .select({
        id: solicitudes.id,
        colaboradorId: solicitudes.colaboradorId,
        tipo: solicitudes.tipo,
        fechaInicio: solicitudes.fechaInicio,
        fechaFin: solicitudes.fechaFin,
        estado: solicitudes.estado,
        aprobadorId: solicitudes.aprobadorId,
        creadaEn: solicitudes.creadaEn,
      })
      .from(solicitudes)
      .where(eq(solicitudes.id, id))
      .limit(1);

    return rows[0] || null;
  }

  /**
   * Registra una nueva solicitud.
   */
  static async create(data: {
    colaboradorId: number;
    tipo: string;
    fechaInicio: string;
    fechaFin: string;
  }) {
    const [result] = await db.insert(solicitudes).values({
      colaboradorId: data.colaboradorId,
      tipo: data.tipo,
      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin,
      estado: "pendiente",
      creadaEn: new Date(),
    });

    return result.insertId;
  }

  /**
   * Actualiza el estado de una solicitud (aprobar o rechazar).
   * Si se aprueba una solicitud de vacaciones, descuenta automáticamente los días del saldo.
   */
  static async updateStatus(
    id: number,
    nuevoEstado: "aprobada" | "rechazada",
    aprobadorId: number
  ) {
    const sol = await this.getById(id);
    if (!sol) {
      throw new Error(`Solicitud #${id} no encontrada.`);
    }

    // Actualizar estado en la tabla de solicitudes
    await db
      .update(solicitudes)
      .set({
        estado: nuevoEstado,
        aprobadorId,
      })
      .where(eq(solicitudes.id, id));

    // Si es aprobada y es de tipo vacaciones, descontar días del saldo activo
    if (nuevoEstado === "aprobada" && sol.tipo.toLowerCase().includes("vacaci")) {
      const inicio = new Date(sol.fechaInicio);
      const fin = new Date(sol.fechaFin);
      const diffTime = Math.abs(fin.getTime() - inicio.getTime());
      const diasCalculados = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

      const [saldoActual] = await db
        .select()
        .from(saldosVacaciones)
        .where(eq(saldosVacaciones.colaboradorId, sol.colaboradorId))
        .limit(1);

      if (saldoActual) {
        const disponibles = Math.max(0, Number(saldoActual.diasDisponibles) - diasCalculados);
        const tomados = Number(saldoActual.diasTomados) + diasCalculados;

        await db
          .update(saldosVacaciones)
          .set({
            diasDisponibles: disponibles.toFixed(2),
            diasTomados: tomados.toFixed(2),
          })
          .where(eq(saldosVacaciones.id, saldoActual.id));
      }
    }

    return await this.getById(id);
  }
}
