import { Request, Response } from "express";
import { SolicitudModel } from "../models/Solicitud.model";
import { ColaboradorModel } from "../models/Colaborador.model";

export class SolicitudController {
  /**
   * GET /api/solicitudes/colaboradores
   * Obtiene la lista simplificada de colaboradores para el formulario de solicitudes.
   */
  static async listarColaboradores(req: Request, res: Response): Promise<void> {
    try {
      const list = await ColaboradorModel.getAll(100);
      const colaboradores = list.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        departamento: c.departamento,
        puesto: c.puesto,
      }));
      res.json({ success: true, colaboradores });
    } catch (error) {
      console.error("Error al listar colaboradores:", error);
      res.status(500).json({ success: false, error: "Error al obtener lista de colaboradores." });
    }
  }

  /**
   * GET /api/solicitudes
   * Obtiene la lista de solicitudes. Soporta filtro query ?estado=pendiente
   */
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      const estadoFiltro = req.query.estado as "pendiente" | "aprobada" | "rechazada" | undefined;
      const solicitudes = await SolicitudModel.getAll(estadoFiltro);

      res.json({
        success: true,
        total: solicitudes.length,
        solicitudes,
      });
    } catch (error) {
      console.error("Error al listar solicitudes:", error);
      res.status(500).json({
        success: false,
        error: "Error interno al recuperar las solicitudes.",
      });
    }
  }

  /**
   * POST /api/solicitudes
   * Crea una nueva solicitud en el portal (vacaciones, permiso, teletrabajo, etc.)
   */
  static async crear(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: "Usuario no autenticado." });
        return;
      }

      const { tipo, fechaInicio, fechaFin, colaboradorId } = req.body;

      if (!tipo || !fechaInicio || !fechaFin) {
        res.status(400).json({
          success: false,
          error: "Debe proporcionar tipo, fechaInicio y fechaFin.",
        });
        return;
      }

      // Si es RRHH puede registrar para otro colaborador, de lo contrario para sí mismo
      const targetColaboradorId =
        user.rol === "rrhh" && colaboradorId ? Number(colaboradorId) : user.id;

      const insertId = await SolicitudModel.create({
        colaboradorId: targetColaboradorId,
        tipo: String(tipo).trim(),
        fechaInicio: String(fechaInicio).trim(),
        fechaFin: String(fechaFin).trim(),
      });

      const nuevaSolicitud = await SolicitudModel.getById(insertId);

      res.status(201).json({
        success: true,
        message: "Solicitud registrada con éxito en estado pendiente de aprobación.",
        solicitud: nuevaSolicitud,
      });
    } catch (error) {
      console.error("Error al crear solicitud:", error);
      res.status(500).json({
        success: false,
        error: "Error interno al registrar la solicitud.",
      });
    }
  }

  /**
   * PATCH /api/solicitudes/:id/estado
   * Aprueba o rechaza una solicitud. Exclusivo para rol 'rrhh' o jefaturas.
   */
  static async actualizarEstado(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: "Usuario no autenticado." });
        return;
      }

      const id = Number(req.params.id);
      const { estado } = req.body;

      if (!id || isNaN(id)) {
        res.status(400).json({ success: false, error: "ID de solicitud inválido." });
        return;
      }

      if (estado !== "aprobada" && estado !== "rechazada") {
        res.status(400).json({
          success: false,
          error: "El estado debe ser exactamente 'aprobada' o 'rechazada'.",
        });
        return;
      }

      const actualizada = await SolicitudModel.updateStatus(id, estado, user.id);

      res.json({
        success: true,
        message: `Solicitud #${id} ha sido ${estado === "aprobada" ? "aprobada" : "rechazada"} con éxito por ${user.nombre}.`,
        solicitud: actualizada,
      });
    } catch (error) {
      console.error("Error al actualizar estado de solicitud:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Error al procesar la solicitud.",
      });
    }
  }
}
