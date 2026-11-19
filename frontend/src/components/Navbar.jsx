import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MessageSquare, LayoutDashboard, LogOut, ShieldCheck, User } from "lucide-react";

export function Navbar() {
  const { user, isRRHH, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo y Empresa */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
            PV
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                Tecnologías Pura Vida
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                CR 🇨🇷
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Portal de Políticas de RRHH &middot; RAG Multiagente
            </p>
          </div>
        </div>

        {/* Navegación por Rol */}
        <nav className="flex items-center gap-2">
          <Link
            to="/chat"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === "/chat"
                ? "bg-blue-50 text-blue-700 font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat de Políticas</span>
          </Link>

          {isRRHH && (
            <Link
              to="/dashboard"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === "/dashboard"
                  ? "bg-purple-50 text-purple-700 font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard RRHH</span>
            </Link>
          )}
        </nav>

        {/* Perfil del Usuario y Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-sm font-semibold text-slate-800 leading-tight">
              {user?.nombre}
            </span>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              {isRRHH ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  <ShieldCheck className="w-3 h-3" /> Rol RRHH
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <User className="w-3 h-3" /> Colaborador
                </span>
              )}
              <span className="text-[11px] text-slate-400">&middot; {user?.departamento}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
