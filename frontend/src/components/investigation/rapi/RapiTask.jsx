import { useMemo } from "react";

import ArtifactList from "../common/ArtifactList";
import VehicleReference from "../common/VehicleReference";

function RapiTask({
  task,
  workspace,
  loading,
  onArtifactUpload,
  onRunRapi,
  processingStage,
}) {
  const vinArtifactType =
    task.artifactTypes?.vin || "RAPI_VIN";

  const plateArtifactType =
    task.artifactTypes?.plate || "RAPI_PLACA";

  const vinArtifacts = useMemo(
    () =>
      (workspace.artifacts || []).filter(
        (artifact) =>
          artifact.type === vinArtifactType
      ),
    [workspace.artifacts, vinArtifactType]
  );

  const plateArtifacts = useMemo(
    () =>
      (workspace.artifacts || []).filter(
        (artifact) =>
          artifact.type === plateArtifactType
      ),
    [workspace.artifacts, plateArtifactType]
  );

  const rapi = workspace.rapi || {};
  const hasArtifacts =
    vinArtifacts.length + plateArtifacts.length > 0;

  return (
    <div className="space-y-6">
      <VehicleReference
        vehicleBase={workspace.vehicleBase}
        check={workspace.check}
      />

      <section className="rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900">
          Consulta RAPI por VIN
        </h3>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Carga el resultado correspondiente al VIN principal del
          expediente.
        </p>

        <ArtifactUploader
          label={
            vinArtifacts.length > 0
              ? "Reemplazar o agregar consulta por VIN"
              : "Cargar consulta por VIN"
          }
          loading={loading}
          onSelect={(file) =>
            onArtifactUpload(vinArtifactType, file)
          }
        />

        <div className="mt-5">
          <ArtifactList artifacts={vinArtifacts} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900">
          Consultas RAPI por placa
        </h3>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Carga una consulta por cada placa localizada durante la
          investigación.
        </p>

        <ArtifactUploader
          label={
            plateArtifacts.length > 0
              ? "Agregar otra consulta por placa"
              : "Cargar consulta por placa"
          }
          loading={loading}
          onSelect={(file) =>
            onArtifactUpload(plateArtifactType, file)
          }
        />

        <div className="mt-5">
          <ArtifactList artifacts={plateArtifacts} />
        </div>
      </section>

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-blue-950">
              Procesamiento RAPI
            </h3>

            <p className="mt-1 text-sm leading-6 text-blue-800">
              Carvanta extraerá, consolidará, analizará y dictaminará
              todas las consultas cargadas.
            </p>
          </div>

          <button
            type="button"
            disabled={loading || !hasArtifacts}
            onClick={onRunRapi}
            className="rounded-lg bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? getProcessingLabel(processingStage)
              : rapi.report
                ? "Reprocesar RAPI"
                : "Analizar RAPI"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Consulta VIN"
            value={
              vinArtifacts.length > 0
                ? `${vinArtifacts.length} cargada`
                : "Pendiente"
            }
          />

          <Metric
            label="Consultas placa"
            value={String(plateArtifacts.length)}
          />

          <Metric
            label="Cobertura"
            value={`${rapi.coverage || 0}%`}
          />

          <Metric
            label="Confianza"
            value={
              typeof rapi.confidence === "number"
                ? `${Math.round(
                    rapi.confidence * 100
                  )}%`
                : "Pendiente"
            }
          />
        </div>
      </section>

      {rapi.preview && (
        <RapiResult rapi={rapi} />
      )}
    </div>
  );
}

function RapiResult({ rapi }) {
  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Dictamen RAPI
          </p>

          <h3 className="mt-1 text-xl font-bold text-slate-900">
            {rapi.verdict?.label || "Resultado disponible"}
          </h3>
        </div>

        <RiskBadge risk={rapi.risk} />
      </div>

      <div className="rounded-lg bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-700">
          Resumen ejecutivo
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-700">
          {rapi.executiveSummary ||
            "El análisis RAPI fue completado."}
        </p>
      </div>

      {rapi.identifiersChecked?.length > 0 && (
        <div>
          <h4 className="font-semibold text-slate-900">
            Identificadores consultados
          </h4>

          <div className="mt-3 flex flex-wrap gap-2">
            {rapi.identifiersChecked.map((identifier) => (
              <span
                key={identifier}
                className="rounded-full bg-slate-100 px-3 py-1 font-mono text-sm text-slate-700"
              >
                {identifier}
              </span>
            ))}
          </div>
        </div>
      )}

      {rapi.findings?.length > 0 && (
        <ResultList
          title="Hallazgos"
          items={rapi.findings}
          getTitle={(item) => item.title}
          getDescription={(item) => item.description}
          getLevel={(item) => item.severity}
        />
      )}

      {rapi.recommendations?.length > 0 && (
        <ResultList
          title="Recomendaciones"
          items={rapi.recommendations}
          getTitle={(item) => item.title}
          getDescription={(item) => item.description}
          getLevel={(item) => item.priority}
        />
      )}

      {rapi.report?.disclaimer && (
        <p className="border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
          {rapi.report.disclaimer}
        </p>
      )}
    </section>
  );
}

function ResultList({
  title,
  items,
  getTitle,
  getDescription,
  getLevel,
}) {
  return (
    <div>
      <h4 className="font-semibold text-slate-900">
        {title}
      </h4>

      <div className="mt-3 space-y-3">
        {items.map((item, index) => (
          <div
            key={`${item.code || title}-${index}`}
            className="rounded-lg border border-slate-200 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-slate-900">
                {getTitle(item)}
              </p>

              <RiskBadge risk={getLevel(item)} compact />
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {getDescription(item)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArtifactUploader({
  label,
  loading,
  onSelect,
}) {
  return (
    <label className="mt-4 inline-block">
      <span className="block cursor-pointer rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white">
        {loading ? "Cargando..." : label}
      </span>

      <input
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        disabled={loading}
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            onSelect(file);
          }

          event.target.value = "";
        }}
      />
    </label>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function RiskBadge({ risk, compact = false }) {
  const styles = {
    LOW: "bg-emerald-100 text-emerald-800",
    MEDIUM: "bg-amber-100 text-amber-800",
    HIGH: "bg-orange-100 text-orange-800",
    CRITICAL: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`rounded-full font-bold ${
        compact
          ? "px-2 py-1 text-xs"
          : "px-3 py-1.5 text-sm"
      } ${styles[risk] || "bg-slate-100 text-slate-700"}`}
    >
      {risk || "PENDIENTE"}
    </span>
  );
}

function getProcessingLabel(stage) {
  const labels = {
    RAPI_EXTRACTING: "Extrayendo consultas...",
    RAPI_NORMALIZING: "Consolidando información...",
    RAPI_INVESTIGATING: "Analizando RAPI...",
    RAPI_DICTATING: "Generando dictamen...",
    RAPI_COMPLETED: "RAPI completado",
  };

  return labels[stage] || "Procesando RAPI...";
}

export default RapiTask;