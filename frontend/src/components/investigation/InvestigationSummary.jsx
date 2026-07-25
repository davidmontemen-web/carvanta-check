import Metric from "./common/Metric";
import { ExecutiveAlert, FieldRow, SectionCard } from "../ui";

const SEVERITY_STYLES = {
  INFO: "border-blue-200 bg-blue-50 text-blue-800",
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-800",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-900",
  HIGH: "border-orange-200 bg-orange-50 text-orange-900",
  CRITICAL: "border-red-200 bg-red-50 text-red-800",
};

function normalizeSeverity(severity) {
  return String(severity || "INFO").toUpperCase();
}

function InvestigationSummary({ workspace }) {
  const vehicle = workspace.vehicleBase || {};
  const findings = workspace.findings || [];
  const summary = workspace.summary || {};
  const artifacts = workspace.artifacts || [];

  const vehicleName = [
    vehicle.brand || workspace.check?.marca,
    vehicle.model || workspace.check?.modelo,
    vehicle.year || workspace.check?.anio,
  ].filter(Boolean).join(" ");

  return (
    <aside className="self-start space-y-4 lg:sticky lg:top-28">
      <SectionCard
        title="Identidad del vehículo"
        description="Referencia principal del expediente."
        contentClassName="py-2"
      >
        <dl>
          <FieldRow label="VIN" value={vehicle.vin || workspace.check?.vin} />
          <FieldRow label="Placas" value={vehicle.plate || workspace.check?.placas} />
          <FieldRow label="Vehículo" value={vehicleName} />
          <FieldRow label="Propietario" value={vehicle.owner} />
          <FieldRow label="Entidad" value={vehicle.state} />
        </dl>
      </SectionCard>

      <SectionCard title="Cobertura del expediente" contentClassName="p-4">
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Archivos" value={summary.artifactCount ?? artifacts.length} />
          <Metric label="Evidencias" value={summary.evidenceCount || 0} />
          <Metric label="Hallazgos" value={summary.findingCount ?? findings.length} />
        </div>
      </SectionCard>

      <SectionCard
        title="Hallazgos prioritarios"
        description="Alertas que requieren atención ejecutiva."
        contentClassName="p-4"
      >
        {findings.length === 0 ? (
          <ExecutiveAlert tone="info" title="Sin hallazgos registrados">
            Aún no existen observaciones en el expediente. Esto no equivale a un dictamen limpio hasta completar el pipeline.
          </ExecutiveAlert>
        ) : (
          <div className="space-y-3">
            {findings.slice(0, 5).map((finding, index) => {
              const severity = normalizeSeverity(finding.severity);

              return (
                <article
                  key={finding.id || `${finding.title}-${index}`}
                  className="rounded-xl border border-slate-200 p-3"
                >
                  <span className={[
                    "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    SEVERITY_STYLES[severity] || SEVERITY_STYLES.INFO,
                  ].join(" ")}
                  >
                    {severity}
                  </span>

                  <p className="mt-2 text-sm font-semibold leading-5 text-slate-900">
                    {finding.title || "Hallazgo sin título"}
                  </p>

                  {finding.description && (
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {finding.description}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    </aside>
  );
}

export default InvestigationSummary;
