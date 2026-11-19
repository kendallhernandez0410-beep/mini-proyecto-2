import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Clock, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";
import { CitationCard } from "./CitationCard";

export function ChatBox({ mensajes, onEnviarMensaje, cargando, onEscalarRRHH }) {
  const [inputTexto, setInputTexto] = useState("");
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputTexto.trim() || cargando) return;
    onEnviarMensaje(inputTexto.trim());
    setInputTexto("");
  };

  const sugerencias = [
    "¿Cuántos días de vacaciones disponibles tengo en mi saldo?",
    "¿Cuándo depositan el aguinaldo según la ley de Costa Rica?",
    "¿Cuál es el subsidio en teletrabajo y cuántos días se va a Escazú?",
    "Si me incapacita la CCSS 5 días, ¿cuánto me subsidia la empresa?",
    "¿Cuántos días de vacaciones tiene mi compañero Juan?", // Prueba de restricción
    "¿Tienen bono mensual por adopción de mascotas?", // Prueba de brecha / escalar
  ];

  const getAgentBadge = (agente) => {
    switch (agente) {
      case "policyAgent":
        return { label: "Policy Agent (RAG)", color: "bg-blue-100 text-blue-800 border-blue-200" };
      case "dataAgent":
        return { label: "Data Agent (SQL)", color: "bg-emerald-100 text-emerald-800 border-emerald-200" };
      case "policyAgent+dataAgent":
        return { label: "RAG + Data Specialist", color: "bg-indigo-100 text-indigo-800 border-indigo-200" };
      case "orchestrator":
        return { label: "Orchestrator Security Guard", color: "bg-amber-100 text-amber-800 border-amber-200" };
      default:
        return { label: "Multiagente", color: "bg-slate-100 text-slate-800 border-slate-200" };
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Área de mensajes con scroll */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {mensajes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-8">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 border border-blue-100 shadow-inner">
              <Bot className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Portal de Políticas de RRHH &middot; Asistente Multiagente
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Pregúntame sobre la normativa laboral de Costa Rica, beneficios de la empresa, teletrabajo, o consulta tu saldo personal de vacaciones y solicitudes.
            </p>

            <div className="w-full text-left">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                Consultas sugeridas para probar el sistema:
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {sugerencias.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => onEnviarMensaje(sug)}
                    className="text-left text-xs text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 rounded-lg px-3 py-2 transition-all flex items-center justify-between group"
                  >
                    <span>{sug}</span>
                    <Sparkles className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          mensajes.map((msg, index) => {
            const esUsuario = msg.remitente === "usuario";
            const badge = msg.agente ? getAgentBadge(msg.agente) : null;

            return (
              <div
                key={index}
                className={`flex gap-3 max-w-3xl ${
                  esUsuario ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-medium text-xs shadow-sm ${
                    esUsuario
                      ? "bg-slate-700"
                      : "bg-gradient-to-tr from-blue-600 to-indigo-600"
                  }`}
                >
                  {esUsuario ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Contenido del mensaje */}
                <div className={`space-y-2 max-w-[85%] ${esUsuario ? "text-right" : "text-left"}`}>
                  {/* Badge de Agente y Latencia */}
                  {!esUsuario && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-1 text-[11px]">
                      {badge && (
                        <span
                          className={`px-2 py-0.5 rounded-full font-medium border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      )}
                      {msg.latenciaMs && (
                        <span className="flex items-center gap-1 text-slate-400 font-mono text-[10px]">
                          <Clock className="w-3 h-3" />
                          {msg.latenciaMs} ms
                        </span>
                      )}
                    </div>
                  )}

                  {/* Burbuja de texto */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line shadow-sm ${
                      esUsuario
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                    }`}
                  >
                    {msg.texto}
                  </div>

                  {/* Citas a Google Drive */}
                  {!esUsuario && msg.documentosCitados && msg.documentosCitados.length > 0 && (
                    <div className="pt-1 space-y-1.5 text-left">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Citas normativas verificadas en Google Drive:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.documentosCitados.map((cita, cIdx) => (
                          <CitationCard key={cIdx} cita={cita} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botón de Escalar a RRHH si no se encontró en las políticas */}
                  {!esUsuario && msg.escalada && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-left">
                      <div className="flex items-center gap-2 text-xs text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Esta consulta no tiene respuesta en las políticas publicadas.</span>
                      </div>
                      <button
                        onClick={() => onEscalarRRHH(msg.preguntaOriginal || msg.texto)}
                        className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                      >
                        Escalar caso a RRHH
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Indicador de escritura */}
        {cargando && (
          <div className="flex gap-3 max-w-xl mr-auto">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]"></span>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Consultando políticas y datos del colaborador...
              </span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input de consulta */}
      <div className="border-t border-slate-200 p-3 sm:p-4 bg-slate-50">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={inputTexto}
            onChange={(e) => setInputTexto(e.target.value)}
            disabled={cargando}
            placeholder="Escribe tu consulta sobre políticas de RRHH, vacaciones, aguinaldo o permisos..."
            className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!inputTexto.trim() || cargando}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
