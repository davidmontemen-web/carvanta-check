import { API_URL } from "../../../services/api";

function ArtifactList({ artifacts }) {
  if (artifacts.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Todavía no se han cargado archivos para esta fuente.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-slate-900">
        Archivos cargados
      </h3>

      {artifacts.map((artifact) => (
        <div
          key={artifact.id}
          className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {artifact.originalName}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {artifact.processingStatus}
            </p>
          </div>

          <a
            href={`${API_URL}${artifact.filePath}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-sm font-bold text-blue-600"
          >
            Abrir
          </a>
        </div>
      ))}
    </div>
  );
}

export default ArtifactList;
