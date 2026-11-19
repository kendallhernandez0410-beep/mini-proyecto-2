import React, { useState, useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { ChatBox } from "../components/ChatBox";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Check, Info } from "lucide-react";

export default function ChatPage() {
  const { user } = useAuth();
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [alerta, setAlerta] = useState(null);

  // Cargar historial de chat previo del colaborador
  useEffect(() => {
    async function cargarHistorial() {
      try {
        const res = await api.get("/chat/history");
        if (res.data.success && res.data.historial) {
          const formateados = [];
          for (const item of res.data.historial.reverse()) {
            formateados.push({
              remitente: "usuario",
              texto: item.pregunta,
            });
            formateados.push({
              remitente: "asistente",
              texto: item.respuesta || "Respuesta registrada en bitácora.",
              agente: item.agente,
              intencion: item.intencion,
              documentosCitados: item.documentosCitados || item.documentos_citados || [],
              escalada: item.escalada,
              latenciaMs: item.latenciaMs || item.latencia_ms,
            });
          }
          if (formateados.length > 0) {
            setMensajes(formateados);
          }
        }
      } catch (err) {
        console.warn("No se pudo cargar el historial previo:", err);
      }
    }
    cargarHistorial();
  }, []);

  const handleEnviarMensaje = async (texto) => {
    // Agregar inmediatamente el mensaje del usuario al chat
    const nuevoMensajeUsuario = { remitente: "usuario", texto };
    setMensajes((prev) => [...prev, nuevoMensajeUsuario]);
    setCargando(true);

    try {
      const res = await api.post("/chat", { mensaje: texto });
      if (res.data.success) {
        const r = res.data.data;
        const nuevoMensajeAsistente = {
          remitente: "asistente",
          texto: r.respuesta,
          agente: r.agente,
          intencion: r.intencion,
          documentosCitados: r.documentosCitados || [],
          escalada: r.escalada,
          latenciaMs: r.latenciaMs,
          preguntaOriginal: texto,
        };
        setMensajes((prev) => [...prev, nuevoMensajeAsistente]);
      }
    } catch (err) {
      setMensajes((prev) => [
        ...prev,
        {
          remitente: "asistente",
          texto:
            "Lo siento, ocurrió un error temporal al conectar con los agentes de RRHH. Por favor intenta de nuevo en unos momentos.",
          agente: "orchestrator",
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  const handleEscalarRRHH = (consulta) => {
    setAlerta(
      `Caso escalado con éxito al equipo de Capital Humano para revisión manual: "${consulta.slice(0, 50)}..."`
    );
    setTimeout(() => setAlerta(null), 5000);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {alerta && (
          <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 shadow-sm animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{alerta}</span>
          </div>
        )}

        <ChatBox
          mensajes={mensajes}
          onEnviarMensaje={handleEnviarMensaje}
          cargando={cargando}
          onEscalarRRHH={handleEscalarRRHH}
        />
      </main>
    </div>
  );
}
