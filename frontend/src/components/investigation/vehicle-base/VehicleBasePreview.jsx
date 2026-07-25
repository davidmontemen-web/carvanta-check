import ComparisonRow from "../common/ComparisonRow";
import StatusBadge from "../common/StatusBadge";
import SummaryItem from "../common/SummaryItem";

function VehicleBasePreview({ preview }) {
  if (!preview) {
    return (
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm text-slate-500">
          Guarda la validación para generar el previo de
          identidad vehicular.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border-2 border-slate-900 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Previo del reporte
          </p>

          <h3 className="mt-2 text-2xl font-bold text-slate-900">
            {preview.title}
          </h3>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {preview.summary}
          </p>
        </div>

        <StatusBadge status={preview.status} />
      </div>

      <div className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
        <SummaryItem
          label="Cobertura"
          value={`${preview.coverage}%`}
        />

        <SummaryItem
          label="Confianza"
          value={preview.data.identityConfidence}
        />

        <SummaryItem
          label="Hallazgos"
          value={String(preview.findings.length)}
        />
      </div>

      <div className="mt-6 space-y-3">
        {preview.data.comparisons.map(
          (comparison) => (
            <ComparisonRow
              key={comparison.field}
              comparison={comparison}
            />
          )
        )}
      </div>

      {preview.findings.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h4 className="font-bold text-amber-900">
            Hallazgos de identidad
          </h4>

          <div className="mt-3 space-y-3">
            {preview.findings.map((finding) => (
              <div
                key={finding.type}
                className="rounded-lg bg-white p-4"
              >
                <p className="text-xs font-bold text-amber-700">
                  {finding.severity}
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {finding.title}
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {finding.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-5 text-xs text-slate-500">
        Esta sección confirma la identidad documental del
        vehículo. No constituye una recomendación de compra.
      </p>
    </section>
  );
}

export default VehicleBasePreview;
