import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getCheckStatus } from "../services/api";

const STAGE_ORDER = [
  {
    key: "RECEIVED",
    label: "Recibido",
  },
  {
    key: "INVESTIGATION",
    label: "En investigación",
  },
  {
    key: "REVIEW",
    label: "En revisión",
  },
  {
    key: "READY",
    label: "Reporte listo",
  },
];

function CheckStatusPage() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      setError("");

      const result =
        await getCheckStatus(id);

      setData(result);
    } catch (requestError) {
      console.error(requestError);

      setError(
        requestError.response?.data?.error ||
          "No fue posible consultar el expediente."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadStatus();

    const interval = window.setInterval(
      loadStatus,
      30000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [loadStatus]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        Consultando tu Carvanta Check...
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-xl rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            No pudimos consultar el expediente
          </h1>

          <p className="mt-3 text-sm text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={loadStatus}
            className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
          >
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  const currentIndex = STAGE_ORDER.findIndex(
    (stage) => stage.key === data.stage
  );

  const vehicleDescription = [
  data.vehicle?.brand,
  data.vehicle?.model,
  data.vehicle?.year,
]
  .filter(Boolean)
  .join(" ");

const vehicleReference =
  vehicleDescription ||
  (data.vehicle?.vin
    ? `VIN ${data.vehicle.vin}`
    : "Vehículo pendiente de identificar");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-blue-600">
          Carvanta Check
        </p>

        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Seguimiento de tu expediente
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Guarda este enlace. Podrás regresar
          cuando quieras para consultar el estado
          de tu reporte.
        </p>

        <div className="mt-6 rounded-xl bg-slate-50 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Expediente
          </p>

          <p className="mt-1 break-all font-bold text-slate-900">
            {data.folio || data.id}
          </p>

          <p className="mt-3 text-sm font-medium text-slate-700">
  {vehicleReference}
</p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-4">
          {STAGE_ORDER.map((stage, index) => {
            const completed =
              currentIndex >= index;

            return (
              <div
                key={stage.key}
                className={[
                  "rounded-xl border p-4 text-center text-sm font-semibold",
                  completed
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-400",
                ].join(" ")}
              >
                {completed ? "✓ " : ""}
                {stage.label}
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">
            Estado actual
          </p>

          <p className="mt-1 text-xl font-bold text-slate-900">
            {data.statusLabel}
          </p>

          <p className="mt-3 text-sm text-slate-600">
            Tiempo estimado:{" "}
            <strong>
              {data.estimatedDelivery}
            </strong>
          </p>
        </div>

        {data.reportReady && data.report ? (
          <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
            <h2 className="text-xl font-bold text-emerald-950">
              Tu reporte está listo
            </h2>

            <p className="mt-3 text-sm leading-6 text-emerald-900">
              {data.report.summary}
            </p>

            <Link
              to={`/check/${data.id}/report`}
              className="mt-5 inline-flex rounded-lg bg-emerald-700 px-5 py-3 text-sm font-bold text-white"
            >
              Abrir reporte Carvanta
            </Link>
          </div>
        ) : (
          <div className="mt-8 rounded-xl bg-amber-50 p-5 text-sm text-amber-900">
            Nuestro equipo continúa trabajando en
            la investigación. Esta página se actualiza
            automáticamente cada 30 segundos.
          </div>
        )}

        <button
          type="button"
          onClick={loadStatus}
          className="mt-6 text-sm font-bold text-blue-600"
        >
          Actualizar estado ahora
        </button>
      </section>
    </main>
  );
}

export default CheckStatusPage;