import { Router } from "express";
import { IngestController } from "../controllers/ingest.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";

const router = Router();

// Exclusivo para el rol 'rrhh'
router.use(authenticateToken);
router.use(requireRole("rrhh"));

router.post("/sync", IngestController.sincronizar);
router.get("/status", IngestController.obtenerEstado);
router.get("/documentos", IngestController.obtenerDocumentos);

export default router;
