import { Request, Response } from "express";
import { OrchestratorAgent } from "../agents/orchestrator";
import { ConsultaLogModel } from "../models/ConsultaLog.model";

export class ChatController {
  static async enviarMensaje(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: "Usuario no autenticado." });
        return;
      }

      const { mensaje } = req.body;
      if (!mensaje || typeof mensaje !== "string" || mensaje.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: "Debe enviar un mensaje de texto no vacío.",
        });
        return;
      }

      // Procesar a través del Agente Orquestador
      const resultado = await OrchestratorAgent.procesarMensaje(user, mensaje.trim());

      // Registrar la consulta en la tabla consultas_chat para auditoría y métricas
      try {
        await ConsultaLogModel.crearLog({
          colaborador_id: user.id,
          pregunta: mensaje.trim(),
          intencion: resultado.intencion,
          agente: resultado.agente,
          documentos_citados: resultado.documentosCitados,
          resuelta: resultado.resuelta,
          escalada: resultado.escalada,
          latencia_ms: resultado.latenciaMs,
        });
      } catch (logErr) {
        console.error("Error registrando consulta en consultas_chat:", logErr);
      }

      res.json({
        success: true,
        data: resultado,
      });
    } catch (error) {
      console.error("Error en chat.controller:", error);
      res.status(500).json({
        success: false,
        error: "Error interno al procesar la consulta multiagente.",
      });
    }
  }

  static async obtenerHistorial(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: "Usuario no autenticado." });
        return;
      }

      const historial = await ConsultaLogModel.getHistorialReciente(user.id, 25);
      res.json({
        success: true,
        historial,
      });
    } catch (error) {
      console.error("Error obteniendo historial:", error);
      res.status(500).json({
        success: false,
        error: "Error al recuperar el historial de consultas.",
      });
    }
  }
}
