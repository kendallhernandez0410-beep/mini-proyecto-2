import { ColaboradorModel } from "../models/Colaborador.model";
import { generateGeminiText } from "../config/gemini";

export interface DataAgentResponse {
  respuesta: string;
  datos: any;
  resuelta: boolean;
}

export const DATA_AGENT_PROMPT_VERSION = "v2.3.0";

const DATA_AGENT_SYSTEM_PROMPT = `
Eres el Agente de Datos Personales y Expediente Laboral del Portal de Recursos Humanos de Tecnologías Pura Vida S.A. (${DATA_AGENT_PROMPT_VERSION}).

REGLAS ESTRICTAS DE RESPUESTA:
1. ALCANCE EXCLUSIVO: Solo puedes responder sobre la información laboral propia del colaborador autenticado que se te entrega en el bloque JSON (su saldo de vacaciones, sus solicitudes registradas, sus incapacidades, su puesto, departamento y fechas de ingreso/pago).
2. CERO INVENCIONES: Tienes estrictamente prohibido inventar cifras, fechas o estados de solicitudes. Usa únicamente los datos exactos del JSON provisto.
3. PRIVACIDAD (Ley N° 8968 de Costa Rica): Nunca reveles ni inventes información de otros colaboradores.
4. TONO Y FORMATO: Dirígete al colaborador por su nombre de forma cordial, clara y estructurada (usando viñetas o negritas para resaltar sus días disponibles, fechas o estados de solicitudes).
`.trim();

export class DataAgent {
  static readonly version = DATA_AGENT_PROMPT_VERSION;

  /**
   * Responde consultas sobre los datos personales y laborales del colaborador autenticado.
   */
  static async responderConsulta(
    colaboradorId: number,
    pregunta: string
  ): Promise<DataAgentResponse> {
    const colaborador = await ColaboradorModel.findById(colaboradorId);
    if (!colaborador) {
      return {
        respuesta: "No fue posible localizar el expediente laboral del usuario autenticado en el portal.",
        datos: null,
        resuelta: false,
      };
    }

    const [saldo, solicitudes, incapacidades] = await Promise.all([
      ColaboradorModel.getSaldoVacaciones(colaboradorId),
      ColaboradorModel.getSolicitudes(colaboradorId),
      ColaboradorModel.getIncapacidades(colaboradorId),
    ]);

    const datosAdjuntos = {
      colaborador: {
        nombre: colaborador.nombre,
        email: colaborador.email,
        departamento: colaborador.departamento,
        puesto: colaborador.puesto,
        fechaIngreso: colaborador.fechaIngreso,
        estado: colaborador.estado,
      },
      saldoVacaciones: saldo || {
        periodo: "2025-2026",
        diasAsignados: "12.00",
        diasTomados: "0.00",
        diasDisponibles: "12.00",
      },
      solicitudesRecientes: solicitudes.slice(0, 5),
      incapacidadesRecientes: incapacidades.slice(0, 5),
      calendarioPagos: {
        quincenas: "Días 14 y 28 de cada mes vía transferencia SINPE",
        aguinaldo: "Primer viernes de diciembre (exento de cargas sociales según Ley N° 2412)",
      },
    };

    const userPrompt = `Pregunta del colaborador "${colaborador.nombre}": "${pregunta}"\n\nExpediente oficial en MySQL del colaborador autenticado:\n${JSON.stringify(
      datosAdjuntos,
      null,
      2
    )}\n\nResponde directamente a lo que el colaborador solicita utilizando exclusivamente estos datos:`;

    const respuestaLLM = await generateGeminiText(DATA_AGENT_SYSTEM_PROMPT, userPrompt, 0.1);

    if (respuestaLLM) {
      return {
        respuesta: respuestaLLM.trim(),
        datos: datosAdjuntos,
        resuelta: true,
      };
    }

    // Fallback determinístico estructurado si el LLM no está disponible
    const lower = pregunta.toLowerCase();
    const partes: string[] = [];

    if (lower.includes("vacaci") || lower.includes("saldo") || lower.includes("días") || lower.includes("dias") || lower.includes("disponible")) {
      if (saldo) {
        partes.push(
          `🏖️ **Saldo de Vacaciones (${saldo.periodo}):** Hola **${colaborador.nombre}**, actualmente cuentas con **${saldo.diasDisponibles} días hábiles disponibles** (de ${saldo.diasAsignados} días asignados, has disfrutado ${saldo.diasTomados} días).`
        );
      }
    }

    if (lower.includes("solicitud") || lower.includes("trámite") || lower.includes("tramite") || lower.includes("pendiente") || lower.includes("permiso")) {
      if (solicitudes.length > 0) {
        const ultimas = solicitudes
          .slice(0, 4)
          .map(
            (s) =>
              `- **${s.tipo.toUpperCase()}** (${s.fechaInicio} al ${s.fechaFin}): Estado **${s.estado.toUpperCase()}**`
          )
          .join("\n");
        partes.push(`📝 **Tus Solicitudes Registradas:**\n${ultimas}`);
      } else {
        partes.push("📝 No tienes solicitudes de permisos o vacaciones registradas recientemente en el portal.");
      }
    }

    if (lower.includes("incapacidad") || lower.includes("ccss") || lower.includes("ins") || lower.includes("médica") || lower.includes("medica")) {
      if (incapacidades.length > 0) {
        const ultimas = incapacidades
          .slice(0, 3)
          .map(
            (i) =>
              `- **${i.tipo} (${i.entidad})**: ${i.dias} días a partir del ${i.fechaInicio}`
          )
          .join("\n");
        partes.push(`🏥 **Tus Incapacidades Registradas:**\n${ultimas}`);
      } else {
        partes.push("🏥 No registras incapacidades médicas recientes en tu expediente.");
      }
    }

    if (partes.length === 0) {
      partes.push(
        `👤 **Resumen de tu Expediente en el Portal (${colaborador.nombre}):**\n` +
          `- **Puesto y Departamento:** ${colaborador.puesto} — ${colaborador.departamento}\n` +
          `- **Fecha de ingreso:** ${colaborador.fechaIngreso}\n` +
          `- **Vacaciones disponibles (${saldo?.periodo || "2025-2026"}):** **${saldo?.diasDisponibles || 0} días hábiles**\n` +
          `- **Solicitudes pendientes:** ${solicitudes.filter((s) => s.estado === "pendiente").length}`
      );
    }

    return {
      respuesta: partes.join("\n\n"),
      datos: datosAdjuntos,
      resuelta: true,
    };
  }
}
