import GenericArtifactTask from "./GenericArtifactTask";
import StatusBadge from "./common/StatusBadge";
import InvoiceTask from "./invoice/InvoiceTask";
import ReportTask from "./report/ReportTask";
import RepuveTask from "./repuve/RepuveTask";
import RapiTask from "./rapi/RapiTask";
import VehicleBaseTask from "./vehicle-base/VehicleBaseTask";


const TASK_DESCRIPTIONS = {
  VEHICLE_VALIDATION:
    "Confirma que los datos capturados por el cliente coincidan con la tarjeta de circulación.",
  REPUVE:
    "Consulta el estatus vehicular en REPUVE y carga el resultado.",
  SAT_FACTURA:
    "Registra la cadena documental y genera un previo del análisis de factura.",
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

const TASK_COMPONENTS = {
  VEHICLE_VALIDATION: VehicleBaseTask,
  REPUVE: RepuveTask,
  RAPI: RapiTask,
  SAT_FACTURA: InvoiceTask,
  REPORT: ReportTask,
};

function TaskWorkspace({
  task,
  workspace,
  actionLoading,
  onReload,
  onArtifactUpload,
  onProcessPipeline,
  onRunRepuve,
  onRunRapi,
  processingStage,
  token,
}) {
  const RegisteredTask = TASK_COMPONENTS[task.key];

  const sharedProps = {
    task,
    workspace,
    loading: actionLoading,
    token,
    onReload,
    onArtifactUpload,
    onProcess: onProcessPipeline,
    onRunRepuve,
    onRunRapi,
    processingStage,
  };

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
        {RegisteredTask ? (
          <RegisteredTask {...sharedProps} />
        ) : (
          <GenericArtifactTask {...sharedProps} />
        )}
      </div>
    </section>
  );
}

export default TaskWorkspace;
