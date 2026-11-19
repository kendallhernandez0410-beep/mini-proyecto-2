import { DocumentoModel, DocumentoBusquedaResult } from "../models/Documento.model";
import { embedText768, generateGeminiText, RAG_SIMILARITY_THRESHOLD } from "../config/gemini";

export interface PolicyResponse {
  respuesta: string;
  documentosCitados: {
    titulo: string;
    seccion: string;
    version: string;
    enlace_drive: string;
    similitud: number;
  }[];
  resuelta: boolean;
  escalada: boolean;
}

export const POLICY_AGENT_PROMPT_VERSION = "v2.3.0";

const POLICY_SYSTEM_PROMPT = `
Eres el Agente Especialista en Políticas y Legislación Laboral del Portal de Recursos Humanos de Tecnologías Pura Vida S.A. en Costa Rica (${POLICY_AGENT_PROMPT_VERSION}).

INSTRUCCIONES OBLIGATORIAS DE COMPORTAMIENTO Y ALCANCE:
1. ALCANCE EXCLUSIVO DE LA PÁGINA:
   - Únicamente estás autorizado para responder consultas que correspondan al Portal de Recursos Humanos de Tecnologías Pura Vida S.A.: políticas internas, vacaciones, aguinaldo, nómina, incapacidades (CCSS/INS), teletrabajo híbrido, permisos con o sin goce de salario, feriados, beneficios corporativos (ASEPURAVIDA, seguro médico, subsidios) y Código de Conducta / legislación laboral de Costa Rica.
   - Si el usuario pregunta sobre cualquier tema ajeno a esta página o a Recursos Humanos (por ejemplo: deportes, recetas de cocina, matemáticas, programación general, historia, películas, clima, política externa, chistes o cultura general), NO respondas a esa pregunta. En su lugar, inicia tu respuesta exactamente con la etiqueta [FUERA_DE_ALCANCE] seguida de un mensaje breve y cordial indicando que solo estás programado para responder temas del Portal de Recursos Humanos de Tecnologías Pura Vida S.A.

2. CERO INVENCIONES (POLÍTICAS NO CONTEMPLADAS):
   - Tu única fuente de verdad son los fragmentos normativos oficiales proporcionados en el contexto.
   - Si el colaborador pregunta por un beneficio laboral, permiso o política de RRHH que NO aparece en absoluto dentro de los fragmentos provistos (por ejemplo: bono por mascotas, guardería en oficina, compra de acciones, etc.), NO inventes políticas. Inicia tu respuesta exactamente con la etiqueta [NO_CONTEMPLADO] e informa con amabilidad que ese punto específico no está contemplado en las políticas oficiales publicadas en el portal, por lo que puede escalar el caso a Recursos Humanos con el botón inferior.

3. CALIDAD DE RESPUESTA Y CITAS OBLIGATORIAS:
   - Cuando la información SÍ se encuentre en los fragmentos provistos, responde de forma clara, bien estructurada (usa viñetas o negritas para facilitar la lectura), directa y amable.
   - Toda afirmación normativa debe citar explícitamente la fuente con el formato: [Título del Documento - Sección, vX.X].
   - Mantén siempre el contexto laboral costarricense (Código de Trabajo de Costa Rica, Ley N° 2412 de Aguinaldo, CCSS, INS, colones/dólares según indique el documento).
`.trim();

export class PolicyAgent {
  static readonly version = POLICY_AGENT_PROMPT_VERSION;

  static async responderConsulta(pregunta: string): Promise<PolicyResponse> {
    // 1. Vectorizar la pregunta del usuario (768 dimensiones)
    const queryEmbedding = await embedText768(pregunta);

    // 2. Búsqueda semántica por similitud coseno sobre documentos_vectores
    const matches: DocumentoBusquedaResult[] = await DocumentoModel.searchSimilar(
      queryEmbedding,
      RAG_SIMILARITY_THRESHOLD,
      4
    );

    // Si no hay fragmentos que superen el umbral de confianza
    if (matches.length === 0) {
      return {
        respuesta:
          "No encontré información sobre esta consulta dentro de las políticas y reglamentos vigentes del Portal de Recursos Humanos de Tecnologías Pura Vida S.A. Si tu consulta trata sobre una excepción laboral o un caso especial de RRHH, puedes escalarla directamente al departamento mediante el botón inferior.",
        documentosCitados: [],
        resuelta: false,
        escalada: true,
      };
    }

    // 3. Preparar contexto con citas exactas
    const contextText = matches
      .map(
        (m, idx) => `[DOCUMENTO ${idx + 1}]
Título: ${m.titulo}
Sección: ${m.seccion}
Versión: ${m.version}
Vigencia: ${m.fecha_vigencia}
Enlace Drive: ${m.enlace_drive}
Contenido: ${m.contenido}`
      )
      .join("\n\n---\n\n");

    const userPrompt = `Pregunta del colaborador en el Portal de RRHH: "${pregunta}"

Fragmentos normativos oficiales recuperados de la base de datos:
${contextText}

Instrucción: Evalúa si la pregunta corresponde a los temas del Portal de RRHH y si se responde con los fragmentos anteriores. Redacta la respuesta cumpliendo estrictamente tus reglas de sistema.`;

    // 4. Generar respuesta con Gemini LLM
    const respuestaLLM = await generateGeminiText(POLICY_SYSTEM_PROMPT, userPrompt, 0.1);

    const documentosCitados = matches.map((m) => ({
      titulo: m.titulo,
      seccion: m.seccion,
      version: m.version,
      enlace_drive: m.enlace_drive,
      similitud: m.similitud,
    }));

    if (!respuestaLLM) {
      // Fallback determinístico bien fundamentado
      const topDoc = matches[0];
      return {
        respuesta: `De acuerdo con la normativa oficial de **Tecnologías Pura Vida S.A.** en **[${topDoc.titulo} - ${topDoc.seccion}, ${topDoc.version}]**:\n\n${topDoc.contenido}`,
        documentosCitados,
        resuelta: true,
        escalada: false,
      };
    }

    // Verificar si el LLM marcó la consulta como fuera de alcance de la página
    if (respuestaLLM.includes("[FUERA_DE_ALCANCE]")) {
      const textoLimpio = respuestaLLM.replace(/\[FUERA_DE_ALCANCE\]/g, "").trim();
      return {
        respuesta:
          textoLimpio ||
          "Soy el asistente exclusivo del **Portal de Recursos Humanos de Tecnologías Pura Vida S.A.** Solo estoy autorizado para responder consultas sobre políticas laborales, beneficios, trámites internos y tus datos de RRHH en esta plataforma.",
        documentosCitados: [],
        resuelta: true,
        escalada: false,
      };
    }

    // Verificar si el LLM detectó que es un tema laboral no contemplado en las políticas
    const esNoContemplado =
      respuestaLLM.includes("[NO_CONTEMPLADO]") ||
      respuestaLLM.toLowerCase().includes("no se encuentra contemplad") ||
      respuestaLLM.toLowerCase().includes("no está contemplad");

    const textoFinal = respuestaLLM.replace(/\[NO_CONTEMPLADO\]/g, "").trim();

    return {
      respuesta: textoFinal,
      documentosCitados: esNoContemplado ? [] : documentosCitados,
      resuelta: !esNoContemplado,
      escalada: esNoContemplado,
    };
  }
}
