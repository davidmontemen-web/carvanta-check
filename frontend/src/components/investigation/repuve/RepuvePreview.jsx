import {
  ConfidenceBadge,
  ExecutiveAlert,
  FieldRow,
  RiskBadge,
  SectionCard,
  TaskStatusBadge,
} from "../../ui";

const COMPARISON_LABELS = {
  MATCH: "Coincide",
  ADDED: "Confirmado",
  MISMATCH: "No coincide",
  MISSING: "No confirmado",
};

function RepuvePreview({ repuve }) {
  const preview = repuve?.preview;

  if (!preview) {
    return (
      <SectionCard
        title="Resumen ejecutivo REPUVE"
        description="El análisis aparecerá después de guardar el resultado."
      >
        <ExecutiveAlert tone="info">
          Todavía no existe un resultado estructurado para esta consulta.
        </ExecutiveAlert>
      </SectionCard>
    );
  }

  const comparisons =
    preview.data?.comparisons || {};

  return (
    <SectionCard
      title="Resumen ejecutivo REPUVE"
      description="Interpretación automática de la evidencia capturada."
      actions={
        <div className="flex flex-wrap gap-2">
          <TaskStatusBadge status={preview.status} />
          <RiskBadge risk={preview.risk} />
          <ConfidenceBadge
            confidence={preview.confidence}
          />
        </div>
      }
    >
      <ExecutiveAlert
        tone={resolveSummaryTone(preview.risk)}
        title={preview.title || "Consulta REPUVE"}
      >
        {preview.summary}
      </ExecutiveAlert>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Cobertura"
          value={`${preview.coverage || 0}%`}
        />

        <MetricCard
          label="Hallazgos"
          value={preview.findings?.length || 0}
        />

        <MetricCard
          label="Recomendaciones"
          value={preview.recommendations?.length || 0}
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Comparación de identidad
          </h3>

          <dl className="mt-2 rounded-xl border border-slate-200 px-4">
            <FieldRow
              label="VIN"
              value={
                comparisons.vin
                  ? `${comparisons.vin.customerValue || "—"} → ${comparisons.vin.consultedValue || "—"}`
                  : ""
              }
              status={
                comparisons.vin && (
                  <ComparisonBadge
                    status={comparisons.vin.status}
                  />
                )
              }
            />

            <FieldRow
              label="Placas"
              value={
                comparisons.plate
                  ? `${comparisons.plate.customerValue || "—"} → ${comparisons.plate.consultedValue || "—"}`
                  : ""
              }
              status={
                comparisons.plate && (
                  <ComparisonBadge
                    status={comparisons.plate.status}
                  />
                )
              }
            />
          </dl>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Resultado oficial
          </h3>

          <dl className="mt-2 rounded-xl border border-slate-200 px-4">
            <FieldRow
              label="Clasificación"
              value={preview.data?.resultLabel}
            />

            <FieldRow
              label="Fecha"
              value={preview.data?.evidence?.queryDate}
            />

            <FieldRow
              label="Folio"
              value={preview.data?.evidence?.officialFolio}
            />
          </dl>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <PreviewList
          title="Hallazgos"
          items={preview.findings}
          emptyText="No se generaron hallazgos."
        />

        <PreviewList
          title="Recomendaciones"
          items={preview.recommendations}
          emptyText="No se generaron recomendaciones."
        />
      </div>
    </SectionCard>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
      <p className="text-2xl font-bold text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-500">
        {label}
      </p>
    </div>
  );
}

function ComparisonBadge({ status }) {
  const classes = {
    MATCH:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    ADDED:
      "border-blue-200 bg-blue-50 text-blue-700",
    MISMATCH:
      "border-red-200 bg-red-50 text-red-700",
    MISSING:
      "border-amber-200 bg-amber-50 text-amber-800",
  };

  return (
    <span
      className={[
        "inline-flex rounded-full border px-2 py-1 text-[10px] font-bold",
        classes[status] ||
          "border-slate-200 bg-slate-100 text-slate-700",
      ].join(" ")}
    >
      {COMPARISON_LABELS[status] || status}
    </span>
  );
}

function PreviewList({ title, items = [], emptyText }) {
  return (
    <section>
      <h3 className="text-sm font-bold text-slate-900">
        {title}
      </h3>

      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">
          {emptyText}
        </p>
      ) : (
        <div className="mt-2 space-y-3">
          {items.map((item, index) => (
            <article
              key={`${item.type || item.title}-${index}`}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                {(item.severity || item.priority) && (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                    {item.severity || item.priority}
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm font-semibold text-slate-900">
                {item.title}
              </p>

              {item.description && (
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {item.description}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function resolveSummaryTone(risk) {
  if (risk === "CRITICAL" || risk === "HIGH") {
    return "danger";
  }

  if (risk === "MEDIUM") {
    return "warning";
  }

  return "success";
}

export default RepuvePreview;
