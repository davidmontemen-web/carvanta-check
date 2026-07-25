const RISK_STYLES = {
  LOW: {
    label: "Riesgo bajo",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  MEDIUM: {
    label: "Riesgo medio",
    className:
      "border-amber-200 bg-amber-50 text-amber-800",
  },
  HIGH: {
    label: "Riesgo alto",
    className:
      "border-orange-200 bg-orange-50 text-orange-800",
  },
  CRITICAL: {
    label: "Riesgo crítico",
    className:
      "border-red-200 bg-red-50 text-red-700",
  },
  UNKNOWN: {
    label: "Riesgo sin determinar",
    className:
      "border-slate-200 bg-slate-100 text-slate-700",
  },
};

function RiskBadge({
  risk = "UNKNOWN",
  label,
  className = "",
}) {
  const config =
    RISK_STYLES[risk] ||
    RISK_STYLES.UNKNOWN;

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

export default RiskBadge;
