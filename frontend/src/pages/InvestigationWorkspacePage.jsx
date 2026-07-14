import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { API_URL } from "../services/api";

const artifactTypes = [
  {
    value: "REPUVE",
    label: "REPUVE",
    description: "Resultado de consulta vehicular.",
  },
  {
    value: "SAT_FACTURA",
    label: "Validación SAT",
    description: "Validación o consulta de la factura.",
  },
  {
    value: "TRANSUNION",
    label: "TransUnion",
    description: "Historial o antecedentes disponibles.",
  },
  {
    value: "RAPI",
    label: "RAPI",
    description: "Consulta de antecedentes vehiculares.",
  },
  {
    value: "ADEUDOS",
    label: "Tenencias y adeudos",
    description: "Consulta de tenencias, multas o adeudos.",
  },
  {
    value: "FACTURA",
    label: "Factura investigada",
    description: "Archivo utilizado para validar la factura.",
  },
  {
    value: "OTRO",
    label: "Otro artifact",
    description: "Otra evidencia documental relevante.",
  },
];

function InvestigationWorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const token = localStorage.getItem("carvanta_token");

  const [investigation, setInvestigation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    loadInvestigation();
  }, [id]);

  async function loadInvestigation() {
    try {
      const response = await api.get(`/investigations/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setInvestigation(response.data);
    } catch (error) {
      console.error(error);

      if (error.response?.status === 401) {
        localStorage.removeItem("carvanta_token");
        localStorage.removeItem("carvanta_user");
        navigate("/login");
        return;
      }

      alert(
        error.response?.data?.error ||
          "No se pudo cargar la investigación."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleArtifactUpload(type, file) {
    if (!file) return;

    const formData = new FormData();

    formData.append("file", file);
    formData.append("type", type);
    formData.append("source", "EXECUTIVE");

    try {
      setUploadingType(type);

      await api.post(
        `/investigations/${investigation.id}/artifacts`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await loadInvestigation();
    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.error ||
          "No se pudo cargar el artifact."
      );
    } finally {
      setUploadingType(null);
    }
  }

  const artifactsByType = useMemo(() => {
    const result = {};

    for (const artifact of investigation?.artifacts || []) {
      if (!result[artifact.type]) {
        result[artifact.type] = [];
      }

      result[artifact.type].push(artifact);
    }

    return result;
  }, [investigation]);

  if (loading) {
    return <main className="p-8">Cargando investigación...</main>;
  }

  if (!investigation) {
    return <main className="p-8">Investigación no encontrada.</main>;
  }

  const check = investigation.check;

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <button
              onClick={() => navigate("/executive")}
              className="text-sm font-medium text-blue-600"
            >
              ← Volver al panel
            </button>

            <h1 className="mt-2 text-xl font-bold text-slate-900">
              Investigación del expediente
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              {check.folio || check.id} · {check.marca}{" "}
              {check.modelo} {check.anio}
            </p>
          </div>

          <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-800">
            {investigation.status}
          </span>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <VehicleSection check={check} />

          <ClientDocumentsSection documents={check.documents || []} />

          <section>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Artifacts de investigación
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Carga los archivos originales obtenidos durante la
                investigación.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {artifactTypes.map((artifactType) => (
                <ArtifactCard
                  key={artifactType.value}
                  artifactType={artifactType}
                  artifacts={
                    artifactsByType[artifactType.value] || []
                  }
                  uploading={
                    uploadingType === artifactType.value
                  }
                  onUpload={(file) =>
                    handleArtifactUpload(
                      artifactType.value,
                      file
                    )
                  }
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <InvestigationProgress
            artifactTypes={artifactTypes}
            artifactsByType={artifactsByType}
          />

          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">
              Responsable
            </h2>

            <p className="mt-3 text-sm font-medium text-slate-900">
              {investigation.executive?.name}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {investigation.executive?.email}
            </p>

            <p className="mt-4 text-xs text-slate-500">
              Iniciada:{" "}
              {new Date(
                investigation.startedAt
              ).toLocaleString()}
            </p>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">
              Siguiente etapa
            </h2>

            <p className="mt-3 text-sm text-slate-600">
              Cuando terminemos de definir y cargar los artifacts
              mínimos, conectaremos el Extraction Engine.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}

function VehicleSection({ check }) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="font-semibold text-slate-900">
        Información del vehículo
      </h2>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Item label="Marca" value={check.marca} />
        <Item label="Modelo" value={check.modelo} />
        <Item label="Año" value={check.anio} />
        <Item label="Versión" value={check.version} />
        <Item label="Placas" value={check.placas} />
        <Item label="VIN / NIV" value={check.vin} />
      </div>
    </section>
  );
}

function ClientDocumentsSection({ documents }) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="font-semibold text-slate-900">
        Documentos proporcionados por el cliente
      </h2>

      {documents.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          El cliente no cargó documentos.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {documents.map((document) => (
            <div
              key={document.id}
              className="rounded-lg border border-slate-200 p-4"
            >
              <p className="text-sm font-semibold text-slate-900">
                {document.type}
              </p>

              <p className="mt-1 truncate text-xs text-slate-500">
                {document.fileName}
              </p>

              <a
                href={`${API_URL}${document.filePath}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-sm font-medium text-blue-600"
              >
                Abrir documento
              </a>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ArtifactCard({
  artifactType,
  artifacts,
  uploading,
  onUpload,
}) {
  const latestArtifact = artifacts[0];

  return (
    <article className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-900">
            {artifactType.label}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {artifactType.description}
          </p>
        </div>

        <StatusBadge
          status={
            latestArtifact?.processingStatus || "NOT_UPLOADED"
          }
        />
      </div>

      {artifacts.length > 0 && (
        <div className="mt-4 space-y-2">
          {artifacts.map((artifact) => (
            <div
              key={artifact.id}
              className="rounded-lg border border-slate-200 p-3"
            >
              <p className="truncate text-sm font-medium text-slate-800">
                {artifact.originalName}
              </p>

              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  {formatBytes(artifact.sizeBytes)}
                </span>

                <a
                  href={`${API_URL}${artifact.filePath}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-blue-600"
                >
                  Abrir
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <label className="mt-4 block">
        <span className="block cursor-pointer rounded-lg border border-dashed border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">
          {uploading
            ? "Cargando..."
            : latestArtifact
              ? "Agregar otro archivo"
              : "Agregar artifact"}
        </span>

        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];

            onUpload(file);

            event.target.value = "";
          }}
          className="hidden"
        />
      </label>
    </article>
  );
}

function InvestigationProgress({
  artifactTypes,
  artifactsByType,
}) {
  const completed = artifactTypes.filter(
    (type) => artifactsByType[type.value]?.length > 0
  ).length;

  const percentage = Math.round(
    (completed / artifactTypes.length) * 100
  );

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">
        Progreso de recolección
      </h2>

      <p className="mt-2 text-3xl font-bold text-slate-900">
        {percentage}%
      </p>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-blue-600"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      <p className="mt-3 text-sm text-slate-600">
        {completed} de {artifactTypes.length} tipos con al menos
        un artifact.
      </p>
    </section>
  );
}

function Item({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>

      <p className="mt-1 font-medium text-slate-900">
        {value || "No capturado"}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const labels = {
    NOT_UPLOADED: "Sin cargar",
    PENDING: "Pendiente",
    PROCESSING: "Procesando",
    PROCESSED: "Procesado",
    FAILED: "Error",
  };

  return (
    <span className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
      {labels[status] || status}
    </span>
  );
}

function formatBytes(bytes) {
  if (!bytes) return "0 KB";

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default InvestigationWorkspacePage;