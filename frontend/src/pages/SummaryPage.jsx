import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { API_URL } from "../services/api";

function SummaryPage() {
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
        alert("No se pudo cargar el expediente.");
      } finally {
        setLoading(false);
      }
    }

    loadCheck();
  }, [id]);

  if (loading) {
    return <main className="p-8">Cargando resumen...</main>;
  }

  if (!check) {
    return <main className="p-8">Expediente no encontrado.</main>;
  }

  const documentCount = check.documents?.length || 0;

const vehicleIdentified = Boolean(
  check.marca ||
  check.modelo ||
  check.anio
);

const vehicleTitle = [
  check.marca,
  check.modelo,
  check.anio,
]
  .filter(Boolean)
  .join(" ");

  const hasAdditionalVehicleData = Boolean(
  check.version ||
  check.placas ||
  check.vendedor ||
  check.precio
);

const expedienteStatus =
  documentCount > 0
    ? "Investigación enriquecida"
    : "Investigación iniciada con VIN";

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-900">
          Resumen del expediente
        </h1>

        <p className="mt-1 text-slate-600">
          Revisa la información capturada antes de continuar.
        </p>

        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
  <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-8 text-white md:px-8">
    <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">
      Vehículo identificado
    </p>

    <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-3xl font-bold">
          {vehicleIdentified
            ? vehicleTitle
            : "Vehículo pendiente de identificar"}
        </h2>

        <p className="mt-2 max-w-2xl text-sm text-blue-100">
          {vehicleIdentified
            ? "Información obtenida automáticamente mediante la decodificación del VIN."
            : "La investigación continuará utilizando el VIN proporcionado."}
        </p>
      </div>

      <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-blue-100">
          VIN / NIV
        </p>

        <p className="mt-1 font-mono text-base font-semibold tracking-wider">
          {check.vin}
        </p>
      </div>
    </div>
  </div>

  <div className="grid gap-4 p-6 md:grid-cols-3 md:p-8">
    <StatusCard
      label="Estado del expediente"
      value={expedienteStatus}
      description="Tu investigación fue creada correctamente."
    />

    <StatusCard
      label="Documentos cargados"
      value={documentCount}
      description={
        documentCount > 0
          ? "Estos documentos enriquecerán la investigación."
          : "Podrás agregar evidencias posteriormente."
      }
    />

    <StatusCard
      label="Precio del servicio"
      value="$199 MXN"
      description="Pago único por la investigación."
    />
  </div>

  {hasAdditionalVehicleData && (
    <div className="border-t border-slate-200 px-6 py-6 md:px-8">
      <h3 className="font-semibold text-slate-900">
        Información adicional proporcionada
      </h3>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {check.version && (
          <Item label="Versión" value={check.version} />
        )}

        {check.placas && (
          <Item label="Placas" value={check.placas} />
        )}

        {check.vendedor && (
          <Item label="Vendedor" value={check.vendedor} />
        )}

        {check.precio && (
          <Item label="Precio anunciado" value={check.precio} />
        )}
      </div>
    </div>
  )}

  <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 md:px-8">
    <Link
      to={`/registro/${check.id}`}
      className="block w-full rounded-lg bg-blue-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-blue-700 md:ml-auto md:w-auto md:min-w-64"
    >
      Continuar al registro
    </Link>
  </div>
</section>

        <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">
            Documentos cargados
          </h2>

         {documentCount === 0 ? (
            <p className="text-slate-600">
  La investigación inició únicamente con el VIN. Podrás agregar documentos
  posteriormente para aumentar el nivel de certeza.
</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-4">
              {check.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <p className="text-sm font-semibold text-slate-800">
                    {labelDoc(doc.type)}
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {doc.fileName}
                  </p>

                  <a
                    href={`${API_URL}${doc.filePath}`}
                    target="_blank"
                    className="mt-3 block rounded-md bg-slate-100 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-200"
                  >
                    Ver archivo
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Item({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value || "No capturado"}</p>
    </div>
  );
}

function StatusCard({
  label,
  value,
  description,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-lg font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-sm leading-5 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function labelDoc(type) {
  const labels = {
    tarjetaCirculacion: "Tarjeta de circulación",
    facturaFrente: "Factura frente",
    facturaReverso: "Factura reverso",
    documentoAdicional: "Documento adicional",
  };

  return labels[type] || type;
}

export default SummaryPage;