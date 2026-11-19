import React, { useState, useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { KpiCards } from "../components/KpiCards";
import { ChartsPanel } from "../components/ChartsPanel";
import { PendingTable } from "../components/PendingTable";
import { DriveDocumentsModal } from "../components/DriveDocumentsModal";
import api from "../services/api";
import { Sparkles, Play, RefreshCw, CheckCircle, FileText } from "lucide-react";

export default function DashboardPage() {
  const [reporte, setReporte] = useState(null);
  const [historialFechas, setHistorialFechas] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [cargando, setCargando] = useState(true);
  const [ejecutandoManual, setEjecutandoManual] = useState(false);
  const [sincronizandoDrive, setSincronizandoDrive] = useState(false);
  const [modalDocsAbierto, setModalDocsAbierto] = useState(false);
  const [mensajeNotificacion, setMensajeNotificacion] = useState(null);

  // Cargar reporte inicial de hoy y lista de historial
  useEffect(() => {
    async function inicializarDashboard() {
      setCargando(true);
      try {
        const [resReporte, resHistorial] = await Promise.all([
          api.get("/reports/today"),
          api.get("/reports/history"),
        ]);

        if (resReporte.data.success && resReporte.data.reporte) {
          setReporte(resReporte.data.reporte);
          setFechaSeleccionada(resReporte.data.reporte.fecha);
        }

        if (resHistorial.data.success && resHistorial.data.historial) {
          setHistorialFechas(resHistorial.data.historial);
        }
      } catch (err) {
        console.error("Error cargando dashboard:", err);
      } finally {
        setCargando(false);
      }
    }

    inicializarDashboard();
  }, []);

  // Cambiar fecha desde el selector
  const handleCambiarFecha = async (nuevaFecha) => {
    setFechaSeleccionada(nuevaFecha);
    setCargando(true);
    try {
      const res = await api.get(`/reports/${nuevaFecha}`);
      if (res.data.success && res.data.reporte) {
        setReporte(res.data.reporte);
      }
    } catch (err) {
      console.error("Error al obtener reporte por fecha:", err);
    } finally {
      setCargando(false);
    }
  };

  // Refrescar datos del reporte actual tras aprobar o crear una solicitud
  const handleRefrescarReporte = async () => {
    try {
      const res = await api.get(`/reports/${fechaSeleccionada}`);
      if (res.data.success && res.data.reporte) {
        setReporte(res.data.reporte);
      }
    } catch (err) {
      console.error("Error al refrescar reporte:", err);
    }
  };

  // Botón: Disparar ejecución manual del Agente Analista
  const handleEjecutarReporteManual = async () => {
    setEjecutandoManual(true);
    setMensajeNotificacion(null);
    try {
      const res = await api.post("/reports/run");
      if (res.data.success) {
        const resActualizado = await api.get("/reports/today");
        if (resActualizado.data.success) {
          setReporte(resActualizado.data.reporte);
          setFechaSeleccionada(resActualizado.data.reporte.fecha);
        }
        setMensajeNotificacion("✅ Reporte analítico ejecutado y actualizado con éxito.");
      }
    } catch (err) {
      setMensajeNotificacion("❌ Error ejecutando el agente analista.");
    } finally {
      setEjecutandoManual(false);
      setTimeout(() => setMensajeNotificacion(null), 4000);
    }
  };

  // Botón: Sincronizar Google Drive (ingestionAgent)
  const handleSincronizarDrive = async () => {
    setSincronizandoDrive(true);
    setMensajeNotificacion(null);
    try {
      const res = await api.post("/ingest/sync", {});
      if (res.data.success) {
        setMensajeNotificacion(
          `✅ Ingesta completada: ${res.data.resultado.archivosProcesados} documentos (${res.data.resultado.chunksInsertados} chunks vectorizados).`
        );
      }
    } catch (err) {
      setMensajeNotificacion("❌ Error al sincronizar con Google Drive.");
    } finally {
      setSincronizandoDrive(false);
      setTimeout(() => setMensajeNotificacion(null), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Cabecera del Dashboard con acciones de agentes */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Dashboard Ejecutivo de Capital Humano
              </h1>
              <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-purple-200">
                Rol RRHH
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tecnologías Pura Vida S.A. &middot; Monitoreo laboral, ausencias y métricas multiagente
            </p>
          </div>

          {/* Botones de acción manual para RRHH */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setModalDocsAbierto(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Documentos de Políticas (6)</span>
            </button>

            <button
              onClick={handleSincronizarDrive}
              disabled={sincronizandoDrive}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 px-3 py-2 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sincronizandoDrive ? "animate-spin" : ""}`} />
              <span>{sincronizandoDrive ? "Sincronizando..." : "Sincronizar Drive (RAG)"}</span>
            </button>

            <button
              onClick={handleEjecutarReporteManual}
              disabled={ejecutandoManual}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-sm px-3.5 py-2 rounded-xl transition-all disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${ejecutandoManual ? "animate-spin" : ""}`} />
              <span>{ejecutandoManual ? "Calculando..." : "Ejecutar Reporte Ahora"}</span>
            </button>
          </div>
        </div>

        {mensajeNotificacion && (
          <div className="p-3 bg-purple-50 border border-purple-200 text-purple-900 text-xs rounded-xl flex items-center gap-2 shadow-sm animate-fade-in font-medium">
            <CheckCircle className="w-4 h-4 text-purple-600 shrink-0" />
            <span>{mensajeNotificacion}</span>
          </div>
        )}

        {/* Caja Destacada: Resumen Ejecutivo Narrado por el LLM (3 a 5 frases) */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-300 border border-blue-400/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold tracking-wide uppercase text-blue-200">
                Resumen Ejecutivo Diario &middot; analystAgent
              </h3>
            </div>
            <span className="text-[11px] text-slate-300 bg-white/10 px-2 py-0.5 rounded-full font-mono">
              Fecha: {reporte?.fecha || fechaSeleccionada}
            </span>
          </div>

          <p className="text-sm sm:text-base leading-relaxed text-slate-100 font-normal mt-3">
            {reporte?.resumen_texto ||
              "Generando el resumen analítico diario de la empresa..."}
          </p>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
            <span>Generado automáticamente a las 07:00 a.m. (node-cron en America/Costa_Rica)</span>
            <span className="font-mono text-slate-400">{reporte?.generado_por}</span>
          </div>
        </div>

        {/* 4 KPIs Clave */}
        <KpiCards datos={reporte?.datos_json} />

        {/* 2 Gráficos con Recharts */}
        <ChartsPanel datosReporte={reporte?.datos_json} />

        {/* Tabla Interactiva de Solicitudes Pendientes con Selector de Historial */}
        <PendingTable
          solicitudes={reporte?.datos_json?.solicitudesPendientes?.lista}
          historialFechas={historialFechas}
          fechaSeleccionada={fechaSeleccionada}
          onCambiarFecha={handleCambiarFecha}
          onSolicitudActualizada={handleRefrescarReporte}
        />

        {/* Modal para ver y descargar los 6 documentos normativos para Google Drive */}
        <DriveDocumentsModal
          isOpen={modalDocsAbierto}
          onClose={() => setModalDocsAbierto(false)}
          onSincronizar={handleSincronizarDrive}
        />
      </main>
    </div>
  );
}
