import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Copy,
  Check,
  ExternalLink,
  Folder,
  X,
  FileCheck,
  RefreshCw,
  Info,
} from "lucide-react";
import api from "../services/api";

export function DriveDocumentsModal({ isOpen, onClose, onSincronizar }) {
  const [documentos, setDocumentos] = useState([]);
  const [folderUrl, setFolderUrl] = useState(
    "https://drive.google.com/drive/folders/1TuHwfL-hAWU8zShyN07E1mnm6-ggJYlH"
  );
  const [serviceAccountEmail, setServiceAccountEmail] = useState(
    "portal-rrhh@gen-lang-client-0909376040.iam.gserviceaccount.com"
  );
  const [copiadoId, setCopiadoId] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      cargarDocumentos();
    }
  }, [isOpen]);

  const cargarDocumentos = async () => {
    setCargando(true);
    try {
      const res = await api.get("/ingest/documentos");
      if (res.data.success) {
        setDocumentos(res.data.documentos);
        if (res.data.folderUrl) setFolderUrl(res.data.folderUrl);
        if (res.data.serviceAccountEmail) setServiceAccountEmail(res.data.serviceAccountEmail);
      }
    } catch (err) {
      console.error("Error al cargar documentos:", err);
    } finally {
      setCargando(false);
    }
  };

  const handleDescargar = (doc) => {
    const filename = doc.name.replace(/\.(gdoc|gsheet|pdf)$/i, ".txt");
    const blob = new Blob([doc.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopiarTexto = (doc) => {
    navigator.clipboard.writeText(doc.text);
    setCopiadoId(doc.fileId);
    setTimeout(() => setCopiadoId(null), 2500);
  };

  const handleDescargarTodos = () => {
    documentos.forEach((doc, idx) => {
      setTimeout(() => {
        handleDescargar(doc);
      }, idx * 300);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Documentos Normativos de RRHH para Google Drive
              </h3>
              <p className="text-xs text-slate-500">
                Descarga estos 6 archivos o copia su texto para subirlos a tu carpeta de Drive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra Informativa de Conexión */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-4 text-xs text-slate-700 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-slate-900">Carpeta de Google Drive conectada: </span>
              <code className="bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-700 font-mono text-[11px]">
                1TuHwfL-hAWU8zShyN07E1mnm6-ggJYlH
              </code>
            </div>
            <a
              href={folderUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-800 bg-white px-3 py-1.5 rounded-lg border border-blue-300 shadow-2xs transition-colors shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir mi Carpeta en Drive</span>
            </a>
          </div>

          <div className="text-[11px] text-slate-600 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <span>
              Asegúrate de que la carpeta esté compartida con rol <strong>Lector</strong> para:{" "}
              <code className="font-mono text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {serviceAccountEmail}
              </code>
            </span>
          </div>
        </div>

        {/* Contenido / Lista de Documentos */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              6 Políticas Listas para Sincronizar ({documentos.length} disponibles)
            </h4>
            <button
              onClick={handleDescargarTodos}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar los 6 Archivos (.txt)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {documentos.map((doc, idx) => {
              const esCopiado = copiadoId === doc.fileId;

              return (
                <div
                  key={doc.fileId || idx}
                  className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <h5 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
                          {doc.name.replace(/\.(gdoc|gsheet|pdf)$/i, "")}
                        </h5>
                      </div>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                        {doc.mimeType.includes("pdf")
                          ? "PDF"
                          : doc.mimeType.includes("spreadsheet")
                          ? "CSV"
                          : "DOC"}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed mb-3 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {doc.text.slice(0, 160)}...
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleCopiarTexto(doc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                      title="Copiar texto al portapapeles"
                    >
                      {esCopiado ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDescargar(doc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                      title="Descargar archivo .txt para subir a Drive"
                    >
                      <Download className="w-3 h-3 text-blue-600" />
                      <span>Descargar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pie del modal con botón de sincronizar */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Una vez subidos los archivos a Google Drive, presiona sincronizar para que los agentes los indexen.
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onSincronizar) onSincronizar();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sincronizar Drive Ahora</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
