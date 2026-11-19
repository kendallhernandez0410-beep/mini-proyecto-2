import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || "";
const hasValidGeminiKey =
  Boolean(apiKey) &&
  apiKey !== "AIzaSyYourGeminiApiKeyHere" &&
  apiKey.trim().length > 10;

export const genAI = hasValidGeminiKey ? new GoogleGenerativeAI(apiKey) : null;

export const GEMINI_LLM_MODEL =
  process.env.GEMINI_LLM_MODEL || "gemini-2.0-flash";
export const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004";
export const RAG_SIMILARITY_THRESHOLD = parseFloat(
  process.env.RAG_SIMILARITY_THRESHOLD || "0.55"
);

/**
 * Generador determinístico de embeddings de 768 dimensiones para el dominio
 * laboral de Recursos Humanos en Costa Rica (fallback offline).
 */
export function generateSemanticEmbedding768(text: string): number[] {
  const vec = new Array(768).fill(0);
  const normalized = text.toLowerCase();

  const topicKeywords: Record<number, string[]> = {
    0: ["vacaciones", "dias libres", "articulo 153", "50 semanas", "acumulacion", "descanso", "feriado"],
    64: ["aguinaldo", "diciembre", "doceava", "ley 2412", "pago", "quincena", "salario", "bono"],
    128: ["incapacidad", "ccss", "ins", "enfermedad", "maternidad", "riesgo de trabajo", "subsidio", "dictamen"],
    192: ["teletrabajo", "remoto", "hibrido", "conectividad", "horario", "equipo", "oficina", "silla"],
    256: ["permiso", "goce de salario", "matrimonio", "fallecimiento", "paternidad", "citas medicas", "cumpleanos"],
    320: ["codigo de conducta", "vestimenta", "etica", "acoso", "ley 7476", "confidencialidad", "sanciones"],
    384: ["beneficios", "seguro medico", "asociacion solidarista", "asepuravida", "educacion", "gimnasio"],
  };

  Object.entries(topicKeywords).forEach(([offsetStr, words]) => {
    const offset = Number(offsetStr);
    words.forEach((word, idx) => {
      if (normalized.includes(word)) {
        for (let i = 0; i < 48; i++) {
          vec[(offset + idx * 5 + i) % 768] += 0.65;
        }
      }
    });
  });

  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    const dim = (code * 31 + i * 17) % 768;
    vec[dim] += ((code % 13) - 6) * 0.04;
  }

  const norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0)) || 1;
  return vec.map((v) => Number((v / norm).toFixed(6)));
}

/**
 * Genera el vector de 768 dimensiones para un texto utilizando text-embedding o gemini-embedding-001.
 */
export async function embedText768(text: string): Promise<number[]> {
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
      const result = await model.embedContent(text);
      const values = result.embedding?.values;
      if (values) {
        if (values.length === 768) {
          return values;
        }
        if (values.length === 3072) {
          const pooled = new Array(768).fill(0);
          for (let i = 0; i < 768; i++) {
            pooled[i] = (values[i * 4] + values[i * 4 + 1] + values[i * 4 + 2] + values[i * 4 + 3]) / 4;
          }
          const norm = Math.sqrt(pooled.reduce((acc, v) => acc + v * v, 0)) || 1;
          return pooled.map((v) => Number((v / norm).toFixed(6)));
        }
      }
    } catch (error) {
      console.warn("⚠️ Fallback a embedding local determinístico 768d:", error instanceof Error ? error.message : error);
    }
  }

  return generateSemanticEmbedding768(text);
}

/**
 * Genera texto con Gemini LLM con prompt de sistema, temperatura controlada y reintento resiliente.
 */
export async function generateGeminiText(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.1
): Promise<string | null> {
  if (!genAI) {
    return null;
  }

  const modelsToTry = Array.from(
    new Set([GEMINI_LLM_MODEL, "gemini-3.5-flash-lite", "gemini-flash-lite-latest"])
  );

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
        generationConfig: { temperature },
      });
      const result = await model.generateContent(userPrompt);
      const text = result.response.text();
      if (text) {
        return text;
      }
    } catch (error: any) {
      console.warn(`⚠️ Aviso con modelo Gemini (${modelName}):`, error?.message || error);
    }
  }

  return null;
}
