import { Router } from "express";
import { ReportController } from "../controllers/report.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";

const router = Router();

// Exclusivo para el rol 'rrhh'
router.use(authenticateToken);
router.use(requireRole("rrhh"));

router.get("/today", ReportController.obtenerReporteHoy);
router.get("/history", ReportController.obtenerHistorial);
router.get("/:fecha", ReportController.obtenerReportePorFecha);
router.post("/run", ReportController.ejecutarManual);

export default router;
