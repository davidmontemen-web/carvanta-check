const STATUS_STYLES = {
  PENDING: {
    label: "Pendiente",
    className:
      "border-slate-200 bg-slate-100 text-slate-700",
  },
  IN_PROGRESS: {
    label: "En progreso",
    className:
      "border-blue-200 bg-blue-50 text-blue-700",
  },
  NEEDS_REVIEW: {
    label: "Requiere revisión",
    className:
      "border-amber-200 bg-amber-50 text-amber-800",
  },
  COMPLETED: {
    label: "Completado",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
};

function TaskStatusBadge({
  status = "PENDING",
  label,
  className = "",
}) {
  const config =
    STATUS_STYLES[status] ||
    STATUS_STYLES.PENDING;

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        config.className,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label || config.label}
    </span>
  );
}

export default TaskStatusBadge;
