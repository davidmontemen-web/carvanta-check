import { useMemo } from "react";

import ArtifactList from "../common/ArtifactList";
import VehicleReference from "../common/VehicleReference";

const REPUVE_URL =
  "https://www2.repuve.gob.mx:8443/ciudadania/";

function RepuveTask({
  workspace,
  loading,
  onArtifactUpload,
}) {
  const artifacts = useMemo(
    () =>
      workspace.artifacts.filter(
        (artifact) => artifact.type === "REPUVE"
      ),
    [workspace.artifacts]
  );

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
          Cargar resultado
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Archivos permitidos: PDF, JPG, PNG o WEBP.
        </p>

        <label className="mt-4 inline-block">
          <span className="block cursor-pointer rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white">
            {loading ? "Cargando..." : "Seleccionar archivo"}
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

      <ArtifactList artifacts={artifacts} />
    </div>
  );
}

export default RepuveTask;
