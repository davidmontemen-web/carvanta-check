import TaskIcon from "./common/TaskIcon";

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
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <nav className="mt-5 space-y-1">
        {tasks.map((task) => {
          const active = task.key === activeTaskKey;

          return (
            <button
              key={task.key}
              type="button"
              onClick={() => onSelectTask(task.key)}
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

export default InvestigationSidebar;
