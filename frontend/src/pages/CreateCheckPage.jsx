import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function CreateCheckPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    marca: "",
    modelo: "",
    anio: "",
    version: "",
    placas: "",
    vin: "",
    vendedor: "",
    precio: "",
  });

  const [files, setFiles] = useState({
    tarjetaCirculacion: null,
    facturaFrente: null,
    facturaReverso: null,
    documentoAdicional: null,
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFile = (e) => {
    setFiles({ ...files, [e.target.name]: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.marca || !form.modelo || !form.anio) {
      alert("Marca, modelo y año son obligatorios.");
      return;
    }

    if (!files.tarjetaCirculacion) {
      alert("La tarjeta de circulación es obligatoria.");
      return;
    }

    const data = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      data.append(key, value);
    });

    Object.entries(files).forEach(([key, file]) => {
      if (file) data.append(key, file);
    });

    setLoading(true);

    try {
      const response = await api.post("/checks", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigate(`/resumen/${response.data.id}`);
    } catch (error) {
      console.error(error);
      alert("Error al crear expediente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-900">
          Validar expediente
        </h1>
        <p className="mt-1 text-slate-600">
          Carga la información básica del vehículo y sus documentos.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="rounded-xl bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="mb-4 font-semibold text-slate-900">
              Datos del vehículo
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Marca *" name="marca" value={form.marca} onChange={handleChange} />
              <Input label="Modelo *" name="modelo" value={form.modelo} onChange={handleChange} />
              <Input label="Año *" name="anio" value={form.anio} onChange={handleChange} />
              <Input label="Versión" name="version" value={form.version} onChange={handleChange} />
              <Input label="Placas" name="placas" value={form.placas} onChange={handleChange} />
              <Input label="VIN / NIV" name="vin" value={form.vin} onChange={handleChange} />
              <Input label="Vendedor" name="vendedor" value={form.vendedor} onChange={handleChange} />
              <Input label="Precio anunciado" name="precio" value={form.precio} onChange={handleChange} />
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-900">Documentos</h2>

            <FileInput label="Tarjeta de circulación *" name="tarjetaCirculacion" onChange={handleFile} />
            <FileInput label="Factura frente" name="facturaFrente" onChange={handleFile} />
            <FileInput label="Factura reverso" name="facturaReverso" onChange={handleFile} />
            <FileInput label="Documento adicional" name="documentoAdicional" onChange={handleFile} />

            <button
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Creando..." : "Ver resumen"}
            </button>
          </section>
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
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
      />
    </label>
  );
}

function FileInput({ label, name, onChange }) {
  return (
    <label className="mb-4 block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="file"
        name={name}
        onChange={onChange}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
      />
    </label>
  );
}

export default CreateCheckPage;