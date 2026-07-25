import { ConfidenceBadge, RiskBadge, SectionCard } from "../ui";

const SOURCE_CATALOG = [
  { key: "VEHICLE_VALIDATION", label: "Identidad", short: "Base" },
  { key: "REPUVE", label: "REPUVE", short: "RPV" },
  { key: "SAT_FACTURA", label: "Factura / SAT", short: "SAT" },
  { key: "ADEUDOS", label: "Adeudos", short: "AD" },
  { key: "MULTAS", label: "Multas", short: "MT" },
  { key: "RAPI", label: "RAPI", short: "RA" },
  { key: "TRANSUNION", label: "Gravámenes", short: "TU" },
];

const STATUS_CONFIG = {
  COMPLETED: {
    label: "Validada",
    dot: "bg-emerald-500",
    card: "border-emerald-200 bg-emerald-50/60",
    text: "text-emerald-800",
  },
  IN_PROGRESS: {
    label: "En proceso",
    dot: "bg-blue-500",
    card: "border-blue-200 bg-blue-50/60",
    text: "text-blue-800",
  },
  NEEDS_REVIEW: {
    label: "Revisión",
    dot: "bg-amber-500",
    card: "border-amber-200 bg-amber-50/70",
    text: "text-amber-900",
  },
  PENDING: {
    label: "Pendiente",
    dot: "bg-slate-300",
    card: "border-slate-200 bg-slate-50",
    text: "text-slate-600",
  },
};

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function normalizeLevel(value, fallback = "UNKNOWN") {
  const normalized = String(value || fallback).toUpperCase();
  return ["LOW", "MEDIUM", "HIGH", "CRITICAL", "UNKNOWN"].includes(normalized)
    ? normalized
    : fallback;
}

function normalizeConfidence(value) {
  const normalized = String(value || "UNKNOWN").toUpperCase();
  return ["LOW", "MEDIUM", "HIGH", "UNKNOWN"].includes(normalized)
    ? normalized
    : "UNKNOWN";
}

function resolveTrustIndex(workspace) {
  const raw = firstDefined(
    workspace?.report?.trustIndex,
    workspace?.report?.trust_index,
    workspace?.report?.score,
    workspace?.analysis?.trustIndex,
    workspace?.analysis?.score,
    workspace?.trustIndex
  );

  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : null;
}

function resolveVerdict(workspace) {
  return firstDefined(
    workspace?.report?.verdict?.label,
    workspace?.report?.verdict,
    workspace?.report?.decision,
    workspace?.analysis?.verdict,
    workspace?.verdict,
    "Pendiente de dictamen"
  );
}

function resolveSummary(workspace) {
  return firstDefined(
    workspace?.report?.executiveSummary,
    workspace?.report?.executive_summary,
    workspace?.report?.summary,
    workspace?.analysis?.summary,
    workspace?.summary?.executiveSummary,
    "El expediente todavía no cuenta con un resumen ejecutivo generado. Completa las fuentes disponibles y ejecuta el pipeline."
  );
}

function ScoreRing({ value }) {
  const score = value ?? 0;
  const degrees = score * 3.6;

  return (
    <div
      className="grid h-24 w-24 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(#2563eb ${degrees}deg, #e2e8f0 ${degrees}deg)`,
      }}
      aria-label={value === null ? "Índice sin calcular" : `Índice Carvanta ${value} de 100`}
    >
      <div className="grid h-[74px] w-[74px] place-items-center rounded-full bg-white shadow-inner">
        <div className="text-center">
          <p className="text-2xl font-black leading-none text-slate-950">
            {value ?? "—"}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            de 100
          </p>
        </div>
      </div>
    </div>
  );
}

function ExecutiveOverview({ workspace, onSelectTask }) {
  const tasks = workspace?.tasks || [];
  const taskMap = new Map(tasks.map((task) => [task.key, task]));
  const trustIndex = resolveTrustIndex(workspace);
  const verdict = resolveVerdict(workspace);
  const executiveSummary = resolveSummary(workspace);

  const risk = normalizeLevel(
    firstDefined(
      workspace?.report?.risk,
      workspace?.report?.riskLevel,
      workspace?.analysis?.risk,
      workspace?.risk
    )
  );

  const confidence = normalizeConfidence(
    firstDefined(
      workspace?.report?.confidence,
      workspace?.report?.confidenceLevel,
      workspace?.analysis?.confidence,
      workspace?.confidence
    )
  );

  return (
    <section className="mx-auto max-w-[1500px] px-4 pt-4 sm:px-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <SectionCard
          title="Panorama ejecutivo"
          description="Lectura rápida del expediente antes de entrar al detalle de cada fuente."
          contentClassName="p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {SOURCE_CATALOG.map((source) => {
              const task = taskMap.get(source.key);
              const status = task?.status || "PENDING";
              const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;

              return (
                <button
                  key={source.key}
                  type="button"
                  onClick={() => task && onSelectTask?.(source.key)}
                  disabled={!task}
                  className={[
                    "rounded-2xl border p-3 text-left transition",
                    config.card,
                    task
                      ? "hover:-translate-y-0.5 hover:shadow-sm"
                      : "cursor-default opacity-70",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-xs font-black text-slate-700 shadow-sm">
                      {source.short}
                    </span>
                    <span className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-950">{source.label}</p>
                  <p className={`mt-1 text-xs font-semibold ${config.text}`}>
                    {task ? config.label : "Próximamente"}
                  </p>
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="Dictamen Carvanta"
          description="Resultado consolidado del expediente."
          contentClassName="p-5"
        >
          <div className="flex items-center gap-5">
            <ScoreRing value={trustIndex} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Veredicto
              </p>
              <p className="mt-1 text-xl font-black leading-tight text-slate-950">
                {String(verdict)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <RiskBadge risk={risk} />
                <ConfidenceBadge confidence={confidence} />
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              Resumen ejecutivo
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {String(executiveSummary)}
            </p>
          </div>
        </SectionCard>
      </div>
    </section>
  );
}

export default ExecutiveOverview;
