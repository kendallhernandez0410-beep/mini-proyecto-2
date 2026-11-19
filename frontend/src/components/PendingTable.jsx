import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  Plus,
  Check,
  X,
  Loader2,
  User,
  FilePlus,
  RefreshCw,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export function PendingTable({
  solicitudes = [],
  historialFechas = [],
  fechaSeleccionada,
  onCambiarFecha,
  onSolicitudActualizada,
}) {
  const { user, isRRHH } = useAuth();
  const [lista, setLista] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("todos"); // "todos" | "pendiente" | "aprobada" | "rechazada"
  const [procesandoId, setProcesandoId] = useState(null);
  const [mensajeToast, setMensajeToast] = useState(null);

  const hoy = new Date().toISOString().split("T")[0];
  const esFechaHoy = !fechaSeleccionada || fechaSeleccionada === hoy;

  // Estados del modal de nueva solicitud
  const [modalAbierto, setModalAbierto] = useState(false);
  const [colaboradores, setColaboradores] = useState([]);
  const [guardandoNueva, setGuardandoNueva] = useState(false);
  const [formulario, setFormulario] = useState({
    colaboradorId: user?.id || "",
    tipo: "vacaciones",
    fechaInicio: new Date().toISOString().split("T")[0],
    fechaFin: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
  });

  // Función para cargar solicitudes en tiempo real desde la API
  const cargarSolicitudesEnVivo = async () => {
    setCargandoLista(true);
    try {
      const res = await api.get("/solicitudes");
      if (res.data.success && Array.isArray(res.data.solicitudes)) {
        setLista(res.data.solicitudes);
      }
    } catch (err) {
      console.error("Error al cargar solicitudes en vivo:", err);
    } finally {
      setCargandoLista(false);
    }
  };

  // Cargar solicitudes al montar o al cambiar la fecha seleccionada
  useEffect(() => {
    if (esFechaHoy) {
      cargarSolicitudesEnVivo();
    } else if (solicitudes && solicitudes.length > 0) {
      setLista(solicitudes);
    } else {
      setLista([]);
    }
  }, [fechaSeleccionada, esFechaHoy]);

  // Si cambian las props de solicitudes para un día histórico, sincronizar
  useEffect(() => {
    if (!esFechaHoy && solicitudes) {
      setLista(solicitudes);
    }
  }, [solicitudes, esFechaHoy]);

  // Cargar lista de colaboradores para el modal si es RRHH
  useEffect(() => {
    async function cargarColaboradores() {
      try {
        const res = await api.get("/solicitudes/colaboradores");
        if (res.data.success && res.data.colaboradores) {
          setColaboradores(res.data.colaboradores);
          if (!formulario.colaboradorId && res.data.colaboradores.length > 0) {
            setFormulario((prev) => ({
              ...prev,
              colaboradorId: user?.id || res.data.colaboradores[0].id,
            }));
          }
        }
      } catch (err) {
        console.error("Error al cargar colaboradores:", err);
      }
    }

    if (modalAbierto && colaboradores.length === 0) {
      cargarColaboradores();
    }
  }, [modalAbierto]);

  // Acción: Aprobar o Rechazar Solicitud
  const handleCambiarEstado = async (id, nuevoEstado) => {
    setProcesandoId(id);
    try {
      const res = await api.patch(`/solicitudes/${id}/estado`, { estado: nuevoEstado });
      if (res.data.success) {
        setMensajeToast({
          tipo: nuevoEstado === "aprobada" ? "success" : "warning",
          texto: `✅ Solicitud #${id} ha sido ${nuevoEstado === "aprobada" ? "APROBADA" : "RECHAZADA"} exitosamente.`,
        });

        // Recargar en vivo desde la base de datos
        await cargarSolicitudesEnVivo();

        if (onSolicitudActualizada) {
          onSolicitudActualizada();
        }
      }
    } catch (err) {
      console.error("Error al actualizar solicitud:", err);
      setMensajeToast({
        tipo: "error",
        texto: "❌ Error al procesar la solicitud. Revisa tus permisos de RRHH.",
      });
    } finally {
      setProcesandoId(null);
      setTimeout(() => setMensajeToast(null), 4500);
    }
  };

  // Crear Nueva Solicitud
  const handleCrearSolicitud = async (e) => {
    e.preventDefault();
    setGuardandoNueva(true);
    try {
      const res = await api.post("/solicitudes", {
        colaboradorId: formulario.colaboradorId || user?.id,
        tipo: formulario.tipo,
        fechaInicio: formulario.fechaInicio,
        fechaFin: formulario.fechaFin,
      });

      if (res.data.success && res.data.solicitud) {
        setModalAbierto(false);

        // Resetear formulario a valores por defecto
        setFormulario({
          colaboradorId: user?.id || (colaboradores[0]?.id || ""),
          tipo: "vacaciones",
          fechaInicio: new Date().toISOString().split("T")[0],
          fechaFin: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
        });

        setMensajeToast({
          tipo: "success",
          texto: `🎉 Nueva solicitud de ${res.data.solicitud.tipo.replace(/_/g, " ")} registrada con éxito (#${res.data.solicitud.id}).`,
        });

        // Recargar inmediatamente de la base de datos para que aparezca visible
        await cargarSolicitudesEnVivo();

        if (onSolicitudActualizada) {
          onSolicitudActualizada();
        }
      }
    } catch (err) {
      console.error("Error al registrar solicitud:", err);
      setMensajeToast({
        tipo: "error",
        texto: "❌ Error al registrar la nueva solicitud.",
      });
    } finally {
      setGuardandoNueva(false);
      setTimeout(() => setMensajeToast(null), 4500);
    }
  };

  // Filtrar lista según pestaña seleccionada
  const itemsFiltrados = lista.filter((sol) => {
    if (filtroEstado === "todos") return true;
    const est = sol.estado || "pendiente";
    return est === filtroEstado;
  });

  const conteoPendientes = lista.filter((s) => s.estado === "pendiente" || !s.estado).length;
  const conteoAprobadas = lista.filter((s) => s.estado === "aprobada").length;
  const conteoRechazadas = lista.filter((s) => s.estado === "rechazada").length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Toast de Notificación */}
      {mensajeToast && (
        <div
          className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between border-b transition-all ${
            mensajeToast.tipo === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : mensajeToast.tipo === "warning"
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{mensajeToast.texto}</span>
          <button
            onClick={() => setMensajeToast(null)}
            className="text-slate-400 hover:text-slate-700 ml-4 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Cabecera con selector de historial y botón Nueva Solicitud */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900">
              Gestión de Solicitudes y Aprobaciones
            </h4>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
              {conteoPendientes} pendientes
            </span>
            {esFechaHoy && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                En vivo
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Aprueba o rechaza solicitudes de colaboradores o registra un nuevo trámite
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botón: Refrescar lista */}
          <button
            type="button"
            onClick={cargarSolicitudesEnVivo}
            disabled={cargandoLista}
            title="Sincronizar solicitudes con la base de datos"
            className="p-1.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargandoLista ? "animate-spin text-indigo-600" : ""}`} />
          </button>

          {/* Botón: Nueva Solicitud */}
          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Solicitud</span>
          </button>

          {/* Selector de Historial */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={fechaSeleccionada}
              onChange={(e) => onCambiarFecha(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
            >
              {historialFechas && historialFechas.length > 0 ? (
                historialFechas.map((rep) => (
                  <option key={rep.fecha} value={rep.fecha}>
                    Reporte del {rep.fecha}
                  </option>
                ))
              ) : (
                <option value={fechaSeleccionada}>Hoy ({fechaSeleccionada})</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Pestañas de filtro por estado */}
      <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFiltroEstado("todos")}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              filtroEstado === "todos"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Todas ({lista.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado("pendiente")}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              filtroEstado === "pendiente"
                ? "bg-white text-amber-700 shadow-xs border border-amber-200 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pendientes ({conteoPendientes})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado("aprobada")}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              filtroEstado === "aprobada"
                ? "bg-white text-emerald-700 shadow-xs border border-emerald-200 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Aprobadas ({conteoAprobadas})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado("rechazada")}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              filtroEstado === "rechazada"
                ? "bg-white text-rose-700 shadow-xs border border-rose-200 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Rechazadas ({conteoRechazadas})
          </button>
        </div>

        <span className="text-[11px] text-slate-500">
          Mostrando {itemsFiltrados.length} de {lista.length} solicitudes
        </span>
      </div>

      {/* Tabla de Solicitudes */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-4 py-3 font-semibold">Colaborador</th>
              <th className="px-4 py-3 font-semibold">Departamento</th>
              <th className="px-4 py-3 font-semibold">Tipo Trámite</th>
              <th className="px-4 py-3 font-semibold">Período Solicitado</th>
              <th className="px-4 py-3 font-semibold text-center">Tiempo Espera</th>
              <th className="px-4 py-3 font-semibold text-center">Estado / SLA</th>
              <th className="px-4 py-3 font-semibold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {itemsFiltrados && itemsFiltrados.length > 0 ? (
              itemsFiltrados.map((sol) => {
                const diasEspera = sol.dias_espera || 0;
                const alertaSla = diasEspera > 3;
                const estadoActual = sol.estado || "pendiente";
                const procesando = procesandoId === sol.id;

                return (
                  <tr key={sol.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        {sol.colaborador_nombre}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{sol.departamento}</td>
                    <td className="px-4 py-3">
                      <span className="capitalize bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium border border-slate-200">
                        {sol.tipo.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                      {sol.fecha_inicio} al {sol.fecha_fin}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">
                      {diasEspera} {diasEspera === 1 ? "día" : "días"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {estadoActual === "aprobada" ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Aprobada
                        </span>
                      ) : estadoActual === "rechazada" ? (
                        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded-full border border-rose-200 text-[10px]">
                          <XCircle className="w-3 h-3 text-rose-600" /> Rechazada
                        </span>
                      ) : alertaSla ? (
                        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded-full border border-rose-200 text-[10px]">
                          <AlertCircle className="w-3 h-3" /> &gt;3 días (Vencido)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 font-medium px-2 py-0.5 rounded-full border border-amber-200 text-[10px]">
                          <Clock className="w-3 h-3" /> Pendiente
                        </span>
                      )}
                    </td>

                    {/* Botones de Aprobar y Rechazar */}
                    <td className="px-4 py-3 text-center">
                      {estadoActual === "pendiente" ? (
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Botón Aprobar */}
                          <button
                            type="button"
                            disabled={procesando}
                            onClick={() => handleCambiarEstado(sol.id, "aprobada")}
                            title="Aprobar solicitud"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs text-[11px]"
                          >
                            {procesando ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3 stroke-[2.5]" />
                            )}
                            <span>Aprobar</span>
                          </button>

                          {/* Botón Rechazar */}
                          <button
                            type="button"
                            disabled={procesando}
                            onClick={() => handleCambiarEstado(sol.id, "rechazada")}
                            title="Rechazar solicitud"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-rose-700 hover:bg-rose-50 hover:text-rose-800 border border-slate-200 hover:border-rose-300 font-semibold disabled:opacity-50 transition-colors text-[11px]"
                          >
                            <X className="w-3 h-3 stroke-[2.5]" />
                            <span>Rechazar</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Procesada
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <CheckCircle className="w-8 h-8 mb-2 text-emerald-500" />
                    <p className="font-semibold text-slate-700 text-xs">
                      {lista.length === 0
                        ? "No hay solicitudes registradas en la base de datos."
                        : `No hay solicitudes en estado "${filtroEstado}".`}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                      {lista.length === 0
                        ? "Haz clic en '+ Nueva Solicitud' arriba para registrar una solicitud de vacaciones, permiso o teletrabajo."
                        : "Cambia la pestaña de filtro a 'Todas' para ver las demás solicitudes."}
                    </p>
                    {lista.length === 0 && (
                      <button
                        type="button"
                        onClick={() => setModalAbierto(true)}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Crear Primera Solicitud</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Registrar Nueva Solicitud */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera del modal */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200">
                  <FilePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Nueva Solicitud de Trámite de RRHH
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registra una solicitud de vacaciones, permiso o teletrabajo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleCrearSolicitud} className="p-6 space-y-4">
              {/* Selección de Colaborador */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Colaborador Solicitante:
                </label>
                {isRRHH && colaboradores.length > 0 ? (
                  <select
                    value={formulario.colaboradorId}
                    onChange={(e) =>
                      setFormulario({ ...formulario, colaboradorId: e.target.value })
                    }
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {colaboradores.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} — {c.puesto} ({c.departamento})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-800 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <span>{user?.nombre || "Usuario actual"} ({user?.departamento || "Colaborador"})</span>
                  </div>
                )}
              </div>

              {/* Tipo de Trámite */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo de Trámite:
                </label>
                <select
                  value={formulario.tipo}
                  onChange={(e) =>
                    setFormulario({ ...formulario, tipo: e.target.value })
                  }
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="vacaciones">🏖️ Vacaciones Remuneradas</option>
                  <option value="permiso_con_goce">📝 Permiso con Goce de Salario (Matrimonio/Paternidad)</option>
                  <option value="permiso_sin_goce">📋 Permiso sin Goce de Salario</option>
                  <option value="teletrabajo_excepcional">💻 Teletrabajo Excepcional</option>
                  <option value="asuntos_medicos">🏥 Cita Médica / Trámite CCSS</option>
                </select>
              </div>

              {/* Rango de Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha de Inicio:
                  </label>
                  <input
                    type="date"
                    required
                    value={formulario.fechaInicio}
                    onChange={(e) =>
                      setFormulario({ ...formulario, fechaInicio: e.target.value })
                    }
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha de Fin:
                  </label>
                  <input
                    type="date"
                    required
                    value={formulario.fechaFin}
                    onChange={(e) =>
                      setFormulario({ ...formulario, fechaFin: e.target.value })
                    }
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-[11px] text-blue-800 leading-relaxed">
                ℹ️ Toda solicitud queda registrada en estado <strong>Pendiente</strong>. Si se aprueba una solicitud de vacaciones, los días hábiles se deducirán automáticamente del saldo del colaborador según la normativa interna v3.2.
              </div>

              {/* Botones de acción */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoNueva}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition-all"
                >
                  {guardandoNueva ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Registrar Solicitud</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
