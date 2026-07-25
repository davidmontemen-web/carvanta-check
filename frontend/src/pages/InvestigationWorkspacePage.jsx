import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import InvestigationSidebar from "../components/investigation/InvestigationSidebar";
import InvestigationSummary from "../components/investigation/InvestigationSummary";
import TaskWorkspace from "../components/investigation/TaskWorkspace";
import WorkspaceHeader from "../components/investigation/WorkspaceHeader";
import {
  getInvestigationWorkspace,
  processInvestigation,
  runRepuvePipeline,
  uploadInvestigationArtifact,
} from "../services/investigationApi";

function InvestigationWorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const token = localStorage.getItem("carvanta_token");

  const [workspace, setWorkspace] = useState(null);
  const [activeTaskKey, setActiveTaskKey] = useState(
    "VEHICLE_VALIDATION"
  );
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] =
    useState(false);
  const [processingStage, setProcessingStage] =
    useState(null);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    loadWorkspace();
  }, [id]);

  async function loadWorkspace() {
    try {
      const data = await getInvestigationWorkspace(
        id,
        token
      );

      setWorkspace(data);

      const currentTask =
        data.tasks.find(
          (task) => task.status !== "COMPLETED"
        ) || data.tasks[0];

      setActiveTaskKey((previousTask) => {
        const stillExists = data.tasks.some(
          (task) => task.key === previousTask
        );

        return stillExists
          ? previousTask
          : currentTask.key;
      });
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

    try {
      setActionLoading(true);

      await uploadInvestigationArtifact({
        investigationId: id,
        token,
        type: artifactType,
        file,
      });

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

  function inferRepuveStage(data) {
    const types = new Set(
      (data?.evidences || []).map((item) => item.type)
    );

    if (types.has("REPUVE_REPORT")) return "COMPLETED";
    if (types.has("REPUVE_ANALYSIS")) return "DICTATING";
    if (types.has("REPUVE_NORMALIZED")) return "INVESTIGATING";
    if (types.has("REPUVE_RAW")) return "NORMALIZING";
    return "EXTRACTING";
  }

  async function handleRunRepuve(artifactId) {
    let intervalId;

    try {
      setActionLoading(true);
      setProcessingStage("STARTING");

      intervalId = window.setInterval(async () => {
        try {
          const data = await getInvestigationWorkspace(id, token);
          setWorkspace(data);
          setProcessingStage(inferRepuveStage(data));
        } catch (pollError) {
          console.error(pollError);
        }
      }, 1500);

      await runRepuvePipeline({
        investigationId: id,
        token,
        artifactId,
      });

      const data = await getInvestigationWorkspace(id, token);
      setWorkspace(data);
      setProcessingStage("COMPLETED");
            alert(
        "REPUVE procesado. El resultado parcial está listo para revisión."
      );
    } catch (error) {
      console.error(error);
      setProcessingStage(null);
      alert(
        error.response?.data?.error ||
          "No se pudo completar el pipeline REPUVE."
      );
    } finally {
      if (intervalId) window.clearInterval(intervalId);
      setActionLoading(false);
    }
  }

  async function handleProcessPipeline() {
    try {
      setActionLoading(true);

      await processInvestigation({
        investigationId: id,
        token,
      });

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
          onArtifactUpload={handleArtifactUpload}
          onProcessPipeline={handleProcessPipeline}
          onRunRepuve={handleRunRepuve}
          processingStage={processingStage}
          token={token}
        />

        <InvestigationSummary
          workspace={workspace}
        />
      </section>
    </main>
  );
}

export default InvestigationWorkspacePage;
