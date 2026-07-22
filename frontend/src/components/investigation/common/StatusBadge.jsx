function StatusBadge({ status }) {
  const labels = {
    NOT_PROVIDED: "No proporcionado",
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

export default StatusBadge;
