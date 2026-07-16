import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import api, { API_URL } from "../services/api";

const TASK_DESCRIPTIONS = {
  VEHICLE_VALIDATION:
    "Confirma que los datos capturados por el cliente coincidan con la tarjeta de circulación.",

  REPUVE:
    "Consulta el estatus vehicular en REPUVE y carga el resultado.",

  SAT_FACTURA:
    "Valida la factura disponible ante el SAT.",

  ADEUDOS:
    "Consulta tenencias, refrendos u otros adeudos.",

  MULTAS:
    "Consulta infracciones o multas asociadas al vehículo.",

  RAPI:
    "Consulta antecedentes vehiculares disponibles en RAPI.",

  TRANSUNION:
    "Consulta antecedentes financieros o gravámenes disponibles.",

  REPORT:
    "Ejecuta el pipeline y genera el reporte preliminar.",
};

const SOURCE_LINKS = {
  REPUVE: "https://www2.repuve.gob.mx:8443/ciudadania/",
};

function InvestigationWorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const token = localStorage.getItem("carvanta_token");

  const [workspace, setWorkspace] = useState(null);
  const [activeTaskKey, setActiveTaskKey] =
    useState("VEHICLE_VALIDATION");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] =
    useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    loadWorkspace();
  }, [id]);

  async function loadWorkspace() {
    try {
      const response = await api.get(
        `/investigations/${id}/workspace`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setWorkspace(response.data);

      const currentTask =
        response.data.tasks.find(
          (task) => task.status !== "COMPLETED"
        ) || response.data.tasks[0];

      setActiveTaskKey((previousTask) => {
        const stillExists =
          response.data.tasks.some(
            (task) => task.key === previousTask
          );

        return stillExists
          ? previousTask
          : currentTask.key;
      });
    } catch (error) {
      console.error(error);

      if (error.response?.status === 401) {
        localStorage.removeItem(
          "carvanta_token"
        );

        localStorage.removeItem(
          "carvanta_user"
        );

        navigate("/login");
        return;
      }

      alert(
        error.response?.data?.error ||
          "No se pudo cargar el Workspace."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleArtifactUpload(
    artifactType,
    file
  ) {
    if (!file) {
      return;
    }

    const formData = new FormData();

    formData.append("file", file);
    formData.append("type", artifactType);
    formData.append("source", "EXECUTIVE");

    try {
      setActionLoading(true);

      await api.post(
        `/investigations/${id}/artifacts`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await loadWorkspace();
    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.error ||
          "No se pudo cargar el artifact."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleProcessPipeline() {
    try {
      setActionLoading(true);

      await api.post(
        `/investigations/${id}/process`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await loadWorkspace();

      alert("Pipeline ejecutado correctamente.");
    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.error ||
          "No se pudo ejecutar el pipeline."
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        Cargando investigación...
      </main>
    );
  }

  if (!workspace) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        Investigación no encontrada.
      </main>
    );
  }

  const activeTask =
    workspace.tasks.find(
      (task) => task.key === activeTaskKey
    ) || workspace.tasks[0];

  const check = workspace.check;

  return (
    <main className="min-h-screen bg-slate-100">
      <WorkspaceHeader
        workspace={workspace}
        onBack={() => navigate("/executive")}
      />

      <section className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        <InvestigationSidebar
          tasks={workspace.tasks}
          activeTaskKey={activeTask.key}
          progress={workspace.progress}
          onSelectTask={setActiveTaskKey}
        />

        <TaskWorkspace
          task={activeTask}
          workspace={workspace}
          actionLoading={actionLoading}
          onReload={loadWorkspace}
          onArtifactUpload={
            handleArtifactUpload
          }
          onProcessPipeline={
            handleProcessPipeline
          }
          token={token}
        />

        <InvestigationSummary
          workspace={workspace}
        />
      </section>
    </main>
  );
}

function WorkspaceHeader({
  workspace,
  onBack,
}) {
  const { check, investigation } = workspace;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-6 px-6 py-4">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-semibold text-blue-600"
          >
            ← Volver al panel
          </button>

          <h1 className="mt-2 text-xl font-bold text-slate-900">
            Investigation Workstation
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            {check.folio || check.id} ·{" "}
            {check.marca} {check.modelo}{" "}
            {check.anio}
          </p>
        </div>

        <div className="text-right">
          <StatusBadge
            status={investigation.status}
          />

          <p className="mt-2 text-xs text-slate-500">
            Responsable:{" "}
            {investigation.executive?.name ||
              "Sin asignar"}
          </p>
        </div>
      </div>
    </header>
  );
}

function InvestigationSidebar({
  tasks,
  activeTaskKey,
  progress,
  onSelectTask,
}) {
  return (
    <aside className="self-start rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4">
      <h2 className="font-bold text-slate-900">
        Investigación
      </h2>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">
            Progreso
          </span>

          <span className="font-semibold text-slate-900">
            {progress}%
          </span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-blue-600"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>

      <nav className="mt-5 space-y-1">
        {tasks.map((task) => {
          const active =
            task.key === activeTaskKey;

          return (
            <button
              key={task.key}
              type="button"
              onClick={() =>
                onSelectTask(task.key)
              }
              className={[
                "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition",
                active
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              <TaskIcon status={task.status} />

              <span className="min-w-0 flex-1">
                {task.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function TaskWorkspace({
  task,
  workspace,
  actionLoading,
  onReload,
  onArtifactUpload,
  onProcessPipeline,
  token,
}) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Tarea actual
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              {task.label}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {TASK_DESCRIPTIONS[task.key]}
            </p>
          </div>

          <StatusBadge status={task.status} />
        </div>
      </div>

      <div className="pt-6">
        {task.key === "VEHICLE_VALIDATION" && (
          <VehicleValidationTask
            workspace={workspace}
            loading={actionLoading}
            token={token}
            onSaved={onReload}
          />
        )}

        {[
          "REPUVE",
          "SAT_FACTURA",
          "ADEUDOS",
          "MULTAS",
          "RAPI",
          "TRANSUNION",
        ].includes(task.key) && (
          <ArtifactTask
            task={task}
            workspace={workspace}
            loading={actionLoading}
            onUpload={(file) =>
              onArtifactUpload(
                task.key,
                file
              )
            }
          />
        )}

        {task.key === "REPORT" && (
          <ReportTask
            workspace={workspace}
            loading={actionLoading}
            onProcess={onProcessPipeline}
          />
        )}
      </div>
    </section>
  );
}

function VehicleValidationTask({
  workspace,
  loading,
  token,
  onSaved,
}) {
  const check = workspace.check;
  const vehicleBase = workspace.vehicleBase;

  const [form, setForm] = useState({
    vin: vehicleBase?.vin || check.vin || "",
    plate:
      vehicleBase?.plate ||
      check.placas ||
      "",
    brand:
      vehicleBase?.brand ||
      check.marca ||
      "",
    model:
      vehicleBase?.model ||
      check.modelo ||
      "",
    year:
      vehicleBase?.year ||
      String(check.anio || ""),
    version:
      vehicleBase?.version ||
      check.version ||
      "",
    state: vehicleBase?.state || "",
    owner: vehicleBase?.owner || "",
    notes: vehicleBase?.notes || "",
  });

  const circulationCard =
    check.documents?.find(
      (document) =>
        document.type ===
        "tarjetaCirculacion"
    );

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      await api.post(
        `/investigations/${workspace.investigation.id}/vehicle-base`,
        form,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await onSaved();

      alert(
        "Identidad del vehículo validada correctamente."
      );
    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.error ||
          "No se pudo guardar la validación."
      );
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="VIN / NIV"
            value={form.vin}
            required
            onChange={(value) =>
              updateField("vin", value)
            }
          />

          <Field
            label="Placas"
            value={form.plate}
            required
            onChange={(value) =>
              updateField("plate", value)
            }
          />

          <Field
            label="Marca"
            value={form.brand}
            required
            onChange={(value) =>
              updateField("brand", value)
            }
          />

          <Field
            label="Modelo"
            value={form.model}
            required
            onChange={(value) =>
              updateField("model", value)
            }
          />

          <Field
            label="Año"
            value={form.year}
            required
            onChange={(value) =>
              updateField("year", value)
            }
          />

          <Field
            label="Versión"
            value={form.version}
            onChange={(value) =>
              updateField("version", value)
            }
          />

          <Field
            label="Entidad"
            value={form.state}
            onChange={(value) =>
              updateField("state", value)
            }
          />

          <Field
            label="Propietario"
            value={form.owner}
            onChange={(value) =>
              updateField("owner", value)
            }
          />
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">
            Observaciones
          </span>

          <textarea
            rows={4}
            value={form.notes}
            onChange={(event) =>
              updateField(
                "notes",
                event.target.value
              )
            }
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {vehicleBase
            ? "Actualizar validación"
            : "Confirmar identidad"}
        </button>
      </form>

      <DocumentPanel
        document={circulationCard}
        title="Tarjeta de circulación"
      />
    </div>
  );
}

function ArtifactTask({
  task,
  workspace,
  loading,
  onUpload,
}) {
  const artifacts = useMemo(
    () =>
      workspace.artifacts.filter(
        (artifact) =>
          artifact.type === task.key
      ),
    [workspace.artifacts, task.key]
  );

  const sourceLink =
    SOURCE_LINKS[task.key];

  return (
    <div className="space-y-6">
      <VehicleReference
        vehicleBase={workspace.vehicleBase}
        check={workspace.check}
      />

      {sourceLink && (
        <a
          href={sourceLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700"
        >
          Abrir fuente oficial ↗
        </a>
      )}

      <div className="rounded-xl border border-dashed border-slate-300 p-5">
        <h3 className="font-semibold text-slate-900">
          Cargar resultado
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Archivos permitidos: PDF, JPG,
          PNG o WEBP.
        </p>

        <label className="mt-4 inline-block">
          <span className="block cursor-pointer rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white">
            {loading
              ? "Cargando..."
              : "Seleccionar archivo"}
          </span>

          <input
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            disabled={loading}
            onChange={(event) => {
              const file =
                event.target.files?.[0];

              onUpload(file);

              event.target.value = "";
            }}
          />
        </label>
      </div>

      <ArtifactList artifacts={artifacts} />
    </div>
  );
}

function ReportTask({
  workspace,
  loading,
  onProcess,
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="font-semibold text-slate-900">
          Estado del expediente
        </h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric
            label="Artifacts"
            value={
              workspace.summary.artifactCount
            }
          />

          <Metric
            label="Evidencias"
            value={
              workspace.summary.evidenceCount
            }
          />

          <Metric
            label="Hallazgos"
            value={
              workspace.summary.findingCount
            }
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onProcess}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Procesando..."
          : workspace.report
            ? "Regenerar reporte"
            : "Ejecutar pipeline y generar reporte"}
      </button>

      {workspace.report && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h3 className="font-bold text-emerald-900">
            Reporte disponible
          </h3>

          <p className="mt-2 text-sm text-emerald-800">
            {workspace.report.summary}
          </p>

          <a
            href={`/check/${workspace.check.id}/report`}
            className="mt-4 inline-block text-sm font-bold text-emerald-900 underline"
          >
            Abrir reporte
          </a>
        </div>
      )}
    </div>
  );
}

function InvestigationSummary({ workspace }) {
  const vehicle =
    workspace.vehicleBase || {};

  return (
    <aside className="self-start space-y-4 lg:sticky lg:top-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">
          Identidad validada
        </h2>

        <div className="mt-4 space-y-3">
          <SummaryItem
            label="VIN"
            value={
              vehicle.vin ||
              workspace.check.vin
            }
          />

          <SummaryItem
            label="Placas"
            value={
              vehicle.plate ||
              workspace.check.placas
            }
          />

          <SummaryItem
            label="Vehículo"
            value={[
              vehicle.brand ||
                workspace.check.marca,
              vehicle.model ||
                workspace.check.modelo,
              vehicle.year ||
                workspace.check.anio,
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
            value={
              workspace.summary.artifactCount
            }
          />

          <Metric
            label="Evidence"
            value={
              workspace.summary.evidenceCount
            }
          />

          <Metric
            label="Findings"
            value={
              workspace.summary.findingCount
            }
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
            {workspace.findings
              .slice(0, 5)
              .map((finding) => (
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

function VehicleReference({
  vehicleBase,
  check,
}) {
  const vehicle = vehicleBase || {};

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="font-semibold text-slate-900">
        Datos para realizar la consulta
      </h3>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SummaryItem
          label="VIN"
          value={vehicle.vin || check.vin}
        />

        <SummaryItem
          label="Placas"
          value={
            vehicle.plate || check.placas
          }
        />
      </div>
    </section>
  );
}

function DocumentPanel({
  document,
  title,
}) {
  return (
    <aside className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="font-semibold text-slate-900">
        {title}
      </h3>

      {!document ? (
        <p className="mt-3 text-sm text-red-600">
          Documento no encontrado.
        </p>
      ) : (
        <>
          <p className="mt-3 break-all text-sm text-slate-600">
            {document.fileName}
          </p>

          <a
            href={`${API_URL}${document.filePath}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
          >
            Abrir documento ↗
          </a>
        </>
      )}
    </aside>
  );
}

function ArtifactList({ artifacts }) {
  if (artifacts.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Todavía no se han cargado archivos
        para esta fuente.
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

function Field({
  label,
  value,
  required = false,
  onChange,
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
        {required ? " *" : ""}
      </span>

      <input
        value={value}
        required={required}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-100 p-3 text-center">
      <p className="text-xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-slate-500">
        {label}
      </p>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value || "No disponible"}
      </p>
    </div>
  );
}

function TaskIcon({ status }) {
  if (status === "COMPLETED") {
    return (
      <span className="text-emerald-600">
        ✓
      </span>
    );
  }

  if (status === "IN_PROGRESS") {
    return (
      <span className="text-amber-500">
        ◐
      </span>
    );
  }

  if (status === "NEEDS_REVIEW") {
    return (
      <span className="text-red-600">!</span>
    );
  }

  return (
    <span className="text-slate-400">○</span>
  );
}

function StatusBadge({ status }) {
  const labels = {
    PENDING: "Pendiente",
    IN_PROGRESS: "En proceso",
    COMPLETED: "Completado",
    NEEDS_REVIEW: "Requiere revisión",
    FAILED: "Error",
  };

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
      {labels[status] || status}
    </span>
  );
}

export default InvestigationWorkspacePage;