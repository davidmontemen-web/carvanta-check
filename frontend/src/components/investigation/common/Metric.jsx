function Metric({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-100 p-3 text-center">
      <p className="text-xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-slate-500">
        {label}
      </p>
    </div>
  );
}

export default Metric;
