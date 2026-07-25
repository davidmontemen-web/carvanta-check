import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";

function scoreOf(trustIndex) {
  const value = Number(
    trustIndex?.score ?? trustIndex?.value ?? trustIndex?.total
  );
  return Number.isFinite(value) ? Math.round(value) : null;
}

function ReportPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/checks/${id}/report`)
      .then((response) => setData(response.data))
      .catch((requestError) => {
        setError(
          requestError.response?.data?.error ||
          "No fue posible consultar el reporte."
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <main className="min-h-screen bg-slate-50 p-8">Consultando reporte...</main>;

  if (error || !data) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <section className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Reporte no disponible</h1>
          <p className="mt-3 text-slate-600">{error}</p>
          <Link to={`/check/${id}/status`} className="mt-6 inline-flex font-bold text-blue-600">Ver seguimiento</Link>
        </section>
      </main>
    );
  }

  const repuve = data.repuve || {};
  const score = scoreOf(repuve.trustIndex);
  const findings = repuve.findings || data.report.alerts || [];
  const recommendations = repuve.recommendations || [];
  const vehicleName = [data.vehicle.brand, data.vehicle.model, data.vehicle.year].filter(Boolean).join(" ");

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-white shadow-sm print:max-w-none print:rounded-none print:shadow-none">
        <header className="bg-slate-950 px-8 py-10 text-white">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">Carvanta Check</p>
              <h1 className="mt-3 text-3xl font-bold">Reporte de investigación vehicular</h1>
              <p className="mt-3 text-slate-300">Folio {data.folio}</p>
            </div>
            <button type="button" onClick={() => window.print()} className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-950 print:hidden">Imprimir / Guardar PDF</button>
          </div>
        </header>

        <div className="space-y-8 p-8">
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-5 md:col-span-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Vehículo</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">{vehicleName || "Vehículo consultado"}</h2>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-500">VIN</dt><dd className="break-all font-semibold">{data.vehicle.vin || "No disponible"}</dd></div>
                <div><dt className="text-slate-500">Placas</dt><dd className="font-semibold">{data.vehicle.plate || "No disponibles"}</dd></div>
                <div><dt className="text-slate-500">Versión</dt><dd className="font-semibold">{data.vehicle.version || "No disponible"}</dd></div>
                <div><dt className="text-slate-500">Fecha del reporte</dt><dd className="font-semibold">{new Date(data.report.createdAt).toLocaleDateString("es-MX")}</dd></div>
              </dl>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Trust Index</p>
              <p className="mt-3 text-5xl font-black text-slate-950">{score ?? "—"}</p>
              <p className="mt-2 text-sm font-semibold text-slate-600">de 100</p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900">Resultado general</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">{repuve.verdict?.label || repuve.verdict?.code || data.report.riskLevel}</span>
            </div>
            <p className="mt-4 leading-7 text-slate-700">{repuve.executiveSummary || data.report.summary}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">Hallazgos</h2>
            <div className="mt-4 space-y-3">
              {findings.length ? findings.map((item, index) => (
                <div key={item.code || item.type || index} className="break-inside-avoid rounded-xl border border-slate-200 p-5">
                  <div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold text-slate-900">{item.title || "Hallazgo"}</h3><span className="text-xs font-bold uppercase text-slate-500">{item.severity || "INFORMATIVO"}</span></div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description || JSON.stringify(item)}</p>
                </div>
              )) : <p className="rounded-xl bg-emerald-50 p-5 text-emerald-900">No se identificaron hallazgos de riesgo en la evidencia procesada.</p>}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">Recomendaciones</h2>
            <div className="mt-4 space-y-3">
              {(recommendations.length ? recommendations : [{ title: "Recomendación general", description: data.report.recommendation }]).map((item, index) => (
                <div key={item.code || index} className="break-inside-avoid rounded-xl bg-slate-50 p-5">
                  <h3 className="font-bold text-slate-900">{item.title || "Acción recomendada"}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description || item.action}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="border-t border-slate-200 pt-6 text-xs leading-5 text-slate-500">
            <p>{repuve.disclaimer || "Este reporte refleja la información disponible en las fuentes y documentos consultados al momento de su generación. No sustituye una revisión física, mecánica, fiscal o jurídica especializada."}</p>
          </section>
        </div>
      </article>
    </main>
  );
}

export default ReportPage;
