import { eq, desc } from "drizzle-orm";
import { db, consultasChat } from "../config/db";

export interface DocumentoCita {
  titulo: string;
  seccion: string;
  version: string;
  enlace_drive: string;
  similitud?: number;
}

export type ConsultaLog = typeof consultasChat.$inferSelect;

export class ConsultaLogModel {
  static async crearLog(data: {
    colaborador_id: number;
    pregunta: string;
    intencion: string;
    agente: string;
    documentos_citados: DocumentoCita[];
    resuelta: boolean;
    escalada: boolean;
    latencia_ms: number;
  }): Promise<void> {
    await db.insert(consultasChat).values({
      colaboradorId: data.colaborador_id,
      pregunta: data.pregunta,
      intencion: data.intencion,
      agente: data.agente,
      documentosCitados: data.documentos_citados,
      resuelta: data.resuelta,
      escalada: data.escalada,
      latenciaMs: data.latencia_ms,
    });
  }

  static async getHistorialReciente(
    colaboradorId: number,
    limit = 25
  ): Promise<ConsultaLog[]> {
    return db
      .select()
      .from(consultasChat)
      .where(eq(consultasChat.colaboradorId, colaboradorId))
      .orderBy(desc(consultasChat.fecha))
      .limit(limit);
  }
}
