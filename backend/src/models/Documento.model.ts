import { eq, sql } from "drizzle-orm";
import { db, documentosVectores, cosineSimilarity } from "../config/db";

export type DocumentoVector = typeof documentosVectores.$inferSelect;
export type DocumentoInsert = typeof documentosVectores.$inferInsert;

export interface DocumentoBusquedaResult {
  id: number;
  drive_file_id: string;
  titulo: string;
  seccion: string;
  version: string;
  fecha_vigencia: string;
  enlace_drive: string;
  contenido: string;
  similitud: number;
}

export class DocumentoModel {
  static async insertChunk(doc: DocumentoInsert): Promise<void> {
    await db.insert(documentosVectores).values(doc);
  }

  static async deleteByDriveId(driveFileId: string): Promise<void> {
    await db
      .delete(documentosVectores)
      .where(eq(documentosVectores.driveFileId, driveFileId));
  }

  static async countAll(): Promise<number> {
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(documentosVectores);
    return Number(rows[0]?.count || 0);
  }

  /**
   * Búsqueda por similitud coseno sobre los embeddings almacenados mediante Drizzle ORM.
   */
  static async searchSimilar(
    queryEmbedding: number[],
    threshold = 0.72,
    limit = 5
  ): Promise<DocumentoBusquedaResult[]> {
    const rows = await db.select().from(documentosVectores);

    const scored: DocumentoBusquedaResult[] = [];

    for (const row of rows) {
      const vec: number[] =
        typeof row.embedding === "string"
          ? JSON.parse(row.embedding)
          : row.embedding;

      const sim = cosineSimilarity(queryEmbedding, vec);
      if (sim >= threshold) {
        scored.push({
          id: row.id,
          drive_file_id: row.driveFileId,
          titulo: row.titulo,
          seccion: row.seccion,
          version: row.version,
          fecha_vigencia: row.fechaVigencia,
          enlace_drive: row.enlaceDrive,
          contenido: row.contenido,
          similitud: parseFloat(sim.toFixed(4)),
        });
      }
    }

    scored.sort((a, b) => b.similitud - a.similitud);
    return scored.slice(0, limit);
  }
}
