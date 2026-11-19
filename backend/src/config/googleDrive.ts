import { google } from "googleapis";
import pdfParse from "pdf-parse";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

export interface DriveDocumentData {
  fileId: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  text: string;
}

export function getDriveClient() {
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  // Intentar cargar también desde archivo JSON local si existe
  const jsonPath = path.resolve(__dirname, "../../google-service-account.json");
  if (fs.existsSync(jsonPath)) {
    try {
      const sa = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      if (sa.client_email && sa.private_key) {
        email = sa.client_email;
        privateKey = sa.private_key;
      }
    } catch {}
  }

  if (!email || !privateKey || privateKey.includes("YourGeminiApiKeyHere") || privateKey.includes("...")) {
    return null;
  }

  try {
    privateKey = privateKey.replace(/\\n/g, "\n");

    const auth = new google.auth.JWT({
      email,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    return google.drive({ version: "v3", auth });
  } catch (err) {
    console.warn("⚠️ Llave de Google Drive no válida o de prueba. Usando corpus normativo integrado.", err);
    return null;
  }
}

export async function extractTextFromDriveFile(
  drive: ReturnType<typeof google.drive>,
  fileId: string,
  mimeType: string
): Promise<string> {
  if (mimeType === "application/vnd.google-apps.document") {
    const res = await drive.files.export({
      fileId,
      mimeType: "text/plain",
    });
    return typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  }

  if (mimeType === "application/vnd.google-apps.spreadsheet") {
    const res = await drive.files.export({
      fileId,
      mimeType: "text/csv",
    });
    return typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  }

  if (mimeType === "application/pdf") {
    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
    const buffer = Buffer.from(res.data as ArrayBuffer);
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }

  if (mimeType.startsWith("text/")) {
    const res = await drive.files.get({ fileId, alt: "media" });
    return typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  }

  return "";
}

export async function listFilesFromFolder(folderId?: string): Promise<DriveDocumentData[]> {
  const drive = getDriveClient();
  const targetFolderId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!drive || !targetFolderId) {
    return getMockDriveDocuments();
  }

  try {
    const res = await drive.files.list({
      q: `'${targetFolderId}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, webViewLink)",
      pageSize: 50,
    });

    const files = res.data.files || [];
    const results: DriveDocumentData[] = [];

    for (const f of files) {
      if (!f.id || !f.name || !f.mimeType) continue;
      try {
        const text = await extractTextFromDriveFile(drive, f.id, f.mimeType);
        if (text.trim().length > 0) {
          results.push({
            fileId: f.id,
            name: f.name,
            mimeType: f.mimeType,
            webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
            text,
          });
        }
      } catch (err) {
        console.warn(`⚠️ Error extrayendo archivo ${f.name}:`, err);
      }
    }

    return results.length > 0 ? results : getMockDriveDocuments();
  } catch (error) {
    console.warn("⚠️ Error conectando con Google Drive API. Usando documentos normativos locales:", error);
    return getMockDriveDocuments();
  }
}

export function getMockDriveDocuments(): DriveDocumentData[] {
  return [
    {
      fileId: "1CR_PolVacaciones_2026_Doc",
      name: "Política de Vacaciones y Días Libres 2026 - Pura Vida.gdoc",
      mimeType: "application/vnd.google-apps.document",
      webViewLink: "https://docs.google.com/document/d/1CR_PolVacaciones_2026_Doc/view",
      text: `
POLÍTICA DE VACACIONES Y DÍAS LIBRES
TECNOLOGÍAS PURA VIDA S.A. - SAN JOSÉ, COSTA RICA
Código: POL-RRHH-VAC-2026 | Versión: v3.2 | Vigencia: 2026-01-01

Sección 2.1 - Derecho a Vacaciones Anuales y Beneficio Escalonado
De conformidad con el Artículo 153 del Código de Trabajo de Costa Rica, toda persona colaboradora de Tecnologías Pura Vida S.A. tiene derecho a un mínimo de dos semanas (12 días hábiles) de vacaciones remuneradas por cada cincuenta (50) semanas de labores continuas, lo que equivale a una acumulación de 1 día hábil por cada mes trabajado. Adicionalmente, como beneficio extra de la empresa:
(a) A partir de cumplir 3 años de antigüedad continua, el colaborador recibe 15 días hábiles anuales (1.25 días/mes).
(b) A partir de cumplir 5 años de antigüedad continua, recibe 18 días hábiles anuales (1.5 días/mes).

Sección 2.4 - Tope de Acumulación y Solicitud en el Portal
Según el Artículo 159 del Código de Trabajo de Costa Rica, queda prohibido acumular las vacaciones por más de un período, salvo una sola vez cuando el trabajador desempeñe labores técnicas de difícil reemplazo. En Tecnologías Pura Vida S.A., ningún colaborador debe superar el tope máximo de 20 días hábiles acumulados sin programar su disfrute. Las solicitudes de vacaciones de 1 a 3 días deben registrarse con al menos 5 días hábiles de anticipación; las solicitudes de 4 o más días requieren 15 días naturales de anticipación y aprobación de la jefatura inmediata.
      `.trim(),
    },
    {
      fileId: "1CR_ManualCompensacion_Aguinaldo_PDF",
      name: "Manual de Compensación Nómina y Aguinaldo 2026.pdf",
      mimeType: "application/pdf",
      webViewLink: "https://drive.google.com/file/d/1CR_ManualCompensacion_Aguinaldo_PDF/view",
      text: `
MANUAL DE COMPENSACIÓN, NÓMINA Y AGUINALDO
TECNOLOGÍAS PURA VIDA S.A.
Código: MAN-FIN-NOM-2026 | Versión: v2.5 | Vigencia: 2026-01-15

Sección 1.2 - Fechas de Pago Quincenal y Deducciones de Ley
Tecnologías Pura Vida S.A. paga los salarios de forma quincenal mediante transferencia bancaria SINPE los días 14 y 28 de cada mes (si cae sábado, domingo o feriado de ley, el depósito se adelanta al día hábil inmediato anterior). Del salario bruto se aplican las deducciones obreras de ley en Costa Rica: 10.67% de cargas sociales de la Caja Costarricense de Seguro Social (CCSS: SEM, IVM y Banco Popular) y el Impuesto al Salario según los tramos vigentes del Ministerio de Hacienda. Quienes pertenezcan voluntariamente a la Asociación Solidarista (ASEPURAVIDA) aportan un 5% de ahorro obrero y la empresa aporta un 5.33% de adelanto de cesantía.

Sección 4.1 - Cálculo y Fecha de Pago del Aguinaldo
En cumplimiento de la Ley de Aguinaldo en la Empresa Privada de Costa Rica (Ley N° 2412), el aguinaldo anual equivale a la doceava parte (1/12 o 8.33%) del total de salarios ordinarios y extraordinarios devengados por la persona colaboradora entre el 1° de diciembre del año anterior y el 30 de noviembre del año en curso. Si bien la ley establece como fecha límite el 20 de diciembre, Tecnologías Pura Vida S.A. realiza el depósito del aguinaldo el primer viernes de diciembre (para el período 2026, el pago se efectúa el viernes 4 de diciembre). El aguinaldo está exento del impuesto sobre la renta y de cargas sociales de la CCSS.
      `.trim(),
    },
    {
      fileId: "1CR_ReglamentoIncapacidades_CCSS_INS",
      name: "Reglamento de Incapacidades Médicas CCSS e INS.gdoc",
      mimeType: "application/vnd.google-apps.document",
      webViewLink: "https://docs.google.com/document/d/1CR_ReglamentoIncapacidades_CCSS_INS/view",
      text: `
REGLAMENTO DE INCAPACIDADES MÉDICAS, LICENCIAS CCSS E INS
TECNOLOGÍAS PURA VIDA S.A.
Código: REG-RRHH-MED-2026 | Versión: v4.0 | Vigencia: 2026-02-01

Sección 3.1 - Incapacidades por Enfermedad Común (CCSS) y Subsidio Complementario
Toda incapacidad médica debe ser emitida o validada por la Caja Costarricense de Seguro Social (CCSS) o el Instituto Nacional de Seguros (INS) y reportada en el portal dentro de las primeras 48 horas hábiles. En incapacidades por enfermedad común de la CCSS:
(1) Durante los días 1 al 3, Tecnologías Pura Vida S.A. mejora el mínimo legal y reconoce el 100% del salario como subsidio patronal los primeros 3 días (hasta dos veces por año; a partir de la tercera incapacidad en el año se paga el 50% de ley).
(2) A partir del día 4, la CCSS paga un subsidio del 60% y Tecnologías Pura Vida S.A. otorga como beneficio un subsidio patronal complementario del 40% hasta por 30 días al año para que el colaborador no vea afectado su ingreso neto.

Sección 3.3 - Licencia de Maternidad, Paternidad y Riesgos del Trabajo (INS)
Conforme al Artículo 95 del Código de Trabajo de Costa Rica:
(a) Licencia de Maternidad: 4 meses (1 mes prenatal y 3 meses postnatales), cubierta 50% por la CCSS y 50% por Tecnologías Pura Vida S.A., computándose dicho monto para el cálculo del aguinaldo y derechos laborales.
(b) Licencia de Paternidad: 2 días con goce de salario por semana durante las primeras 4 semanas posteriores al nacimiento (total 8 días hábiles), más 2 días adicionales al nacer otorgados como beneficio corporativo Pura Vida (total 10 días).
(c) Riesgos del Trabajo (INS): Cubiertos por la póliza obligatoria RT del INS desde el primer día según dictamen médico del INS.
      `.trim(),
    },
    {
      fileId: "1CR_PoliticaTeletrabajo_Hibrido",
      name: "Política de Teletrabajo Híbrido y Conectividad.gdoc",
      mimeType: "application/vnd.google-apps.document",
      webViewLink: "https://docs.google.com/document/d/1CR_PoliticaTeletrabajo_Hibrido/view",
      text: `
POLÍTICA DE TELETRABAJO HÍBRIDO Y CONECTIVIDAD
TECNOLOGÍAS PURA VIDA S.A.
Código: POL-RRHH-TEL-2026 | Versión: v2.1 | Vigencia: 2026-03-01

Sección 1.1 - Modalidad 3x2, Horario Flexible y Subsidio de Internet
Amparada en la Ley para Regular el Teletrabajo en Costa Rica (Ley N° 9738), Tecnologías Pura Vida S.A. opera bajo un esquema híbrido 3x2: 3 días de teletrabajo desde el domicilio reportado en Costa Rica y 2 días presenciales en el centro corporativo de Escazú (San José). El horario núcleo obligatorio de conexión (core hours) es de 9:00 a.m. a 4:00 p.m. (hora de Costa Rica, UTC-6), completando las 40 horas semanales. La empresa otorga un subsidio mensual no salarial de conectividad y electricidad de ₡25,000 CRC depositado en la segunda quincena y provee silla ergonómica certificada y monitor externo mediante solicitud a TI.
      `.trim(),
    },
    {
      fileId: "1CR_TablaPermisos_Beneficios_Sheet",
      name: "Matriz de Permisos Feriados y Beneficios Corporativos.gsheet",
      mimeType: "application/vnd.google-apps.spreadsheet",
      webViewLink: "https://docs.google.com/spreadsheets/d/1CR_TablaPermisos_Beneficios_Sheet/view",
      text: `
Tipo de Permiso,Días Concedidos,Remuneración,Observaciones
Matrimonio del colaborador,5 días hábiles,100% con goce de salario,A disfrutar dentro de los 15 días posteriores al matrimonio
Fallecimiento 1er grado (padres/hijos/cónyuge),5 días hábiles,100% con goce de salario,Inmediato al suceso
Fallecimiento 2do grado (hermanos/abuelos),2 días hábiles,100% con goce de salario,Inmediato al suceso
Día de cumpleaños,1 día hábil,100% con goce de salario,Disfrutable en cualquier fecha dentro del mes de nacimiento
Graduación académica,1 día hábil,100% con goce de salario,Para defensa de tesis o acto de graduación universitaria
Feriados de Pago Obligatorio Costa Rica,11 feriados oficiales al año,Remuneración completa según Art. 148 Código de Trabajo,Incluye Jueves y Viernes Santo; 11 de abril; 1 de mayo; 25 de julio; 15 de agosto; 15 de septiembre; 25 de diciembre
      `.trim(),
    },
    {
      fileId: "1CR_CodigoConducta_ReglamentoInterno",
      name: "Código de Conducta y Ética Laboral 2026.pdf",
      mimeType: "application/pdf",
      webViewLink: "https://drive.google.com/file/d/1CR_CodigoConducta_ReglamentoInterno/view",
      text: `
CÓDIGO DE CONDUCTA, CONFIDENCIALIDAD Y PREVENCIÓN DEL ACOSO
TECNOLOGÍAS PURA VIDA S.A.
Código: COD-ETI-CON-2026 | Versión: v3.0 | Vigencia: 2026-01-01

Sección 5.2 - Confidencialidad de Datos Personales y Salariales (Ley N° 8968)
En cumplimiento de la Ley de Protección de la Persona frente al Tratamiento de sus Datos Personales de Costa Rica (Ley N° 8968), toda información relativa a salarios, saldos individuales de vacaciones, expedientes médicos de incapacidades CCSS/INS y evaluaciones de desempeño es estrictamente confidencial. Ningún colaborador con rol estándar puede consultar datos personales o laborales de otros compañeros. Únicamente el personal autorizado del departamento de Recursos Humanos (rol RRHH) y las jefaturas directas dentro de sus flujos formales tienen acceso a reportes consolidados. Asimismo, rige tolerancia cero ante el hostigamiento sexual conforme a la Ley N° 7476.
      `.trim(),
    },
  ];
}
