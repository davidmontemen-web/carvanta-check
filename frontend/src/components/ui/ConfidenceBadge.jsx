const CONFIDENCE_STYLES = {
  HIGH: {
    label: "Confianza alta",
    className:
      "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  MEDIUM: {
    label: "Confianza media",
    className:
      "border-violet-200 bg-violet-50 text-violet-700",
  },
  LOW: {
    label: "Confianza baja",
    className:
      "border-slate-200 bg-slate-100 text-slate-700",
  },
  UNKNOWN: {
    label: "Confianza sin determinar",
    className:
      "border-slate-200 bg-slate-100 text-slate-700",
  },
};

function ConfidenceBadge({
  confidence = "UNKNOWN",
  label,
  className = "",
}) {
  const config =
    CONFIDENCE_STYLES[confidence] ||
    CONFIDENCE_STYLES.UNKNOWN;

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

export default ConfidenceBadge;
