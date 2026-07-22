import { useEffect, useState } from "react";
import {
  Link,
  useParams,
} from "react-router-dom";

import api from "../services/api";

function ReportPage() {
  const { id } = useParams();

  const [statusData, setStatusData] =
    useState(null);

  const [check, setCheck] = useState(null);
  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadReport();
  }, [id]);

  async function loadReport() {
    try {
      setError("");

      const statusResponse = await api.get(
        `/checks/${id}/status`
      );

      const status = statusResponse.data;

      setStatusData(status);

      if (!status.reportReady) {
        return;
      }

      const checkResponse = await api.get(
        `/checks/${id}`
      );

      setCheck(checkResponse.data);
    } catch (requestError) {
      console.error(requestError);

      setError(
        requestError.response?.data?.error ||
          "No fue posible consultar el reporte."
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        Consultando reporte...
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-xl rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            No pudimos consultar el reporte
          </h1>

          <p className="mt-3 text-sm text-red-600">
            {error}
          </p>
        </div>
      </main>
    );
  }

  if (!statusData?.reportReady) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-bold text-blue-600">
            Carvanta Check
          </p>

          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Tu reporte todavía está en proceso
          </h1>

          <p className="mt-4 leading-7 text-slate-600">
            Nuestro equipo continúa realizando la
            investigación y validando las fuentes
            correspondientes.
          </p>

          <div className="mt-6 rounded-xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">
              Estado actual
            </p>

            <p className="mt-1 text-lg font-bold text-slate-900">
              {statusData?.statusLabel ||
                "En proceso"}
            </p>

            <p className="mt-3 text-sm text-slate-600">
              Tiempo estimado:{" "}
              <strong>
                {statusData?.estimatedDelivery ||
                  "24 a 48 horas"}
              </strong>
            </p>
          </div>

          <Link
            to={`/check/${id}/status`}
            className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white"
          >
            Ver seguimiento
          </Link>
        </section>
      </main>
    );
  }

  if (!check?.report) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        El reporte fue publicado, pero no se pudo
        cargar su contenido.
      </main>
    );
  }

  return (
    <main>
      {/* Conserva aquí el diseño actual de tu reporte */}
    </main>
  );
}

export default ReportPage;