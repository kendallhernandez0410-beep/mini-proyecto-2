import { Router } from "express";
import { ChatController } from "../controllers/chat.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

// Ambos roles ('colaborador' y 'rrhh') tienen acceso al chat
router.use(authenticateToken);

router.post("/", ChatController.enviarMensaje);
router.get("/history", ChatController.obtenerHistorial);

export default router;
