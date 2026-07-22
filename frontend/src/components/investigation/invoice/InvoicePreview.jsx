import Metric from "../common/Metric";
import SummaryItem from "../common/SummaryItem";

function InvoicePreview({
  documents,
  transfers,
  analysis,
}) {
  return (
    <section className="rounded-xl border-2 border-slate-900 p-6">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
        Previo del reporte
      </p>

      <h3 className="mt-2 text-2xl font-bold text-slate-900">
        Factura y cadena documental
      </h3>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric
          label="Documentos"
          value={documents.length}
        />

        <Metric
          label="Transmisiones"
          value={transfers.length}
        />

        <Metric
          label="Refacturas"
          value={analysis.refacturaCount || 0}
        />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <SummaryItem
          label="Cadena"
          value={analysis.chainStatus}
        />

        <SummaryItem
          label="SAT"
          value={analysis.allCfdiValidated}
        />

        <SummaryItem
          label="Calidad documental"
          value={analysis.documentQuality}
        />

        <SummaryItem
          label="Confianza del investigador"
          value={analysis.researcherConfidence}
        />
      </div>

      <div className="mt-5 rounded-lg bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase text-slate-500">
          Análisis del investigador Carvanta
        </p>

        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {analysis.conclusion ||
            analysis.technicalObservations ||
            "Análisis pendiente."}
        </p>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Este resultado describe la documentación revisada y
        no constituye una recomendación de compra.
      </p>
    </section>
  );
}

export default InvoicePreview;
