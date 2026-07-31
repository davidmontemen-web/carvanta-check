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

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="rounded-xl bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="mb-4 font-semibold text-slate-900">
              Datos del vehículo
            </h2>

            <div className="grid gap-3 md:grid-cols-2">
              <Item label="Marca" value={check.marca} />
              <Item label="Modelo" value={check.modelo} />
              <Item label="Año" value={check.anio} />
              <Item label="Versión" value={check.version} />
              <Item label="Placas" value={check.placas} />
              <Item label="VIN / NIV" value={check.vin} />
              <Item label="Vendedor" value={check.vendedor} />
              <Item label="Precio anunciado" value={check.precio} />
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-900">
              Estado del expediente
            </h2>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Estado documental</p>
              <p className="mt-1 font-semibold text-slate-900">
                {expedienteStatus}
              </p>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Documentos cargados</p>
              <p className="mt-1 font-semibold text-slate-900">
                {documentCount}
              </p>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Precio del servicio</p>
              <p className="mt-1 font-semibold text-slate-900">$199 MXN</p>
            </div>

            <Link
              to={`/registro/${check.id}`}
              className="mt-6 block rounded-lg bg-blue-600 px-4 py-3 text-center font-semibold text-white hover:bg-blue-700"
            >
              Continuar al registro
            </Link>
          </section>
        </div>

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