import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

function ReportPage() {
  const { id } = useParams();
  const [check, setCheck] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCheck() {
      try {
        const response = await api.get(`/checks/${id}`);
        setCheck(response.data);
      } catch (error) {
        console.error(error);
        alert("No se pudo cargar el reporte.");
      } finally {
        setLoading(false);
      }
    }

    loadCheck();
  }, [id]);

  if (loading) {
    return <main className="p-8">Generando reporte...</main>;
  }

  if (!check) {
    return <main className="p-8">Reporte no encontrado.</main>;
  }

  const docTypes = check.documents.map((doc) => doc.type);

  const hasTarjeta = docTypes.includes("tarjetaCirculacion");
  const hasFacturaFrente = docTypes.includes("facturaFrente");
  const hasFacturaReverso = docTypes.includes("facturaReverso");
  const hasVin = Boolean(check.vin);

  const alerts = [];

  if (!hasTarjeta) alerts.push("No se cargó tarjeta de circulación.");
  if (!hasFacturaFrente) alerts.push("No se cargó factura frente.");
  if (!hasFacturaReverso) alerts.push("No se cargó factura reverso.");
  if (!hasVin) alerts.push("No se capturó VIN / NIV.");

  const quality = getQuality({
    hasTarjeta,
    hasFacturaFrente,
    hasFacturaReverso,
    hasVin,
  });

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">
            Carvanta Check
          </p>

          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Reporte básico del expediente
          </h1>

          <p className="mt-2 text-slate-600">
            Este reporte resume la información cargada y las primeras alertas
            documentales.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="rounded-xl bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="mb-4 font-semibold text-slate-900">
              Vehículo revisado
            </h2>

            <div className="grid gap-3 md:grid-cols-2">
              <Item label="Marca" value={check.marca} />
              <Item label="Modelo" value={check.modelo} />
              <Item label="Año" value={check.anio} />
              <Item label="Versión" value={check.version} />
              <Item label="Placas" value={check.placas} />
              <Item label="VIN / NIV" value={check.vin} />
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-900">
              Resultado inicial
            </h2>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Calidad del expediente</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {quality}
              </p>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Estado de pago</p>
              <p className="mt-1 font-semibold text-slate-900">
                {check.status === "pagado" ? "Pagado" : check.status}
              </p>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">
            Alertas documentales
          </h2>

          {alerts.length === 0 ? (
            <p className="rounded-lg bg-green-50 p-4 font-medium text-green-700">
              No se detectaron faltantes básicos en el expediente cargado.
            </p>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <p
                  key={alert}
                  className="rounded-lg bg-yellow-50 p-4 font-medium text-yellow-800"
                >
                  {alert}
                </p>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">
            Recomendación Carvanta
          </h2>

          <p className="text-slate-700">
            {quality === "Completo"
              ? "El expediente tiene los documentos básicos para iniciar una revisión documental más completa."
              : "El expediente puede revisarse de forma inicial, pero recomendamos solicitar los documentos faltantes antes de avanzar con la compra."}
          </p>
        </section>
      </div>
    </main>
  );
}

function getQuality({ hasTarjeta, hasFacturaFrente, hasFacturaReverso, hasVin }) {
  const score = [hasTarjeta, hasFacturaFrente, hasFacturaReverso, hasVin].filter(
    Boolean
  ).length;

  if (score >= 4) return "Completo";
  if (score >= 2) return "Parcial";
  return "Básico";
}

function Item({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value || "No capturado"}</p>
    </div>
  );
}

export default ReportPage;