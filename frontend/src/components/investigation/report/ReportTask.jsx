import Metric from "../common/Metric";

function ReportTask({
  workspace,
  loading,
  onProcess,
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="font-semibold text-slate-900">
          Estado del expediente
        </h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric
            label="Artifacts"
            value={workspace.summary.artifactCount}
          />

          <Metric
            label="Evidencias"
            value={workspace.summary.evidenceCount}
          />

          <Metric
            label="Hallazgos"
            value={workspace.summary.findingCount}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onProcess}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Procesando..."
          : workspace.report
            ? "Regenerar reporte"
            : "Ejecutar pipeline y generar reporte"}
      </button>

      {workspace.report && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h3 className="font-bold text-emerald-900">
            Reporte disponible
          </h3>

          <p className="mt-2 text-sm text-emerald-800">
            {workspace.report.summary}
          </p>

          <a
            href={`/check/${workspace.check.id}/report`}
            className="mt-4 inline-block text-sm font-bold text-emerald-900 underline"
          >
            Abrir reporte
          </a>
        </div>
      )}
    </div>
  );
}

export default ReportTask;
