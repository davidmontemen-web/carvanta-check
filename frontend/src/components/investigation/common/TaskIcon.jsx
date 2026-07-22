function TaskIcon({ status }) {
  if (status === "COMPLETED") {
    return <span className="text-emerald-600">✓</span>;
  }

  if (status === "IN_PROGRESS") {
    return <span className="text-amber-500">◐</span>;
  }

  if (status === "NEEDS_REVIEW") {
    return <span className="text-red-600">!</span>;
  }

  if (status === "NOT_PROVIDED") {
    return <span className="text-slate-300">—</span>;
  }

  return <span className="text-slate-400">○</span>;
}

export default TaskIcon;
