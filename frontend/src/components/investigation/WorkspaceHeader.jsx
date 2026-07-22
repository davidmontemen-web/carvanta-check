import StatusBadge from "./common/StatusBadge";

function WorkspaceHeader({
  workspace,
  onBack,
}) {
  const { check, investigation } = workspace;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-6 px-6 py-4">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-semibold text-blue-600"
          >
            ← Volver al panel
          </button>

          <h1 className="mt-2 text-xl font-bold text-slate-900">
            Investigation Workstation
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            {check.folio || check.id} · {check.marca}{" "}
            {check.modelo} {check.anio}
          </p>
        </div>

        <div className="text-right">
          <StatusBadge status={investigation.status} />

          <p className="mt-2 text-xs text-slate-500">
            Responsable:{" "}
            {investigation.executive?.name || "Sin asignar"}
          </p>
        </div>
      </div>
    </header>
  );
}

export default WorkspaceHeader;
