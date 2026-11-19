import { PolicyAgent } from "./policyAgent";
import { DataAgent } from "./dataAgent";
import { generateGeminiText } from "../config/gemini";
import { Colaborador } from "../models/Colaborador.model";

export type IntencionChat =
  | "politica"
  | "dato_personal"
  | "mixta"
  | "restringida"
  | "fuera_de_alcance"
  | "plataforma_drive";

export interface OrchestratorResult {
  respuesta: string;
  intencion: IntencionChat;
  agente: string;
  documentosCitados: any[];
  resuelta: boolean;
  escalada: boolean;
  latenciaMs: number;
}

export const ORCHESTRATOR_PROMPT_VERSION = "v2.5.0";

const ORCHESTRATOR_CLASSIFIER_SYSTEM_PROMPT = `
Eres el Agente Orquestador de Intenciones del Portal de Recursos Humanos de Tecnologías Pura Vida S.A. (${ORCHESTRATOR_PROMPT_VERSION}).
Tu única función es clasificar el mensaje del usuario en UNA de las siguientes categorías exactas:
- PLATAFORMA_DRIVE: Consultas sobre el funcionamiento de la página, opciones del portal, cómo aprobar/crear solicitudes, o preguntas sobre los documentos/archivos de Google Drive (ej. "¿puedes leer los documentos que hay en el drive?", "¿qué archivos hay en drive?", "¿cómo funciona la página?", "¿qué opciones tiene el portal?").
- SALUDO: Saludos breves ("hola", "buenos días", "pura vida"), agradecimientos ("gracias").
- RESTRINGIDA: Consultas donde el usuario pide ver el salario, vacaciones, incapacidades o datos privados de OTRO compañero o tercero.
- DATO_PERSONAL: Consultas sobre los propios datos del empleado autenticado en el portal (ej. "¿cuántos días de vacaciones tengo?", "mi saldo", "mis solicitudes pendientes", "mis incapacidades", "mi puesto", "mi fecha de ingreso", "cuándo me pagan").
- POLITICA: Consultas sobre normativas de la empresa, reglamentos de RRHH o legislación laboral de Costa Rica (vacaciones de ley, cálculo de aguinaldo, incapacidades CCSS/INS, teletrabajo, horario, permisos por matrimonio/luto/paternidad, beneficios, asociación solidarista, seguro médico, código de conducta).
- MIXTA: Consultas que combinan DATO_PERSONAL del empleado + POLITICA normativa en la misma pregunta.
- FUERA_DE_ALCANCE: Cualquier pregunta o instrucción que NO corresponda al Portal de Recursos Humanos ni a la empresa (ej. matemáticas, deportes externos, cocina, historia, clima, películas, chistes, política electoral, etc.).

Responde ÚNICAMENTE con una sola palabra en mayúsculas: PLATAFORMA_DRIVE, SALUDO, RESTRINGIDA, DATO_PERSONAL, POLITICA, MIXTA o FUERA_DE_ALCANCE.
`.trim();

const PLATFORM_DRIVE_SYSTEM_PROMPT = `
Eres el Asistente Experto del Portal de Recursos Humanos y Arquitectura RAG de Tecnologías Pura Vida S.A. en Costa Rica (${ORCHESTRATOR_PROMPT_VERSION}).

INSTRUCCIONES CLAVE DE RESPUESTA:

1. SI PREGUNTAN SI PUEDES LEER LOS ARCHIVOS O DOCUMENTOS DE GOOGLE DRIVE (o qué archivos hay):
   - Responde con un claro y entusiasta: "¡Sí, por supuesto! Tengo la capacidad de leer, consultar y procesar todos los documentos normativos de nuestra carpeta oficial de Google Drive."
   - Menciona que la conexión se realiza mediante una Cuenta de Servicio oficial de Google Cloud vinculada a la carpeta de la empresa (ID: 1TuHwfL-hAWU8zShyN07E1mnm6-ggJYlH).
   - Detalla con claridad los 6 documentos normativos oficiales de RRHH que tienes indexados y listos para responder dudas:
     1. 🏖️ **Política de Vacaciones y Días Libres (v3.2):** 12 días base (Art. 153 Código de Trabajo), 15 días con 3 años y 18 días con 5 años de antigüedad continua; tope máximo de 20 días acumulados.
     2. 💳 **Manual de Compensación, Nómina y Aguinaldo (v2.5):** Pagos quincenales días 14 y 28 vía SINPE, deducciones CCSS (10.67%), cálculo del aguinaldo (Ley N° 2412) pagado el primer viernes de diciembre exento de cargas.
     3. 🏥 **Reglamento de Incapacidades Médicas CCSS e INS (v4.0):** 100% de subsidio patronal los primeros 3 días, licencias de maternidad (4 meses) y paternidad (10 días).
     4. 💻 **Política de Teletrabajo Híbrido y Conectividad (v2.1):** Modalidad 3x2, core hours de 9:00 a.m. a 4:00 p.m., subsidio mensual de ₡25,000 CRC (Ley N° 9738).
     5. 📝 **Matriz de Permisos Feriados y Beneficios (v2.0):** 5 días con goce por matrimonio o luto 1er grado, 1 día por cumpleaños, 11 feriados obligatorios de Costa Rica.
     6. 🛡️ **Código de Conducta y Ética Laboral (v3.0):** Confidencialidad estricta de salarios y expedientes (Ley N° 8968) y tolerancia cero al hostigamiento (Ley N° 7476).
   - Invita cordialmente al colaborador a preguntarte sobre cualquier detalle o cálculo específico de estas políticas.

2. SI PREGUNTAN CÓMO FUNCIONA LA PÁGINA O QUÉ OPCIONES TIENE:
   - Explica de forma concisa y amigable los módulos del portal:
     - 💬 **Chat de Políticas:** Consultas en lenguaje natural con respuestas fundamentadas en los documentos de Drive y el Código de Trabajo.
     - 👤 **Expediente del Colaborador:** Ver saldos de vacaciones disponibles, solicitudes e incapacidades personales.
     - 📊 **Dashboard Ejecutivo (para Rol RRHH):** Indicadores clave (KPIs), gráficos de ausencias Recharts, resumen ejecutivo diario generado por IA y gestión de solicitudes (aprobar y rechazar trámites, o registrar nuevas solicitudes).
     - 🔄 **Sincronización con Drive:** Botón para re-indexar automáticamente cualquier nuevo documento que se suba a la carpeta de Drive.

FORMATO Y TONO:
- Tono respetuoso, cálido, profesional y costarricense ("¡Pura vida!").
- Estructurado con viñetas limpias y negritas para una lectura ágil.
`.trim();

export class OrchestratorAgent {
  static readonly version = ORCHESTRATOR_PROMPT_VERSION;

  /**
   * Detecta si el mensaje es una consulta sobre Google Drive o sobre las funciones de la página.
   */
  static esConsultaDePlataformaODrive(pregunta: string): boolean {
    const lower = pregunta.toLowerCase().trim();

    const patronesDrive = [
      /\bdrive\b/i,
      /documentos?\s+(?:que\s+hay\s+)?en\s+el\s+drive/i,
      /archivos?\s+(?:que\s+hay\s+)?en\s+el\s+drive/i,
      /puedes\s+leer\s+(?:los\s+)?(?:documentos?|archivos?|el\s+drive)/i,
      /lees?\s+(?:los\s+)?(?:documentos?|archivos?|drive)/i,
      /qu[eé]\s+(?:documentos?|archivos?)\s+(?:tienes?|hay|posees?|lees?|contiene)/i,
      /qu[eé]\s+hay\s+en\s+el\s+drive/i,
      /sincronizar\s+(?:con\s+)?drive/i,
      /carpeta\s+(?:de\s+)?drive/i,
      /acceso\s+al\s+drive/i,
      /archivos?\s+disponibles/i,
      /documentos?\s+disponibles/i,
      /qu[eé]\s+pol[ií]ticas\s+tienes/i,
      /cu[aá]les\s+pol[ií]ticas\s+hay/i,
      /cu[aá]les\s+son\s+las\s+pol[ií]ticas/i,
    ];

    const patronesPagina = [
      /c[oó]mo\s+funciona\s+(?:esta\s+)?(?:p[aá]gina|portal|sistema|aplicaci[oó]n|app|chat)/i,
      /qu[eé]\s+opciones\s+tiene\s+(?:esta\s+)?(?:p[aá]gina|portal|sistema)/i,
      /qu[eé]\s+puedo\s+hacer\s+(?:en\s+|con\s+)?(?:esta\s+p[aá]gina|el\s+portal|este\s+sistema)/i,
      /para\s+qu[eé]\s+sirve\s+(?:esta\s+p[aá]gina|el\s+portal|este\s+sistema)/i,
      /c[oó]mo\s+apruebo\s+(?:una\s+)?solicitud/i,
      /c[oó]mo\s+creo\s+(?:una\s+)?solicitud/i,
      /c[oó]mo\s+solicito\s+vacaciones/i,
      /c[oó]mo\s+uso\s+(?:esta\s+)?p[aá]gina/i,
      /qu[eé]\s+funciones\s+tiene/i,
      /qu[eé]\s+haces\s+t[uú]/i,
      /para\s+qu[eé]\s+fuiste\s+creado/i,
    ];

    return (
      patronesDrive.some((r) => r.test(lower)) ||
      patronesPagina.some((r) => r.test(lower))
    );
  }

  /**
   * Detecta si el mensaje es un saludo breve o agradecimiento.
   */
  static esSaludoOCortesia(pregunta: string): boolean {
    const clean = pregunta
      .toLowerCase()
      .replace(/[¡!¿?.,;:]/g, "")
      .trim();

    const saludosExactos = new Set([
      "hola",
      "hola buenas",
      "buenos dias",
      "buenos días",
      "buenas tardes",
      "buenas noches",
      "buenas",
      "pura vida",
      "hola pura vida",
      "que tal",
      "qué tal",
      "como estas",
      "cómo estás",
      "gracias",
      "muchas gracias",
      "ok gracias",
      "ayuda",
      "menu",
      "menú",
    ]);

    if (saludosExactos.has(clean)) {
      return true;
    }

    return /^(hola|buenos d[ií]as|buenas tardes|buenas noches|pura vida)\s*(?:como estas|c[oó]mo est[aá]s|que tal|qu[eé] tal)?$/i.test(
      clean
    );
  }

  /**
   * Clasifica la intención de la consulta del colaborador.
   */
  static async clasificarIntencion(
    pregunta: string,
    rol: "colaborador" | "rrhh"
  ): Promise<{ intencion: IntencionChat; esSaludo?: boolean }> {
    const lower = pregunta.toLowerCase().trim();

    // 0. Preguntas sobre Google Drive o sobre las funciones de la página
    if (this.esConsultaDePlataformaODrive(lower)) {
      return { intencion: "plataforma_drive" };
    }

    // 1. Saludos breves
    if (this.esSaludoOCortesia(lower)) {
      return { intencion: "fuera_de_alcance", esSaludo: true };
    }

    // 2. REGLA DE SEGURIDAD CRÍTICA (Ley N° 8968): Consultas por datos de terceros
    const patronesTerceros = [
      /cu[aá]ntos?\s+d[ií]as\s+.*(?:mi\s+compa[ñn]ero|otro|juan|pedro|mar[ií]a|carlos|valeria|mauricio|carolina|alejandro|esteban|daniela|fabi[aá]n|mariana|roberto|gabriela|sebasti[aá]n|adriana|diego|paola|andr[eé]s|gerente|jefe)/i,
      /salario\s+de\s+(?!m[ií]|mis\b)/i,
      /sueldo\s+de\s+(?!m[ií]|mis\b)/i,
      /cu[aá]nto\s+gana\b/i,
      /expediente\s+de\s+(?!m[ií]\b)/i,
      /vacaciones\s+de\s+(?:juan|pedro|mar[ií]a|carlos|valeria|mauricio|carolina|alejandro|esteban|daniela|mi\s+compa[ñn]ero|mi\s+jefe|otro\b)/i,
      /incapacidad(?:es)?\s+de\s+(?:juan|pedro|mar[ií]a|otro|mi\s+compa[ñn]ero)/i,
      /solicitudes\s+de\s+(?:mi\s+compa[ñn]ero|otro|todos)/i,
    ];

    if (patronesTerceros.some((regex) => regex.test(lower)) && rol !== "rrhh") {
      return { intencion: "restringida" };
    }

    // 3. Temas claramente fuera de alcance de la página de RRHH
    const patronesFueraAlcance = [
      /\b(?:pel[ií]cula|serie|netflix|cine|actor)\b/i,
      /\b(?:receta|cocinar|ingredientes|arroz con|comida)\b/i,
      /\b(?:f[uú]tbol|mundial|saprissa|alajuelense|champions|deporte|partido)\b/i,
      /\b(?:clima|temperatura|llover[aá]|pron[oó]stico del tiempo)\b/i,
      /\b(?:chiste|broma|adivinanza|poema|canci[oó]n|cuento)\b/i,
      /\b(?:c[oó]digo\s+python|javascript|html|css|sql\s+query|programar\s+un|algoritmo)\b/i,
      /\b(?:cu[aá]nto\s+es\s+\d+|\d+\s*[\+\-\*\/]\s*\d+|ecuaci[oó]n|ra[ií]z\s+cuadrada)\b/i,
      /\b(?:capital\s+de|presidente\s+de|historia\s+de|segunda\s+guerra|planeta|universo)\b/i,
      /\b(?:traduce|traducir\s+al\s+ingl[eé]s|franc[eé]s|alem[aá]n)\b/i,
      /\b(?:criptomoneda|bitcoin|acciones\s+de\s+bolsa|apuesta)\b/i,
    ];

    if (patronesFueraAlcance.some((regex) => regex.test(lower))) {
      return { intencion: "fuera_de_alcance", esSaludo: false };
    }

    // 4. Patrones de datos personales del propio colaborador en el portal
    const tieneDatoPersonal =
      /\b(?:mi\s+saldo|mis\s+vacaciones|mis\s+d[ií]as|mi\s+solicitud|mis\s+solicitudes|mis\s+tr[aá]mites|mi\s+incapacidad|mis\s+incapacidades|mi\s+puesto|mi\s+departamento|mi\s+antig[uü]edad|mi\s+fecha\s+de\s+ingreso|mi\s+perfil|mi\s+expediente|mis\s+datos)\b/i.test(
        lower
      ) ||
      /\b(?:cu[aá]ntos?\s+d[ií]as\s+(?:de\s+vacaciones\s+)?(?:tengo|me\s+quedan|tengo\s+disponibles|llevo))\b/i.test(
        lower
      ) ||
      /\b(?:tengo\s+solicitudes\s+pendientes|estado\s+de\s+mi\s+solicitud|cu[aá]nto\s+me\s+queda\s+de\s+vacaciones)\b/i.test(
        lower
      );

    // 5. Patrones de política general / Normativa laboral de RRHH
    const tienePolitica =
      /\b(?:c[oó]digo\s+de\s+trabajo|art[ií]culo|pol[ií]tica|reglamento|normativa|ley|aguinaldo|teletrabajo|remoto|h[ií]brido|internet|silla|feriado|permiso|licencia|matrimonio|paternidad|maternidad|luto|fallecimiento|subsidio|incapacidad|ccss|ins|asepuravida|solidarista|seguro\s+m[eé]dico|conducta|vestimenta|[eé]tica|acoso|tope\s+de\s+acumulaci[oó]n|anticizaci[oó]n|anticipaci[oó]n|quincena|n[oó]mina|beneficio|documento|archivo)\b/i.test(
        lower
      ) ||
      /\b(?:cu[aá]ntos\s+d[ií]as\s+dan\s+por|corresponden\s+por\s+ley|c[oó]mo\s+se\s+calcula|c[oó]mo\s+solicito|requisitos\s+para)\b/i.test(
        lower
      );

    if (tieneDatoPersonal && tienePolitica) {
      return { intencion: "mixta" };
    }

    if (tieneDatoPersonal) {
      return { intencion: "dato_personal" };
    }

    if (tienePolitica) {
      return { intencion: "politica" };
    }

    // 6. Si no coincide con patrones claros, usar Gemini LLM para clasificar con exactitud
    const clasificacionLLM = await generateGeminiText(
      ORCHESTRATOR_CLASSIFIER_SYSTEM_PROMPT,
      `Mensaje del usuario: "${pregunta}"`,
      0.0
    );

    if (clasificacionLLM) {
      const upper = clasificacionLLM.trim().toUpperCase();
      if (upper.includes("PLATAFORMA_DRIVE")) {
        return { intencion: "plataforma_drive" };
      }
      if (upper.includes("SALUDO")) {
        return { intencion: "fuera_de_alcance", esSaludo: true };
      }
      if (upper.includes("RESTRINGIDA") && rol !== "rrhh") {
        return { intencion: "restringida" };
      }
      if (upper.includes("FUERA_DE_ALCANCE")) {
        return { intencion: "fuera_de_alcance", esSaludo: false };
      }
      if (upper.includes("MIXTA")) {
        return { intencion: "mixta" };
      }
      if (upper.includes("DATO_PERSONAL")) {
        return { intencion: "dato_personal" };
      }
      if (upper.includes("POLITICA")) {
        return { intencion: "politica" };
      }
    }

    // Si menciona palabras de la empresa o portal
    if (
      lower.includes("vacaci") ||
      lower.includes("trabajo") ||
      lower.includes("empresa") ||
      lower.includes("rrhh") ||
      lower.includes("recursos humanos") ||
      lower.includes("drive")
    ) {
      return { intencion: "politica" };
    }

    return { intencion: "fuera_de_alcance", esSaludo: false };
  }

  /**
   * Procesa la consulta completa, enruta a especialistas y consolida la respuesta.
   */
  static async procesarMensaje(
    usuario: Pick<Colaborador, "id" | "nombre" | "rol">,
    pregunta: string
  ): Promise<OrchestratorResult> {
    const startTime = Date.now();
    const { intencion, esSaludo } = await this.clasificarIntencion(pregunta, usuario.rol);

    // Caso: Consulta sobre la Plataforma o Documentos de Google Drive
    if (intencion === "plataforma_drive") {
      const promptUsuario = `Consulta de ${usuario.nombre} (Rol: ${usuario.rol}): "${pregunta}"`;
      const respuestaLLM = await generateGeminiText(
        PLATFORM_DRIVE_SYSTEM_PROMPT,
        promptUsuario,
        0.1
      );

      const latenciaMs = Date.now() - startTime;
      const respuestaFinal =
        respuestaLLM?.trim() ||
        `¡Sí, por supuesto! Tengo la capacidad de leer, sincronizar y consultar en vivo todos los documentos de nuestra carpeta oficial de Google Drive (ID: 1TuHwfL-hAWU8zShyN07E1mnm6-ggJYlH).\n\nActualmente cuento con 6 documentos normativos de Recursos Humanos listos para responderte:\n- 🏖️ **Política de Vacaciones y Días Libres (v3.2)**\n- 💳 **Manual de Compensación, Nómina y Aguinaldo (v2.5)**\n- 🏥 **Reglamento de Incapacidades Médicas CCSS e INS (v4.0)**\n- 💻 **Política de Teletrabajo Híbrido y Conectividad (v2.1)**\n- 📝 **Matriz de Permisos Feriados y Beneficios (v2.0)**\n- 🛡️ **Código de Conducta y Ética Laboral (v3.0)**\n\nPuedes hacerme cualquier pregunta sobre sus secciones, beneficios o artículos de ley laboral.`;

      const documentosDrive = [
        {
          titulo: "Política de Vacaciones y Días Libres 2026",
          seccion: "Sección 2.1 y 2.4 (Beneficio Escalonado y Topes)",
          version: "v3.2",
          enlace_drive: "https://drive.google.com/drive/folders/1TuHwfL-hAWU8zShyN07E1mnm6-ggJYlH",
          similitud: 1.0,
        },
        {
          titulo: "Manual de Compensación, Nómina y Aguinaldo 2026",
          seccion: "Sección 1.2 y 4.1 (SINPE y Aguinaldo Ley 2412)",
          version: "v2.5",
          enlace_drive: "https://drive.google.com/drive/folders/1TuHwfL-hAWU8zShyN07E1mnm6-ggJYlH",
          similitud: 1.0,
        },
        {
          titulo: "Reglamento de Incapacidades Médicas CCSS e INS",
          seccion: "Sección 3.1 y 3.3 (Subsidios y Licencias)",
          version: "v4.0",
          enlace_drive: "https://drive.google.com/drive/folders/1TuHwfL-hAWU8zShyN07E1mnm6-ggJYlH",
          similitud: 1.0,
        },
        {
          titulo: "Política de Teletrabajo Híbrido y Conectividad",
          seccion: "Sección 1.1 (Modalidad 3x2 y Subsidio ₡25,000)",
          version: "v2.1",
          enlace_drive: "https://drive.google.com/drive/folders/1TuHwfL-hAWU8zShyN07E1mnm6-ggJYlH",
          similitud: 1.0,
        },
      ];

      return {
        respuesta: respuestaFinal,
        intencion,
        agente: "driveKnowledgeAgent",
        documentosCitados: documentosDrive,
        resuelta: true,
        escalada: false,
        latenciaMs,
      };
    }

    // Caso 0: Saludo cordial o bienvenida
    if (intencion === "fuera_de_alcance" && esSaludo) {
      const latenciaMs = Date.now() - startTime;
      return {
        respuesta:
          `👋 ¡Hola, **${usuario.nombre}**! ¡Pura vida! Soy el asistente oficial del **Portal de Recursos Humanos de Tecnologías Pura Vida S.A.**\n\n` +
          `Estoy programado para ayudarte con todo lo referente a esta plataforma y a nuestras políticas laborales:\n` +
          `- 🏖️ **Tus Datos en el Portal:** Consultar tu saldo disponible de vacaciones, el estado de tus solicitudes, tus incapacidades registradas o datos de tu puesto.\n` +
          `- 📁 **Documentos en Google Drive:** Puedo leer e interpretar todas las políticas normativas de la empresa (vacaciones, aguinaldo Ley N° 2412, incapacidades CCSS/INS, teletrabajo híbrido, permisos y código de conducta).\n` +
          `- ⚙️ **Opciones de la Página:** Guiarte en cómo usar el chat, el dashboard ejecutivo o cómo aprobar/crear solicitudes.\n\n` +
          `¿En qué te puedo colaborar hoy?`,
        intencion: "fuera_de_alcance",
        agente: "orchestrator",
        documentosCitados: [],
        resuelta: true,
        escalada: false,
        latenciaMs,
      };
    }

    // Caso 1: Consulta RESTRINGIDA (Seguridad y Privacidad - Ley N° 8968)
    if (intencion === "restringida") {
      const latenciaMs = Date.now() - startTime;
      return {
        respuesta:
          "⛔ **Acceso Restringido:** De conformidad con la **Ley de Protección de la Persona frente al Tratamiento de sus Datos Personales de Costa Rica (Ley N° 8968)** y el **Código de Conducta de Tecnologías Pura Vida S.A. (Sección 5.2)**, los saldos de vacaciones, salarios, incapacidades y expedientes de otros colaboradores son estrictamente confidenciales. Únicamente puedes consultar tu propia información personal.",
        intencion,
        agente: "orchestrator",
        documentosCitados: [],
        resuelta: true,
        escalada: false,
        latenciaMs,
      };
    }

    // Caso 2: FUERA DE ALCANCE (Temas totalmente ajenos a la empresa y RRHH)
    if (intencion === "fuera_de_alcance") {
      const latenciaMs = Date.now() - startTime;
      return {
        respuesta:
          `ℹ️ Estimado(a) **${usuario.nombre}**, soy un agente especializado y exclusivo del **Portal de Recursos Humanos de Tecnologías Pura Vida S.A.**\n\n` +
          `Por directrices del sistema, **solo puedo responder consultas que correspondan a esta página y a nuestra empresa**: políticas laborales en Google Drive, beneficios corporativos, legislación laboral costarricense (vacaciones, aguinaldo, incapacidades CCSS/INS, teletrabajo, permisos) o tu expediente personal en el portal. No estoy autorizado para responder sobre temas externos o ajenos a Recursos Humanos.`,
        intencion,
        agente: "orchestrator",
        documentosCitados: [],
        resuelta: true,
        escalada: false,
        latenciaMs,
      };
    }

    // Caso 3: DATO PERSONAL ÚNICAMENTE
    if (intencion === "dato_personal") {
      const dataRes = await DataAgent.responderConsulta(usuario.id, pregunta);
      const latenciaMs = Date.now() - startTime;
      return {
        respuesta: dataRes.respuesta,
        intencion,
        agente: "dataAgent",
        documentosCitados: [],
        resuelta: dataRes.resuelta,
        escalada: false,
        latenciaMs,
      };
    }

    // Caso 4: POLÍTICA GENERAL ÚNICAMENTE (RAG)
    if (intencion === "politica") {
      const policyRes = await PolicyAgent.responderConsulta(pregunta);
      const latenciaMs = Date.now() - startTime;
      return {
        respuesta: policyRes.respuesta,
        intencion,
        agente: "policyAgent",
        documentosCitados: policyRes.documentosCitados,
        resuelta: policyRes.resuelta,
        escalada: policyRes.escalada,
        latenciaMs,
      };
    }

    // Caso 5: MIXTA (Políticas RAG + Datos Personales)
    const [policyRes, dataRes] = await Promise.all([
      PolicyAgent.responderConsulta(pregunta),
      DataAgent.responderConsulta(usuario.id, pregunta),
    ]);

    const respuestaConsolidada = `${dataRes.respuesta}\n\n---\n\n📋 **Normativa y Política Aplicable:**\n${policyRes.respuesta}`;
    const latenciaMs = Date.now() - startTime;

    return {
      respuesta: respuestaConsolidada,
      intencion: "mixta",
      agente: "policyAgent+dataAgent",
      documentosCitados: policyRes.documentosCitados,
      resuelta: policyRes.resuelta && dataRes.resuelta,
      escalada: policyRes.escalada,
      latenciaMs,
    };
  }
}
