function FieldRow({
  label,
  value,
  helperText,
  status,
  emptyLabel = "Sin información",
  className = "",
}) {
  const hasValue =
    value !== undefined &&
    value !== null &&
    String(value).trim() !== "";

  return (
    <div
      className={[
        "grid gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-start sm:gap-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <dt className="text-sm font-medium text-slate-600">
        {label}
      </dt>

      <dd>
        <p
          className={
            hasValue
              ? "text-sm font-medium text-slate-900"
              : "text-sm italic text-slate-400"
          }
        >
          {hasValue ? value : emptyLabel}
        </p>

        {helperText && (
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {helperText}
          </p>
        )}
      </dd>

      {status && (
        <div className="sm:justify-self-end">
          {status}
        </div>
      )}
    </div>
  );
}

export default FieldRow;
