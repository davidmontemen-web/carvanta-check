const ALERT_STYLES = {
  info: {
    title: "Información",
    container:
      "border-blue-200 bg-blue-50",
    titleClass: "text-blue-900",
    bodyClass: "text-blue-800",
  },
  success: {
    title: "Validación correcta",
    container:
      "border-emerald-200 bg-emerald-50",
    titleClass: "text-emerald-900",
    bodyClass: "text-emerald-800",
  },
  warning: {
    title: "Revisión recomendada",
    container:
      "border-amber-200 bg-amber-50",
    titleClass: "text-amber-900",
    bodyClass: "text-amber-800",
  },
  danger: {
    title: "Atención crítica",
    container:
      "border-red-200 bg-red-50",
    titleClass: "text-red-900",
    bodyClass: "text-red-800",
  },
};

function ExecutiveAlert({
  tone = "info",
  title,
  children,
  actions,
  className = "",
}) {
  const config =
    ALERT_STYLES[tone] ||
    ALERT_STYLES.info;

  return (
    <aside
      className={[
        "rounded-xl border p-4",
        config.container,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p
            className={[
              "text-sm font-semibold",
              config.titleClass,
            ].join(" ")}
          >
            {title || config.title}
          </p>

          {children && (
            <div
              className={[
                "mt-1 text-sm leading-6",
                config.bodyClass,
              ].join(" ")}
            >
              {children}
            </div>
          )}
        </div>

        {actions && (
          <div className="shrink-0">
            {actions}
          </div>
        )}
      </div>
    </aside>
  );
}

export default ExecutiveAlert;
