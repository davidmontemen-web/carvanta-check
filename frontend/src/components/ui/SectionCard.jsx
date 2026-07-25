function SectionCard({
  title,
  description,
  actions,
  children,
  className = "",
  contentClassName = "",
}) {
  return (
    <section
      className={[
        "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {(title || description || actions) && (
        <header className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title && (
              <h2 className="text-base font-semibold text-slate-900">
                {title}
              </h2>
            )}

            {description && (
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {description}
              </p>
            )}
          </div>

          {actions && (
            <div className="shrink-0">{actions}</div>
          )}
        </header>
      )}

      <div
        className={[
          "p-5",
          contentClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </div>
    </section>
  );
}

export default SectionCard;
