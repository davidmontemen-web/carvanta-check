const STATUS_CONFIG = {
  MATCH: {
    label: "Coincide",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  ADDED: {
    label: "Confirmado",
    className:
      "bg-blue-50 text-blue-700 border-blue-200",
  },
  MISMATCH: {
    label: "No coincide",
    className:
      "bg-red-50 text-red-700 border-red-200",
  },
  MISSING: {
    label: "No confirmado",
    className:
      "bg-amber-50 text-amber-700 border-amber-200",
  },
};

function ComparisonRow({ comparison }) {
  const config =
    STATUS_CONFIG[comparison.status] ||
    STATUS_CONFIG.MATCH;

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-[130px_1fr_1fr_auto] md:items-center">
      <p className="text-sm font-bold capitalize text-slate-700">
        {comparison.label}
      </p>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Cliente
        </p>
        <p className="mt-1 break-words text-sm text-slate-700">
          {comparison.customerValue || "No proporcionado"}
        </p>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Tarjeta
        </p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-900">
          {comparison.validatedValue || "No confirmado"}
        </p>
      </div>

      <span
        className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold ${config.className}`}
      >
        {config.label}
      </span>
    </div>
  );
}

export default ComparisonRow;
