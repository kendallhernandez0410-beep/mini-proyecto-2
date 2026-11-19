import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes";
import chatRoutes from "./routes/chat.routes";
import reportsRoutes from "./routes/reports.routes";
import ingestRoutes from "./routes/ingest.routes";
import solicitudRoutes from "./routes/solicitud.routes";
import { initDailyReportCron } from "./jobs/dailyReport.cron";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

// Middlewares globales
app.use(
  cors({
    origin: [CORS_ORIGIN, "http://localhost:3000", "http://127.0.0.1:5173"],
    credentials: true,
  })
);
app.use(express.json());

// Verificación de estado del servidor (Health Check)
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "Portal RRHH RAG Multiagente API",
    empresa: "Tecnologías Pura Vida S.A. (Costa Rica)",
    time: new Date().toISOString(),
  });
});

// Rutas de la API REST
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/ingest", ingestRoutes);
app.use("/api/solicitudes", solicitudRoutes);

// Iniciar tarea programada diaria (7:00 a.m.)
initDailyReportCron();

// Iniciar servidor Express
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 SERVIDOR BACKEND ACTIVO EN PUERTO: ${PORT}`);
  console.log(`🏢 Empresa: Tecnologías Pura Vida S.A. (Costa Rica)`);
  console.log(`📡 URL API: http://localhost:${PORT}/api`);
  console.log(`🛡️ CORS Habilitado para: ${CORS_ORIGIN}`);
  console.log(`=======================================================`);
});

export default app;
