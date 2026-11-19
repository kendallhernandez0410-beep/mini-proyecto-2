import cron from "node-cron";
import { AnalystAgent } from "../agents/analystAgent";
import dotenv from "dotenv";

dotenv.config();

const CRON_SCHEDULE = process.env.REPORT_CRON_SCHEDULE || "0 7 * * *";
const CRON_TIMEZONE = process.env.REPORT_CRON_TIMEZONE || "America/Costa_Rica";

/**
 * Inicializa la tarea programada diaria para el Agente Analista de RRHH.
 */
export function initDailyReportCron() {
  console.log(
    `⏰ Configurando Cron Job del Agente Analista (${CRON_SCHEDULE} en ${CRON_TIMEZONE})...`
  );

  cron.schedule(
    CRON_SCHEDULE,
    async () => {
      console.log("🌅 [CRON 07:00 AM] Ejecutando generación automática de reporte ejecutivo diario...");
      try {
        const hoy = new Date().toISOString().split("T")[0];
        const resultado = await AnalystAgent.generarReporteDiario(
          hoy,
          "analystAgent (cron automático 07:00 AM)"
        );
        console.log(`✅ [CRON] Reporte #${resultado.id} generado exitosamente.`);
      } catch (error) {
        console.error("❌ [CRON] Error generando reporte diario programado:", error);
      }
    },
    {
      timezone: CRON_TIMEZONE,
    }
  );
}

if (require.main === module) {
  initDailyReportCron();
  console.log("Cron Job iniciado en modo standalone. Presione Ctrl+C para detener.");
}
