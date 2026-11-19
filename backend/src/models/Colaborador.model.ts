import { eq, desc } from "drizzle-orm";
import { db, colaboradores, saldosVacaciones, solicitudes, incapacidades } from "../config/db";

export type Colaborador = typeof colaboradores.$inferSelect;
export type SaldoVacaciones = typeof saldosVacaciones.$inferSelect;
export type Solicitud = typeof solicitudes.$inferSelect;
export type Incapacidad = typeof incapacidades.$inferSelect;

export class ColaboradorModel {
  static async findByEmail(email: string): Promise<Colaborador | null> {
    const rows = await db
      .select()
      .from(colaboradores)
      .where(eq(colaboradores.email, email.toLowerCase().trim()))
      .limit(1);
    return rows[0] || null;
  }

  static async findById(id: number): Promise<Colaborador | null> {
    const rows = await db
      .select()
      .from(colaboradores)
      .where(eq(colaboradores.id, id))
      .limit(1);
    return rows[0] || null;
  }

  static async getSaldoVacaciones(colaboradorId: number): Promise<SaldoVacaciones | null> {
    const rows = await db
      .select()
      .from(saldosVacaciones)
      .where(eq(saldosVacaciones.colaboradorId, colaboradorId))
      .orderBy(desc(saldosVacaciones.id))
      .limit(1);
    return rows[0] || null;
  }

  static async getSolicitudes(colaboradorId: number): Promise<Solicitud[]> {
    return db
      .select()
      .from(solicitudes)
      .where(eq(solicitudes.colaboradorId, colaboradorId))
      .orderBy(desc(solicitudes.creadaEn))
      .limit(10);
  }

  static async getIncapacidades(colaboradorId: number): Promise<Incapacidad[]> {
    return db
      .select()
      .from(incapacidades)
      .where(eq(incapacidades.colaboradorId, colaboradorId))
      .orderBy(desc(incapacidades.fechaInicio))
      .limit(10);
  }

  static async getAll(limit = 100): Promise<Colaborador[]> {
    return db
      .select()
      .from(colaboradores)
      .orderBy(colaboradores.nombre)
      .limit(limit);
  }
}
