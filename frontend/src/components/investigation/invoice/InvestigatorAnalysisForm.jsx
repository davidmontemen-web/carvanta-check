import Field from "../common/Field";
import SelectField from "../common/SelectField";

function InvestigatorAnalysisForm({
  analysis,
  onChange,
  onSubmit,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 grid gap-4 rounded-xl border border-slate-200 p-5 md:grid-cols-2"
    >
      <SelectField
        label="Calidad documental"
        value={analysis.documentQuality}
        options={[
          ["", "Seleccionar"],
          ["EXCELLENT", "Excelente"],
          ["GOOD", "Buena"],
          ["REGULAR", "Regular"],
          ["POOR", "Deficiente"],
        ]}
        onChange={(value) =>
          onChange("documentQuality", value)
        }
      />

      <SelectField
        label="Cadena documental"
        value={analysis.chainStatus}
        options={[
          ["", "Seleccionar"],
          ["COMPLETE", "Completa"],
          ["WITH_OBSERVATIONS", "Con observaciones"],
          ["INCOMPLETE", "Incompleta"],
          ["INCONSISTENT", "Inconsistente"],
        ]}
        onChange={(value) =>
          onChange("chainStatus", value)
        }
      />

      <SelectField
        label="Validación SAT"
        value={analysis.allCfdiValidated}
        options={[
          ["", "Seleccionar"],
          ["YES", "Todos validados"],
          ["NO", "Validación incompleta"],
          ["NOT_APPLICABLE", "No aplica"],
        ]}
        onChange={(value) =>
          onChange("allCfdiValidated", value)
        }
      />

      <SelectField
        label="Confianza del análisis"
        value={analysis.researcherConfidence}
        options={[
          ["", "Seleccionar"],
          ["HIGH", "Alta"],
          ["MEDIUM", "Media"],
          ["LOW", "Baja"],
        ]}
        onChange={(value) =>
          onChange("researcherConfidence", value)
        }
      />

      <Field
        label="Número de refacturas"
        type="number"
        value={String(analysis.refacturaCount)}
        onChange={(value) =>
          onChange("refacturaCount", Number(value))
        }
      />

      <SelectField
        label="Relación de refacturas"
        value={analysis.refacturaRelation}
        options={[
          ["", "Seleccionar"],
          ["CONSISTENT", "Correcta"],
          ["INCOMPLETE", "Incompleta"],
          ["INCONSISTENT", "Inconsistente"],
          ["NOT_APPLICABLE", "No aplica"],
        ]}
        onChange={(value) =>
          onChange("refacturaRelation", value)
        }
      />

      <label className="md:col-span-2">
        <span className="text-sm font-semibold text-slate-700">
          Observaciones técnicas
        </span>

        <textarea
          rows={4}
          value={analysis.technicalObservations}
          onChange={(event) =>
            onChange(
              "technicalObservations",
              event.target.value
            )
          }
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="md:col-span-2">
        <span className="text-sm font-semibold text-slate-700">
          Conclusión preliminar
        </span>

        <textarea
          rows={4}
          value={analysis.conclusion}
          onChange={(event) =>
            onChange("conclusion", event.target.value)
          }
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <button className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white md:col-span-2">
        Guardar análisis
      </button>
    </form>
  );
}

export default InvestigatorAnalysisForm;
