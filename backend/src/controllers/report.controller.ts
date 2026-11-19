import { Request, Response } from "express";
import { AnalystAgent } from "../agents/analystAgent";
import { ReporteModel } from "../models/Reporte.model";

export class ReportController {
  static async obtenerReporteHoy(req: Request, res: Response): Promise<void> {
    try {
      const hoy = new Date().toISOString().split("T")[0];
      let reporte = await ReporteModel.obtenerPorFecha(hoy);

      if (!reporte) {
        // Si aún no se ha generado a las 7am, se calcula en el momento
        await AnalystAgent.generarReporteDiario(hoy, "AnalystAgent (automático al consultar)");
        reporte = await ReporteModel.obtenerPorFecha(hoy);
      } else if (reporte.datosJson) {
        // Enriquecer con métricas de solicitudes pendientes en tiempo real
        const pendientes = await ReporteModel.getSolicitudesPendientes();
        (reporte.datosJson as any).solicitudesPendientes = {
          totalPendientes: pendientes.totalPendientes,
          pendientesMas3Dias: pendientes.pendientesMas3Dias,
          lista: pendientes.lista.slice(0, 10),
        };
      }

      res.json({
        success: true,
        reporte,
      });
    } catch (error) {
      console.error("Error al obtener reporte de hoy:", error);
      res.status(500).json({
        success: false,
        error: "Error al recuperar el reporte ejecutivo del día.",
      });
    }
  }

  static async obtenerReportePorFecha(req: Request, res: Response): Promise<void> {
    try {
      const fecha = String(req.params.fecha);
      const reporte = await ReporteModel.obtenerPorFecha(fecha);

      if (!reporte) {
        res.status(404).json({
          success: false,
          error: `No existe reporte generado para la fecha ${fecha}.`,
        });
        return;
      }

      const hoy = new Date().toISOString().split("T")[0];
      if (fecha === hoy && reporte && reporte.datosJson) {
        const pendientes = await ReporteModel.getSolicitudesPendientes();
        (reporte.datosJson as any).solicitudesPendientes = {
          totalPendientes: pendientes.totalPendientes,
          pendientesMas3Dias: pendientes.pendientesMas3Dias,
          lista: pendientes.lista.slice(0, 10),
        };
      }

      res.json({
        success: true,
        reporte,
      });
    } catch (error) {
      console.error("Error al obtener reporte por fecha:", error);
      res.status(500).json({
        success: false,
        error: "Error interno al consultar el reporte histórico.",
      });
    }
  }

  static async obtenerHistorial(req: Request, res: Response): Promise<void> {
    try {
      const historial = await ReporteModel.obtenerHistorial(30);
      res.json({
        success: true,
        historial,
      });
    } catch (error) {
      console.error("Error al obtener historial de reportes:", error);
      res.status(500).json({
        success: false,
        error: "Error al listar el historial de reportes.",
      });
    }
  }

  static async ejecutarManual(req: Request, res: Response): Promise<void> {
    try {
      const hoy = new Date().toISOString().split("T")[0];
      const resultado = await AnalystAgent.generarReporteDiario(
        hoy,
        `analystAgent (manual por ${req.user?.nombre || "RRHH"})`
      );

      res.json({
        success: true,
        message: "Reporte diario ejecutado y actualizado exitosamente.",
        resultado,
      });
    } catch (error) {
      console.error("Error al ejecutar reporte manual:", error);
      res.status(500).json({
        success: false,
        error: "Error al ejecutar el agente analista de reportes.",
      });
    }
  }
}
