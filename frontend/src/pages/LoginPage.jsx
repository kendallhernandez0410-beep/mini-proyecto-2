import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Lock, Mail, ShieldCheck, UserCheck, Sparkles, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        if (res.usuario.rol === "rrhh") {
          navigate("/dashboard");
        } else {
          navigate("/chat");
        }
      } else {
        setError(res.error || "Credenciales incorrectas.");
      }
    } catch (err) {
      setError(
        err.response?.data?.error || "No fue posible conectar con el servidor backend."
      );
    } finally {
      setCargando(false);
    }
  };

  const seleccionarUsuarioDemo = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-blue-500/30 mb-3">
          PV
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Portal de RRHH &middot; Pura Vida
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          Tecnologías Pura Vida S.A. &middot; San José, Costa Rica 🇨🇷
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-100">
          {/* Selector Rápido de Usuarios Demo */}
          <div className="mb-6 p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Acceso Rápido Demo (1-Click):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  seleccionarUsuarioDemo("valeria.solis@puravida.cr", "PuraVida2026!")
                }
                className="text-left p-2.5 rounded-lg bg-white border border-blue-200 hover:border-purple-400 hover:bg-purple-50 transition-all text-xs group"
              >
                <div className="flex items-center gap-1 font-bold text-purple-900">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span>Rol RRHH</span>
                </div>
                <div className="text-[11px] text-slate-500 truncate">Valeria Solís (Directora)</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  seleccionarUsuarioDemo("esteban.vargas@puravida.cr", "PuraVida2026!")
                }
                className="text-left p-2.5 rounded-lg bg-white border border-blue-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-xs group"
              >
                <div className="flex items-center gap-1 font-bold text-emerald-900">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Colaborador</span>
                </div>
                <div className="text-[11px] text-slate-500 truncate">Esteban Vargas (Ing.)</div>
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo Electrónico Corporativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@puravida.cr"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-blue-500/25 transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {cargando ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <span>Ingresar al Portal</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-slate-100 pt-4">
            <span className="text-[11px] text-slate-400">
              Control de acceso basado en roles (RBAC) &middot; Costa Rica 2026
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
