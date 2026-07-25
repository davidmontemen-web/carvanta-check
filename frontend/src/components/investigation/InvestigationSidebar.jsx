import TaskIcon from "./common/TaskIcon";
import { TaskStatusBadge } from "../ui";

function InvestigationSidebar({ tasks, activeTaskKey, progress, onSelectTask }) {
  const safeProgress = Math.min(100, Math.max(0, Number(progress) || 0));
  const completedTasks = tasks.filter((task) => task.status === "COMPLETED").length;

  return (
    <aside className="self-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-4">
      <div className="border-b border-slate-200 px-4 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
          Carvanta Check
        </p>

        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-950">Investigación</h2>
            <p className="mt-1 text-xs text-slate-500">
              {completedTasks} de {tasks.length} tareas completas
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
            {safeProgress}%
          </span>
        </div>

        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-label="Progreso de la investigación"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={safeProgress}
        >
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${safeProgress}%` }}
          />
        </div>
      </div>

      <nav className="space-y-1 p-2" aria-label="Tareas de investigación">
        {tasks.map((task) => {
          const active = task.key === activeTaskKey;

          return (
            <button
              key={task.key}
              type="button"
              onClick={() => onSelectTask(task.key)}
              aria-current={active ? "step" : undefined}
              className={[
                "group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition",
                active
                  ? "border-blue-200 bg-blue-50 shadow-sm"
                  : "border-transparent hover:border-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              <span className="shrink-0">
                <TaskIcon status={task.status} />
              </span>

              <span className="min-w-0 flex-1">
                <span className={[
                  "block truncate text-sm",
                  active ? "font-bold text-blue-800" : "font-semibold text-slate-700",
                ].join(" ")}>
                  {task.label}
                </span>

                <span className="mt-1 block">
                  <TaskStatusBadge
                    status={task.status}
                    className="px-2 py-0.5 text-[10px]"
                  />
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default InvestigationSidebar;
