import { ReporteModel } from "../models/Reporte.model";
import { generateGeminiText } from "../config/gemini";

export const ANALYST_AGENT_PROMPT_VERSION = "v2.0.0";

const ANALYST_SYSTEM_PROMPT = `
Eres el Agente Analista Ejecutivo de Recursos Humanos de Tecnologías Pura Vida S.A. en Costa Rica (${ANALYST_AGENT_PROMPT_VERSION}).
Tu tarea es redactar un RESUMEN EJECUTIVO DIARIO DE 3 A 5 FRASES para la Dirección de Capital Humano basado EXCLUSIVAMENTE en el objeto JSON de métricas que se te proporciona.

REGLAS ESTRICTAS DE CERO ALUCINACIÓN:
1. TIENES ESTRICTAMENTE PROHIBIDO inventar, recalcular, aproximar o alterar números.
2. Menciona exactamente las cifras provistas en el JSON: ausentes hoy (desglosando vacaciones e incapacidades), solicitudes pendientes (>3 días), rotación de personal (ingresos/salidas), colaboradores con >20 días de vacaciones acumulados y métricas del chatbot de ayer.
3. El tono debe ser formal, conciso, ejecutivo y orientado a la toma de decisiones en el sector de tecnología de Costa Rica.
4. Longitud exacta: Entre 3 y 5 oraciones estructuradas en un único párrafo sólido.
`.trim();

export class AnalystAgent {
  static readonly version = ANALYST_AGENT_PROMPT_VERSION;

  /**
   * Ejecuta las 7 agregaciones analíticas de SQL y genera el reporte diario.
   */
  static async generarReporteDiario(
    fechaIso?: string,
    generadoPor = "analystAgent (cron 07:00)"
  ) {
    const fecha = fechaIso || new Date().toISOString().split("T")[0];

    console.log(`📊 [analystAgent ${ANALYST_AGENT_PROMPT_VERSION}] Recolectando métricas exactas para el ${fecha}...`);

    // 1. Ejecutar las 7 agregaciones SQL precisas en paralelo
    const [
      ausentesHoy,
      solicitudesPendientes,
      incapacidadesMes,
      rotacionPersonalMes,
      vacacionesAcumuladasAlerta,
      metricasChatbotAyer,
      topTemasYBrechasRAG,
    ] = await Promise.all([
      ReporteModel.getAusentesHoy(),
      ReporteModel.getSolicitudesPendientes(),
      ReporteModel.getIncapacidadesMes(),
      ReporteModel.getRotacionMes(),
      ReporteModel.getVacacionesAcumuladasAlerta(),
      ReporteModel.getMetricasChatAyer(),
      ReporteModel.getTopTemasYBrechas(),
    ]);

    const datosJson = {
      fechaReporte: fecha,
      ausentesHoy,
      solicitudesPendientes: {
        totalPendientes: solicitudesPendientes.totalPendientes,
        pendientesMas3Dias: solicitudesPendientes.pendientesMas3Dias,
        lista: solicitudesPendientes.lista.slice(0, 5),
      },
      incapacidadesMes,
      rotacionPersonalMes,
      vacacionesAcumuladasAlerta,
      metricasChatbotAyer,
      topTemasYBrechasRAG,
    };

    // 2. Redacción narrativa del resumen ejecutivo con Gemini LLM
    const userPrompt = `A continuación se presentan las métricas consolidadas de RRHH para la fecha ${fecha}:\n\n${JSON.stringify(
      datosJson,
      null,
      2
    )}\n\nRedacta el resumen ejecutivo de 3 a 5 frases respetando estrictamente los datos anteriores:`;

    const resumenLLM = await generateGeminiText(ANALYST_SYSTEM_PROMPT, userPrompt, 0.1);

    // Fallback narrativo determinístico si el LLM estuviese fuera de línea
    const resumenTexto =
      resumenLLM?.trim() ||
      `Para la jornada del ${fecha}, Tecnologías Pura Vida S.A. reporta ${ausentesHoy.total} colaboradores ausentes (${ausentesHoy.porTipo.vacaciones || 0} por vacaciones y ${(ausentesHoy.porTipo.incapacidad_ccss || 0) + (ausentesHoy.porTipo.incapacidad_ins || 0)} por incapacidades médicas). Existen ${solicitudesPendientes.totalPendientes} solicitudes pendientes en el portal, de las cuales ${solicitudesPendientes.pendientesMas3Dias} superan el umbral de 3 días sin respuesta por parte de sus jefaturas. La plantilla activa cuenta con ${rotacionPersonalMes.headcountActivo} colaboradores, registrando una tasa de rotación mensual del ${rotacionPersonalMes.tasaRotacionMensualPct}% con ${rotacionPersonalMes.ingresosMes} ingresos y ${rotacionPersonalMes.salidasMes} salida. Se mantiene en observación un pasivo laboral de ${vacacionesAcumuladasAlerta.totalColaboradoresMas20Dias} colaboradores con más de 20 días de vacaciones acumulados, mientras el chatbot resolvió ayer ${metricasChatbotAyer.totalConsultas} consultas con un ${metricasChatbotAyer.porcentajeResueltasSinEscalar}% de efectividad.`;

    // 3. Guardar en la tabla reportes_diarios
    const idReporte = await ReporteModel.guardarReporteDiario(
      fecha,
      datosJson,
      resumenTexto,
      generadoPor
    );

    console.log(`✅ [analystAgent] Reporte #${idReporte} del ${fecha} guardado exitosamente.`);

    return {
      id: idReporte,
      fecha,
      datosJson,
      resumenTexto,
      generadoPor,
    };
  }
}
