import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const INITIAL_FORM = {
  vin: "",
  marca: "",
  modelo: "",
  anio: "",
  version: "",
  placas: "",
  vendedor: "",
  precio: "",
};

const INITIAL_FILES = {
  tarjetaCirculacion: null,
  facturaFrente: null,
  facturaReverso: null,
  documentoAdicional: null,
};

function normalizeVin(value) {
  return value
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 17);
}

function isValidVin(value) {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(value);
}

function getApiError(error) {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    "No se pudo crear el expediente."
  );
}

function CreateCheckPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [showOptionalData, setShowOptionalData] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [form, setForm] = useState(INITIAL_FORM);
  const [files, setFiles] = useState(INITIAL_FILES);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setErrorMessage("");

    setForm((currentForm) => ({
      ...currentForm,
      [name]: name === "vin" ? normalizeVin(value) : value,
    }));
  };

  const handleFile = (event) => {
    const { name, files: selectedFiles } = event.target;

    setFiles((currentFiles) => ({
      ...currentFiles,
      [name]: selectedFiles?.[0] || null,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!isValidVin(form.vin)) {
      setErrorMessage(
        "Captura un VIN / NIV válido de 17 caracteres. No puede contener I, O o Q."
      );
      return;
    }

    const data = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      const trimmedValue = value.trim();

      if (trimmedValue) {
        data.append(key, trimmedValue);
      }
    });

    Object.entries(files).forEach(([key, file]) => {
      if (file) {
        data.append(key, file);
      }
    });

    setLoading(true);

    try {
      const response = await api.post("/checks", data);

      navigate(`/resumen/${response.data.id}`);
    } catch (error) {
      console.error(error);
      setErrorMessage(getApiError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Investigación vehicular Carvanta
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Comienza con el VIN
          </h1>

          <p className="mt-2 max-w-2xl text-slate-600">
            Sólo necesitamos el VIN o NIV del vehículo para crear la
            investigación. Podrás agregar más información y documentos para
            aumentar el nivel de certeza.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <label className="block">
              <span className="text-sm font-semibold text-slate-900">
                VIN / NIV del vehículo
              </span>

              <input
                autoFocus
                autoComplete="off"
                name="vin"
                value={form.vin}
                onChange={handleChange}
                placeholder="Ejemplo: 3MZBN1V35JM123456"
                maxLength={17}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-mono text-lg uppercase tracking-wider outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <div className="mt-3 flex items-center justify-between gap-4">
              <p className="text-sm text-slate-500">
                Debe contener exactamente 17 caracteres.
              </p>

              <p
                className={`text-sm font-medium ${
                  form.vin.length === 17
                    ? "text-emerald-600"
                    : "text-slate-500"
                }`}
              >
                {form.vin.length}/17
              </p>
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <button
              type="button"
              onClick={() => setShowOptionalData((current) => !current)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <h2 className="font-semibold text-slate-900">
                  Agregar más información
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Es opcional y ayudará a enriquecer el expediente.
                </p>
              </div>

              <span className="text-sm font-semibold text-blue-600">
                {showOptionalData ? "Ocultar" : "Agregar"}
              </span>
            </button>

            {showOptionalData && (
              <div className="mt-6 border-t border-slate-200 pt-6">
                <h3 className="mb-4 font-semibold text-slate-900">
                  Datos conocidos del vehículo
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Marca"
                    name="marca"
                    value={form.marca}
                    onChange={handleChange}
                  />

                  <Input
                    label="Modelo"
                    name="modelo"
                    value={form.modelo}
                    onChange={handleChange}
                  />

                  <Input
                    label="Año"
                    name="anio"
                    value={form.anio}
                    onChange={handleChange}
                  />

                  <Input
                    label="Versión"
                    name="version"
                    value={form.version}
                    onChange={handleChange}
                  />

                  <Input
                    label="Placas"
                    name="placas"
                    value={form.placas}
                    onChange={handleChange}
                  />

                  <Input
                    label="Vendedor"
                    name="vendedor"
                    value={form.vendedor}
                    onChange={handleChange}
                  />

                  <Input
                    label="Precio anunciado"
                    name="precio"
                    value={form.precio}
                    onChange={handleChange}
                  />
                </div>

                <div className="mt-8">
                  <h3 className="font-semibold text-slate-900">
                    Documentos disponibles
                  </h3>

                  <p className="mt-1 text-sm text-slate-600">
                    Ningún documento es obligatorio para iniciar.
                  </p>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <FileInput
                      label="Tarjeta de circulación"
                      name="tarjetaCirculacion"
                      onChange={handleFile}
                    />

                    <FileInput
                      label="Factura frente"
                      name="facturaFrente"
                      onChange={handleFile}
                    />

                    <FileInput
                      label="Factura reverso"
                      name="facturaReverso"
                      onChange={handleFile}
                    />

                    <FileInput
                      label="Documento adicional"
                      name="documentoAdicional"
                      onChange={handleFile}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-4 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creando investigación..." : "Continuar con la investigación"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Input({ label, name, value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>

      <input
        name={name}
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function FileInput({ label, name, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>

      <input
        type="file"
        name={name}
        onChange={onChange}
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
      />
    </label>
  );
}

export default CreateCheckPage;