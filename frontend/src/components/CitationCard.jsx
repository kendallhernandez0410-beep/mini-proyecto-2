import React from "react";
import { FileText, ExternalLink, Bookmark } from "lucide-react";

export function CitationCard({ cita }) {
  if (!cita) return null;

  const simPct = cita.similitud ? Math.round(cita.similitud * 100) : null;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 hover:border-blue-300 transition-all shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-slate-900 truncate">
          <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="truncate">{cita.titulo}</span>
        </div>
        {cita.version && (
          <span className="shrink-0 bg-blue-100 text-blue-800 font-mono text-[10px] px-1.5 py-0.5 rounded border border-blue-200">
            {cita.version}
          </span>
        )}
      </div>

      <div className="mt-1 flex items-center gap-1 text-slate-600 text-[11px]">
        <Bookmark className="w-3 h-3 text-amber-500 shrink-0" />
        <span className="truncate">{cita.seccion}</span>
      </div>

      <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200/70">
        {simPct !== null ? (
          <span className="text-[10px] text-slate-500">
            Similitud semántica: <strong className="text-slate-700">{simPct}%</strong>
          </span>
        ) : (
          <span className="text-[10px] text-slate-400">Fuente oficial</span>
        )}

        {cita.enlace_drive && (
          <a
            href={cita.enlace_drive}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-medium text-[11px]"
          >
            Ver en Drive
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
