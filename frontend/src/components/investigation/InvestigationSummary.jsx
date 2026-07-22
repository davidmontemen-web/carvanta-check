import Metric from "./common/Metric";
import SummaryItem from "./common/SummaryItem";

function InvestigationSummary({ workspace }) {
  const vehicle = workspace.vehicleBase || {};

  return (
    <aside className="self-start space-y-4 lg:sticky lg:top-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">
          Identidad validada
        </h2>

        <div className="mt-4 space-y-3">
          <SummaryItem
            label="VIN"
            value={vehicle.vin || workspace.check.vin}
          />

          <SummaryItem
            label="Placas"
            value={vehicle.plate || workspace.check.placas}
          />

          <SummaryItem
            label="Vehículo"
            value={[
              vehicle.brand || workspace.check.marca,
              vehicle.model || workspace.check.modelo,
              vehicle.year || workspace.check.anio,
            ]
              .filter(Boolean)
              .join(" ")}
          />

          <SummaryItem
            label="Propietario"
            value={vehicle.owner}
          />

          <SummaryItem
            label="Entidad"
            value={vehicle.state}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">
          Resumen
        </h2>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Metric
            label="Artifacts"
            value={workspace.summary.artifactCount}
          />

          <Metric
            label="Evidence"
            value={workspace.summary.evidenceCount}
          />

          <Metric
            label="Findings"
            value={workspace.summary.findingCount}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">
          Hallazgos recientes
        </h2>

        {workspace.findings.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Aún no existen hallazgos.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {workspace.findings.slice(0, 5).map((finding) => (
              <div
                key={finding.id}
                className="rounded-lg border border-slate-200 p-3"
              >
                <p className="text-xs font-bold text-slate-400">
                  {finding.severity}
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {finding.title}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}

export default InvestigationSummary;
