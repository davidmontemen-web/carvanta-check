import { useMemo } from "react";

import ArtifactList from "../common/ArtifactList";
import VehicleReference from "../common/VehicleReference";

const REPUVE_URL =
  "https://www2.repuve.gob.mx:8443/ciudadania/";

const STAGE_LABELS = {
  STARTING: "Preparando procesamiento...",
  EXTRACTING: "Cerebro 1: extrayendo información...",
  NORMALIZING: "Cerebro 2: normalizando datos...",
  INVESTIGATING: "Cerebro 3: investigando hallazgos...",
  DICTATING: "Cerebro 4: generando dictamen...",
  COMPLETED: "Procesamiento completado",
};

function RepuveTask({
  workspace,
  loading,
  onArtifactUpload,
  onRunRepuve,
  processingStage,
}) {
  const artifacts = useMemo(
    () =>
      workspace.artifacts.filter(
        (artifact) => artifact.type === "REPUVE"
      ),
    [workspace.artifacts]
  );

  const latestArtifact = artifacts[artifacts.length - 1];
  const reportReady = Boolean(workspace.repuve?.report);

  return (
    <div className="space-y-6">
      <VehicleReference
        vehicleBase={workspace.vehicleBase}
        check={workspace.check}
      />

      <a
        href={REPUVE_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700"
      >
        Abrir fuente oficial ↗
      </a>

      <div className="rounded-xl border border-dashed border-slate-300 p-5">
        <h3 className="font-semibold text-slate-900">
          Cargar evidencia REPUVE
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Archivos permitidos: PDF, JPG, PNG o WEBP.
        </p>
        <label className="mt-4 inline-block">
          <span className="block cursor-pointer rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white">
            {loading ? "Procesando..." : "Seleccionar archivo"}
          </span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            disabled={loading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              onArtifactUpload("REPUVE", file);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {latestArtifact && (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <h3 className="font-bold text-slate-900">
            Procesamiento automático
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Ejecuta extracción, normalización, investigación y dictamen con un solo botón.
          </p>

          {processingStage && (
            <div className="mt-4 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-blue-700">
              {STAGE_LABELS[processingStage] || processingStage}
            </div>
          )}

          <button
            type="button"
            onClick={() => onRunRepuve(latestArtifact.id)}
            disabled={loading}
            className="mt-4 rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Procesando REPUVE..."
              : reportReady
                ? "Reprocesar REPUVE"
                : "Procesar REPUVE"}
          </button>
        </section>
      )}

      {reportReady && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h3 className="font-bold text-emerald-950">Dictamen listo</h3>
          <p className="mt-2 text-sm text-emerald-900">
            {workspace.repuve.executiveSummary || workspace.repuve.preview?.summary}
          </p>
          <p className="mt-4 text-sm font-medium text-emerald-900">
  Continúa al paso “Generar reporte” para crear el reporte final del cliente.
</p>
        </section>
      )}

      <ArtifactList artifacts={artifacts} />
    </div>
  );
}

export default RepuveTask;
