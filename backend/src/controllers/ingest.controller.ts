import { Request, Response } from "express";
import { IngestionAgent } from "../agents/ingestionAgent";
import { DocumentoModel } from "../models/Documento.model";
import { getMockDriveDocuments } from "../config/googleDrive";

export class IngestController {
  static async obtenerDocumentos(req: Request, res: Response): Promise<void> {
    try {
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || "1TuHwfL-hAWU8zShyN07E1mnm6-ggJYlH";
      const docs = getMockDriveDocuments().map((d) => ({
        fileId: d.fileId,
        name: d.name,
        mimeType: d.mimeType,
        webViewLink: d.webViewLink,
        text: d.text,
      }));

      res.json({
        success: true,
        folderId,
        folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
        serviceAccountEmail:
          process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
          "portal-rrhh@gen-lang-client-0909376040.iam.gserviceaccount.com",
        documentos: docs,
      });
    } catch (error) {
      console.error("Error obteniendo documentos:", error);
      res.status(500).json({
        success: false,
        error: "Error al recuperar documentos normativos.",
      });
    }
  }

  static async sincronizar(req: Request, res: Response): Promise<void> {
    try {
      const { folderId } = req.body;
      const resultado = await IngestionAgent.syncDocuments(folderId);

      res.json({
        success: true,
        message: "Sincronización documental e indexación vectorial completada.",
        resultado,
      });
    } catch (error) {
      console.error("Error en sincronización documental:", error);
      res.status(500).json({
        success: false,
        error: "Error al sincronizar con Google Drive y vectorizar documentos.",
      });
    }
  }

  static async obtenerEstado(req: Request, res: Response): Promise<void> {
    try {
      const totalChunks = await DocumentoModel.countAll();
      res.json({
        success: true,
        totalChunks,
        driveConfigurado: Boolean(
          process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
          process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
        ),
      });
    } catch (error) {
      console.error("Error consultando estado de ingesta:", error);
      res.status(500).json({
        success: false,
        error: "Error consultando estado de documentos vectorizados.",
      });
    }
  }
}
