function LoadingOverlay({
  visible = true,
  label = "Procesando...",
  fullScreen = false,
}) {
  if (!visible) {
    return null;
  }

  return (
    <div
      className={[
        "z-50 flex items-center justify-center bg-slate-950/30 backdrop-blur-[1px]",
        fullScreen
          ? "fixed inset-0"
          : "absolute inset-0 rounded-inherit",
      ].join(" ")}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        <span className="text-sm font-semibold text-slate-800">
          {label}
        </span>
      </div>
    </div>
  );
}

export default LoadingOverlay;
