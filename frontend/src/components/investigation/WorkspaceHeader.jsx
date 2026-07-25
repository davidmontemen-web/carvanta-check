import { TaskStatusBadge } from "../ui";

function WorkspaceHeader({ workspace, onBack, onRefresh, actionLoading = false }) {
  const { check, investigation } = workspace;
  const vehicleName = [check?.marca, check?.modelo, check?.anio].filter(Boolean).join(" ");

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-blue-600 transition hover:text-blue-700"
          >
            <span aria-hidden="true">←</span>
            Volver al panel
          </button>

          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
                Executive Workspace
              </p>
              <span className="text-xs text-slate-300">/</span>
              <p className="text-xs font-semibold text-slate-500">
                {check?.folio || check?.id || investigation?.id}
              </p>
            </div>

            <h1 className="mt-1 truncate text-xl font-black text-slate-950 sm:text-2xl">
              {vehicleName || "Expediente vehicular"}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Investigación documental, evidencia y dictamen ejecutivo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <button
            type="button"
            onClick={onRefresh}
            disabled={actionLoading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {actionLoading ? "Actualizando…" : "Actualizar"}
          </button>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Responsable
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {investigation?.executive?.name || "Sin asignar"}
            </p>
          </div>

          <TaskStatusBadge
            status={investigation?.status}
            label={investigation?.status || "Sin estado"}
            className="px-3 py-2"
          />
        </div>
      </div>
    </header>
  );
}

export default WorkspaceHeader;
