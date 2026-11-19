import { DocumentoModel } from "../models/Documento.model";
import { embedText768, generateGeminiText } from "../config/gemini";
import { listFilesFromFolder, DriveDocumentData } from "../config/googleDrive";

export const INGESTION_AGENT_PROMPT_VERSION = "v2.0.0";

const INGESTION_METADATA_SYSTEM_PROMPT = `
Eres el Agente de Ingesta y Vectorización Documental de Tecnologías Pura Vida S.A. (${INGESTION_AGENT_PROMPT_VERSION}).
Analiza el encabezado del documento y extrae exactamente en formato JSON estricto:
- "titulo": Nombre formal de la política o manual
- "version": Versión (ej. "v2.1", "v3.2")
- "fechaVigencia": Fecha en formato "YYYY-MM-DD"

Devuelve SOLO el JSON:
{"titulo": "...", "version": "vX.Y", "fechaVigencia": "YYYY-MM-DD"}
`.trim();

export interface ChunkInfo {
  seccion: string;
  contenido: string;
  tokenCountAprox: number;
}

/**
 * Divide el documento en chunks de 500 a 1000 tokens (~2000 a 4000 caracteres)
 * con solapamiento (~100 tokens), preservando encabezados y secciones.
 */
export function chunkDocument(
  fullText: string,
  minTokens = 400,
  maxTokens = 1000,
  overlapTokens = 100
): ChunkInfo[] {
  const maxChars = maxTokens * 4;
  const minChars = minTokens * 4;
  const overlapChars = overlapTokens * 4;

  const lines = fullText.split(/\r?\n/);
  const sections: { title: string; lines: string[] }[] = [];

  let currentTitle = "Disposiciones Generales";
  let currentLines: string[] = [];

  const headerRegex =
    /^(?:#+\s+|secci[oó]n\s+\d+|art[ií]culo\s+\d+|cap[ií]tulo\s+[ivxlcdm\d]+|hoja\s+\d+|t[ií]tulo\s+\d+)/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && headerRegex.test(trimmed)) {
      if (currentLines.length > 0) {
        sections.push({ title: currentTitle, lines: currentLines });
        currentLines = [];
      }
      currentTitle = trimmed.replace(/^#+\s*/, "");
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    sections.push({ title: currentTitle, lines: currentLines });
  }

  const chunks: ChunkInfo[] = [];

  for (const section of sections) {
    const text = section.lines.join("\n").trim();
    if (!text) continue;

    if (text.length <= maxChars) {
      chunks.push({
        seccion: section.title,
        contenido: text,
        tokenCountAprox: Math.ceil(text.length / 4),
      });
      continue;
    }

    const paragraphs = text.split(/\n\s*\n/);
    let buffer = "";

    for (const p of paragraphs) {
      const trimmedP = p.trim();
      if (!trimmedP) continue;

      if ((buffer + "\n\n" + trimmedP).length <= maxChars) {
        buffer = buffer ? `${buffer}\n\n${trimmedP}` : trimmedP;
      } else {
        if (buffer.length >= minChars) {
          chunks.push({
            seccion: section.title,
            contenido: buffer,
            tokenCountAprox: Math.ceil(buffer.length / 4),
          });
          const overlap = buffer.slice(-overlapChars);
          buffer = `${overlap}\n\n${trimmedP}`.trim();
        } else {
          buffer = buffer ? `${buffer}\n\n${trimmedP}` : trimmedP;
          while (buffer.length > maxChars) {
            const piece = buffer.slice(0, maxChars);
            chunks.push({
              seccion: section.title,
              contenido: piece,
              tokenCountAprox: Math.ceil(piece.length / 4),
            });
            buffer = buffer.slice(maxChars - overlapChars);
          }
        }
      }
    }

    if (buffer.trim().length > 0) {
      chunks.push({
        seccion: section.title,
        contenido: buffer.trim(),
        tokenCountAprox: Math.ceil(buffer.length / 4),
      });
    }
  }

  return chunks.length > 0
    ? chunks
    : [
        {
          seccion: "Disposiciones Generales",
          contenido: fullText.trim(),
          tokenCountAprox: Math.ceil(fullText.length / 4),
        },
      ];
}

export class IngestionAgent {
  static readonly version = INGESTION_AGENT_PROMPT_VERSION;

  static async extractMetadata(docText: string, fileName: string) {
    const headerSample = docText.slice(0, 1500);

    const llmRes = await generateGeminiText(
      INGESTION_METADATA_SYSTEM_PROMPT,
      `Archivo: "${fileName}"\n\nEncabezado:\n"""\n${headerSample}\n"""`
    );

    if (llmRes) {
      try {
        const clean = llmRes.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(clean);
        if (parsed.titulo && parsed.version && parsed.fechaVigencia) {
          return {
            titulo: String(parsed.titulo),
            version: String(parsed.version),
            fechaVigencia: String(parsed.fechaVigencia),
          };
        }
      } catch {
        // Fallback a regex
      }
    }

    const versionMatch = docText.match(/v(\d+\.\d+)/i) || fileName.match(/v(\d+\.\d+)/i);
    const vigenciaMatch = docText.match(/vigencia:\s*(\d{4}-\d{2}-\d{2})/i);

    return {
      titulo: fileName.replace(/\.(gdoc|gsheet|pdf|docx|txt)$/i, "").replace(/_/g, " ").trim(),
      version: versionMatch ? `v${versionMatch[1]}` : "v1.0",
      fechaVigencia: vigenciaMatch ? vigenciaMatch[1] : "2026-01-01",
    };
  }

  static async syncDocuments(folderId?: string) {
    const startTime = Date.now();
    console.log(`🔄 [ingestionAgent ${this.version}] Iniciando sincronización con Google Drive...`);

    const driveDocs = await listFilesFromFolder(folderId);
    let totalChunks = 0;
    const detalles: any[] = [];

    for (const doc of driveDocs) {
      const meta = await this.extractMetadata(doc.text, doc.name);
      const chunks = chunkDocument(doc.text);

      // Eliminar chunks viejos del mismo archivo
      await DocumentoModel.deleteByDriveId(doc.fileId);

      for (const chunk of chunks) {
        const textToEmbed = `${meta.titulo} - ${chunk.seccion}: ${chunk.contenido}`;
        const embedding = await embedText768(textToEmbed);

        await DocumentoModel.insertChunk({
          driveFileId: doc.fileId,
          titulo: meta.titulo,
          seccion: chunk.seccion,
          version: meta.version,
          fechaVigencia: meta.fechaVigencia,
          enlaceDrive: doc.webViewLink,
          contenido: chunk.contenido,
          embedding,
        });

        totalChunks++;
      }

      detalles.push({
        archivo: doc.name,
        driveFileId: doc.fileId,
        version: meta.version,
        vigencia: meta.fechaVigencia,
        chunksCount: chunks.length,
      });
    }

    const duracionMs = Date.now() - startTime;
    console.log(`✅ [ingestionAgent] Sincronizados ${driveDocs.length} documentos (${totalChunks} chunks) en ${duracionMs}ms.`);

    return {
      exito: true,
      archivosProcesados: driveDocs.length,
      chunksInsertados: totalChunks,
      duracionMs,
      detalles,
    };
  }
}
