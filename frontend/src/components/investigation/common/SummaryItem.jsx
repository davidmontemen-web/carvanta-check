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

export default SummaryItem;
