import { Router } from "express";
import { SolicitudController } from "../controllers/solicitud.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";

const router = Router();

// GET /api/solicitudes/colaboradores - Lista de colaboradores para selección
router.get("/colaboradores", authenticateToken, SolicitudController.listarColaboradores);

// GET /api/solicitudes - Listar solicitudes (todas o por estado)
router.get("/", authenticateToken, SolicitudController.listar);

// POST /api/solicitudes - Registrar una nueva solicitud (vacaciones, permisos, teletrabajo)
router.post("/", authenticateToken, SolicitudController.crear);

// PATCH /api/solicitudes/:id/estado - Aprobar o Rechazar una solicitud (Rol RRHH)
router.patch("/:id/estado", authenticateToken, requireRole("rrhh"), SolicitudController.actualizarEstado);

export default router;
